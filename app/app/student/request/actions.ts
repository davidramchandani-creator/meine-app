'use server';

import {
  BookingError,
  DEFAULT_LESSON_DURATION_MINUTES,
  DEFAULT_LESSON_BUFFER_MINUTES,
  ensureNoStudentCollision,
  normaliseBookingWindow,
} from "@/lib/booking";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { supabaseService } from "@/lib/supabaseService";
import { revalidatePath } from "next/cache";
import { getAdminSettings } from "@/lib/adminSettings";
import {
  DEFAULT_WEEKLY_AVAILABILITY,
  isSlotWithinAvailability,
} from "@/lib/availability";

const SLOT_INTERVAL_MINUTES = 15;

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
    const message = String(formData.get("message") ?? "").slice(0, 500);

    if (!startRaw) {
      throw new BookingError("Bitte wähle einen Startzeitpunkt.");
    }

    const startDate = new Date(startRaw);
    if (Number.isNaN(startDate.getTime())) {
      throw new BookingError("Ungültiger Startzeitpunkt.");
    }

    if (
      startDate.getMinutes() % SLOT_INTERVAL_MINUTES !== 0 ||
      startDate.getSeconds() !== 0 ||
      startDate.getMilliseconds() !== 0
    ) {
      throw new BookingError("Startzeiten sind nur in 15-Minuten-Schritten möglich.");
    }

    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + DEFAULT_LESSON_DURATION_MINUTES);

    const adminSettings = await getAdminSettings();
    const availability = adminSettings?.weekly_availability ?? DEFAULT_WEEKLY_AVAILABILITY;
    const bufferMinutes =
      adminSettings?.buffer_min ?? DEFAULT_LESSON_BUFFER_MINUTES;

    const { data: activePackage, error: packageError } = await supabaseService
      .from("v_student_current_package")
      .select("lessons_left")
      .eq("student_id", user.id)
      .maybeSingle();

    if (packageError) {
      throw new BookingError("Paketstatus konnte nicht geprüft werden.");
    }

    const lessonsLeft = activePackage?.lessons_left ?? 0;
    if (!activePackage || lessonsLeft <= 0) {
      throw new BookingError(
        "Du benötigst ein aktives Paket mit verfügbaren Credits, um eine Lektion anzufragen."
      );
    }

    if (!isSlotWithinAvailability(startDate, endDate, availability)) {
      throw new BookingError("Die gewählte Zeit liegt außerhalb der verfügbaren Slots.");
    }

    const { startIso, endIso } = normaliseBookingWindow(
      startRaw,
      undefined
    );

    await ensureNoStudentCollision({
      studentId: user.id,
      startsAtIso: startIso,
      endsAtIso: endIso,
      bufferMinutes,
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
