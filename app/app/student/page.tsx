import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function StudentHome() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Schüler-Dashboard</h1>
      <div className="rounded border p-3">
        <div>
          <b>E-Mail:</b> {profile?.email ?? user.email}
        </div>
        <div>
          <b>Rolle:</b> {profile?.role ?? "unknown"}
        </div>
      </div>
      <form action="/logout" method="post">
        <button className="rounded bg-gray-900 px-3 py-2 text-white">Logout</button>
      </form>
    </div>
  );
}
