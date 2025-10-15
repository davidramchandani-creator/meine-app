import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { createAdminSuggestion } from "../actions";
import styles from "../request-form.module.css";

type PageProps = {
  searchParams: {
    student?: string;
    counter?: string;
    mode?: string;
    lesson?: string;
  };
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60000);
  return local.toISOString().slice(0, 16);
}

export default async function NewAdminSuggestionPage({
  searchParams,
}: PageProps) {
  const supabase = await createSupabaseServer();
  const { data: students } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("role", "student")
    .order("email", { ascending: true });

  let defaultStudentId = searchParams.student ?? "";
  let defaultStart = "";
  let defaultEnd = "";
  let selectedKind: "booking" | "reschedule" =
    searchParams.mode === "reschedule" ? "reschedule" : "booking";
  let selectedLessonId = searchParams.lesson ?? "";

  if (searchParams.counter) {
    const { data: counterRequest } = await supabase
      .from("booking_requests")
      .select("student_id, proposed_starts_at, proposed_ends_at, kind, lesson_id")
      .eq("id", searchParams.counter)
      .eq("direction", "student_to_admin")
      .single();

    if (counterRequest) {
      defaultStudentId = counterRequest.student_id;
      defaultStart = toLocalInputValue(counterRequest.proposed_starts_at);
      defaultEnd = toLocalInputValue(counterRequest.proposed_ends_at);
      selectedKind = counterRequest.kind ?? "booking";
      if (counterRequest.lesson_id) {
        selectedLessonId = counterRequest.lesson_id;
      }
    }
  } else if (searchParams.lesson) {
    const { data: targetLesson } = await supabase
      .from("lessons")
      .select("id, student_id, starts_at, ends_at")
      .eq("id", searchParams.lesson)
      .single();

    if (targetLesson) {
      defaultStudentId = targetLesson.student_id;
      defaultStart = toLocalInputValue(targetLesson.starts_at);
      defaultEnd = toLocalInputValue(targetLesson.ends_at);
      selectedKind = "reschedule";
      selectedLessonId = targetLesson.id;
    }
  }

  async function Create(formData: FormData) {
    "use server";

    const studentId = String(formData.get("studentId") ?? "");
    const start = String(formData.get("start") ?? "");
    const end = String(formData.get("end") ?? "");
    const msg = String(formData.get("message") ?? "");
    const counterOf = formData.get("counterOf");
    const kind = (formData.get("kind") as string) || "booking";
    const lessonId = formData.get("lessonId") as string | null;

    await createAdminSuggestion(
      studentId,
      start,
      end,
      msg,
      {
        counterOf: counterOf ? String(counterOf) : undefined,
        kind: kind === "reschedule" ? "reschedule" : "booking",
        lessonId: lessonId || undefined,
      }
    );

    redirect("/app/admin/requests");
  }

  const heading =
    selectedKind === "reschedule"
      ? "Verschiebung vorschlagen"
      : "Neuen Vorschlag senden";

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{heading}</h1>
      <form action={Create} className={styles.form}>
        <input
          type="hidden"
          name="counterOf"
          value={searchParams.counter ?? ""}
        />
        <input type="hidden" name="kind" value={selectedKind} />
        <input type="hidden" name="lessonId" value={selectedLessonId} />

        <label className={styles.label}>
          Schüler
          <select
            name="studentId"
            className={styles.input}
            required
            defaultValue={defaultStudentId}
          >
            <option value="">– auswählen –</option>
            {students?.map((student) => (
              <option key={student.id} value={student.id}>
                {student.full_name
                  ? `${student.full_name} – ${student.email}`
                  : student.email}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.label}>
          Start
          <input
            type="datetime-local"
            name="start"
            className={styles.input}
            required
            defaultValue={defaultStart}
          />
        </label>

        <label className={styles.label}>
          Ende
          <input
            type="datetime-local"
            name="end"
            className={styles.input}
            required
            defaultValue={defaultEnd}
          />
        </label>

        <label className={styles.label}>
          Nachricht (optional)
          <input
            type="text"
            name="message"
            placeholder="z. B. Hausbesuch bei dir"
            className={styles.input}
          />
        </label>

        <button className={styles.submit} type="submit">
          {selectedKind === "reschedule" ? "Verschiebung senden" : "Vorschlag senden"}
        </button>
      </form>
    </div>
  );
}
