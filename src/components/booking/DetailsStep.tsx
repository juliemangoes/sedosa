"use client";

import { useEffect, useState } from "react";
import IntakeForm from "./IntakeForm";
import type { PublicData, PublicService, Slot } from "./types";
import { computeTotals } from "./flow";
import { money } from "@/lib/format";
import { IconCard, IconCheck, IconHeart } from "@/components/landing/icons";
import SignInPanel, { type AccountProfile, type SignInResult } from "@/components/account/SignInPanel";

export const DETAILS_FORM_ID = "booking-details";
const STORAGE_KEY = "sedosa.client.v1";

type Client = { firstName: string; lastName: string; phone: string; email: string; smsOptIn: boolean; whatsappOptIn: boolean };
const EMPTY: Client = { firstName: "", lastName: "", phone: "", email: "", smsOptIn: false, whatsappOptIn: false };

function formatPhone(raw: string) {
  // International numbers stay as typed; US numbers (incl. +1…) show as (404) 555-0123.
  if (raw.trim().startsWith("+") && !raw.trim().startsWith("+1")) return raw;
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length < 4) return d;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function readSaved(): Client | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v ? { ...EMPTY, ...(JSON.parse(v) as Partial<Client>) } : null;
  } catch {
    return null;
  }
}

function writeSaved(c: Client | null) {
  try {
    if (c) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode etc. */
  }
}

export default function DetailsStep(props: {
  data: PublicData;
  service: PublicService;
  slot: Slot;
  location: number | "any";
  addonIds: number[];
  chosenAddons: PublicData["addons"];
  account: AccountProfile | null;
  savedAnswers: Record<string, unknown>;
  accountsEnabled: boolean;
  onSignedIn: (r: SignInResult) => void;
  onSignedOut: () => void;
  onSlotTaken: (msg: string) => void;
}) {
  const { data, service, slot, location, addonIds, chosenAddons, account, savedAnswers } = props;
  const [showSignIn, setShowSignIn] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const [client, setClient] = useState<Client>(EMPTY);
  const [returning, setReturning] = useState(false);
  const [remember, setRemember] = useState(true);
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const forms = data.forms.filter((f) => service.formIds.includes(f.id));
  const { totalPrice, deposit } = computeTotals({ service, addons: chosenAddons });
  const payOnline = deposit > 0 && data.onlineDeposit;

  // Signed in: use the account profile. Guest: details remembered on this device, if any.
  useEffect(() => {
    if (account) {
      setClient((c) => ({
        firstName: account.firstName || c.firstName,
        lastName: account.lastName || c.lastName,
        phone: formatPhone(account.phone || c.phone),
        email: account.email,
        smsOptIn: account.smsOptIn,
        whatsappOptIn: account.whatsappOptIn,
      }));
      setShowSignIn(false);
      return;
    }
    const saved = readSaved();
    if (saved?.email) {
      setClient({ ...saved, phone: formatPhone(saved.phone) });
      setReturning(true);
    }
  }, [account]);

  // Pre-fill this service's questions from the client's previous answers (consent boxes excluded server-side).
  useEffect(() => {
    const ids = new Set(forms.flatMap((f) => f.fields.map((x) => String(x.id))));
    const relevant = Object.fromEntries(Object.entries(savedAnswers).filter(([k]) => ids.has(k)));
    if (!Object.keys(relevant).length) return;
    setAnswers((a) => ({ ...relevant, ...a }));
    setPrefilled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAnswers]);

  const scrollToError = () =>
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>("[data-error]");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = el?.parentElement?.querySelector<HTMLElement>("input, textarea, select");
      input?.focus({ preventScroll: true });
    });

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!client.firstName.trim()) errs.firstName = "Please add your first name.";
    if (!client.lastName.trim()) errs.lastName = "Please add your last name.";
    if (client.phone.replace(/\D/g, "").length < 10) errs.phone = "Please add a mobile number, including area code.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim())) errs.email = "Please check your email address.";
    for (const f of forms.flatMap((x) => x.fields)) {
      if (!f.required) continue;
      const v = answers[String(f.id)];
      const empty = f.type === "checkbox" ? v !== true : f.type === "checkboxlist" ? !Array.isArray(v) || v.length === 0 : !v;
      if (empty) errs[String(f.id)] = f.type === "checkbox" ? "Please check this box to continue." : "Please answer this question.";
    }
    return errs;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      const n = Object.keys(errs).length;
      setFormError(`Almost there: ${n} thing${n === 1 ? "" : "s"} still need${n === 1 ? "s" : ""} your attention.`);
      scrollToError();
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, locationId: location, addonIds, startsAt: slot.start, client, answers, clientNotes: notes }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409 && j.code === "slot_unavailable") {
        setSubmitting(false);
        props.onSlotTaken(j.error);
        return;
      }
      if (!res.ok) {
        if (j.fieldErrors) {
          setErrors(j.fieldErrors);
          scrollToError();
        }
        setFormError(j.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      if (!account) writeSaved(remember ? client : null);
      window.location.href = j.checkoutUrl ?? `/booking/${j.token}?new=1`;
    } catch {
      setFormError("Network hiccup. Please check your connection and try again.");
      setSubmitting(false);
    }
  };

  const set = (k: "firstName" | "lastName" | "phone" | "email") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = k === "phone" ? formatPhone(e.target.value) : e.target.value;
    setClient((c) => ({ ...c, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _, ...rest }) => rest);
  };
  const fieldErr = (k: string) =>
    errors[k] ? (
      <p id={`${k}-err`} className="mt-1.5 text-sm font-medium text-red-800" data-error>
        {errors[k]}
      </p>
    ) : null;
  const inputProps = (k: "firstName" | "lastName" | "phone" | "email") => ({
    id: k,
    className: "field mt-1.5",
    value: client[k],
    onChange: set(k),
    "aria-invalid": !!errors[k],
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
    "aria-required": true,
  });

  return (
    <form id={DETAILS_FORM_ID} onSubmit={submit} noValidate className="mt-6 space-y-5">
      <section aria-labelledby="you-title" className="rounded-3xl bg-white/80 p-5 ring-1 ring-petal-line sm:p-7">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="you-title" className="text-xl font-semibold">
            {account ? `Booking as ${account.firstName || "you"} ♡` : returning && client.firstName ? `Welcome back, ${client.firstName} ♡` : "Your details"}
          </h2>
          {account && (
            <button
              type="button"
              className="text-sm font-semibold text-plum underline-offset-4 hover:underline"
              onClick={async () => {
                await fetch("/api/account/logout", { method: "POST" }).catch(() => undefined);
                setClient(EMPTY);
                setAnswers({});
                setPrefilled(false);
                props.onSignedOut();
              }}
            >
              Not you? Sign out
            </button>
          )}
          {!account && returning && (
            <button
              type="button"
              className="text-sm font-semibold text-plum underline-offset-4 hover:underline"
              onClick={() => {
                writeSaved(null);
                setReturning(false);
                setClient(EMPTY);
              }}
            >
              Not you?
            </button>
          )}
        </div>
        {!account && props.accountsEnabled && (
          <div className="mt-4 rounded-2xl bg-blush/70 p-4 ring-1 ring-petal-line">
            {showSignIn ? (
              <SignInPanel compact initialEmail={client.email} onSignedIn={props.onSignedIn} />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  <strong>Been here before?</strong> Sign in and I&apos;ll fill this in for you.
                </p>
                <button type="button" className="btn-outline px-4 py-2" onClick={() => setShowSignIn(true)}>
                  Sign in
                </button>
              </div>
            )}
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName">First name</label>
            <input autoComplete="given-name" {...inputProps("firstName")} />
            {fieldErr("firstName")}
          </div>
          <div>
            <label htmlFor="lastName">Last name</label>
            <input autoComplete="family-name" {...inputProps("lastName")} />
            {fieldErr("lastName")}
          </div>
          <div>
            <label htmlFor="phone">Mobile number</label>
            <input type="tel" inputMode="tel" autoComplete="tel" placeholder="(404) 555-0123" {...inputProps("phone")} />
            {fieldErr("phone")}
          </div>
          {account ? (
            <div>
              <span className="block">Email</span>
              <p className="mt-1.5 flex items-center justify-between gap-2 rounded-xl bg-blush/70 px-3.5 py-3">
                <span className="truncate">{account.email}</span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-900 ring-1 ring-emerald-200">
                  <IconCheck size={12} strokeWidth={2.6} /> Signed in
                </span>
              </p>
              <p className="mt-1 text-xs text-ink/70">This booking will appear in your account.</p>
            </div>
          ) : (
            <div>
              <label htmlFor="email">Email</label>
              <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" {...inputProps("email")} />
              {fieldErr("email")}
              <p className="mt-1 text-xs text-ink/70">Your confirmation and reschedule link go here.</p>
            </div>
          )}
        </div>
        <div className="mt-5 space-y-3 text-sm">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-black" checked={client.smsOptIn} onChange={(e) => setClient((c) => ({ ...c, smsOptIn: e.target.checked }))} />
            <span>
              Text me my confirmation and reminders. <span className="text-ink/70">Message frequency varies; msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.</span>
            </span>
          </label>
          {data.whatsappReminders && (
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-black" checked={client.whatsappOptIn} onChange={(e) => setClient((c) => ({ ...c, whatsappOptIn: e.target.checked }))} />
              <span>
                Send my reminder on WhatsApp <span className="text-ink/70">(same number)</span>
              </span>
            </label>
          )}
          {!account && (
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-black" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>
                Remember my details on this device <span className="text-ink/70">(name, phone and email only)</span>
              </span>
            </label>
          )}
        </div>
      </section>

      {forms.length > 0 && (
        <div className="space-y-5">
          {prefilled ? (
            <p role="status" className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950 ring-1 ring-emerald-200">
              <IconCheck size={16} strokeWidth={2.4} className="mt-0.5 shrink-0" />
              <span>I filled in your answers from last time. Please check they&apos;re still right, and tick the consent boxes again.</span>
            </p>
          ) : (
            <p className="px-1 text-sm text-ink/70">
              Quick consent {forms.length === 1 ? "form" : "forms"} for this service. It helps me keep you safe and get you the best results.
            </p>
          )}
          <IntakeForm
            forms={forms}
            answers={answers}
            errors={errors}
            onChange={(id, v) => {
              setAnswers((a) => ({ ...a, [id]: v }));
              setErrors(({ [String(id)]: _, ...rest }) => rest);
            }}
          />
        </div>
      )}

      <section aria-labelledby="notes-title" data-reveal className="rounded-3xl bg-white/80 p-5 ring-1 ring-petal-line sm:p-7">
        <h2 id="notes-title" className="text-xl font-semibold">
          Anything I should know? <span className="text-sm font-normal text-ink/70">Optional</span>
        </h2>
        <label htmlFor="notes" className="sr-only">
          Notes for the artist
        </label>
        <textarea
          id="notes"
          rows={3}
          className="field mt-3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Inspo, brow goals, sensitivities, bringing a guest…"
        />
      </section>

      <section aria-labelledby="policy-title" data-reveal="scale" className="rounded-3xl bg-black p-5 text-[#fde7f5] sm:p-7">
        <h2 id="policy-title" className="flex items-center gap-2 text-lg font-semibold">
          <IconHeart className="text-neon" /> Before you confirm
        </h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-[#f3d6e8]">
          {data.policies.map((p) => (
            <li key={p.title}>
              <strong className="text-white">{p.title}:</strong> {p.body}
            </li>
          ))}
        </ul>
        {deposit > 0 && !payOnline && <p className="mt-4 rounded-2xl bg-white/10 p-4 text-sm text-white">{data.manualDepositInstructions}</p>}
      </section>

      {formError && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-center font-medium text-red-900 ring-1 ring-red-200">
          {formError}
        </p>
      )}
      <div className="flex flex-col items-center gap-3 pt-1">
        <button type="submit" className="btn-black w-full max-w-md py-4 text-sm" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" /> Booking…
            </>
          ) : payOnline ? (
            <>
              <IconCard size={18} /> Confirm &amp; pay {money(deposit)} deposit
            </>
          ) : (
            "Confirm booking"
          )}
        </button>
        <p className="max-w-md text-center text-xs text-ink/70">
          {payOnline
            ? `You'll pay securely with Stripe. Your card is kept on file for the no-show fee in the waiver. ${money(totalPrice - deposit)} is due at your appointment.`
            : `By confirming you agree to the booking policies above. ${money(totalPrice)} total${deposit > 0 ? `, including the ${money(deposit)} deposit` : ""}.`}
        </p>
      </div>
    </form>
  );
}
