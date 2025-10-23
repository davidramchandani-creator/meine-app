import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { RequestForm } from "./RequestForm";
import { getAdminSettings } from "@/lib/adminSettings";
import { DEFAULT_LESSON_BUFFER_MINUTES } from "@/lib/booking";

const LOOKAHEAD_DAYS = 21;

export default async function StudentRequestPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentPackage, error: packageError } = await supabase
    .from("v_student_current_package")
    .select("lessons_left")
    .eq("student_id", user.id)
    .maybeSingle();

  if (packageError) {
    console.error("Failed to load current package", packageError);
  }

  if (!currentPackage || (currentPackage.lessons_left ?? 0) <= 0) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-semibold text-slate-900">
          Keine Credits verfügbar
        </h1>
        <p className="mb-4 text-sm text-slate-600">
          Für neue Anfragen benötigst du ein aktives Paket mit freien Lektionen.
          Buche zuerst ein Paket im Schülerbereich.
        </p>
      </div>
    );
  }

  const adminSettings = await getAdminSettings();
  const bufferMinutes =
    adminSettings?.buffer_min ?? DEFAULT_LESSON_BUFFER_MINUTES;
  const bufferMs = bufferMinutes * 60 * 1000;

  const now = new Date();
  const earliestRelevant = new Date(now.getTime() - bufferMs);
  const latestRelevant = new Date(now);
  latestRelevant.setDate(latestRelevant.getDate() + LOOKAHEAD_DAYS);

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("starts_at, ends_at")
    .eq("student_id", user.id)
    .neq("status", "cancelled")
    .gte("ends_at", earliestRelevant.toISOString())
    .lte("starts_at", latestRelevant.toISOString())
    .order("starts_at", { ascending: true })
    .returns<{ starts_at: string | null; ends_at: string | null }[]>();

  if (lessonsError) {
    console.error("Failed to load upcoming lessons for slot filtering", lessonsError);
  }

  const existingLessons =
    lessons
      ?.filter(
        (lesson): lesson is { starts_at: string; ends_at: string } =>
          Boolean(lesson.starts_at && lesson.ends_at)
      )
      .map((lesson) => ({
        startsAt: lesson.starts_at,
        endsAt: lesson.ends_at,
      })) ?? [];

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Neue Anfrage
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        Wähle einen Termin, optional eine Nachricht, und sende die Anfrage an
        deine Lehrperson. Du erhältst eine Bestätigung oder einen
        Gegenvorschlag.
      </p>
      <RequestForm
        availability={adminSettings?.weekly_availability ?? null}
        bufferMinutes={bufferMinutes}
        existingLessons={existingLessons}
      />
    </div>
  );
}
