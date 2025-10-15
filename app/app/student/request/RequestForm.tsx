"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { submitStudentRequest, RequestFormState } from "./actions";
import styles from "./request.module.css";

export function RequestForm() {
  const initialState: RequestFormState = { ok: false };
  const router = useRouter();
  const [state, formAction] = useFormState(
    submitStudentRequest,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      router.replace("/app/student/suggestions");
    }
  }, [state.ok, router]);

  const minDateTimeLocal = (() => {
    const now = new Date();
    now.setHours(now.getHours() + 6);
    now.setMinutes(now.getMinutes() - (now.getMinutes() % 5));
    return now.toISOString().slice(0, 16);
  })();

  return (
    <form className={styles.form} action={formAction}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="start">
          Startzeit
        </label>
        <input
          className={styles.input}
          type="datetime-local"
          id="start"
          name="start"
          required
          min={minDateTimeLocal}
        />
        <p className={styles.hint}>
          Dauer wird automatisch auf 45 Minuten gesetzt. Du kannst optional ein
          Ende definieren.
        </p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="end">
          Ende (optional)
        </label>
        <input
          className={styles.input}
          type="datetime-local"
          id="end"
          name="end"
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="message">
          Nachricht (optional)
        </label>
        <input
          className={styles.input}
          type="text"
          id="message"
          name="message"
          placeholder="z. B. Hausbesuch bei mir"
        />
      </div>

      {state.error ? <p className={styles.error}>{state.error}</p> : null}

      <button className={styles.submit} type="submit">
        Anfrage senden
      </button>
    </form>
  );
}
