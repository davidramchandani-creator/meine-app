import { createSupabaseServer } from "@/lib/supabaseServer";
import styles from "./lessons.module.css";
import { LessonActions } from "./LessonActions";

type LessonRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
};

type PendingRescheduleRow = {
  id: string;
  lesson_id: string | null;
  proposed_starts_at: string;
  proposed_ends_at: string;
  message: string | null;
};

type LessonStyles = typeof styles;

function resolveLessonStatus(status: string, moduleStyles: LessonStyles) {
  switch (status) {
    case "booked":
      return {
        label: "Geplant",
        className: `${moduleStyles.status} ${moduleStyles.statusBooked}`,
      };
    case "completed":
      return {
        label: "Gehalten",
        className: `${moduleStyles.status} ${moduleStyles.statusCompleted}`,
      };
    case "cancelled":
      return {
        label: "Storniert",
        className: `${moduleStyles.status} ${moduleStyles.statusCancelled}`,
      };
    case "no_show_charged":
      return {
        label: "Nicht erschienen (berechnet)",
        className: `${moduleStyles.status} ${moduleStyles.statusNoShowCharged}`,
      };
    case "no_show_refunded":
      return {
        label: "Nicht erschienen (erstattet)",
        className: `${moduleStyles.status} ${moduleStyles.statusNoShowRefunded}`,
      };
    default:
      return {
        label: status,
        className: `${moduleStyles.status} ${moduleStyles.statusDefault}`,
      };
  }
}

export default async function StudentLessonsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const nowIso = new Date().toISOString();

  const [
    { data: lessons },
    { data: pendingReschedules },
    { data: noShowLessons },
  ] = await Promise.all([
    supabase
      .from("lessons")
      .select(
        "id, starts_at, ends_at, status, cancellation_reason, cancelled_at, cancelled_by"
      )
      .eq("student_id", user.id)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .returns<LessonRow[]>(),
    supabase
      .from("booking_requests")
      .select(
        "id, lesson_id, proposed_starts_at, proposed_ends_at, message"
      )
      .eq("student_id", user.id)
      .eq("kind", "reschedule")
      .eq("status", "pending")
      .returns<PendingRescheduleRow[]>(),
    supabase
      .from("lessons")
      .select(
        "id, starts_at, ends_at, status, cancellation_reason, cancelled_at, cancelled_by"
      )
      .eq("student_id", user.id)
      .in("status", ["no_show_charged", "no_show_refunded"])
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(10)
      .returns<LessonRow[]>(),
  ]);

  const pendingByLesson = new Map<string, PendingRescheduleRow>();
  pendingReschedules?.forEach((request) => {
    if (request.lesson_id) {
      pendingByLesson.set(request.lesson_id, request);
    }
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Kommende Lektionen</h1>
      <div className={styles.list}>
        {lessons && lessons.length > 0 ? (
          lessons.map((lesson) => {
            const start = new Date(lesson.starts_at);
            const end = new Date(lesson.ends_at);
            const diffHours =
              (start.getTime() - Date.now()) / (1000 * 60 * 60);
            const canCancel =
              lesson.status === "booked" && diffHours >= 24;
            const pending = pendingByLesson.get(lesson.id) ?? null;
            const statusInfo = resolveLessonStatus(lesson.status, styles);

            return (
              <div key={lesson.id} className={styles.item}>
                <div className={styles.lessonInfo}>
                  <div className={styles.lessonDate}>
                    {start.toLocaleDateString("de-CH", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </div>
                  <div className={styles.lessonTime}>
                    {start.toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {end.toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <span className={statusInfo.className}>{statusInfo.label}</span>
                  {lesson.status === "cancelled" && lesson.cancellation_reason ? (
                    <div className={styles.lessonTime}>
                      Grund: {lesson.cancellation_reason}
                    </div>
                  ) : null}
                </div>

                {lesson.status === "booked" ? (
                  <LessonActions
                    lessonId={lesson.id}
                    startsAt={lesson.starts_at}
                    endsAt={lesson.ends_at}
                    canCancel={canCancel}
                    pendingReschedule={
                      pending
                        ? {
                            id: pending.id,
                            proposed_starts_at: pending.proposed_starts_at,
                            proposed_ends_at: pending.proposed_ends_at,
                            message: pending.message,
                          }
                        : null
                    }
                  />
                ) : null}
              </div>
            );
          })
        ) : (
          <p className={styles.empty}>
            Keine Lektionen geplant – buche deine nächste Stunde über den Button.
          </p>
        )}
      </div>

      {noShowLessons && noShowLessons.length > 0 ? (
        <section className={styles.historySection}>
          <h2 className={styles.subheading}>Vergangene Abwesenheiten</h2>
          <div className={styles.list}>
            {noShowLessons.map((lesson) => {
              const start = new Date(lesson.starts_at);
              const end = new Date(lesson.ends_at);
              const statusInfo = resolveLessonStatus(lesson.status, styles);
              const creditInfo =
                lesson.status === "no_show_refunded"
                  ? "Credit wurde zurückgegeben."
                  : "Credit bleibt belastet.";

              return (
                <div key={lesson.id} className={styles.item}>
                  <div className={styles.lessonInfo}>
                    <div className={styles.lessonDate}>
                      {start.toLocaleDateString("de-CH", {
                        weekday: "short",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </div>
                    <div className={styles.lessonTime}>
                      {start.toLocaleTimeString("de-CH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" – "}
                      {end.toLocaleTimeString("de-CH", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <span className={statusInfo.className}>{statusInfo.label}</span>
                    <div className={styles.historyNote}>{creditInfo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
