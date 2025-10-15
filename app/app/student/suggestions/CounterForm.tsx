"use client";

import { useState } from "react";
import { counterSuggest } from "./actions";
import styles from "./counter-form.module.css";

export default function CounterForm({
  requestId,
  studentId,
}: {
  requestId: string;
  studentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    if (!start || !end) {
      return;
    }

    await counterSuggest(
      requestId,
      studentId,
      new Date(start).toISOString(),
      new Date(end).toISOString(),
      message
    );

    window.location.reload();
  }

  if (!open) {
    return (
      <button
        className={styles.trigger}
        onClick={() => setOpen(true)}
        type="button"
      >
        Gegenvorschlag machen
      </button>
    );
  }

  return (
    <div className={styles.form}>
      <input
        type="datetime-local"
        value={start}
        onChange={(event) => setStart(event.target.value)}
        className={styles.input}
      />
      <input
        type="datetime-local"
        value={end}
        onChange={(event) => setEnd(event.target.value)}
        className={styles.input}
      />
      <input
        type="text"
        placeholder="Nachricht (optional)"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className={styles.input}
      />
      <div className={styles.actions}>
        <button
          onClick={submit}
          className={styles.submit}
          type="button"
        >
          Senden
        </button>
        <button
          onClick={() => setOpen(false)}
          className={styles.cancel}
          type="button"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
