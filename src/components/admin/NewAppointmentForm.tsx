"use client";

import { useMemo, useState } from "react";
import { createAppointmentAction } from "@/app/admin/actions";
import SubmitButton from "./SubmitButton";
import { Card, Field, btnCls, inputCls } from "./ui";
import { money } from "@/lib/format";

type Props = {
  services: { id: number; name: string; category: string; durationMin: number; priceCents: number; depositCents: number; addonIds: number[]; locationIds: number[] }[];
  addons: { id: number; name: string; priceCents: number; durationMin: number }[];
  locations: { id: number; name: string }[];
  clients: { id: number; firstName: string; lastName: string; email: string; phone: string; smsOptIn: boolean; whatsappOptIn: boolean }[];
  defaultServiceId?: number;
  defaultClientId?: number;
};

export default function NewAppointmentForm({ services, addons, locations, clients, defaultServiceId, defaultClientId }: Props) {
  const [serviceId, setServiceId] = useState<number>(defaultServiceId ?? services[0]?.id ?? 0);
  const service = services.find((s) => s.id === serviceId);
  const initialClient = clients.find((c) => c.id === defaultClientId);
  const [client, setClient] = useState({
    firstName: initialClient?.firstName ?? "",
    lastName: initialClient?.lastName ?? "",
    email: initialClient?.email ?? "",
    phone: initialClient?.phone ?? "",
    smsOptIn: initialClient?.smsOptIn ?? false,
    whatsappOptIn: initialClient?.whatsappOptIn ?? false,
  });
  const categories = useMemo(() => [...new Set(services.map((s) => s.category))], [services]);
  const svcAddons = addons.filter((a) => service?.addonIds.includes(a.id));

  const onEmail = (email: string) => {
    const match = clients.find((c) => c.email.toLowerCase() === email.trim().toLowerCase());
    setClient((c) => (match ? { firstName: match.firstName, lastName: match.lastName, email: match.email, phone: match.phone, smsOptIn: match.smsOptIn, whatsappOptIn: match.whatsappOptIn } : { ...c, email }));
  };

  return (
    <form action={createAppointmentAction} className="grid gap-6 lg:grid-cols-2">
      <Card title="Service & time">
        <div className="space-y-4">
          <Field label="Service" htmlFor="serviceId">
            <select id="serviceId" name="serviceId" className={inputCls} value={serviceId} onChange={(e) => setServiceId(Number(e.target.value))}>
              {categories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {services
                    .filter((s) => s.category === cat)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.durationMin} min · {money(s.priceCents)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </Field>
          {svcAddons.length > 0 && (
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-ink-soft">Add-ons</legend>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {svcAddons.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="addonIds" value={a.id} />
                    {a.name} <span className="text-ink-soft">+{a.durationMin}m {money(a.priceCents)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <Field label="Location" htmlFor="locationId">
            <select id="locationId" name="locationId" className={inputCls}>
              {locations
                .filter((l) => !service || service.locationIds.includes(l.id))
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Date & time" htmlFor="startsAt">
            <input id="startsAt" type="datetime-local" name="startsAt" required step={300} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="force" /> Book even if outside hours or overlapping another appointment
          </label>
          {service && service.depositCents > 0 && (
            <Field label={`Deposit (${money(service.depositCents)})`} htmlFor="deposit">
              <select id="deposit" name="deposit" className={inputCls} defaultValue="due">
                <option value="due">Not paid yet</option>
                <option value="cashapp">Paid by Cash App</option>
                <option value="zelle">Paid by Zelle</option>
                <option value="cash">Paid in cash</option>
                <option value="card">Paid by card</option>
                <option value="waived">Waive deposit</option>
              </select>
            </Field>
          )}
        </div>
      </Card>

      <Card title="Client">
        <div className="space-y-4">
          <Field label="Email" htmlFor="email" hint="Existing clients fill in automatically.">
            <input id="email" name="email" type="email" required list="client-emails" className={inputCls} value={client.email} onChange={(e) => onEmail(e.target.value)} />
            <datalist id="client-emails">
              {clients.map((c) => (
                <option key={c.id} value={c.email}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </datalist>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" htmlFor="firstName">
              <input id="firstName" name="firstName" required className={inputCls} value={client.firstName} onChange={(e) => setClient({ ...client, firstName: e.target.value })} />
            </Field>
            <Field label="Last name" htmlFor="lastName">
              <input id="lastName" name="lastName" required className={inputCls} value={client.lastName} onChange={(e) => setClient({ ...client, lastName: e.target.value })} />
            </Field>
          </div>
          <Field label="Phone" htmlFor="phone">
            <input id="phone" name="phone" type="tel" className={inputCls} value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
          </Field>
          <div className="space-y-2 rounded-xl bg-plaster p-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="whatsappOptIn" className="size-4 accent-[#9e2d5a]" checked={client.whatsappOptIn} onChange={(e) => setClient({ ...client, whatsappOptIn: e.target.checked })} /> Client agreed to WhatsApp reminders
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="smsOptIn" className="size-4 accent-[#9e2d5a]" checked={client.smsOptIn} onChange={(e) => setClient({ ...client, smsOptIn: e.target.checked })} /> Client agreed to text messages
            </label>
          </div>
          <Field label="Note" htmlFor="clientNotes">
            <textarea id="clientNotes" name="clientNotes" rows={3} className={inputCls} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="notify" defaultChecked /> Send the client a confirmation
          </label>
          <SubmitButton className={`${btnCls} w-full`} pendingText="Booking…">
            Book appointment
          </SubmitButton>
          <p className="text-xs text-ink-soft">Intake forms aren&apos;t required for bookings you enter yourself.</p>
        </div>
      </Card>
    </form>
  );
}
