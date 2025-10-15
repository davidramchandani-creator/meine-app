'use server';

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { supabaseService } from "@/lib/supabaseService";
import { geocodeAddress } from "@/lib/googleMaps";

export type ProfileFormState = {
  ok: boolean;
  error?: string;
};

const NAME_PATTERN = /^[\p{L}\p{M}\s'\-]+$/u;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return {
        ok: false,
        error: "Der Adressdienst ist nicht konfiguriert. Bitte Admin kontaktieren.",
      };
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, error: "Bitte erneut anmelden." };
    }

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const addressLine = String(formData.get("addressLine") ?? "").trim();
    const postalCode = String(formData.get("postalCode") ?? "").trim();
    const city = String(formData.get("city") ?? "").trim();

    if (!firstName || !lastName) {
      return {
        ok: false,
        error: "Bitte Vor- und Nachname eingeben.",
      };
    }

    if (!NAME_PATTERN.test(firstName) || !NAME_PATTERN.test(lastName)) {
      return {
        ok: false,
        error: "Name enthält ungültige Zeichen.",
      };
    }

    if (!addressLine || !postalCode || !city) {
      return {
        ok: false,
        error: "Bitte Adresse mit Strasse, PLZ und Ort ausfüllen.",
      };
    }

    const fullAddress = `${addressLine}, ${postalCode} ${city}`;
    const location = await geocodeAddress(fullAddress);

    if (!location) {
      return {
        ok: false,
        error: "Adresse konnte nicht gefunden werden. Bitte überprüfe die Eingabe.",
      };
    }

    const { error } = await supabaseService
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        address_line: addressLine,
        postal_code: postalCode,
        city: city,
        lat: location.lat,
        lng: location.lng,
      })
      .eq("id", user.id);

    if (error) {
      console.error("updateProfile", error);
      return {
        ok: false,
        error: "Profil konnte nicht gespeichert werden.",
      };
    }

    revalidatePath("/app/student/profile");
    revalidatePath("/app/student");
    revalidatePath("/app/admin/students");

    return { ok: true };
  } catch (error) {
    console.error("updateProfile", error);
    return {
      ok: false,
      error: "Unbekannter Fehler beim Speichern.",
    };
  }
}
