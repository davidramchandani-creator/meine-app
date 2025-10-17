'use server';

import { revalidatePath } from "next/cache";
import {
  BookingError,
  normaliseBookingWindow,
  ensureNoStudentCollision,
  refundStudentPackageCredit,
  DEFAULT_LESSON_BUFFER_MINUTES,
} from "@/lib/booking";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { supabaseService } from "@/lib/supabaseService";
import { getAdminSettings } from "@/lib/adminSettings";

export async function requestLessonReschedule(
  lessonId: string,
  start: string,
  end: string,
  message: string
) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new BookingError("Bitte erneut anmelden.");
    }

    const { data: lesson, error: lessonError } = await supabaseService
      .from("lessons")
      .select("id, student_id, starts_at, ends_at, status, student_package_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new BookingError("Lesson nicht gefunden.");
    }

    if (lesson.student_id !== user.id) {
      throw new BookingError("Diese Lesson gehört nicht zu dir.");
    }

    if (lesson.status !== "booked") {
      throw new BookingError("Diese Lesson kann nicht verschoben werden.");
    }

    const { data: existingRequest } = await supabaseService
      .from("booking_requests")
      .select("id")
      .eq("lesson_id", lessonId)
      .eq("status", "pending")
      .eq("kind", "reschedule")
      .maybeSingle();

    if (existingRequest) {
      throw new BookingError(
        "Es liegt bereits eine offene Verschiebungsanfrage vor."
      );
    }

    const adminSettings = await getAdminSettings();
    const bufferMinutes =
      adminSettings?.buffer_min ?? DEFAULT_LESSON_BUFFER_MINUTES;

    const { startIso, endIso } = normaliseBookingWindow(start, end);

    await ensureNoStudentCollision({
      studentId: user.id,
      startsAtIso: startIso,
      endsAtIso: endIso,
      ignoreLessonId: lessonId,
      bufferMinutes,
    });

    const { error: insertError } = await supabaseService
      .from("booking_requests")
      .insert({
        requester_id: user.id,
        student_id: user.id,
        lesson_id: lessonId,
        proposed_starts_at: startIso,
        proposed_ends_at: endIso,
        message: message ? message.slice(0, 500) : null,
        direction: "student_to_admin",
        status: "pending",
        kind: "reschedule",
        counter_of: null,
      });

    if (insertError) {
      throw new BookingError(insertError.message);
    }

    revalidatePath("/app/student/lessons");
    revalidatePath("/app/student/suggestions");
    revalidatePath("/app/admin/requests");

    return { ok: true };
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: "Anfrage konnte nicht gesendet werden." };
  }
}

export async function cancelLessonAsStudent(
  lessonId: string,
  reason: string
) {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new BookingError("Bitte erneut anmelden.");
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      throw new BookingError("Bitte gib einen Grund für die Stornierung an.");
    }

    const { data: lesson, error: lessonError } = await supabaseService
      .from("lessons")
      .select("id, student_id, starts_at, status, student_package_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new BookingError("Lesson nicht gefunden.");
    }

    if (lesson.student_id !== user.id) {
      throw new BookingError("Diese Lesson gehört nicht zu dir.");
    }

    if (lesson.status !== "booked") {
      throw new BookingError("Lesson ist nicht mehr aktiv.");
    }

    const startsAt = new Date(lesson.starts_at);
    const now = new Date();
    const adminSettings = await getAdminSettings();
    const cancelWindowHours = adminSettings?.cancel_window_hours ?? 24;
    const diffHours = (startsAt.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < cancelWindowHours) {
      throw new BookingError(
        `Stornierungen sind nur bis ${cancelWindowHours} Stunde(n) vor Beginn möglich.`
      );
    }

    const { error: updateError } = await supabaseService
      .from("lessons")
      .update({
        status: "cancelled",
        cancellation_reason: trimmedReason.slice(0, 500),
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
      })
      .eq("id", lessonId);

    if (updateError) {
      throw new BookingError("Lesson konnte nicht storniert werden.");
    }

    if (lesson.student_package_id) {
      await refundStudentPackageCredit(lesson.student_package_id);
    }

    revalidatePath("/app/student/lessons");
    revalidatePath("/app/student");
    revalidatePath("/app/admin/calendar");
    revalidatePath("/app/admin/students");

    return { ok: true };
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return { ok: false, error: "Stornierung fehlgeschlagen." };
  }
}
