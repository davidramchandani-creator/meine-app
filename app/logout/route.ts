import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabaseServer";

export async function POST() {
  const supabase = createSupabaseServer();
  await supabase.auth.signOut();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return NextResponse.redirect(new URL("/login", siteUrl));
}
