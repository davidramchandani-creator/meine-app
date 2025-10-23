"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  adminUpdateLessonTime,
  cancelLessonAsAdmin,
  adminSetLessonStatus,
  adminRegisterNoShow,
} from "./actions";
import styles from "../admin-shared.module.css";

type Props = {
  lessonId: string;
  studentId: string;
  startsAt: string;
  endsAt: string;
  status: string;
};

function toLocalValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function LessonAdminActions({
  lessonId,
  studentId,
  startsAt,
  endsAt,
  status,
}: Props) {
  const [openReschedule, setOpenReschedule] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [openNoShow, setOpenNoShow] = useState(false);
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

  const handleStatusChange = (nextStatus: "booked" | "completed") => {
    setError(null);
    setOpenNoShow(false);
    startTransition(async () => {
      try {
        await adminSetLessonStatus(lessonId, nextStatus);
      } catch (err: any) {
        setError(err?.message ?? "Lesson-Status konnte nicht aktualisiert werden.");
      }
    });
  };

  const handleNoShow = (refundCredit: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        await adminRegisterNoShow(lessonId, { refundCredit });
        setOpenNoShow(false);
      } catch (err: any) {
        setError(err?.message ?? "Nicht-Erscheinen konnte nicht erfasst werden.");
      }
    });
  };

  const isBooked = status === "booked";
  const isCompleted = status === "completed";
  const isNoShowCharged = status === "no_show_charged";
  const isNoShowRefunded = status === "no_show_refunded";

  return (
    <div className={styles.actionContainer}>
      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setOpenReschedule((prev) => !prev)}
          disabled={isPending}
        >
          Direkt verschieben
        </button>
        <Link
          className={styles.actionButton}
          href={`/app/admin/requests/new?student=${studentId}&lesson=${lessonId}&mode=reschedule`}
        >
          Vorschlag senden
        </Link>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => setOpenCancel((prev) => !prev)}
          disabled={isPending}
        >
          Stornieren
        </button>
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.actionButtonSecondary}
          onClick={() => handleStatusChange("completed")}
          disabled={isPending || isCompleted}
        >
          Als gehalten markieren
        </button>
        <button
          type="button"
          className={styles.actionButtonSecondary}
          onClick={() => handleStatusChange("booked")}
          disabled={isPending || isBooked}
        >
          Zurück auf geplant
        </button>
        <button
          type="button"
          className={styles.actionButtonSecondary}
          onClick={() => setOpenNoShow((prev) => !prev)}
          disabled={isPending}
        >
          Nicht erschienen
        </button>
      </div>

      {openReschedule && (
        <div className={styles.actionDrawer}>
          <label className={styles.actionDrawerLabel}>
            Neuer Start
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className={styles.actionInput}
            />
          </label>
          <label className={styles.actionDrawerLabel}>
            Neues Ende
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className={styles.actionInput}
            />
          </label>
          <div className={styles.actionRow}>
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
        <div className={styles.actionDrawer}>
          <label className={styles.actionDrawerLabel}>
            Grund (optional)
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={styles.actionInput}
              placeholder="z. B. Krankheitsfall"
            />
          </label>
          <div className={styles.actionRow}>
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

      {openNoShow && (
        <div className={styles.actionDrawer}>
          <span className={styles.actionDrawerLabel}>
            Wie soll der Credit behandelt werden?
          </span>
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.actionButtonSecondary}
              onClick={() => handleNoShow(false)}
              disabled={isPending || isNoShowCharged}
            >
              Credit behalten
            </button>
            <button
              type="button"
              className={styles.actionButtonSecondary}
              onClick={() => handleNoShow(true)}
              disabled={isPending || isNoShowRefunded}
            >
              Credit zurückgeben
            </button>
            <button
              type="button"
              className={styles.actionButtonSecondary}
              onClick={() => setOpenNoShow(false)}
              disabled={isPending}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {error ? <p className={styles.placeholder}>{error}</p> : null}
    </div>
  );
}
