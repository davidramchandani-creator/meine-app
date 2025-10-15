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
            {payments.map((payment) => (
              <div key={payment.id} className={styles.listItem}>
                <div className={styles.listMeta}>
                  <span className={styles.listTitle}>
                    {(payment.amount ?? 0).toFixed(2)}{" "}
                    {payment.currency ?? "CHF"}
                  </span>
                  <span className={styles.listSubtitle}>
                    Status: {payment.status ?? "pending"} ·{" "}
                    {payment.method ?? "manuell"}
                  </span>
                  <span className={styles.listSubtitle}>
                    Erstellt am{" "}
                    {new Date(payment.created_at).toLocaleString("de-CH", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
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
              </div>
            ))}
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
