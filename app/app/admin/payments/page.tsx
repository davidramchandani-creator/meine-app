import { createSupabaseServer } from "@/lib/supabaseServer";
import styles from "../admin-shared.module.css";

type PaymentRow = {
  id: string;
  student_id: string | null;
  amount: number | null;
  currency: string | null;
  status: string | null;
  method: string | null;
  created_at: string;
  receipt_url: string | null;
};

export default async function AdminPaymentsPage() {
  const supabase = await createSupabaseServer();
  const { data: payments } = await supabase
    .from("payments")
    .select(
      "id, student_id, amount, currency, status, method, created_at, receipt_url"
    )
    .order("created_at", { ascending: false })
    .limit(25)
    .returns<PaymentRow[]>();

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Zahlungen</h2>
        {payments && payments.length > 0 ? (
          <div className={styles.list}>
            {payments.map((payment) => {
              const status = payment.status ?? "pending";
              const created = new Date(payment.created_at).toLocaleString(
                "de-CH",
                {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                }
              );

              return (
                <article key={payment.id} className={styles.listItem}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardHeading}>
                      <span className={styles.cardTitle}>
                        {(payment.amount ?? 0).toFixed(2)} {payment.currency ?? "CHF"}
                      </span>
                      <span className={styles.cardSubtitle}>Erstellt am {created}</span>
                    </div>
                    <span className={`${styles.statusBadge} ${status === "paid" ? styles.statusBadgeAccepted : styles.statusBadgePending}`}>
                      {status === "paid" ? "Bezahlt" : "Ausstehend"}
                    </span>
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Status</span>
                      <span className={styles.metaValue}>{status}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <span className={styles.metaLabel}>Methode</span>
                      <span className={styles.metaValue}>{payment.method ?? "manuell"}</span>
                    </div>
                    {payment.student_id ? (
                      <div className={styles.metaItem}>
                        <span className={styles.metaLabel}>Schüler ID</span>
                        <span className={styles.metaValue}>#{payment.student_id.slice(0, 6)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.actions}>
                    <button
                      className={styles.actionButtonSecondary}
                      type="button"
                      disabled
                    >
                      Als bezahlt markieren
                    </button>
                    <button
                      className={styles.actionButtonSecondary}
                      type="button"
                      disabled={!payment.receipt_url}
                    >
                      Beleg öffnen
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className={styles.placeholder}>
            Noch keine Zahlungen erfasst. Sobald ein Paket bezahlt ist,
            erscheint es hier. Stripe/Twint wird später angebunden.
          </p>
        )}
      </section>
    </div>
  );
}
