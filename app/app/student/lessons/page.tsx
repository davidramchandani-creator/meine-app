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

export default async function StudentLessonsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const nowIso = new Date().toISOString();

  const [{ data: lessons }, { data: pendingReschedules }] = await Promise.all([
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

            const statusClass =
              lesson.status === "booked"
                ? `${styles.status} ${styles.statusBooked}`
                : `${styles.status} ${styles.statusDefault}`;

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
                  <span className={statusClass}>{lesson.status}</span>
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
    </div>
  );
}
