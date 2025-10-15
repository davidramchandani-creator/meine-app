import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { AdminNavigation, AdminNavItem } from "./AdminNavigation";
import styles from "./admin-layout.module.css";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
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
    .single();

  if (profile?.role !== "admin") {
    redirect("/app/student");
  }

  const [{ count: pendingRequests = 0 }] = await Promise.all([
    supabase
      .from("booking_requests")
      .select("id", { head: true, count: "exact" })
      .eq("direction", "student_to_admin")
      .eq("status", "pending"),
  ]);

  const navItems: AdminNavItem[] = [
    { href: "/app/admin", label: "Overview" },
    { href: "/app/admin/students", label: "Schüler" },
    { href: "/app/admin/requests", label: "Anfragen", badge: pendingRequests },
    { href: "/app/admin/calendar", label: "Kalender" },
    { href: "/app/admin/payments", label: "Zahlungen" },
  ];

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Admin-Portal</h1>
            <Link className={styles.settingsLink} href="/app/admin/settings">
              Einstellungen
            </Link>
          </div>
          <AdminNavigation items={navItems} />
        </div>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
