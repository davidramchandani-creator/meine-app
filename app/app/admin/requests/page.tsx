import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabaseServer";
import styles from "../admin-shared.module.css";
import {
  acceptStudentRequest,
  declineStudentRequest,
} from "./actions";

type RequestRow = {
  id: string;
  student_id: string;
  requester_id: string | null;
  direction: "student_to_admin" | "admin_to_student";
  status: string;
  proposed_starts_at: string;
  proposed_ends_at: string;
  message: string | null;
  created_at: string;
  counter_of: string | null;
  kind: "booking" | "reschedule";
  lesson_id: string | null;
};

type StudentProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
};

function formatDateRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("de-CH", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
  const range = `${start.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return { date, range };
}

export default async function AdminRequestsPage() {
  const supabase = await createSupabaseServer();

  const { data: requests } = await supabase
    .from("booking_requests")
    .select(
      "id, student_id, requester_id, direction, status, proposed_starts_at, proposed_ends_at, message, created_at, counter_of, kind, lesson_id"
    )
    .eq("direction", "student_to_admin")
    .order("created_at", { ascending: false })
    .limit(25)
    .returns<RequestRow[]>();

  const studentIds = Array.from(
    new Set((requests ?? []).map((request) => request.student_id))
  );

  const { data: profiles } = studentIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds)
        .returns<StudentProfile[]>()
    : { data: [] as StudentProfile[] };

  const profileMap = new Map<string, StudentProfile>();
  profiles?.forEach((profile) => {
    profileMap.set(profile.id, profile);
  });

  const pending = requests?.filter((req) => req.status === "pending") ?? [];
  const history =
    requests?.filter((req) => req.status !== "pending").slice(0, 10) ?? [];

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Offene Anfragen</h2>
        {pending.length > 0 ? (
          <div className={styles.list}>
            {pending.map((request) => {
              const { date, range } = formatDateRange(
                request.proposed_starts_at,
                request.proposed_ends_at
              );
              const isReschedule = request.kind === "reschedule";

              return (
                <div key={request.id} className={styles.listItem}>
                  <div className={styles.listMeta}>
                    <span className={styles.listTitle}>
                      {profileMap.get(request.student_id)?.full_name ??
                        profileMap.get(request.student_id)?.email ??
                        "Unbekannter Schüler"}
                    </span>
                    <span className={styles.listSubtitle}>
                      {date} · {range}
                    </span>
                    <span className={styles.listSubtitle}>
                      Typ: {isReschedule ? "Verschiebung" : "Neue Buchung"}
                    </span>
                    {request.message ? (
                      <span className={styles.listSubtitle}>
                        {request.message}
                      </span>
                    ) : null}
                  </div>
                  <div className={styles.actions}>
                    <form action={acceptStudentRequest.bind(null, request.id)}>
                      <button className={styles.actionButton} type="submit">
                        Annehmen
                      </button>
                    </form>
                    <form
                      action={declineStudentRequest.bind(null, request.id)}
                    >
                      <button
                        className={styles.actionButtonSecondary}
                        type="submit"
                      >
                        Ablehnen
                      </button>
                    </form>
                    <Link
                      className={styles.actionButtonSecondary}
                      href={`/app/admin/requests/new?student=${request.student_id}&counter=${request.id}`}
                    >
                      Gegenvorschlag
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.placeholder}>
            Keine offenen Anfragen. Sobald eine Schülerin oder ein Schüler eine
            Lektion anfragt, erscheint sie hier.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Verlauf</h2>
        {history.length > 0 ? (
          <div className={styles.list}>
            {history.map((request) => {
              const { date, range } = formatDateRange(
                request.proposed_starts_at,
                request.proposed_ends_at
              );

              return (
                <div key={request.id} className={styles.listItem}>
                  <div className={styles.listMeta}>
                    <span className={styles.listTitle}>
                      {profileMap.get(request.student_id)?.full_name ??
                        profileMap.get(request.student_id)?.email ??
                        "Unbekannter Schüler"}
                    </span>
                    <span className={styles.listSubtitle}>
                      {date} · {range}
                    </span>
                    <span className={styles.listSubtitle}>
                      Typ: {request.kind === "reschedule" ? "Verschiebung" : "Neue Buchung"}
                    </span>
                    <span className={styles.listSubtitle}>
                      Status: {request.status}
                    </span>
                  </div>
                  <span className={styles.listSubtitle}>
                    Erstellt am{" "}
                    {new Date(request.created_at).toLocaleString("de-CH", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className={styles.placeholder}>
            Noch keine bearbeiteten Anfragen.
          </p>
        )}
      </section>
    </div>
  );
}
