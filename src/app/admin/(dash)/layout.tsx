import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";
import AdminNav from "@/components/admin/AdminNav";

export const metadata: Metadata = { title: "Dashboard · Sedosa Beauty Studio", robots: { index: false } };

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="/admin" className="font-serif text-lg text-plum">
            Sedosa <span className="text-stone-500">· Studio</span>
          </a>
          <div className="flex items-center gap-3 text-sm">
            <a href="/" target="_blank" className="text-stone-600 hover:text-plum">
              View booking page ↗
            </a>
            <form action={logoutAction}>
              <button type="submit" className="text-stone-600 hover:text-plum">
                Log out
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
