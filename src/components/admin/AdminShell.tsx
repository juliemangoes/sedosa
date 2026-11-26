"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Wordmark from "@/components/landing/Wordmark";
import {
  AICalendar,
  AIClipboard,
  AIClock,
  AIExternal,
  AIHome,
  AILayers,
  AIPhoto,
  AILogout,
  AIMessage,
  AIMore,
  AIPlus,
  AISettings,
  AISparkles,
  AIUsers,
  AIWallet,
} from "./icons";

type Item = { href: string; label: string; Icon: (p: { size?: number; className?: string }) => React.ReactNode; match?: (p: string) => boolean; badge?: number };

export default function AdminShell({
  businessName,
  remindersDue,
  logoutAction,
  children,
}: {
  businessName: string;
  remindersDue: number;
  logoutAction: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const more = useRef<HTMLDialogElement>(null);

  const main: Item[] = [
    { href: "/admin", label: "Home", Icon: AIHome, match: (p) => p === "/admin", badge: remindersDue },
    { href: "/admin/calendar", label: "Calendar", Icon: AICalendar, match: (p) => p.startsWith("/admin/calendar") || p.startsWith("/admin/appointments") },
    { href: "/admin/clients", label: "Clients", Icon: AIUsers },
    { href: "/admin/finance", label: "Finance", Icon: AIWallet },
  ];
  const menu: Item[] = [
    { href: "/admin/services", label: "Services", Icon: AISparkles },
    { href: "/admin/addons", label: "Add-ons", Icon: AILayers },
    { href: "/admin/forms", label: "Forms", Icon: AIClipboard },
    { href: "/admin/photos", label: "Photos", Icon: AIPhoto },
  ];
  const studio: Item[] = [
    { href: "/admin/availability", label: "Hours & time off", Icon: AIClock },
    { href: "/admin/messages", label: "Messages", Icon: AIMessage },
    { href: "/admin/settings", label: "Settings", Icon: AISettings },
  ];
  const isActive = (i: Item) => (i.match ? i.match(path) : path.startsWith(i.href));

  // Close the "More" sheet after navigating.
  useEffect(() => {
    if (more.current?.open) more.current.close();
  }, [path]);

  const sideLink = (i: Item) => {
    const active = isActive(i);
    return (
      <li key={i.href}>
        <Link
          href={i.href}
          aria-current={active ? "page" : undefined}
          className={`group flex items-center gap-3 rounded-full px-3.5 py-2.5 text-[0.93rem] transition duration-200 ${
            active ? "bg-rose font-medium text-oxblood" : "text-plaster hover:bg-oxblood-2"
          }`}
        >
          <i.Icon size={19} className={active ? "text-oxblood" : "text-brass-light"} />
          <span className="flex-1">{i.label}</span>
          {!!i.badge && <span className={`rounded-full px-1.5 text-xs font-semibold ${active ? "bg-oxblood text-plaster" : "bg-rose text-oxblood"}`}>{i.badge}</span>}
        </Link>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-plaster font-sans text-ink">
      {/* Desktop sidebar */}
      <aside className="on-dark fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-oxblood text-plaster lg:flex" aria-label="Dashboard">
        <div className="flex h-20 items-center px-6">
          <Wordmark businessName={businessName} tone="light" />
        </div>
        <div className="px-4">
          <Link href="/admin/appointments/new" className="btn-rose w-full">
            <AIPlus size={17} /> New appointment
          </Link>
        </div>
        <nav className="mt-5 flex-1 space-y-6 overflow-y-auto px-3 pb-6" aria-label="Sections">
          <ul className="space-y-0.5">{main.map(sideLink)}</ul>
          <div>
            <p className="mb-1.5 px-3.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-brass-light">Menu</p>
            <ul className="space-y-0.5">{menu.map(sideLink)}</ul>
          </div>
          <div>
            <p className="mb-1.5 px-3.5 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-brass-light">Studio</p>
            <ul className="space-y-0.5">{studio.map(sideLink)}</ul>
          </div>
        </nav>
        <div className="space-y-0.5 border-t border-brass/40 p-3 text-sm">
          <a href="/" target="_blank" className="flex items-center gap-3 rounded-full px-3.5 py-2 text-plaster hover:bg-oxblood-2">
            <AIExternal size={18} /> View booking page
          </a>
          <form action={logoutAction}>
            <button type="submit" className="flex w-full items-center gap-3 rounded-full px-3.5 py-2 text-left text-plaster hover:bg-oxblood-2">
              <AILogout size={18} /> Log out
            </button>
          </form>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="on-dark sticky top-0 z-30 flex h-16 items-center justify-between bg-oxblood px-4 text-plaster lg:hidden">
        <Link href="/admin" className="rounded-lg" aria-label={`${businessName} dashboard home`}>
          <Wordmark businessName={businessName} tone="light" />
        </Link>
        <Link href="/admin/appointments/new" className="btn-rose min-h-0 px-4 py-2" aria-label="New appointment">
          <AIPlus size={17} /> New
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:max-w-none lg:px-10 lg:pb-12 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Phone bottom tabs */}
      <nav aria-label="Dashboard" className="fixed inset-x-0 bottom-0 z-30 border-t border-brass bg-panel pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5">
          {main.map((i) => {
            const active = isActive(i);
            return (
              <li key={i.href}>
                <Link href={i.href} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[0.7rem] ${active ? "font-semibold text-lacquer" : "text-ink-soft"}`}>
                  <i.Icon size={22} />
                  {i.label}
                  {!!i.badge && <span className="absolute right-[calc(50%-1.1rem)] top-1.5 grid size-4 place-items-center rounded-full bg-lacquer text-[0.6rem] font-bold text-panel">{i.badge}</span>}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => more.current?.showModal()}
              className={`flex w-full flex-col items-center gap-0.5 py-2.5 text-[0.7rem] ${[...menu, ...studio].some(isActive) ? "font-semibold text-lacquer" : "text-ink-soft"}`}
            >
              <AIMore size={22} /> More
            </button>
          </li>
        </ul>
      </nav>

      <dialog
        ref={more}
        aria-label="More"
        onClick={(e) => e.target === more.current && more.current?.close()}
        className="m-0 mt-auto w-full max-w-none rounded-t-[2rem] bg-plaster p-0 text-ink backdrop:bg-oxblood/50 open:animate-sheet-up lg:hidden"
      >
        <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line-strong/40" />
          <ul className="grid grid-cols-3 gap-2">
            {[...menu, ...studio].map((i) => (
              <li key={i.href}>
                <Link href={i.href} className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-4 text-center text-xs ${isActive(i) ? "bg-rose font-semibold text-oxblood" : "bg-panel ring-1 ring-line"}`}>
                  <i.Icon size={22} />
                  {i.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <a href="/" target="_blank" className="flex items-center justify-center gap-2 rounded-2xl bg-panel py-3 ring-1 ring-line">
              <AIExternal size={17} /> Booking page
            </a>
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-panel py-3 ring-1 ring-line">
                <AILogout size={17} /> Log out
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </div>
  );
}
