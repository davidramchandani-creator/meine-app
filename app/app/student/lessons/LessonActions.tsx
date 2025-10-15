"use client";

import { useState, useTransition } from "react";
import {
  cancelLessonAsStudent,
  requestLessonReschedule,
} from "./actions";
import styles from "./lessons.module.css";

type PendingReschedule = {
  id: string;
  proposed_starts_at: string;
  proposed_ends_at: string;
  message: string | null;
};

type LessonActionsProps = {
  lessonId: string;
  startsAt: string;
  endsAt: string;
  canCancel: boolean;
  pendingReschedule: PendingReschedule | null;
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function LessonActions({
  lessonId,
  startsAt,
  endsAt,
  canCancel,
  pendingReschedule,
}: LessonActionsProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState(
    toLocalInputValue(startsAt)
  );
  const [rescheduleEnd, setRescheduleEnd] = useState(toLocalInputValue(endsAt));
  const [rescheduleNote, setRescheduleNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      const result = await cancelLessonAsStudent(lessonId, reason);
      if (!result.ok) {
        setError(result.error ?? "Stornierung fehlgeschlagen.");
      } else {
        setCancelOpen(false);
        setReason("");
      }
    });
  };

  const handleReschedule = () => {
    setError(null);
    startTransition(async () => {
      const result = await requestLessonReschedule(
        lessonId,
        rescheduleStart,
        rescheduleEnd,
        rescheduleNote
      );
      if (!result.ok) {
        setError(result.error ?? "Anfrage konnte nicht gesendet werden.");
      } else {
        setRescheduleOpen(false);
        setRescheduleNote("");
      }
    });
  };

  return (
    <div className={styles.actionsWrapper}>
      {pendingReschedule ? (
        <div className={styles.pendingInfo}>
          <strong>Verschiebung angefragt:</strong>{" "}
          {new Date(pendingReschedule.proposed_starts_at).toLocaleString(
            "de-CH",
            { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }
          )}
          {" – "}
          {new Date(pendingReschedule.proposed_ends_at).toLocaleTimeString(
            "de-CH",
            { hour: "2-digit", minute: "2-digit" }
          )}
          {pendingReschedule.message ? ` · ${pendingReschedule.message}` : ""}
        </div>
      ) : (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setRescheduleOpen((prev) => !prev)}
          disabled={isPending}
        >
          Verschieben anfragen
        </button>
      )}

      <button
        type="button"
        className={styles.actionButtonSecondary}
        onClick={() => setCancelOpen((prev) => !prev)}
        disabled={!canCancel || isPending}
        title={
          canCancel ? undefined : "Stornierungen nur bis 24 Stunden vor Beginn."
        }
      >
        Stornieren
      </button>

      {rescheduleOpen && (
        <div className={styles.inlineForm}>
          <label className={styles.inlineLabel}>
            Neuer Start
            <input
              type="datetime-local"
              value={rescheduleStart}
              onChange={(event) => setRescheduleStart(event.target.value)}
              className={styles.inlineInput}
            />
          </label>
          <label className={styles.inlineLabel}>
            Neues Ende (optional)
            <input
              type="datetime-local"
              value={rescheduleEnd}
              onChange={(event) => setRescheduleEnd(event.target.value)}
              className={styles.inlineInput}
            />
          </label>
          <label className={styles.inlineLabel}>
            Nachricht (optional)
            <input
              type="text"
              value={rescheduleNote}
              onChange={(event) => setRescheduleNote(event.target.value)}
              className={styles.inlineInput}
              placeholder="z. B. Bitte eine Stunde später"
            />
          </label>
          <div className={styles.inlineActions}>
            <button
              type="button"
              onClick={handleReschedule}
              className={styles.inlinePrimary}
              disabled={isPending}
            >
              Anfrage senden
            </button>
            <button
              type="button"
              onClick={() => setRescheduleOpen(false)}
              className={styles.inlineSecondary}
              disabled={isPending}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {cancelOpen && (
        <div className={styles.inlineForm}>
          <label className={styles.inlineLabel}>
            Stornierungsgrund
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={styles.inlineTextarea}
              placeholder="Warum möchtest du den Termin absagen?"
              rows={3}
            />
          </label>
          <div className={styles.inlineActions}>
            <button
              type="button"
              onClick={handleCancel}
              className={styles.inlinePrimary}
              disabled={isPending || !reason.trim()}
            >
              Stornieren
            </button>
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className={styles.inlineSecondary}
              disabled={isPending}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
