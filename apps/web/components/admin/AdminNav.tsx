"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BASE_NAV = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/deals", label: "Deals" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/settings", label: "Settings" },
];

const TEAM_ROLES = ["owner", "manager", "cashier"];

export function AdminNav({ role = "" }: { role?: string }) {
  const pathname = usePathname();
  const nav = [...BASE_NAV];
  if (role === "rider") {
    nav.splice(1, 0, { href: "/admin/deliveries", label: "My Deliveries" });
  }
  if (TEAM_ROLES.includes(role)) {
    nav.splice(3, 0, { href: "/admin/team", label: "Team" });
  }
  return (
    <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2">
      {nav.map((n) => {
        const active =
          n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
