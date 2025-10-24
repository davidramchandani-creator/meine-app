import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile?.role ?? "").toLowerCase() === "admin") {
    redirect("/app/admin");
  }

  redirect("/app/student");
}
