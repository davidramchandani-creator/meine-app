"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabaseBrowser";
import styles from "./login.module.css";

export default function LoginPage() {
  const supabase = createSupabaseBrowser();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : null);

      if (!siteUrl) {
        throw new Error("Fehlende NEXT_PUBLIC_SITE_URL für Magic-Link-Redirect.");
      }

      const redirectTo = `${siteUrl.replace(/\/$/, "")}/auth/callback`;
      const { error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (signInError) {
        throw signInError;
      }

      setSent(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(message);
    }
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Anmelden</h1>

      {sent ? (
        <p>Magic-Link wurde gesendet. Bitte E-Mail prüfen.</p>
      ) : (
        <form onSubmit={onSubmit} className={styles.form}>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="deine@email.ch"
            className={styles.input}
          />
          <button className={styles.submit} type="submit">
            Link senden
          </button>
          {error ? <p className={styles.error}>{error}</p> : null}
        </form>
      )}
    </div>
  );
}
