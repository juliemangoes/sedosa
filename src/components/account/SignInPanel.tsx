"use client";

import { useEffect, useRef, useState } from "react";
import { IconArrowRight, IconMail } from "@/components/landing/icons";

export type AccountProfile = { firstName: string; lastName: string; email: string; phone: string; smsOptIn: boolean };
export type SignInResult = { account: AccountProfile; savedAnswers: Record<string, unknown> };

type Props = {
  initialEmail?: string;
  onSignedIn: (r: SignInResult) => void;
  /** Smaller layout for use inside the booking form. */
  compact?: boolean;
};

/** Passwordless sign-in: email → 6-digit code (or the one-tap link in the same email). */
export default function SignInPanel({ initialEmail = "", onSignedIn, compact }: Props) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Please enter a valid email address.");
    setBusy(true);
    try {
      const res = await fetch("/api/account/code", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return setError(j.error ?? "Couldn't send the code. Please try again.");
      setDevCode(j.devCode ?? null);
      setCode("");
      setStep("code");
      setCooldown(30);
    } catch {
      setError("Network hiccup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value = code) => {
    setError(null);
    if (value.replace(/\D/g, "").length !== 6) return setError("Enter the 6-digit code from your email.");
    setBusy(true);
    try {
      const res = await fetch("/api/account/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code: value }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "That code didn't work.");
        setCode("");
        codeRef.current?.focus();
        return;
      }
      onSignedIn({ account: j.account, savedAnswers: j.savedAnswers ?? {} });
    } catch {
      setError("Network hiccup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const err = error ? (
    <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-900 ring-1 ring-red-200">
      {error}
    </p>
  ) : null;

  if (step === "email") {
    return (
      <form onSubmit={sendCode} noValidate>
        <label htmlFor={compact ? "signin-email-inline" : "signin-email"} className={compact ? "text-sm font-medium" : "font-medium"}>
          Email
        </label>
        <div className={`mt-1.5 flex gap-2 ${compact ? "flex-col sm:flex-row" : "flex-col"}`}>
          <input
            id={compact ? "signin-email-inline" : "signin-email"}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className={`btn-black shrink-0 px-6 py-3.5 ${compact ? "" : "w-full"}`} disabled={busy}>
            {busy ? "Sending…" : "Email me a code"} {!busy && <IconArrowRight size={16} />}
          </button>
        </div>
        {!compact && <p className="mt-3 text-sm text-ink/70">No password needed. We&apos;ll email you a 6-digit code and a one-tap sign-in link.</p>}
        {err}
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
      noValidate
    >
      <p className="flex items-start gap-2.5 text-sm">
        <IconMail size={18} className="mt-0.5 shrink-0 text-plum" />
        <span>
          We sent a code to <strong className="break-all">{email}</strong>. It expires in 10 minutes.
        </span>
      </p>
      {devCode && (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          Email isn&apos;t set up on this site yet, so here&apos;s the code for testing: <strong className="tracking-widest">{devCode}</strong>
        </p>
      )}
      <label htmlFor={compact ? "signin-code-inline" : "signin-code"} className="mt-4 block text-sm font-medium">
        6-digit code
      </label>
      <div className={`mt-1.5 flex gap-2 ${compact ? "flex-col sm:flex-row" : "flex-col"}`}>
        <input
          ref={codeRef}
          id={compact ? "signin-code-inline" : "signin-code"}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={7}
          placeholder="123456"
          className="field text-center text-2xl font-semibold tracking-[0.4em] sm:text-left"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
            if (v.length === 6) verify(v);
          }}
        />
        <button type="submit" className={`btn-black shrink-0 px-6 py-3.5 ${compact ? "" : "w-full"}`} disabled={busy}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </div>
      {err}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <button type="button" className="font-semibold text-plum underline-offset-4 hover:underline disabled:text-ink/50 disabled:no-underline" disabled={cooldown > 0 || busy} onClick={() => sendCode()}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </button>
        <button
          type="button"
          className="font-semibold text-plum underline-offset-4 hover:underline"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
