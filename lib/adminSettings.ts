import { supabaseService } from "@/lib/supabaseService";

export type AdminSettings = {
  id: number;
  start_address: string | null;
  start_lat: number | null;
  start_lng: number | null;
  default_duration_min: number | null;
  buffer_min: number | null;
  cancel_window_hours: number | null;
  updated_at: string | null;
};

export async function getAdminSettings(): Promise<AdminSettings | null> {
  const { data, error } = await supabaseService
    .from("admin_settings")
    .select(
      "id, start_address, start_lat, start_lng, default_duration_min, buffer_min, cancel_window_hours, updated_at"
    )
    .eq("id", 1)
    .returns<AdminSettings>()
    .maybeSingle();

  if (error) {
    console.error("Failed to load admin settings", error);
    return null;
  }

  return data ?? null;
}

export async function upsertAdminSettings(settings: {
  start_address: string;
  start_lat: number;
  start_lng: number;
  default_duration_min: number;
  buffer_min: number;
  cancel_window_hours: number;
}) {
  const { error } = await supabaseService.rpc("set_admin_settings", {
    p_start_address: settings.start_address,
    p_start_lat: settings.start_lat,
    p_start_lng: settings.start_lng,
    p_duration: settings.default_duration_min,
    p_buffer: settings.buffer_min,
    p_cancel_hours: settings.cancel_window_hours,
  });

  if (error) {
    console.error("Failed to update admin settings", error);
    throw error;
  }
}
