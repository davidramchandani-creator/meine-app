import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <div>
          <span className={styles.badge}>Willkommen</span>
          <h1 className={styles.title}>
            Starte deine Reise mit unserer App
          </h1>
          <p className={styles.lead}>
            Registriere dich in wenigen Schritten und erhalte Zugriff auf
            personalisierte Inhalte. Du brauchst nur deine E-Mail-Adresse und
            ein sicheres Passwort.
          </p>
        </div>

        <div className={styles.actions}>
          <Link className={styles.primaryButton} href="/register">
            Jetzt registrieren
          </Link>
          <a
            className={styles.secondaryLink}
            href="https://supabase.com/docs/guides/auth"
            rel="noopener noreferrer"
            target="_blank"
          >
            Mehr zur Authentifizierung erfahren
          </a>
        </div>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <h2 className={styles.featureTitle}>Schnelle Einrichtung</h2>
            <p className={styles.featureCopy}>
              Verknüpfe deine Supabase-Instanz über Umgebungsvariablen und los
              geht&apos;s.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h2 className={styles.featureTitle}>Sichere Registrierung</h2>
            <p className={styles.featureCopy}>
              Nutzer:innen bestätigen ihre E-Mail über Supabase, bevor sie
              Zugriff erhalten.
            </p>
          </div>
          <div className={styles.featureCard}>
            <h2 className={styles.featureTitle}>Intuitive Oberfläche</h2>
            <p className={styles.featureCopy}>
              Das Formular führt Schritt für Schritt durch die Registrierung.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
