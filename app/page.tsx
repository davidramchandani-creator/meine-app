import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-6 py-16 text-slate-900">
      <div className="flex w-full max-w-4xl flex-col items-center gap-10 rounded-3xl bg-white/90 p-10 text-center shadow-xl ring-1 ring-slate-900/5 backdrop-blur">
        <div className="space-y-4">
          <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
            Willkommen
          </span>
          <h1 className="text-4xl font-semibold sm:text-5xl">Starte deine Reise mit unserer App</h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Registriere dich in wenigen Schritten und erhalte Zugriff auf personalisierte Inhalte. Du brauchst nur deine E-Mail-Adresse und ein sicheres Passwort.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
            href="/register"
          >
            Jetzt registrieren
          </Link>
          <a
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            href="https://supabase.com/docs/guides/auth"
            rel="noopener noreferrer"
            target="_blank"
          >
            Mehr zur Authentifizierung erfahren
          </a>
        </div>

        <div className="grid w-full gap-6 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Schnelle Einrichtung</h2>
            <p className="mt-2 text-sm text-slate-600">
              Verknüpfe deine Supabase-Instanz über Umgebungsvariablen und los geht&apos;s.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Sichere Registrierung</h2>
            <p className="mt-2 text-sm text-slate-600">
              Nutzer:innen bestätigen ihre E-Mail über Supabase, bevor sie Zugriff erhalten.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Intuitive Oberfläche</h2>
            <p className="mt-2 text-sm text-slate-600">
              Das Formular führt Schritt für Schritt durch die Registrierung.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
