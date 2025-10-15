import { createSupabaseServer } from "@/lib/supabaseServer";
import styles from "../admin-shared.module.css";
import { LessonAdminActions } from "./LessonAdminActions";

export default async function AdminCalendarPage() {
  const supabase = await createSupabaseServer();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, student_id, starts_at, ends_at, status")
    .eq("status", "booked")
    .order("starts_at", { ascending: true })
    .limit(10);

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kalender (Vorschau)</h2>
        {lessons && lessons.length > 0 ? (
          <div className={styles.list}>
            {lessons.map((lesson) => (
              <div key={lesson.id} className={styles.listItem}>
                <div className={styles.listMeta}>
                  <span className={styles.listTitle}>
                    {new Date(lesson.starts_at).toLocaleDateString("de-CH", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <span className={styles.listSubtitle}>
                    {new Date(lesson.starts_at).toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {new Date(lesson.ends_at).toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className={styles.listSubtitle}>
                    Status: {lesson.status}
                  </span>
                </div>
                <LessonAdminActions
                  lessonId={lesson.id}
                  studentId={lesson.student_id}
                  startsAt={lesson.starts_at}
                  endsAt={lesson.ends_at}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>
            Noch keine Lektionen geplant. Neue Lektionen erscheinen hier, sobald
            sie gebucht oder bestätigt sind. Drag&Drop wird in einem späteren
            Schritt ergänzt.
          </p>
        )}
      </section>
    </div>
  );
}
