"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

      setMessage(
        "Registrierung erfolgreich! Du wirst zur Anmeldung weitergeleitet."
      );
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
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-gradient-to-br from-slate-100 to-slate-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5">
        <h1 className="text-2xl font-semibold text-slate-900">Registrieren</h1>
        <p className="mt-2 text-sm text-slate-600">
          Erstelle ein neues Konto, indem du deine E-Mail-Adresse und ein Passwort eingibst.
        </p>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="email">
              E-Mail-Adresse
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="password">
              Passwort
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
            <p className="text-xs text-slate-500">Das Passwort muss mindestens 6 Zeichen lang sein.</p>
          </div>

          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            type="submit"
            disabled={isSubmitDisabled}
          >
            {loading ? "Registriere..." : "Konto erstellen"}
          </button>
        </form>

        {message ? (
          <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
        ) : null}

        <p className="mt-8 text-sm text-slate-600">
          Bereits registriert?{" "}
          <Link className="font-semibold text-slate-900 hover:underline" href="/login">
            Zur Anmeldung
          </Link>
        </p>
      </div>
    </main>
  );
}
