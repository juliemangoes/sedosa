import Link from "next/link";
import { DateTime } from "luxon";
import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import * as t from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Card, Empty, PageHeader } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  await requireAdmin();
  const db = await getDb();
  const [rows, settings] = await Promise.all([db.select().from(t.messageLog).orderBy(desc(t.messageLog.createdAt)).limit(200), getSettings(db)]);
  const emailOn = !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const smsOn = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
  return (
    <>
      <PageHeader title="Messages" />
      {(!emailOn || !smsOn) && (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {!emailOn && "Email isn't connected yet (RESEND_API_KEY / EMAIL_FROM). "}
          {!smsOn && "Text messages aren't connected yet (Twilio). "}
          Messages are still recorded below so you can see what clients would receive.
        </p>
      )}
      <Card>
        {rows.length === 0 ? (
          <Empty>No messages yet.</Empty>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((m) => (
              <li key={m.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-stone-500">{DateTime.fromJSDate(m.createdAt).setZone(settings.timezone).toFormat("LLL d, h:mm a")}</span>
                  <span className="rounded bg-stone-100 px-1.5 text-xs uppercase">{m.channel}</span>
                  <span className="font-medium">{m.to}</span>
                  <span className={m.status === "failed" ? "text-red-700" : m.status === "logged" ? "text-amber-700" : "text-emerald-700"}>
                    {m.status === "logged" ? "recorded only" : m.status}
                  </span>
                  {m.appointmentId && (
                    <Link href={`/admin/appointments/${m.appointmentId}`} className="text-plum underline">
                      appointment
                    </Link>
                  )}
                </div>
                {m.subject && <p className="mt-1 font-medium">{m.subject}</p>}
                <details className="mt-1">
                  <summary className="cursor-pointer text-stone-500">Show message</summary>
                  <pre className="mt-2 whitespace-pre-wrap rounded bg-stone-50 p-3 font-sans text-xs">{m.body}</pre>
                </details>
                {m.error && <p className="mt-1 text-xs text-red-700">{m.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
