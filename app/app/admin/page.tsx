import { createSupabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import sharedStyles from "./admin-shared.module.css";
import styles from "./admin-dashboard.module.css";

export default async function AdminOverviewPage() {
  const supabase = await createSupabaseServer();

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const [
    { count: pendingStudentRequests = 0 },
    { count: lessonsNext24h = 0 },
    { count: pendingPayments = 0 },
  ] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id", { head: true, count: "exact" })
      .eq("direction", "student_to_admin")
      .eq("status", "pending"),
    supabase
      .from("lessons")
      .select("id", { head: true, count: "exact" })
      .gte("starts_at", now.toISOString())
      .lt("starts_at", tomorrow.toISOString()),
    supabase
      .from("payments")
      .select("id", { head: true, count: "exact" })
      .eq("status", "pending"),
  ]);

  return (
    <div className={sharedStyles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Kennzahlen</h1>
          <p className={styles.subtitle}>Alles Wichtige auf einen Blick</p>
        </div>
      </header>

      <section className={styles.metricGrid}>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Offene Vorschläge</span>
          <span className={styles.metricValue}>
            {pendingStudentRequests ?? 0}
          </span>
          <span className={styles.metricHint}>Student → Admin</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Lektionen (24h)</span>
          <span className={styles.metricValue}>{lessonsNext24h ?? 0}</span>
          <span className={styles.metricHint}>Geplanter Zeitraum</span>
        </article>
        <article className={styles.metricCard}>
          <span className={styles.metricLabel}>Fällige Zahlungen</span>
          <span className={styles.metricValue}>{pendingPayments ?? 0}</span>
          <span className={styles.metricHint}>Status „Pending“</span>
        </article>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          <Link className={styles.primaryAction} href="/app/admin/requests/new">
            Vorschlag senden
          </Link>
          <Link className={styles.secondaryAction} href="/app/admin/requests">
            Anfragen öffnen
          </Link>
          <Link className={styles.secondaryAction} href="/app/admin/students">
            Schüler verwalten
          </Link>
        </div>
      </section>
    </div>
  );
}
