import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminPasswordConfigured, isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Studio login", robots: { index: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  const configured = adminPasswordConfigured();
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4 font-sans">
      <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-7 shadow-sm">
        <h1 className="font-serif text-2xl text-plum">Sedosa Beauty Studio</h1>
        <p className="mt-1 text-sm text-stone-600">Owner dashboard</p>
        {configured ? (
          <LoginForm devHint={process.env.NODE_ENV !== "production" && !process.env.ADMIN_PASSWORD} />
        ) : (
          <p className="mt-6 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Set <code>ADMIN_PASSWORD</code> and <code>SESSION_SECRET</code> in your hosting environment variables to enable login.
          </p>
        )}
      </div>
    </main>
  );
}
