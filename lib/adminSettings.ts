import { supabaseService } from "@/lib/supabaseService";
import { WeeklyAvailability, sanitiseWeeklyAvailability } from "./availability";

type AdminSettingsRow = {
  id: number;
  start_address: string | null;
  start_lat: number | null;
  start_lng: number | null;
  default_duration_min: number | null;
  buffer_min: number | null;
  cancel_window_hours: number | null;
  updated_at: string | null;
  weekly_availability?: unknown;
};

export type AdminSettings = Omit<AdminSettingsRow, "weekly_availability"> & {
  weekly_availability: WeeklyAvailability | null;
};

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const { data, error } = await supabaseService
    .from("admin_settings")
    .select("*")
    .eq("id", 1)
    .returns<AdminSettingsRow>()
    .maybeSingle();

  if (error) {
    console.error("Failed to load admin settings", error);
    return null;
  }

  if (!data) {
    return null;
  }

  const row: AdminSettingsRow = data;

  return {
    ...row,
    weekly_availability: row.weekly_availability
      ? sanitiseWeeklyAvailability(row.weekly_availability)
      : null,
  };
}

type AdminSettingsUpdate = {
  start_address?: string;
  start_lat?: number | null;
  start_lng?: number | null;
  default_duration_min?: number;
  buffer_min?: number;
  cancel_window_hours?: number;
  weekly_availability?: WeeklyAvailability | null;
};

export async function upsertAdminSettings(settings: AdminSettingsUpdate) {
  const payload: Record<string, unknown> = {};

  if ("start_address" in settings) {
    payload.start_address = settings.start_address;
  }
  if ("start_lat" in settings) {
    payload.start_lat = settings.start_lat;
  }
  if ("start_lng" in settings) {
    payload.start_lng = settings.start_lng;
  }
  if ("default_duration_min" in settings) {
    payload.default_duration_min = settings.default_duration_min;
  }
  if ("buffer_min" in settings) {
    payload.buffer_min = settings.buffer_min;
  }
  if ("cancel_window_hours" in settings) {
    payload.cancel_window_hours = settings.cancel_window_hours;
  }
  if ("weekly_availability" in settings) {
    payload.weekly_availability = settings.weekly_availability;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const { error } = await supabaseService
    .from("admin_settings")
    .upsert(
      {
        id: 1,
        ...payload,
      },
      { onConflict: "id" }
    );

  if (error) {
    console.error("Failed to update admin settings", error);
    throw error;
  }
}
