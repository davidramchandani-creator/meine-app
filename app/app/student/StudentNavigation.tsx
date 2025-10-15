"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./student-layout.module.css";

export type StudentNavItem = {
  href: string;
  label: string;
  badge?: number;
};

export function StudentNavigation({
  items,
  variant,
}: {
  items: StudentNavItem[];
  variant: "top" | "bottom";
}) {
  const pathname = usePathname();

  const className =
    variant === "top" ? styles.topNav : styles.bottomNav;

  return (
    <nav className={className}>
      {items.map((item) => {
        const isActive =
          item.href === "/app/student"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        const linkClass = [
          styles.navLink,
          isActive ? styles.navLinkActive : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link key={item.href} className={linkClass} href={item.href}>
            <span>{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span className={styles.badge}>{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
