'use server';

import {
  acceptRequest,
  declineRequest,
  BookingError,
} from "@/lib/booking";
import { supabaseService } from "@/lib/supabaseService";
import { revalidatePath } from "next/cache";

export async function acceptSuggestion(requestId: string, studentId: string) {
  try {
    const result = await acceptRequest({
      requestId,
      expectedDirection: "admin_to_student",
      studentId,
    });
    revalidatePath("/app/student");
    revalidatePath("/app/student/lessons");
    revalidatePath("/app/student/suggestions");
    revalidatePath("/app/admin/calendar");
    revalidatePath("/app/admin/students");
    return { ok: true, lessonId: result.lessonId };
  } catch (error) {
    if (error instanceof BookingError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function declineSuggestion(requestId: string, studentId: string) {
  try {
    await declineRequest({
      requestId,
      expectedDirection: "admin_to_student",
      studentId,
    });
    revalidatePath("/app/student/suggestions");
    return { ok: true };
  } catch (error) {
    if (error instanceof BookingError) {
      throw new Error(error.message);
    }
    throw error;
  }
}

export async function counterSuggest(
  originalRequestId: string,
  studentId: string,
  startIso: string,
  endIso: string,
  message: string
) {
  const { data: originalRequest, error } = await supabaseService
    .from("booking_requests")
    .select("id")
    .eq("id", originalRequestId)
    .eq("student_id", studentId)
    .eq("direction", "admin_to_student")
    .eq("status", "pending")
    .single();

  if (error || !originalRequest) {
    throw new Error("Original-Vorschlag nicht gefunden");
  }

  const { error: insertError } = await supabaseService
    .from("booking_requests")
    .insert({
      requester_id: studentId,
      student_id: studentId,
      proposed_starts_at: startIso,
      proposed_ends_at: endIso,
      message,
      direction: "student_to_admin",
      status: "pending",
      kind: "booking",
      lesson_id: null,
      counter_of: originalRequestId,
    });

  if (insertError) {
    throw new Error(insertError.message);
  }

  await supabaseService
    .from("booking_requests")
    .update({ status: "declined" })
    .eq("id", originalRequestId);

  revalidatePath("/app/student/suggestions");

  return { ok: true };
}
