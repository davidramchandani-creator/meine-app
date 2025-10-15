'use server';

import { revalidatePath } from "next/cache";
import { upsertAdminSettings, getAdminSettings } from "@/lib/adminSettings";
import { geocodeAddress } from "@/lib/googleMaps";

export type SettingsFormState = {
  ok: boolean;
  error?: string;
};

export async function saveAdminSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return {
        ok: false,
        error: "Google Maps API Key fehlt. Bitte in den Umgebungsvariablen hinterlegen.",
      };
    }

    const startAddress = String(formData.get("startAddress") ?? "").trim();
    const duration = Number(formData.get("defaultDuration") ?? 45);
    const buffer = Number(formData.get("bufferMinutes") ?? 5);
    const cancelHours = Number(formData.get("cancelWindow") ?? 24);

    if (!startAddress) {
      return { ok: false, error: "Startadresse darf nicht leer sein." };
    }

    if (Number.isNaN(duration) || duration <= 0) {
      return { ok: false, error: "Standarddauer muss größer 0 sein." };
    }

    if (Number.isNaN(buffer) || buffer < 0) {
      return { ok: false, error: "Puffer muss >= 0 sein." };
    }

    if (Number.isNaN(cancelHours) || cancelHours < 0) {
      return { ok: false, error: "Storno-Fenster muss >= 0 sein." };
    }

    const location = await geocodeAddress(startAddress);

    if (!location) {
      return {
        ok: false,
        error: "Startadresse konnte nicht geocodiert werden. Bitte Eingabe prüfen.",
      };
    }

    await upsertAdminSettings({
      start_address: startAddress,
      start_lat: location.lat,
      start_lng: location.lng,
      default_duration_min: Math.round(duration),
      buffer_min: Math.round(buffer),
      cancel_window_hours: Math.round(cancelHours),
    });

    revalidatePath("/app/admin/settings");
    revalidatePath("/app/student");

    return { ok: true };
  } catch (error) {
    console.error("saveAdminSettings", error);
    return {
      ok: false,
      error: "Einstellungen konnten nicht gespeichert werden.",
    };
  }
}

export async function loadAdminSettingsForForm() {
  const settings = await getAdminSettings();
  return {
    startAddress: settings?.start_address ?? "",
    defaultDuration: settings?.default_duration_min ?? 45,
    bufferMinutes: settings?.buffer_min ?? 5,
    cancelWindow: settings?.cancel_window_hours ?? 24,
    startLat: settings?.start_lat ?? null,
    startLng: settings?.start_lng ?? null,
    updatedAt: settings?.updated_at ?? null,
  };
}
