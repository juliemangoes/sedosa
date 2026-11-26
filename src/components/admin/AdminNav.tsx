"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Appointments", match: (p: string) => p === "/admin" || p.startsWith("/admin/appointments") },
  { href: "/admin/clients", label: "Clients" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/addons", label: "Add-ons" },
  { href: "/admin/forms", label: "Forms" },
  { href: "/admin/availability", label: "Hours & time off" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard" className="mx-auto max-w-6xl overflow-x-auto px-2">
      <ul className="flex gap-1 whitespace-nowrap text-sm">
        {LINKS.map((l) => {
          const active = l.match ? l.match(path) : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-2.5 ${active ? "border-lacquer font-medium text-lacquer" : "border-transparent text-ink-soft hover:text-ink"}`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
