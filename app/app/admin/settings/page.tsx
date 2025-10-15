import { loadAdminSettingsForForm } from "./actions";
import styles from "../admin-shared.module.css";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const initial = await loadAdminSettingsForForm();

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Startadresse & Regeln</h2>
        <p className={styles.listSubtitle}>
          Die Startadresse wird für Distanzberechnungen verwendet. Beim
          Speichern werden Koordinaten automatisch per Google-Geocoding
          ermittelt.
        </p>
        <SettingsForm initial={initial} />
      </section>
    </div>
  );
}
