import { supabaseService } from "./supabaseService";
import { getAdminSettings } from "./adminSettings";

type BookingDirection = "student_to_admin" | "admin_to_student";
type BookingStatus = "pending" | "accepted" | "declined" | "expired";
type BookingKind = "booking" | "reschedule";

export const DEFAULT_LESSON_DURATION_MINUTES = 45;
export const DEFAULT_LESSON_BUFFER_MINUTES = 30;
export const MIN_LEAD_TIME_HOURS = 6;

type BookingRequestRow = {
  id: string;
  student_id: string;
  lesson_id: string | null;
  direction: BookingDirection;
  status: BookingStatus;
  kind: BookingKind;
  proposed_starts_at: string;
  proposed_ends_at: string;
  message: string | null;
  counter_of: string | null;
};

type StudentPackageRow = {
  id: string;
  student_id: string;
  lessons_total: number | null;
  lessons_used: number | null;
  status: string;
};

type LessonRow = {
  id: string;
  student_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  student_package_id: string | null;
};

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

export async function fetchPendingRequest(options: {
  requestId: string;
  expectedDirection: BookingDirection;
  studentId?: string;
}): Promise<BookingRequestRow> {
  const { requestId, expectedDirection, studentId } = options;

  const query = supabaseService
    .from("booking_requests")
    .select(
      "id, student_id, lesson_id, direction, status, kind, proposed_starts_at, proposed_ends_at, message, counter_of"
    )
    .eq("id", requestId)
    .eq("status", "pending" satisfies BookingStatus)
    .eq("direction", expectedDirection)
    .single<BookingRequestRow>();

  const { data, error } = await query;

  if (error || !data) {
    throw new BookingError("Vorschlag oder Anfrage wurde nicht gefunden.");
  }

  if (studentId && data.student_id !== studentId) {
    throw new BookingError("Keine Berechtigung für diesen Vorschlag.");
  }

  return data;
}

export async function ensureNoStudentCollision(options: {
  studentId: string;
  startsAtIso: string;
  endsAtIso: string;
  ignoreLessonId?: string;
  bufferMinutes?: number | null;
}) {
  const { studentId, startsAtIso, endsAtIso, ignoreLessonId } = options;

  let effectiveBuffer = options.bufferMinutes;
  if (effectiveBuffer == null) {
    const settings = await getAdminSettings();
    if (settings?.buffer_min != null) {
      effectiveBuffer = settings.buffer_min;
    } else {
      effectiveBuffer = DEFAULT_LESSON_BUFFER_MINUTES;
    }
  }

  const bufferMs = Math.max(0, effectiveBuffer) * 60 * 1000;
  const startDate = new Date(startsAtIso);
  const endDate = new Date(endsAtIso);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new BookingError("Ungültiger Zeitraum.");
  }

  const windowStartIso = bufferMs
    ? new Date(startDate.getTime() - bufferMs).toISOString()
    : startDate.toISOString();
  const windowEndIso = bufferMs
    ? new Date(endDate.getTime() + bufferMs).toISOString()
    : endDate.toISOString();

  const query = supabaseService
    .from("lessons")
    .select("id, starts_at, ends_at")
    .eq("student_id", studentId)
    .neq("status", "cancelled")
    .lte("starts_at", windowEndIso)
    .gte("ends_at", windowStartIso)
    .order("starts_at", { ascending: true })
    .limit(1);

  if (ignoreLessonId) {
    query.neq("id", ignoreLessonId);
  }

  const { data: clash, error } =
    await query.maybeSingle<Pick<LessonRow, "id" | "starts_at" | "ends_at">>();

  if (error) {
    throw new BookingError("Fehler beim Prüfen auf Terminkonflikte.");
  }

  if (clash) {
    const start = new Date(clash.starts_at);
    const end = new Date(clash.ends_at);
    const formatted = `${start.toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "2-digit",
    })} ${start.toLocaleTimeString("de-CH", {
      hour: "2-digit",
      minute: "2-digit",
    })}–${end.toLocaleTimeString("de-CH", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    const bufferSuffix =
      (effectiveBuffer ?? 0) > 0 ? ` (inkl. ${effectiveBuffer} Min Puffer)` : "";
    throw new BookingError(`Zeitfenster kollidiert${bufferSuffix} mit ${formatted}.`);
  }
}

export async function fetchActivePackage(
  studentId: string
): Promise<StudentPackageRow | null> {
  const { data, error } = await supabaseService
    .from("student_packages")
    .select("id, student_id, lessons_total, lessons_used, status")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<StudentPackageRow>();

  if (error) {
    throw new BookingError("Aktives Paket konnte nicht geladen werden.");
  }

  return data ?? null;
}

export async function createLessonWithOptionalPackage(options: {
  studentId: string;
  startsAtIso: string;
  endsAtIso: string;
  studentPackage: StudentPackageRow | null;
}): Promise<LessonRow> {
  const { studentId, startsAtIso, endsAtIso, studentPackage } = options;

  const { data: lesson, error: insertError } = await supabaseService
    .from("lessons")
    .insert({
      student_id: studentId,
      student_package_id: studentPackage ? studentPackage.id : null,
      starts_at: startsAtIso,
      ends_at: endsAtIso,
      status: "booked",
    })
    .select("id, starts_at, ends_at")
    .single<LessonRow>();

  if (insertError || !lesson) {
    throw new BookingError(
      insertError?.message ?? "Lesson konnte nicht angelegt werden."
    );
  }

  if (studentPackage) {
    const used = (studentPackage.lessons_used ?? 0) + 1;
    const total = studentPackage.lessons_total ?? 0;
    const newStatus = used >= total ? "completed" : "active";

    const { error: packageError } = await supabaseService
      .from("student_packages")
      .update({
        lessons_used: used,
        status: newStatus,
      })
      .eq("id", studentPackage.id);

    if (packageError) {
      throw new BookingError(
        packageError.message ?? "Credits konnten nicht aktualisiert werden."
      );
    }
  }

  return lesson;
}

export async function markRequestStatus(options: {
  requestId: string;
  status: BookingStatus;
}) {
  const { requestId, status } = options;
  const { error } = await supabaseService
    .from("booking_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    throw new BookingError("Vorschlag konnte nicht aktualisiert werden.");
  }
}

export async function acceptRequest(options: {
  requestId: string;
  expectedDirection: BookingDirection;
  studentId?: string;
}): Promise<{ lessonId: string }> {
  const request = await fetchPendingRequest(options);

  if (request.kind === "booking") {
    await ensureNoStudentCollision({
      studentId: request.student_id,
      startsAtIso: request.proposed_starts_at,
      endsAtIso: request.proposed_ends_at,
    });

    const studentPackage = await fetchActivePackage(request.student_id);

    const lesson = await createLessonWithOptionalPackage({
      studentId: request.student_id,
      startsAtIso: request.proposed_starts_at,
      endsAtIso: request.proposed_ends_at,
      studentPackage,
    });

    await markRequestStatus({ requestId: request.id, status: "accepted" });

    return { lessonId: lesson.id };
  }

  if (request.kind === "reschedule") {
    if (!request.lesson_id) {
      throw new BookingError("Vorschlag ohne zugehörige Lesson.");
    }

    const { data: lesson, error } = await supabaseService
      .from("lessons")
      .select("id, student_id, status")
      .eq("id", request.lesson_id)
      .single<Pick<LessonRow, "id" | "student_id" | "status">>();

    if (error || !lesson) {
      throw new BookingError("Lesson wurde nicht gefunden.");
    }

    if (lesson.student_id !== request.student_id) {
      throw new BookingError("Lesson gehört nicht zu diesem Schüler.");
    }

    await ensureNoStudentCollision({
      studentId: request.student_id,
      startsAtIso: request.proposed_starts_at,
      endsAtIso: request.proposed_ends_at,
      ignoreLessonId: lesson.id,
    });

    const { error: updateError } = await supabaseService
      .from("lessons")
      .update({
        starts_at: request.proposed_starts_at,
        ends_at: request.proposed_ends_at,
      })
      .eq("id", lesson.id);

    if (updateError) {
      throw new BookingError("Lesson konnte nicht aktualisiert werden.");
    }

    await markRequestStatus({ requestId: request.id, status: "accepted" });

    return { lessonId: lesson.id };
  }

  throw new BookingError("Unbekannter Request-Typ.");
}

export async function refundStudentPackageCredit(studentPackageId: string) {
  const { data: pkg, error } = await supabaseService
    .from("student_packages")
    .select("id, lessons_total, lessons_used, status")
    .eq("id", studentPackageId)
    .single<StudentPackageRow>();

  if (error || !pkg) {
    throw new BookingError(
      "Konnte Paket für die Stornierung nicht aktualisieren."
    );
  }

  const total = pkg.lessons_total ?? 0;
  const currentUsed = pkg.lessons_used ?? 0;
  const used = Math.max(currentUsed - 1, 0);
  const newStatus = used >= total ? pkg.status : "active";

  const { error: updateError } = await supabaseService
    .from("student_packages")
    .update({
      lessons_used: used,
      status: newStatus,
    })
    .eq("id", pkg.id);

  if (updateError) {
    throw new BookingError(
      "Fehler beim Zurückbuchen des Credits nach Stornierung."
    );
  }
}

export async function chargeStudentPackageCredit(studentPackageId: string) {
  const { data: pkg, error } = await supabaseService
    .from("student_packages")
    .select("id, lessons_total, lessons_used, status")
    .eq("id", studentPackageId)
    .single<StudentPackageRow>();

  if (error || !pkg) {
    throw new BookingError(
      "Paket konnte für die erneute Verrechnung nicht geladen werden."
    );
  }

  const total = pkg.lessons_total ?? 0;
  const currentUsed = pkg.lessons_used ?? 0;

  if (total > 0 && currentUsed >= total) {
    // Bereits alle Credits genutzt – keine weitere Belastung möglich.
    throw new BookingError(
      "Keine verfügbaren Credits mehr im Paket. Bitte neues Paket aktivieren."
    );
  }

  const used = currentUsed + 1;
  const newStatus =
    total > 0 && used >= total ? "completed" : "active";

  const { error: updateError } = await supabaseService
    .from("student_packages")
    .update({
      lessons_used: used,
      status: newStatus,
    })
    .eq("id", pkg.id);

  if (updateError) {
    throw new BookingError(
      "Credit konnte nicht erneut belastet werden."
    );
  }
}

export async function declineRequest(options: {
  requestId: string;
  expectedDirection: BookingDirection;
  studentId?: string;
}) {
  await fetchPendingRequest(options);
  await markRequestStatus({ requestId: options.requestId, status: "declined" });
}

export function validateLeadTime(start: Date) {
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  if (diffMs < MIN_LEAD_TIME_HOURS * 60 * 60 * 1000) {
    throw new BookingError(
      `Der Termin muss mindestens ${MIN_LEAD_TIME_HOURS} Stunden im Voraus angefragt werden.`
    );
  }
}

export function computeEndFromStart(start: Date) {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + DEFAULT_LESSON_DURATION_MINUTES);
  return end;
}

export function normaliseBookingWindow(
  startInput: string,
  endInput?: string | null,
  options: { enforceLead?: boolean } = {}
) {
  const start = new Date(startInput);
  if (Number.isNaN(start.getTime())) {
    throw new BookingError("Ungültiger Startzeitpunkt.");
  }

  const end =
    endInput && endInput !== ""
      ? new Date(endInput)
      : computeEndFromStart(start);

  if (Number.isNaN(end.getTime())) {
    throw new BookingError("Ungültiger Endzeitpunkt.");
  }

  if (start >= end) {
    throw new BookingError("Ende muss nach dem Start liegen.");
  }

  const enforceLead = options.enforceLead ?? true;
  if (enforceLead) {
    validateLeadTime(start);
  }

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}
