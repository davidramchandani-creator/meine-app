import { createSupabaseServer } from "@/lib/supabaseServer";
import { acceptSuggestion, declineSuggestion } from "./actions";
import CounterForm from "./CounterForm";
import styles from "./suggestions.module.css";

export default async function SuggestionsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const userId = user.id;

  const { data: suggestions, error } = await supabase
    .from("booking_requests")
    .select("id, proposed_starts_at, proposed_ends_at, message, kind, lesson_id")
    .eq("student_id", userId)
    .eq("direction", "admin_to_student")
    .eq("status", "pending")
    .order("proposed_starts_at", { ascending: true });

  if (error) {
    return (
      <div className={styles.error}>Fehler: {error.message}</div>
    );
  }

  async function Accept(formData: FormData) {
    "use server";
    await acceptSuggestion(String(formData.get("id")), userId);
  }

  async function Decline(formData: FormData) {
    "use server";
    await declineSuggestion(String(formData.get("id")), userId);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Vorgeschlagene Termine</h1>
      {!suggestions?.length ? (
        <p className={styles.empty}>Keine Vorschläge.</p>
      ) : (
        <div className={styles.list}>
          {suggestions.map((suggestion) => {
            const start = new Date(suggestion.proposed_starts_at);
            const end = new Date(suggestion.proposed_ends_at);
            const isReschedule = suggestion.kind === "reschedule";

            return (
              <div key={suggestion.id} className={styles.card}>
                <div className={styles.details}>
                  <div className={styles.date}>
                    {start.toLocaleDateString("de-CH", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </div>
                  <div className={styles.time}>
                    {start.toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    –{" "}
                    {end.toLocaleTimeString("de-CH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  {isReschedule ? (
                    <div className={styles.time}>
                      Vorschlag zur Verschiebung deiner bestehenden Lesson.
                    </div>
                  ) : null}
                  {suggestion.message ? (
                    <div className={styles.message}>
                      {suggestion.message}
                    </div>
                  ) : null}
                </div>

                <div className={styles.actions}>
                  <div className={styles.buttonRow}>
                    <form action={Accept}>
                      <input
                        type="hidden"
                        name="id"
                        value={suggestion.id}
                      />
                      <button
                        className={`${styles.actionButton} ${styles.accept}`}
                        type="submit"
                      >
                        Annehmen
                      </button>
                    </form>
                    <form action={Decline}>
                      <input
                        type="hidden"
                        name="id"
                        value={suggestion.id}
                      />
                      <button
                        className={`${styles.actionButton} ${styles.decline}`}
                        type="submit"
                      >
                        Ablehnen
                      </button>
                    </form>
                  </div>
                  <CounterForm
                    requestId={suggestion.id}
                    studentId={userId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
