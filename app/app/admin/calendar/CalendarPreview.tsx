"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./calendar.module.css";
import sharedStyles from "../admin-shared.module.css";
import { LessonAdminActions } from "./LessonAdminActions";

type LessonSummary = {
  id: string;
  studentId: string;
  studentLabel: string;
  startsAt: string;
  endsAt: string;
  status: string;
  statusLabel: string;
  statusBadgeClass: string;
};

type Props = {
  lessons: LessonSummary[];
};

const weekdayFormatter = new Intl.DateTimeFormat("de-CH", {
  weekday: "short",
});
const dayFormatter = new Intl.DateTimeFormat("de-CH", { day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("de-CH", { month: "long" });
const timeFormatter = new Intl.DateTimeFormat("de-CH", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatDateLine(date: Date) {
  const weekdayRaw = weekdayFormatter.format(date);
  const weekday = weekdayRaw.endsWith(".")
    ? weekdayRaw.slice(0, -1)
    : weekdayRaw;
  const numericDay = Number(dayFormatter.format(date));
  const month = monthFormatter.format(date);
  return `${weekday}. ${numericDay}. ${month}`;
}

function formatTimeLabel(date: Date) {
  return timeFormatter.format(date);
}

function formatTimeRange(start: Date, end: Date) {
  return `${formatTimeLabel(start)} – ${formatTimeLabel(end)}`;
}

const WEEKDAY_LABELS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export function CalendarPreview({ lessons }: Props) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [activeLesson, setActiveLesson] = useState<LessonSummary | null>(null);

  const monthDate = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setHours(0, 0, 0, 0);
    base.setMonth(base.getMonth() + monthOffset);
    return base;
  }, [monthOffset]);

  const monthLabel = monthDate.toLocaleDateString("de-CH", {
    month: "long",
    year: "numeric",
  });

  const lessonMap = useMemo(() => {
    const map = new Map<string, LessonSummary[]>();
    lessons.forEach((lesson) => {
      const key = formatLocalDate(new Date(lesson.startsAt));
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(lesson);
    });
    return map;
  }, [lessons]);

  const weeks = useMemo(
    () => buildMonthMatrix(monthDate),
    [monthDate]
  );

  const visibleLessons = lessons
    .map((lesson) => ({
      ...lesson,
      startsAtDate: new Date(lesson.startsAt),
    }))
    .sort((a, b) => a.startsAtDate.getTime() - b.startsAtDate.getTime())
    .slice(0, 6);

  useEffect(() => {
    if (!activeLesson) {
      return;
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveLesson(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [activeLesson]);

  const closeModal = () => setActiveLesson(null);

  const renderLessonSummary = (lesson: LessonSummary) => {
    const startsAt = new Date(lesson.startsAt);
    const endsAt = new Date(lesson.endsAt);
    const dateLabel = formatDateLine(startsAt);
    const timeLabel = formatTimeRange(startsAt, endsAt);

    return (
      <>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeading}>
            <span className={styles.modalTitle}>{lesson.studentLabel}</span>
            <span className={styles.modalSubtitle}>
              {dateLabel} · {timeLabel}
            </span>
          </div>
          <span
            className={`${sharedStyles.statusBadge} ${lesson.statusBadgeClass}`}
          >
            {lesson.statusLabel}
          </span>
        </div>

        <div className={sharedStyles.metaGrid}>
          <div className={sharedStyles.metaItem}>
            <span className={sharedStyles.metaLabel}>Lesson ID</span>
            <span className={sharedStyles.metaValue}>#{lesson.id.slice(0, 6)}</span>
          </div>
          <div className={sharedStyles.metaItem}>
            <span className={sharedStyles.metaLabel}>Schüler-ID</span>
            <span className={sharedStyles.metaValue}>#{lesson.studentId.slice(0, 6)}</span>
          </div>
          <div className={sharedStyles.metaItem}>
            <span className={sharedStyles.metaLabel}>Beginn</span>
            <span className={sharedStyles.metaValue}>
              {formatTimeLabel(startsAt)}
            </span>
          </div>
          <div className={sharedStyles.metaItem}>
            <span className={sharedStyles.metaLabel}>Ende</span>
            <span className={sharedStyles.metaValue}>
              {formatTimeLabel(endsAt)}
            </span>
          </div>
        </div>

        <LessonAdminActions
          lessonId={lesson.id}
          studentId={lesson.studentId}
          startsAt={lesson.startsAt}
          endsAt={lesson.endsAt}
          status={lesson.status}
        />
      </>
    );
  };

  return (
    <div className={styles.calendarCard}>
      <header className={styles.calendarHeader}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setMonthOffset((value) => value - 1)}
        >
          ←
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => setMonthOffset((value) => value + 1)}
        >
          →
        </button>
      </header>

      <div className={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.weekday}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.weekRow}>
            {week.map((day) => {
              const key = formatLocalDate(day);
              const dayLessons = lessonMap.get(key) ?? [];
              const isCurrentMonth = day.getMonth() === monthDate.getMonth();
              const isToday = isSameDay(day, new Date());
              const singleLesson = dayLessons.length === 1 ? dayLessons[0] : null;

              const cellClass = combineClasses(
                styles.dayCell,
                !isCurrentMonth && styles.dayOutside,
                isToday && styles.dayToday,
                dayLessons.length > 0 && styles.dayHasLesson,
                singleLesson && styles.dayClickable
              );

              return (
                <div
                  key={key}
                  className={cellClass}
                  onClick={() => {
                    if (singleLesson) {
                      setActiveLesson(singleLesson);
                    }
                  }}
                >
                  <span className={styles.dayNumber}>{day.getDate()}</span>
                  {dayLessons.length > 0 ? (
                    <div className={styles.lessonMarkers}>
                      {dayLessons.slice(0, 3).map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          className={styles.lessonMarker}
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveLesson(lesson);
                          }}
                        >
                          {new Date(lesson.startsAt).toLocaleTimeString("de-CH", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </button>
                      ))}
                      {dayLessons.length > 3 ? (
                        <span className={styles.lessonMore}>
                          +{dayLessons.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {visibleLessons.length > 0 ? (
        <div className={styles.lessonList}>
          {visibleLessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              className={styles.lessonEntry}
              onClick={() => setActiveLesson(lesson)}
            >
              <span className={styles.lessonEntryTime}>
                {formatDateLine(lesson.startsAtDate)} ·{" "}
                {formatTimeLabel(lesson.startsAtDate)}
              </span>
              <span className={styles.lessonEntryMeta}>
                Status: {lesson.statusLabel}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className={styles.lessonEmpty}>
          Für diesen Zeitraum sind keine Lektionen geplant.
        </p>
      )}

      {activeLesson ? (
        <div
          className={styles.modalOverlay}
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeModal}
              aria-label="Modal schließen"
            >
              ×
            </button>
            {renderLessonSummary(activeLesson)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function buildMonthMatrix(monthBase: Date) {
  const firstOfMonth = new Date(monthBase);
  firstOfMonth.setDate(1);
  const firstDayOffset = mod(firstOfMonth.getDay() - 1, 7); // Monday = 0
  const calendarStart = new Date(firstOfMonth);
  calendarStart.setDate(firstOfMonth.getDate() - firstDayOffset);

  const weeks: Date[][] = [];
  const cursor = new Date(calendarStart);

  for (let week = 0; week < 6; week += 1) {
    const row: Date[] = [];
    for (let day = 0; day < 7; day += 1) {
      row.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(row);

    const lastDayInRow = row[6];
    if (
      lastDayInRow.getMonth() === monthBase.getMonth() &&
      lastDayInRow.getDate() >= getDaysInMonth(monthBase)
    ) {
      break;
    }
  }

  return weeks;
}

function getDaysInMonth(date: Date) {
  const end = new Date(date);
  end.setMonth(end.getMonth() + 1, 0);
  return end.getDate();
}

function mod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatLocalDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const tzOffset = copy.getTimezoneOffset();
  const local = new Date(copy.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 10);
}

function combineClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
