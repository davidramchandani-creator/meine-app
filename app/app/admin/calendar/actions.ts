'use server';

import { revalidatePath } from "next/cache";
import {
  BookingError,
  ensureNoStudentCollision,
  refundStudentPackageCredit,
  DEFAULT_LESSON_BUFFER_MINUTES,
} from "@/lib/booking";
import { supabaseService } from "@/lib/supabaseService";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { getAdminSettings } from "@/lib/adminSettings";

const DEFAULT_ADMIN_CANCEL_REASON = "Storniert durch Admin";

export async function cancelLessonAsAdmin(lessonId: string, reason: string) {
  const trimmedReason = reason.trim();
  const normalizedReason =
    trimmedReason.length > 0 ? trimmedReason : DEFAULT_ADMIN_CANCEL_REASON;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new BookingError("Bitte erneut anmelden.");
  }

  const { data: lesson, error } = await supabaseService
    .from("lessons")
    .select("id, status, student_package_id")
    .eq("id", lessonId)
    .single();

  if (error || !lesson) {
    throw new BookingError("Lesson nicht gefunden.");
  }

  if (lesson.status === "cancelled") {
    throw new BookingError("Lesson wurde bereits storniert.");
  }

  const { error: updateError } = await supabaseService
    .from("lessons")
    .update({
      status: "cancelled",
      cancellation_reason: normalizedReason.slice(0, 500),
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
    })
    .eq("id", lessonId);

  if (updateError) {
    console.error("[AdminCancelLesson] update failed", updateError);
    throw new BookingError(
      updateError.message ?? "Lesson konnte nicht storniert werden."
    );
  }

  if (lesson.student_package_id) {
    await refundStudentPackageCredit(lesson.student_package_id);
  }

  revalidatePath("/app/admin/calendar");
  revalidatePath("/app/student/lessons");
  revalidatePath("/app/student");
  revalidatePath("/app/admin/students");
}

export async function adminUpdateLessonTime(
  lessonId: string,
  startIso: string,
  endIso: string
) {
  const { data: lesson, error } = await supabaseService
    .from("lessons")
    .select("id, student_id, status")
    .eq("id", lessonId)
    .single();

  if (error || !lesson) {
    throw new BookingError("Lesson nicht gefunden.");
  }

  if (lesson.status !== "booked") {
    throw new BookingError("Nur aktive Lessons können verschoben werden.");
  }

  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date(start.getTime() + 45 * 60000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new BookingError("Ungültiges Datum.");
  }

  if (start >= end) {
    throw new BookingError("Ende muss nach dem Start liegen.");
  }

  const startUtc = start.toISOString();
  const endUtc = end.toISOString();

  const adminSettings = await getAdminSettings();
  const bufferMinutes =
    adminSettings?.buffer_min ?? DEFAULT_LESSON_BUFFER_MINUTES;

  await ensureNoStudentCollision({
    studentId: lesson.student_id,
    startsAtIso: startUtc,
    endsAtIso: endUtc,
    ignoreLessonId: lessonId,
    bufferMinutes,
  });

  const { error: updateError } = await supabaseService
    .from("lessons")
    .update({
      starts_at: startUtc,
      ends_at: endUtc,
    })
    .eq("id", lessonId);

  if (updateError) {
    throw new BookingError("Lesson konnte nicht aktualisiert werden.");
  }

  revalidatePath("/app/admin/calendar");
  revalidatePath("/app/student/lessons");
  revalidatePath("/app/student");
}
