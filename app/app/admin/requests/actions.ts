'use server';

import {
  acceptRequest,
  declineRequest,
  BookingError,
  ensureNoStudentCollision,
  fetchPendingRequest,
  normaliseBookingWindow,
} from "@/lib/booking";
import { supabaseService } from "@/lib/supabaseService";
import { revalidatePath } from "next/cache";

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

  await ensureNoStudentCollision({
    studentId,
    startsAtIso: startUtc,
    endsAtIso: endUtc,
    ignoreLessonId: options.lessonId,
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
