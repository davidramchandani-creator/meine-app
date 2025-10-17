'use server';

import {
  acceptRequest,
  declineRequest,
  BookingError,
  ensureNoStudentCollision,
  fetchPendingRequest,
  normaliseBookingWindow,
  DEFAULT_LESSON_BUFFER_MINUTES,
} from "@/lib/booking";
import { supabaseService } from "@/lib/supabaseService";
import { revalidatePath } from "next/cache";
import { getAdminSettings } from "@/lib/adminSettings";
import {
  DEFAULT_WEEKLY_AVAILABILITY,
  isSlotWithinAvailability,
} from "@/lib/availability";

export async function createAdminSuggestion(
  studentId: string,
  startIso: string,
  endIso: string,
  message: string,
  options: { counterOf?: string; kind?: "booking" | "reschedule"; lessonId?: string } = {}
) {
  if (!studentId) {
    throw new BookingError("Schüler fehlt.");
  }

  const kind = options.kind ?? "booking";
  if (kind === "reschedule" && !options.lessonId) {
    throw new BookingError("Lesson-ID für Verschiebung fehlt.");
  }

  const { startIso: startUtc, endIso: endUtc } = normaliseBookingWindow(
    startIso,
    endIso,
    { enforceLead: kind !== "reschedule" }
  );

  const startDate = new Date(startUtc);
  const endDate = new Date(endUtc);

  const adminSettings = await getAdminSettings();
  const availability = adminSettings?.weekly_availability ?? DEFAULT_WEEKLY_AVAILABILITY;
  const bufferMinutes =
    adminSettings?.buffer_min ?? DEFAULT_LESSON_BUFFER_MINUTES;

  if (!isSlotWithinAvailability(startDate, endDate, availability)) {
    throw new BookingError("Zeitpunkt liegt außerhalb der verfügbaren Slots.");
  }

  await ensureNoStudentCollision({
    studentId,
    startsAtIso: startUtc,
    endsAtIso: endUtc,
    ignoreLessonId: options.lessonId,
    bufferMinutes,
  });

  const { data: admin } = await supabaseService
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  const requesterId = admin?.id ?? null;

  const { error } = await supabaseService.from("booking_requests").insert({
    requester_id: requesterId,
    student_id: studentId,
      proposed_starts_at: startUtc,
      proposed_ends_at: endUtc,
      message,
      direction: "admin_to_student",
      status: "pending",
      kind,
      lesson_id: options.lessonId ?? null,
      counter_of: options.counterOf ?? null,
    });

  if (error) {
    throw new BookingError(error.message);
  }

  if (options.counterOf) {
    await supabaseService
      .from("booking_requests")
      .update({ status: "declined" })
      .eq("id", options.counterOf);
  }

  revalidatePath("/app/admin/requests");
  revalidatePath("/app/admin");
  revalidatePath("/app/student/suggestions");

  return { ok: true };
}

export async function acceptStudentRequest(requestId: string): Promise<void> {
  try {
    await acceptRequest({
      requestId,
      expectedDirection: "student_to_admin",
    });
    revalidatePath("/app/admin/requests");
    revalidatePath("/app/admin");
    revalidatePath("/app/admin/calendar");
    revalidatePath("/app/student");
    revalidatePath("/app/student/lessons");
    revalidatePath("/app/student/suggestions");
    revalidatePath("/app/admin/students");
    return;
  } catch (error) {
    if (error instanceof BookingError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function declineStudentRequest(requestId: string): Promise<void> {
  try {
    await declineRequest({
      requestId,
      expectedDirection: "student_to_admin",
    });
    revalidatePath("/app/admin/requests");
    return;
  } catch (error) {
    if (error instanceof BookingError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function deleteStudentRequest(requestId: string): Promise<void> {
  const { data: request, error: fetchError } = await supabaseService
    .from("booking_requests")
    .select("id, status, direction")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError) {
    throw new Error("Anfrage konnte nicht geladen werden.");
  }

  if (!request) {
    throw new Error("Anfrage wurde nicht gefunden.");
  }

  if (request.direction !== "student_to_admin") {
    throw new Error("Anfrage kann nicht gelöscht werden.");
  }

  if (request.status === "pending") {
    throw new Error("Offene Anfragen können nicht gelöscht werden.");
  }

  const { error: counterResetError } = await supabaseService
    .from("booking_requests")
    .update({ counter_of: null })
    .eq("counter_of", requestId);

  if (counterResetError) {
    throw new Error("Verknüpfte Anfragen konnten nicht aktualisiert werden.");
  }

  const { error: deleteError } = await supabaseService
    .from("booking_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    throw new Error("Anfrage konnte nicht gelöscht werden.");
  }

  revalidatePath("/app/admin/requests");
  revalidatePath("/app/admin");
}

export async function counterStudentRequest(
  requestId: string,
  startIso: string,
  endIso: string,
  message: string
) {
  try {
    const request = await fetchPendingRequest({
      requestId,
      expectedDirection: "student_to_admin",
    });

    const kind = request.kind;

    await createAdminSuggestion(
      request.student_id,
      startIso,
      endIso,
      message,
      {
        counterOf: requestId,
        kind,
        lessonId: request.lesson_id ?? undefined,
      }
    );

    revalidatePath("/app/admin/requests");

    return { ok: true };
  } catch (error) {
    if (error instanceof BookingError) {
      throw new Error(error.message);
    }
    throw error;
  }
}
