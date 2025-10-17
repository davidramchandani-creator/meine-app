export const APPLICATION_TIMEZONE = "Europe/Zurich";

export const WEEKDAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayKey = (typeof WEEKDAY_ORDER)[number];

export type DailyAvailability = {
  start: string;
  end: string;
};

export type WeeklyAvailability = Partial<Record<WeekdayKey, DailyAvailability[]>>;

export const DEFAULT_DAILY_AVAILABILITY: DailyAvailability = {
  start: "07:00",
  end: "21:00",
};

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = WEEKDAY_ORDER.reduce(
  (acc, day) => {
    acc[day] = [DEFAULT_DAILY_AVAILABILITY];
    return acc;
  },
  {} as WeeklyAvailability
);

const timeStringRegex = /^\d{2}:\d{2}$/;

export function isValidTimeString(value: string): boolean {
  if (!timeStringRegex.test(value)) {
    return false;
  }
  const [hours, minutes] = value.split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return false;
  }
  return true;
}

export function timeStringToMinutes(value: string): number | null {
  if (!isValidTimeString(value)) {
    return null;
  }
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function sanitiseWeeklyAvailability(raw: unknown): WeeklyAvailability {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const availability: WeeklyAvailability = {};

  for (const day of WEEKDAY_ORDER) {
    const dayValue = (raw as Record<string, unknown>)[day];
    if (!Array.isArray(dayValue)) {
      continue;
    }

    const validIntervals: DailyAvailability[] = [];
    for (const entry of dayValue) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const { start, end } = entry as { start?: unknown; end?: unknown };
      if (typeof start !== "string" || typeof end !== "string") {
        continue;
      }

      if (!isValidTimeString(start) || !isValidTimeString(end)) {
        continue;
      }

      const startMinutes = timeStringToMinutes(start);
      const endMinutes = timeStringToMinutes(end);

      if (
        startMinutes == null ||
        endMinutes == null ||
        startMinutes >= endMinutes
      ) {
        continue;
      }

      validIntervals.push({ start, end });
    }

    if (validIntervals.length > 0) {
      validIntervals.sort((a, b) => {
        const aStart = timeStringToMinutes(a.start) ?? 0;
        const bStart = timeStringToMinutes(b.start) ?? 0;
        return aStart - bStart;
      });
      availability[day] = mergeOverlapping(validIntervals);
    }
  }

  return availability;
}

function mergeOverlapping(intervals: DailyAvailability[]): DailyAvailability[] {
  if (intervals.length <= 1) {
    return intervals;
  }

  const merged: DailyAvailability[] = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i += 1) {
    const next = intervals[i];
    const currentEnd = timeStringToMinutes(current.end) ?? 0;
    const nextStart = timeStringToMinutes(next.start) ?? 0;
    const nextEnd = timeStringToMinutes(next.end) ?? 0;

    if (nextStart <= currentEnd) {
      const extended =
        nextEnd > currentEnd ? minutesToTimeString(nextEnd) : current.end;
      current = { start: current.start, end: extended };
    } else {
      merged.push(current);
      current = next;
    }
  }

  merged.push(current);
  return merged;
}

export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const h = hours.toString().padStart(2, "0");
  const m = minutes.toString().padStart(2, "0");
  return `${h}:${m}`;
}

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: APPLICATION_TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: APPLICATION_TIMEZONE,
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: APPLICATION_TIMEZONE,
});

export function getWeekdayKeyFromDate(date: Date): WeekdayKey {
  const weekday = weekdayFormatter.format(date).toLowerCase();

  switch (weekday.slice(0, 2)) {
    case "mo":
      return "monday";
    case "tu":
      return "tuesday";
    case "we":
      return "wednesday";
    case "th":
      return "thursday";
    case "fr":
      return "friday";
    case "sa":
      return "saturday";
    default:
      return "sunday";
  }
}

export function getMinutesOfDay(date: Date): number {
  const parts = timeFormatter.formatToParts(date);
  const hourStr = parts.find((part) => part.type === "hour")?.value ?? "0";
  const minuteStr = parts.find((part) => part.type === "minute")?.value ?? "0";
  return Number.parseInt(hourStr, 10) * 60 + Number.parseInt(minuteStr, 10);
}

export function getLocalDateKey(date: Date): string {
  return dateFormatter.format(date);
}

export function isSlotWithinAvailability(
  start: Date,
  end: Date,
  availability: WeeklyAvailability
): boolean {
  const weekday = getWeekdayKeyFromDate(start);
  const dayAvailability = availability[weekday];

  if (!dayAvailability || dayAvailability.length === 0) {
    return false;
  }

  const startMinutes = getMinutesOfDay(start);
  const endMinutes = getMinutesOfDay(end);

  if (getLocalDateKey(start) !== getLocalDateKey(end)) {
    return false;
  }

  return dayAvailability.some((interval) => {
    const intervalStart = timeStringToMinutes(interval.start) ?? 0;
    const intervalEnd = timeStringToMinutes(interval.end) ?? 0;
    return startMinutes >= intervalStart && endMinutes <= intervalEnd;
  });
}

export const WEEKDAY_LABELS_DE: Record<WeekdayKey, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};
