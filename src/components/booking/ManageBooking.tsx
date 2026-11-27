"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import SlotPicker from "./SlotPicker";
import type { Slot } from "./types";

type Props = {
  token: string;
  timezone: string;
  /** null = allowed; otherwise the reason it isn't. */
  canReschedule: string | null;
  canCancel: string | null;
  depositNote: string;
};

export default function ManageBooking({ token, timezone, canReschedule, canCancel, depositNote }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reschedule" | "cancel">("idle");
  const [slot, setSlot] = useState<Slot | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const post = async (path: string, body?: unknown) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/bookings/${token}/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? "Something went wrong.");
        if (res.status === 409) setSlot(null);
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="manage-title" className="rounded-[1.75rem] bg-panel p-6 ring-1 ring-line sm:p-8">
      {mode === "idle" && (
        <>
          <h2 id="manage-title" className="heading text-[1.75rem]">
            Need to make a change?
          </h2>
          {done && (
            <p role="status" className="mt-3 rounded-2xl bg-panel px-4 py-3 text-sm font-medium text-[#1f6b4a] ring-1 ring-[#1f6b4a]/40">
              {done}
            </p>
          )}
          <p className="mt-1 text-sm text-ink-soft">{canReschedule ?? canCancel ?? "Reschedule or cancel online, no call needed."}</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn-primary px-6 py-3" disabled={!!canReschedule} onClick={() => setMode("reschedule")}>
              Reschedule
            </button>
            <button type="button" className="btn-secondary px-6 py-3" disabled={!!canCancel} onClick={() => setMode("cancel")}>
              Cancel appointment
            </button>
          </div>
        </>
      )}

      {mode === "reschedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="manage-title" className="heading text-[1.75rem]">
              Pick a new time
            </h2>
            <button type="button" className="text-sm font-medium text-lacquer underline-offset-4 hover:underline" onClick={() => setMode("idle")}>
              Keep current time
            </button>
          </div>
          <SlotPicker query={`token=${encodeURIComponent(token)}&locationId=any`} timezone={timezone} selected={slot} onSelect={setSlot} />
          {slot && (
            <div className="on-dark flex flex-col items-center gap-3 rounded-2xl bg-oxblood p-5 text-center text-plaster sm:flex-row sm:justify-between sm:text-left">
              <p>
                Move to <strong>{DateTime.fromISO(slot.start).setZone(timezone).toFormat("cccc, LLL d 'at' h:mm a")}</strong>?
              </p>
              <button
                type="button"
                className="btn-rose"
                disabled={busy}
                onClick={async () => {
                  if (await post("reschedule", { startsAt: slot.start, locationId: "any" })) {
                    setDone(`You're all set for ${DateTime.fromISO(slot.start).setZone(timezone).toFormat("cccc, LLL d 'at' h:mm a")}. We've sent you an updated confirmation.`);
                    setMode("idle");
                    setSlot(null);
                    router.refresh();
                  }
                }}
              >
                {busy ? "Saving…" : "Confirm new time"}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "cancel" && (
        <div className="text-center">
          <h2 id="manage-title" className="heading text-[1.75rem]">
            Cancel this appointment?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            {depositNote ? `${depositNote} ` : ""}If you&apos;d rather keep your spot, you can pick a new time instead.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              className="btn-primary px-6 py-3"
              disabled={busy}
              onClick={async () => {
                if (await post("cancel")) router.refresh();
              }}
            >
              {busy ? "Canceling…" : "Yes, cancel"}
            </button>
            <button type="button" className="btn-secondary px-6 py-3" onClick={() => setMode("reschedule")}>
              Reschedule instead
            </button>
            <button type="button" className="px-4 py-3 text-sm font-medium text-lacquer" onClick={() => setMode("idle")}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p role="alert" className="mt-4 rounded-2xl bg-panel px-4 py-3 text-center text-sm font-medium text-[#a61b2b] ring-1 ring-[#a61b2b]/50">
          {msg}
        </p>
      )}
    </section>
  );
}
