import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/db";
import { getSettings } from "@/lib/settings";
import { dueReminders, whatsappApiConfigured } from "@/lib/whatsapp";
import { logoutAction } from "../actions";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = { title: "Dashboard · Sedosa Beauty Studio", robots: { index: false } };

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const db = await getDb();
  const settings = await getSettings(db);
  // Reminders waiting for a one-tap send (only when WhatsApp isn't sending automatically).
  const due = whatsappApiConfigured() ? 0 : (await dueReminders(db)).length;
  return (
    <AdminShell businessName={settings.businessName} remindersDue={due} logoutAction={logoutAction}>
      {children}
    </AdminShell>
  );
}
