"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignInPanel, { type AccountProfile } from "./SignInPanel";

/** Sign-in on the /account page: refreshes into the dashboard once signed in. */
export function AccountSignIn({ initialEmail }: { initialEmail?: string }) {
  const router = useRouter();
  return <SignInPanel initialEmail={initialEmail} onSignedIn={() => router.refresh()} />;
}

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/account/logout", { method: "POST" }).catch(() => undefined);
        router.refresh();
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}

function formatPhone(raw: string) {
  if (raw.trim().startsWith("+") && !raw.startsWith("+1")) return raw;
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function ProfileForm({ profile, incomplete, whatsapp }: { profile: AccountProfile; incomplete: boolean; whatsapp: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...profile, phone: formatPhone(profile.phone) });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const set = (k: "firstName" | "lastName" | "phone") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "phone" ? formatPhone(e.target.value) : e.target.value }));

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch("/api/account/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName: form.firstName, lastName: form.lastName, phone: form.phone, smsOptIn: form.smsOptIn, ...(whatsapp ? { whatsappOptIn: form.whatsappOptIn } : {}) }),
        }).catch(() => null);
        const j = res ? await res.json().catch(() => ({})) : {};
        setBusy(false);
        if (!res?.ok) return setMsg({ ok: false, text: j.error ?? "Couldn't save. Please try again." });
        setMsg({ ok: true, text: "Saved ♡" });
        router.refresh();
      }}
    >
      {incomplete && <p className="rounded-2xl bg-blush px-4 py-3 text-sm">Add your name and number so they&apos;re ready next time you book.</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-first">First name</label>
          <input id="acc-first" className="field mt-1.5" autoComplete="given-name" value={form.firstName} onChange={set("firstName")} />
        </div>
        <div>
          <label htmlFor="acc-last">Last name</label>
          <input id="acc-last" className="field mt-1.5" autoComplete="family-name" value={form.lastName} onChange={set("lastName")} />
        </div>
        <div>
          <label htmlFor="acc-phone">Mobile number</label>
          <input id="acc-phone" type="tel" inputMode="tel" className="field mt-1.5" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <span className="block">Email</span>
          <p className="mt-1.5 truncate rounded-xl bg-blush/70 px-3.5 py-3 text-ink/80" title={profile.email}>
            {profile.email}
          </p>
        </div>
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-black" checked={form.smsOptIn} onChange={(e) => setForm((f) => ({ ...f, smsOptIn: e.target.checked }))} />
        <span>Text me confirmations and reminders. Msg &amp; data rates may apply; reply STOP to opt out.</span>
      </label>
      {whatsapp && (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-black" checked={form.whatsappOptIn} onChange={(e) => setForm((f) => ({ ...f, whatsappOptIn: e.target.checked }))} />
          <span>Send my appointment reminders on WhatsApp.</span>
        </label>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" className="btn-black px-6 py-3" disabled={busy}>
          {busy ? "Saving…" : "Save details"}
        </button>
        {msg && (
          <p role="status" className={`text-sm font-medium ${msg.ok ? "text-emerald-800" : "text-red-800"}`}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}
