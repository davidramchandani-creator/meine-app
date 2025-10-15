import Link from "next/link";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { createSupabaseServer } from "@/lib/supabaseServer";
import { StudentNavigation, StudentNavItem } from "./StudentNavigation";
import styles from "./student-layout.module.css";

export default async function StudentLayout({
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

  const { count: pendingSuggestions = 0 } = await supabase
    .from("booking_requests")
    .select("id", { head: true, count: "exact" })
    .eq("student_id", user.id)
    .eq("direction", "admin_to_student")
    .eq("status", "pending");

  const navItems: StudentNavItem[] = [
    { href: "/app/student", label: "Home" },
    { href: "/app/student/lessons", label: "Lektionen" },
    {
      href: "/app/student/suggestions",
      label: "Vorschläge",
      badge: pendingSuggestions ?? 0,
    },
    { href: "/app/student/profile", label: "Profil" },
  ];

  return (
    <div className={styles.shell}>
      <StudentNavigation items={navItems} variant="top" />
      <main className={styles.content}>{children}</main>
      <StudentNavigation items={navItems} variant="bottom" />
      <Link className={styles.fab} href="/app/student/request">
        <span>Buchen</span>
      </Link>
    </div>
  );
}
