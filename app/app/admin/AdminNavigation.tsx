"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./admin-layout.module.css";

export type AdminNavItem = {
  href: string;
  label: string;
  badge?: number;
};

export function AdminNavigation({ items }: { items: AdminNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {items.map((item) => {
        const isActive =
          item.href === "/app/admin"
            ? pathname === item.href
            : pathname.startsWith(item.href);

        const className = [
          styles.navLink,
          isActive ? styles.navLinkActive : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link key={item.href} href={item.href} className={className}>
            {item.label}
            {item.badge && item.badge > 0 ? (
              <span className={styles.badge}>{item.badge}</span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
