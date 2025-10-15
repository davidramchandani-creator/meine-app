import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { RequestForm } from "./RequestForm";

export default async function StudentRequestPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">
        Neue Anfrage
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        Wähle einen Termin, optional eine Nachricht, und sende die Anfrage an
        deine Lehrperson. Du erhältst eine Bestätigung oder einen
        Gegenvorschlag.
      </p>
      <RequestForm />
    </div>
  );
}
