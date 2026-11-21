"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import TimeGrid from "./TimeGrid";
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
    <div className="mt-8">
      {mode === "idle" && (
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" className="btn-black" disabled={!!canReschedule} onClick={() => setMode("reschedule")}>
            Reschedule
          </button>
          <button
            type="button"
            className="label-caps rounded-sm border border-black px-4 py-2 disabled:opacity-40"
            disabled={!!canCancel}
            onClick={() => setMode("cancel")}
          >
            Cancel appointment
          </button>
        </div>
      )}
      {mode === "idle" && (canReschedule || canCancel) && (
        <p className="mt-3 text-center text-sm">{canReschedule ?? canCancel}</p>
      )}

      {mode === "reschedule" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pick a new time</h3>
            <button type="button" className="label-caps hover:text-plum" onClick={() => setMode("idle")}>
              Close
            </button>
          </div>
          <TimeGrid query={`token=${encodeURIComponent(token)}&locationId=any`} timezone={timezone} selected={slot} onSelect={setSlot} />
          {slot && (
            <div className="flex flex-col items-center gap-2 rounded-sm bg-white/60 p-4 text-center">
              <p>
                Move to <strong>{DateTime.fromISO(slot.start).setZone(timezone).toFormat("cccc, LLL d 'at' h:mm a")}</strong>?
              </p>
              <button
                type="button"
                className="btn-black"
                disabled={busy}
                onClick={async () => {
                  if (await post("reschedule", { startsAt: slot.start, locationId: "any" })) {
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
        <div className="rounded-sm border border-black bg-white/60 p-5 text-center">
          <p className="font-semibold">Cancel this appointment?</p>
          {depositNote && <p className="mt-1 text-sm">{depositNote}</p>}
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              className="btn-black"
              disabled={busy}
              onClick={async () => {
                if (await post("cancel")) router.refresh();
              }}
            >
              {busy ? "Canceling…" : "Yes, cancel"}
            </button>
            <button type="button" className="label-caps rounded-sm border border-black px-4 py-2" onClick={() => setMode("idle")}>
              Keep it
            </button>
          </div>
        </div>
      )}

      {msg && (
        <p role="alert" className="mt-4 text-center text-red-800">
          {msg}
        </p>
      )}
    </div>
  );
}
