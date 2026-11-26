import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminPasswordConfigured, isAdmin } from "@/lib/auth";
import Wordmark from "@/components/landing/Wordmark";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio login", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const configured = adminPasswordConfigured();
  return (
    <main className="on-dark flex min-h-screen flex-col items-center justify-center bg-oxblood px-4 py-12 text-plaster">
      <Wordmark businessName="Sedosa Beauty Studio" size="lg" tone="light" />
      <div className="mt-10 w-full max-w-sm rounded-[1.75rem] bg-panel p-1.5 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
        <div className="on-light rounded-[1.4rem] p-7 ring-1 ring-brass">
          <h1 className="font-display text-[1.75rem] font-medium leading-tight">Owner dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">Sign in to run the studio.</p>
          {configured ? (
            <LoginForm devHint={process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD} />
          ) : (
            <p className="mt-6 rounded-2xl bg-plaster p-3 text-sm text-[#7a4a00] ring-1 ring-[#7a4a00]/40">
              Set <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code> in your hosting environment variables to enable login.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
