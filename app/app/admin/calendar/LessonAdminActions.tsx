"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  adminUpdateLessonTime,
  cancelLessonAsAdmin,
} from "./actions";
import styles from "../admin-shared.module.css";

type Props = {
  lessonId: string;
  studentId: string;
  startsAt: string;
  endsAt: string;
};

function toLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function LessonAdminActions({ lessonId, studentId, startsAt, endsAt }: Props) {
  const [openReschedule, setOpenReschedule] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [start, setStart] = useState(toLocalValue(startsAt));
  const [end, setEnd] = useState(toLocalValue(endsAt));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReschedule = () => {
    setError(null);
    startTransition(async () => {
      try {
        await adminUpdateLessonTime(lessonId, start, end);
        setOpenReschedule(false);
      } catch (err: any) {
        setError(err?.message ?? "Lesson konnte nicht verschoben werden.");
      }
    });
  };

  const handleCancel = () => {
    setError(null);
    startTransition(async () => {
      try {
        await cancelLessonAsAdmin(lessonId, reason);
        setOpenCancel(false);
        setReason("");
      } catch (err: any) {
        setError(err?.message ?? "Lesson konnte nicht storniert werden.");
      }
    });
  };

  return (
    <div className={styles.actionsColumn}>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButtonSecondary}
          onClick={() => setOpenReschedule((prev) => !prev)}
          disabled={isPending}
        >
          Direkt verschieben
        </button>
        <Link
          className={styles.actionButtonSecondary}
          href={`/app/admin/requests/new?student=${studentId}&lesson=${lessonId}&mode=reschedule`}
        >
          Vorschlag senden
        </Link>
      </div>
      <button
        type="button"
        className={styles.actionButtonSecondary}
        onClick={() => setOpenCancel((prev) => !prev)}
        disabled={isPending}
      >
        Stornieren
      </button>

      {openReschedule && (
        <div className={styles.list}>
          <label className={styles.listSubtitle}>
            Neuer Start
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={styles.actionButtonSecondary}
            />
          </label>
          <label className={styles.listSubtitle}>
            Neues Ende
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={styles.actionButtonSecondary}
            />
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleReschedule}
              disabled={isPending}
            >
              Speichern
            </button>
            <button
              type="button"
              className={styles.actionButtonSecondary}
              onClick={() => setOpenReschedule(false)}
              disabled={isPending}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {openCancel && (
        <div className={styles.list}>
          <label className={styles.listSubtitle}>
            Grund (optional)
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={styles.actionButtonSecondary}
              placeholder="z. B. Krankheitsfall"
            />
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={handleCancel}
              disabled={isPending}
            >
              Stornieren
            </button>
            <button
              type="button"
              className={styles.actionButtonSecondary}
              onClick={() => setOpenCancel(false)}
              disabled={isPending}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {error ? <p className={styles.placeholder}>{error}</p> : null}
    </div>
  );
}
