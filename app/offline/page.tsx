export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center text-slate-800">
      <h1 className="text-3xl font-semibold">Offline-Modus</h1>
      <p className="max-w-md text-base">
        Du bist gerade ohne Internetverbindung unterwegs. Einige Informationen
        sind weiterhin verfügbar, sobald du wieder online gehst, wird alles
        automatisch synchronisiert.
      </p>
    </main>
  );
}
