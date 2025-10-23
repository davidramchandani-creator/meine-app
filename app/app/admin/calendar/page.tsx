import { createSupabaseServer } from "@/lib/supabaseServer";
import sharedStyles from "../admin-shared.module.css";
import { CalendarPreview } from "./CalendarPreview";

type LessonRow = {
  id: string;
  student_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function resolveStatus(status: string) {
  switch (status) {
    case "booked":
      return { label: "Geplant", badge: sharedStyles.statusBadgeBooked };
    case "completed":
      return { label: "Gehalten", badge: sharedStyles.statusBadgeAccepted };
    case "no_show_charged":
      return {
        label: "Nicht erschienen (berechnet)",
        badge: sharedStyles.statusBadgeWarning,
      };
    case "no_show_refunded":
      return {
        label: "Nicht erschienen (erstattet)",
        badge: sharedStyles.statusBadgeInfo,
      };
    case "cancelled":
      return { label: "Storniert", badge: sharedStyles.statusBadgeDeclined };
    default:
      return { label: status, badge: sharedStyles.statusBadgePending };
  }
}

function resolveStudentLabel(profile?: StudentProfile) {
  if (!profile) return "Unbekannter Schüler";
  return profile.full_name?.trim().length
    ? profile.full_name
    : profile.email ?? "Unbekannter Schüler";
}

export default async function AdminCalendarPage() {
  const supabase = await createSupabaseServer();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, student_id, starts_at, ends_at, status")
    .in("status", ["booked", "completed", "no_show_charged", "no_show_refunded"])
    .order("starts_at", { ascending: true })
    .limit(50)
    .returns<LessonRow[]>();

  const studentIds = Array.from(
    new Set((lessons ?? []).map((lesson) => lesson.student_id))
  );

  const { data: profiles } = studentIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds)
        .returns<StudentProfile[]>()
    : { data: [] as StudentProfile[] };

  const profileMap = new Map<string, StudentProfile>();
  profiles?.forEach((profile) => profileMap.set(profile.id, profile));

  const lessonSummaries = (lessons ?? []).map((lesson) => {
    const profile = profileMap.get(lesson.student_id);
    const statusInfo = resolveStatus(lesson.status);
    return {
      id: lesson.id,
      studentId: lesson.student_id,
      studentLabel: resolveStudentLabel(profile),
      startsAt: lesson.starts_at,
      endsAt: lesson.ends_at,
      status: lesson.status,
      statusLabel: statusInfo.label,
      statusBadgeClass: statusInfo.badge,
    };
  });

  return (
    <div className={sharedStyles.page}>
      <section className={sharedStyles.section}>
        <h2 className={sharedStyles.sectionTitle}>Kalender (Vorschau)</h2>
        <CalendarPreview
          lessons={lessonSummaries}
        />
        {lessonSummaries.length === 0 ? (
          <p className={sharedStyles.placeholder}>
            Noch keine Lektionen geplant. Neue Lektionen erscheinen hier, sobald
            sie gebucht oder bestätigt sind. Drag&Drop wird in einem späteren
            Schritt ergänzt.
          </p>
        ) : null}
      </section>
    </div>
  );
}
