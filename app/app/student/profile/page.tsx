import { createSupabaseServer } from "@/lib/supabaseServer";
import styles from "./profile.module.css";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: profile }, { data: payments }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "first_name, last_name, address_line, postal_code, city, lat, lng, email"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount, currency, status, created_at, receipt_url")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const initial = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    addressLine: profile?.address_line ?? "",
    postalCode: profile?.postal_code ?? "",
    city: profile?.city ?? "",
  };

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Persönliche Daten</h2>
        <ProfileForm initial={initial} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Zahlungen & Belege</h2>
        {payments && payments.length > 0 ? (
          <div className={styles.payments}>
            {payments.map((payment) => (
              <div key={payment.id} className={styles.paymentItem}>
                <div className={styles.paymentMeta}>
                  <span className={styles.paymentAmount}>
                    {(payment.amount ?? 0).toFixed(2)}{" "}
                    {payment.currency ?? "CHF"}
                  </span>
                  <span className={styles.paymentStatus}>
                    {payment.status ?? "pending"}
                  </span>
                </div>
                <button
                  className={styles.secondary}
                  type="button"
                  disabled={!payment.receipt_url}
                >
                  Beleg öffnen
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.placeholder}>
            Noch keine Zahlungen vorhanden. Sobald ein Paket bezahlt ist,
            erscheinen die Belege hier.
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Sitzung</h2>
        <form action="/logout" method="post" className={styles.actions}>
          <button className={styles.primary} type="submit">
            Logout
          </button>
        </form>
      </section>
    </div>
  );
}
