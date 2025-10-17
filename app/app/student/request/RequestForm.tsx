"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitStudentRequest, RequestFormState } from "./actions";
import styles from "./request.module.css";
import {
  DEFAULT_WEEKLY_AVAILABILITY,
  WeeklyAvailability,
  getWeekdayKeyFromDate,
  timeStringToMinutes,
} from "@/lib/availability";

const LESSON_DURATION_MINUTES = 45;
const SLOT_INTERVAL_MINUTES = 15;
const LEAD_TIME_HOURS = 6;
const LOOKAHEAD_DAYS = 21;

type SlotOption = {
  value: string;
  label: string;
};

type SlotDay = {
  dateKey: string;
  label: string;
  slots: SlotOption[];
};

type Props = {
  availability: WeeklyAvailability | null;
  bufferMinutes: number;
  existingLessons: { startsAt: string; endsAt: string }[];
};

export function RequestForm({ availability, bufferMinutes, existingLessons }: Props) {
  const initialState: RequestFormState = { ok: false };
  const router = useRouter();
  const [state, formAction] = useActionState(
    submitStudentRequest,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      router.replace("/app/student/suggestions");
    }
  }, [state.ok, router]);

  const lessonRanges = useMemo(
    () =>
      existingLessons
        .map((lesson) => {
          const start = new Date(lesson.startsAt).getTime();
          const end = new Date(lesson.endsAt).getTime();
          if (Number.isNaN(start) || Number.isNaN(end)) {
            return null;
          }
          return { start, end };
        })
        .filter(
          (value): value is { start: number; end: number } => value !== null
        )
        .sort((a, b) => a.start - b.start),
    [existingLessons]
  );

  const slotDays = useMemo<SlotDay[]>(() => {
    const days: SlotDay[] = [];
    const now = new Date();
    const earliest = new Date(now.getTime() + LEAD_TIME_HOURS * 60 * 60 * 1000);
    earliest.setMinutes(
      earliest.getMinutes() +
        (SLOT_INTERVAL_MINUTES -
      (earliest.getMinutes() % SLOT_INTERVAL_MINUTES || SLOT_INTERVAL_MINUTES))
    );
    earliest.setSeconds(0, 0);
    earliest.setMilliseconds(0);

    const effectiveAvailability =
      availability ?? DEFAULT_WEEKLY_AVAILABILITY;

    for (let dayOffset = 0; dayOffset < LOOKAHEAD_DAYS; dayOffset += 1) {
      const dayStart = new Date(earliest);
      dayStart.setHours(0, 0, 0, 0);
      dayStart.setDate(dayStart.getDate() + dayOffset);

      const groupLabel = dayStart.toLocaleDateString("de-CH", {
        weekday: "short",
        day: "numeric",
        month: "long",
      });

      const dayOptions: SlotOption[] = [];

      const weekdayKey = getWeekdayKeyFromDate(dayStart);
      const intervals = effectiveAvailability[weekdayKey] ?? [];

      for (const interval of intervals) {
        const intervalStart = timeStringToMinutes(interval.start);
        const intervalEnd = timeStringToMinutes(interval.end);
        if (
          intervalStart == null ||
          intervalEnd == null ||
          intervalEnd - intervalStart < LESSON_DURATION_MINUTES
        ) {
          continue;
        }

        const lastPossibleStart = intervalEnd - LESSON_DURATION_MINUTES;
        for (
          let cursor = intervalStart;
          cursor <= lastPossibleStart;
          cursor += SLOT_INTERVAL_MINUTES
        ) {
          const slot = new Date(dayStart);
          slot.setHours(Math.floor(cursor / 60), cursor % 60, 0, 0);
          if (slot < earliest) {
            continue;
          }

          const slotStartMs = slot.getTime();
          const slotEndMs =
            slotStartMs + LESSON_DURATION_MINUTES * 60 * 1000;
          const bufferMs = bufferMinutes * 60 * 1000;
          const hasConflict = lessonRanges.some((lesson) => {
            const blockedStart = lesson.start - bufferMs;
            const blockedEnd = lesson.end + bufferMs;
            return slotStartMs < blockedEnd && slotEndMs > blockedStart;
          });

          if (hasConflict) {
            continue;
          }

          dayOptions.push({
            value: formatLocalDateTime(slot),
            label: slot.toLocaleTimeString("de-CH", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        }
      }

      if (dayOptions.length) {
        days.push({
          dateKey: formatLocalDate(dayStart),
          label: groupLabel,
          slots: dayOptions,
        });
      }
    }

    return days;
  }, [availability, lessonRanges, bufferMinutes]);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startValue, setStartValue] = useState<string>("");

  useEffect(() => {
    if (slotDays.length === 0) {
      setSelectedDate("");
      return;
    }

    setSelectedDate((prev) => {
      if (prev && slotDays.some((day) => day.dateKey === prev)) {
        return prev;
      }
      return slotDays[0].dateKey;
    });
  }, [slotDays]);

  useEffect(() => {
    if (!selectedDate) {
      setStartValue("");
      return;
    }

    const day = slotDays.find((entry) => entry.dateKey === selectedDate);
    const options = day?.slots ?? [];
    if (!options.length) {
      setStartValue("");
      return;
    }

    setStartValue((prev) => {
      if (options.some((option) => option.value === prev)) {
        return prev;
      }
      return options[0].value;
    });
  }, [selectedDate, slotDays]);

  const timeOptions = useMemo<SlotOption[]>(() => {
    if (!selectedDate) {
      return [];
    }
    const day = slotDays.find((entry) => entry.dateKey === selectedDate);
    return day?.slots ?? [];
  }, [selectedDate, slotDays]);

  return (
    <form className={styles.form} action={formAction}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="date">
          Datum
        </label>
        <select
          className={styles.select}
          id="date"
          name="date"
          required
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
          disabled={slotDays.length === 0}
        >
          {slotDays.length === 0 ? (
            <option value="">Keine verfügbaren Tage</option>
          ) : null}
          {slotDays.map((day) => (
            <option key={day.dateKey} value={day.dateKey}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="start">
          Startzeit
        </label>
        <select
          className={styles.select}
          id="start"
          name="start"
          required
          value={startValue}
          onChange={(event) => setStartValue(event.target.value)}
          disabled={!timeOptions.length}
        >
          {timeOptions.length === 0 ? (
            <option value="">Keine verfügbaren Zeiten</option>
          ) : null}
          {timeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className={styles.hint}>
          Dauer wird automatisch auf 45 Minuten gesetzt. Startzeiten folgen dem 15-Minuten-Raster innerhalb deiner verfügbaren Tage und Zeiten; das System erzwingt zusätzlich {bufferMinutes} Minuten Puffer zwischen Terminen.
        </p>
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

      <button
        className={styles.submit}
        type="submit"
        disabled={!startValue || !timeOptions.length}
      >
        Anfrage senden
      </button>
    </form>
  );
}

function formatLocalDateTime(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function formatLocalDate(date: Date) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}
