'use server';

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { supabaseService } from "@/lib/supabaseService";

export async function removeStudentPackage(studentId: string) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Bitte erneut anmelden." };
  }

  const { data: packageRow, error } = await supabaseService
    .from("student_packages")
    .select("id, lessons_total, lessons_used, status")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: "Aktives Paket konnte nicht geladen werden.",
    };
  }

  if (!packageRow) {
    return { ok: false, error: "Der Schüler hat aktuell kein aktives Paket." };
  }

  const total = packageRow.lessons_total ?? packageRow.lessons_used ?? 0;

  const { error: updateError } = await supabaseService
    .from("student_packages")
    .update({
      status: "completed",
      lessons_used: total,
    })
    .eq("id", packageRow.id);

  if (updateError) {
    return {
      ok: false,
      error: "Paket konnte nicht entnommen werden.",
    };
  }

  revalidatePath("/app/admin/students");
  revalidatePath("/app/student");
  revalidatePath("/app/student/lessons");

  return { ok: true };
}
