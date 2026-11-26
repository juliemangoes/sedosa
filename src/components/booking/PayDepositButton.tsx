"use client";

import { useState } from "react";

export default function PayDepositButton({ token, label }: { token: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn-primary px-6 py-3"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          const res = await fetch(`/api/bookings/${token}/pay`, { method: "POST" });
          const j = await res.json().catch(() => ({}));
          if (res.ok && j.checkoutUrl) window.location.href = j.checkoutUrl;
          else {
            setErr(j.error ?? "Could not start payment.");
            setBusy(false);
          }
        }}
      >
        {busy ? "Opening…" : label}
      </button>
      {err && <p className="mt-2 text-sm font-medium text-[#a61b2b]">{err}</p>}
    </>
  );
}
