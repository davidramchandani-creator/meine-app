import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const STUDENT_PATH = "/app/student";
const ADMIN_PATH = "/app/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl));
  }

  const cookieOperations: Array<{
    name: string;
    value: string;
    options: any;
  }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "meine-app-auth",
      },
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          cookieOperations.push({ name, value, options });
        },
        remove(name, options) {
          cookieOperations.push({
            name,
            value: "",
            options: { ...options, maxAge: 0 },
          });
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    console.error("[auth/callback] exchange error", exchangeError);
    const message = encodeURIComponent(exchangeError.message ?? "unknown");
    return NextResponse.redirect(
      new URL(`/login?error=auth&message=${message}`, requestUrl)
    );
  }

  let destination = requestedNext ?? STUDENT_PATH;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!requestedNext && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "admin") {
      destination = ADMIN_PATH;
    }
  }

  const response = NextResponse.redirect(new URL(destination, requestUrl));
  for (const { name, value, options } of cookieOperations) {
    response.cookies.set(name, value, options);
  }

  return response;
}
