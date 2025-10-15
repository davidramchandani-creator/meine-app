'use server';

import { revalidatePath } from "next/cache";
import {
  BookingError,
  ensureNoStudentCollision,
  refundStudentPackageCredit,
} from "@/lib/booking";
import { supabaseService } from "@/lib/supabaseService";

export async function cancelLessonAsAdmin(
  lessonId: string,
  reason: string
) {
  const trimmedReason = reason.trim();

  const { data: lesson, error } = await supabaseService
    .from("lessons")
    .select("id, status, student_package_id")
    .eq("id", lessonId)
    .single();

  if (error || !lesson) {
    throw new BookingError("Lesson nicht gefunden.");
  }

  const { error: updateError } = await supabaseService
    .from("lessons")
    .update({
      status: "cancelled",
      cancellation_reason: trimmedReason ? trimmedReason.slice(0, 500) : null,
      cancelled_at: new Date().toISOString(),
      cancelled_by: null,
    })
    .eq("id", lessonId);

  if (updateError) {
    throw new BookingError("Lesson konnte nicht storniert werden.");
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

  await ensureNoStudentCollision({
    studentId: lesson.student_id,
    startsAtIso: startUtc,
    endsAtIso: endUtc,
    ignoreLessonId: lessonId,
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
