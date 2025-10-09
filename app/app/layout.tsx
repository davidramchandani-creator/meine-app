import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { createSupabaseServer } from "@/lib/supabaseServer";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <div className="mx-auto max-w-4xl p-4">{children}</div>;
}
