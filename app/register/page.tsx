"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./register.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const trimmedEmail = email.trim();
      const loginRedirectUrl =
        typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;
      const { error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: loginRedirectUrl
          ? {
              emailRedirectTo: loginRedirectUrl,
            }
          : undefined,
      });

      if (signUpError) {
        throw signUpError;
      }

      setMessage("Registrierung erfolgreich! Du wirst zur Anmeldung weitergeleitet.");
      setEmail("");
      setPassword("");
      router.push(`/login?email=${encodeURIComponent(trimmedEmail)}&check-email=1`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || email.trim() === "" || password.trim() === "";

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Registrieren</h1>
        <p className={styles.intro}>
          Erstelle ein neues Konto, indem du deine E-Mail-Adresse und ein Passwort eingibst.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              E-Mail-Adresse
            </label>
            <input
              className={styles.input}
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="du@example.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Passwort
            </label>
            <input
              className={styles.input}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mindestens 6 Zeichen"
              minLength={6}
            />
            <p className={styles.hint}>Das Passwort muss mindestens 6 Zeichen lang sein.</p>
          </div>

          <button className={styles.submit} type="submit" disabled={isSubmitDisabled}>
            {loading ? "Registriere..." : "Konto erstellen"}
          </button>
        </form>

        {message ? (
          <p className={`${styles.message} ${styles.success}`}>{message}</p>
        ) : null}

        {error ? <p className={`${styles.message} ${styles.error}`}>{error}</p> : null}

        <p className={styles.footer}>
          Bereits registriert?{" "}
          <Link className={styles.link} href="/login">
            Zur Anmeldung
          </Link>
        </p>
      </div>
    </main>
  );
}
