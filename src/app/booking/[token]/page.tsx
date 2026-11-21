import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getDb } from "@/db";
import { clientCanChange, findByToken } from "@/lib/booking";
import { getSettings } from "@/lib/settings";
import { appUrl, stripeEnabled } from "@/lib/env";
import { duration, longDateTime, money } from "@/lib/format";
import { googleCalendarLink } from "@/lib/ics";
import { appointmentEvent } from "@/lib/notify";
import { syncCheckoutSession } from "@/lib/stripe";
import ManageBooking from "@/components/booking/ManageBooking";
import PayDepositButton from "@/components/booking/PayDepositButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your appointment · Sedosa Beauty Studio", robots: { index: false } };

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ token }, sp] = await Promise.all([params, searchParams]);
  const db = await getDb();
  let found = await findByToken(db, token);
  if (!found) notFound();
  const h = await headers();
  const base = appUrl(new Request(`${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}/`));

  // Returning from Stripe: confirm right away instead of waiting for the webhook.
  if (sp.session_id && stripeEnabled() && found.appointment.stripeCheckoutSessionId === sp.session_id && found.appointment.depositStatus !== "paid") {
    try {
      await syncCheckoutSession(db, sp.session_id, base);
      found = (await findByToken(db, token))!;
    } catch (e) {
      console.error("Checkout sync failed", e);
    }
  }

  const { appointment: a, client } = found;
  const settings = await getSettings(db);
  const zone = settings.timezone;
  const s = a.snapshot;
  const isNew = !!sp.new || !!sp.session_id;
  const balance = Math.max(a.priceCents - a.amountPaidCents, 0);
  const ev = appointmentEvent(a, settings, base);
  const resched = clientCanChange(a, settings, "reschedule");
  const cancel = clientCanChange(a, settings, "cancel");
  const holdActive = a.status === "pending" && a.holdExpiresAt && a.holdExpiresAt > new Date();

  const heading =
    a.status === "confirmed"
      ? isNew
        ? `You're booked, ${client.firstName}! ♡`
        : "Your appointment"
      : a.status === "pending"
        ? holdActive
          ? "Almost done: pay your deposit to confirm"
          : "This booking wasn't completed"
        : a.status === "cancelled"
          ? "This appointment was canceled"
          : a.status === "expired"
            ? "This booking expired"
            : a.status === "completed"
              ? "Thanks for visiting!"
              : "Missed appointment";

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-8">
      <h1 className="text-center text-xl font-medium text-plum">
        <a href="/">{settings.businessName}</a>
      </h1>
      <h2 className="mt-8 text-center text-2xl font-semibold">{heading}</h2>
      {sp.canceled && a.status === "pending" && holdActive && (
        <p className="mt-3 text-center text-sm">Payment was canceled. Your time is held until {longDateTime(a.holdExpiresAt!, zone).split(" at ")[1]}.</p>
      )}
      {a.status === "expired" && (
        <p className="mt-3 text-center text-sm">The deposit wasn&apos;t paid in time, so the slot was released.</p>
      )}

      <div className="mt-8 rounded-sm bg-petal p-5 shadow-sm sm:p-7">
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3">
          <dt className="label-caps pt-1 text-plum">Service</dt>
          <dd>
            <span className="font-semibold">{s.serviceName}</span>
            <span className="text-sm"> · {duration(Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60000))}</span>
            {s.addons.map((x) => (
              <div key={x.id} className="text-sm">
                + {x.name} ({money(x.priceCents)})
              </div>
            ))}
          </dd>
          <dt className="label-caps pt-1 text-plum">When</dt>
          <dd className={a.status === "cancelled" || a.status === "expired" ? "line-through" : "font-semibold"}>{longDateTime(a.startsAt, zone)}</dd>
          <dt className="label-caps pt-1 text-plum">Where</dt>
          <dd>
            {s.locationName}
            {a.status === "confirmed" && s.locationAddress && <div className="text-sm">{s.locationAddress}</div>}
          </dd>
          <dt className="label-caps pt-1 text-plum">Price</dt>
          <dd>
            {money(a.priceCents)}
            {a.depositCents > 0 && (
              <div className="text-sm">
                Deposit {money(a.depositCents)}:{" "}
                {a.depositStatus === "paid" ? "paid ✓" : a.depositStatus === "waived" ? "waived" : "not paid yet"}
                {a.status === "confirmed" && <> · {money(balance)} due at your appointment</>}
              </div>
            )}
          </dd>
        </dl>

        {a.status === "confirmed" && a.depositStatus === "due" && !stripeEnabled() && (
          <div className="mt-5 rounded-sm border border-plum bg-white/50 p-4 text-sm">
            <p>{settings.manualDepositInstructions}</p>
            {(settings.cashAppHandle || settings.zelleHandle) && (
              <p className="mt-2">
                {settings.cashAppHandle && (
                  <>
                    Cash App: <strong>{settings.cashAppHandle}</strong>
                    <br />
                  </>
                )}
                {settings.zelleHandle && (
                  <>
                    Zelle: <strong>{settings.zelleHandle}</strong>
                  </>
                )}
              </p>
            )}
          </div>
        )}

        {holdActive && stripeEnabled() && (
          <div className="mt-6 text-center">
            <PayDepositButton token={a.token} label={`Pay ${money(a.depositCents)} deposit`} />
          </div>
        )}

        {a.status === "confirmed" && (
          <div className="mt-6 flex flex-wrap gap-3">
            <a className="btn-black" href={googleCalendarLink(ev)} target="_blank" rel="noopener noreferrer">
              Add to Google Calendar
            </a>
            <a className="btn-black" href={`/api/bookings/${a.token}/ics`}>
              Apple / Outlook (.ics)
            </a>
          </div>
        )}
      </div>

      {a.status === "confirmed" && (
        <ManageBooking
          token={a.token}
          timezone={zone}
          canReschedule={resched.ok ? null : resched.reason}
          canCancel={cancel.ok ? null : cancel.reason}
          depositNote={a.depositStatus === "paid" ? "Your deposit is non-refundable." : ""}
        />
      )}

      {(a.status === "cancelled" || a.status === "expired" || a.status === "completed" || (a.status === "pending" && !holdActive)) && (
        <p className="mt-8 text-center">
          <a href="/" className="btn-black">
            Book an appointment
          </a>
        </p>
      )}

      {a.status === "confirmed" && (
        <div className="mt-8 rounded-sm bg-petal p-5 text-sm shadow-sm sm:p-7">
          <h3 className="label-caps mb-3">Booking policies</h3>
          <ul className="space-y-2">
            {settings.policies.map((p) => (
              <li key={p.title}>
                <strong>{p.title}:</strong> {p.body}
              </li>
            ))}
          </ul>
          <p className="mt-4">{settings.confirmationNote}</p>
        </div>
      )}

      <p className="mt-10 text-center text-sm text-ink/70">
        Questions? Call or text {settings.phone} · {settings.email}
      </p>
    </div>
  );
}
