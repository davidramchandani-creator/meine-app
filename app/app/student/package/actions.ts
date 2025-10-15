'use server';

import { revalidatePath } from "next/cache";
import {
  BookingError,
  fetchActivePackage,
} from "@/lib/booking";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { supabaseService } from "@/lib/supabaseService";
import { getAdminSettings, upsertAdminSettings } from "@/lib/adminSettings";
import { geocodeAddress, getDrivingDistanceKm } from "@/lib/googleMaps";

type PackageId = "10" | "20";

const PACKAGE_DB_IDS: Record<PackageId, string> = {
  "10": "05c6afa6-8a00-4cb9-ba6e-68a59f37a0cc",
  "20": "4ab83713-13e4-4c7c-b403-42d2110fd73e",
};

export async function buyPackage(packageId: PackageId) {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new BookingError(
        "Der Routen-Service ist nicht konfiguriert. Bitte Admin kontaktieren."
      );
    }

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new BookingError("Bitte erneut anmelden.");
    }

    const packageUuid = PACKAGE_DB_IDS[packageId];

    if (!packageUuid) {
      throw new BookingError("Unbekanntes Paket.");
    }

    const activePackage = await fetchActivePackage(user.id);
    if (activePackage) {
      const total = activePackage.lessons_total ?? 0;
      const used = activePackage.lessons_used ?? 0;
      const remaining = Math.max(total - used, 0);

      if (remaining > 0) {
        throw new BookingError(
          "Es ist bereits ein aktives Paket vorhanden. Verbrauche zuerst alle Credits."
        );
      }

      const { error: completeError } = await supabaseService
        .from("student_packages")
        .update({ status: "completed" })
        .eq("id", activePackage.id);

      if (completeError) {
        console.error("Konnte altes Paket nicht abschließen", completeError);
      }
    }

    const { data: profile, error: profileError } = await supabaseService
      .from("profiles")
      .select(
        "first_name, last_name, address_line, postal_code, city, lat, lng"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      throw new BookingError("Profil konnte nicht geladen werden.");
    }

    if (!profile.first_name?.trim() || !profile.last_name?.trim()) {
      throw new BookingError(
        "Bitte trage Vor- und Nachname in deinem Profil ein."
      );
    }

    if (
      !profile.address_line?.trim() ||
      !profile.postal_code?.trim() ||
      !profile.city?.trim()
    ) {
      throw new BookingError(
        "Bitte vervollständige deine Adresse (Strasse, PLZ, Ort) im Profil."
      );
    }

    const studentAddress = `${profile.address_line}, ${profile.postal_code} ${profile.city}`;

    let studentLat = profile.lat;
    let studentLng = profile.lng;

    if (studentLat == null || studentLng == null) {
      const geocoded = await geocodeAddress(studentAddress);
      if (!geocoded) {
        throw new BookingError(
          "Schüleradresse konnte nicht geocodiert werden. Bitte prüfe die Angaben."
        );
      }

      studentLat = geocoded.lat;
      studentLng = geocoded.lng;

      const { error: updateProfileError } = await supabaseService
        .from("profiles")
        .update({ lat: studentLat, lng: studentLng })
        .eq("id", user.id);

      if (updateProfileError) {
        console.error(
          "Konnte Schüler-Koordinaten nicht speichern",
          updateProfileError
        );
      }
    }

    const adminSettings = await getAdminSettings();

    if (!adminSettings?.start_address) {
      throw new BookingError(
        "Die Startadresse ist noch nicht hinterlegt. Bitte Admin kontaktieren."
      );
    }

    let startLat = adminSettings.start_lat;
    let startLng = adminSettings.start_lng;

    if (startLat == null || startLng == null) {
      const geocoded = await geocodeAddress(adminSettings.start_address);
      if (!geocoded) {
        throw new BookingError(
          "Startadresse konnte nicht geocodiert werden. Bitte im Admin-Bereich prüfen."
        );
      }

      startLat = geocoded.lat;
      startLng = geocoded.lng;

      await upsertAdminSettings({
        start_address: adminSettings.start_address,
        start_lat: startLat,
        start_lng: startLng,
        default_duration_min: adminSettings.default_duration_min ?? 45,
        buffer_min: adminSettings.buffer_min ?? 5,
        cancel_window_hours: adminSettings.cancel_window_hours ?? 24,
      });
    }

    if (startLat == null || startLng == null) {
      throw new BookingError(
        "Koordinaten der Startadresse fehlen. Bitte im Admin-Bereich speichern."
      );
    }

    const distanceKm = await getDrivingDistanceKm(
      { lat: startLat, lng: startLng },
      { lat: studentLat!, lng: studentLng! }
    );

    if (distanceKm == null || Number.isNaN(distanceKm)) {
      throw new BookingError("Die Distanz konnte nicht berechnet werden.");
    }

    const distanceRounded = Math.max(0, Math.round(distanceKm * 100) / 100);

    const { data: rpcData, error: rpcError } = await supabaseService.rpc(
      "activate_package_with_travel",
      {
        p_student: user.id,
        p_package: packageUuid,
        p_distance_km: distanceRounded,
      }
    );

    if (rpcError) {
      throw new BookingError(
        rpcError.message ?? "Paket konnte nicht aktiviert werden."
      );
    }

    if (!rpcData) {
      console.warn("activate_package_with_travel returned no data");
    }

    revalidatePath("/app/student");
    revalidatePath("/app/student/lessons");
    revalidatePath("/app/admin/students");

    return { ok: true };
  } catch (error) {
    if (error instanceof BookingError) {
      return { ok: false, error: error.message };
    }
    console.error("buyPackage failed", error);
    return { ok: false, error: "Paketkauf fehlgeschlagen." };
  }
}
