'use server';

import {
  BookingError,
  ensureNoStudentCollision,
  normaliseBookingWindow,
} from "@/lib/booking";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { supabaseService } from "@/lib/supabaseService";
import { revalidatePath } from "next/cache";

export type RequestFormState = {
  ok: boolean;
  error?: string;
};

export async function submitStudentRequest(
  _prevState: RequestFormState,
  formData: FormData
): Promise<RequestFormState> {
  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Bitte erneut anmelden." };
    }

    const startRaw = String(formData.get("start") ?? "");
    const endRaw = formData.get("end");
    const message = String(formData.get("message") ?? "").slice(0, 500);

    if (!startRaw) {
      throw new BookingError("Bitte wähle einen Startzeitpunkt.");
    }

    const { startIso, endIso } = normaliseBookingWindow(
      startRaw,
      (endRaw ?? undefined) as string | undefined
    );

    await ensureNoStudentCollision({
      studentId: user.id,
      startsAtIso: startIso,
      endsAtIso: endIso,
    });

    const { error } = await supabaseService.from("booking_requests").insert({
      requester_id: user.id,
      student_id: user.id,
      proposed_starts_at: startIso,
      proposed_ends_at: endIso,
      message: message.length ? message : null,
      direction: "student_to_admin",
      status: "pending",
      kind: "booking",
      counter_of: null,
      lesson_id: null,
    });

    if (error) {
      throw new BookingError(error.message);
    }

    revalidatePath("/app/admin/requests");
    revalidatePath("/app/admin");

    return { ok: true };
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message };
    }
    console.error(error);
    return {
      ok: false,
      error: "Die Anfrage konnte nicht gespeichert werden.",
    };
  }
}
