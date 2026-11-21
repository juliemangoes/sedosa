"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import { duration, money, ordinal } from "@/lib/format";
import TimeGrid from "./TimeGrid";
import IntakeForm from "./IntakeForm";
import type { PublicData, PublicService, Slot } from "./types";

type Step = "category" | "service" | "location" | "time" | "info";
type LocationChoice = number | "any";

const STEP_TITLES: Record<Step, string> = {
  category: "Select Category",
  service: "Select Appointment",
  location: "Select Calendar",
  time: "Date & Time",
  info: "Your Information",
};

export default function BookingApp({ data, initialServiceId }: { data: PublicData; initialServiceId?: number }) {
  const initialService = data.services.find((s) => s.id === initialServiceId) ?? null;
  const [step, setStepState] = useState<Step>(
    initialService ? (initialService.locationIds.length > 1 ? "location" : "time") : "category",
  );
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [service, setService] = useState<PublicService | null>(initialService);
  const [location, setLocation] = useState<LocationChoice>(
    initialService && initialService.locationIds.length === 1 ? initialService.locationIds[0] : "any",
  );
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  // Keep the browser back button working between steps.
  const setStep = useCallback((s: Step, replace = false) => {
    setStepState(s);
    if (replace) window.history.replaceState({ step: s }, "");
    else window.history.pushState({ step: s }, "");
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);
  useEffect(() => {
    window.history.replaceState({ step }, "");
    const onPop = (e: PopStateEvent) => {
      const s = (e.state?.step as Step | undefined) ?? "category";
      setStepState(s);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseService = (s: PublicService) => {
    setService(s);
    setAddonIds([]);
    setSlot(null);
    if (s.locationIds.length > 1) {
      setLocation("any");
      setStep("location");
    } else {
      setLocation(s.locationIds[0]);
      setStep("time");
    }
  };

  const prev: { label: string; go: () => void } | null = useMemo(() => {
    switch (step) {
      case "service":
        return { label: "Select Category", go: () => setStep("category") };
      case "location":
        return { label: "Select Appointment", go: () => setStep("service") };
      case "time":
        return service && service.locationIds.length > 1
          ? { label: "Select Calendar", go: () => setStep("location") }
          : { label: "Select Appointment", go: () => setStep("service") };
      case "info":
        return { label: "Date & Time", go: () => setStep("time") };
      default:
        return null;
    }
  }, [step, service, setStep]);

  const addons = useMemo(
    () => (service ? data.addons.filter((a) => service.addonIds.includes(a.id)) : []),
    [service, data.addons],
  );
  const chosenAddons = addons.filter((a) => addonIds.includes(a.id));
  const totalPrice = (service?.priceCents ?? 0) + chosenAddons.reduce((n, a) => n + a.priceCents, 0);
  const totalMin = (service?.durationMin ?? 0) + chosenAddons.reduce((n, a) => n + a.durationMin, 0);

  const availabilityQuery = service
    ? new URLSearchParams({ serviceId: String(service.id), locationId: String(location), addons: addonIds.join(",") }).toString()
    : "";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-8">
      <h1 className="text-center text-xl font-medium text-plum">{data.businessName}</h1>

      {step === "category" && data.bannerImages.length > 0 && (
        <div className="mx-auto mt-8 max-w-[640px] overflow-hidden rounded-sm shadow-md">
          {data.bannerImages.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt={i === 0 ? `${data.businessName} booking policies and info` : ""} className="block w-full" width={2000} height={1000} loading={i < 2 ? "eager" : "lazy"} />
          ))}
        </div>
      )}

      <div ref={topRef} className="scroll-mt-4" />
      <nav className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div>
          {prev && (
            <button type="button" onClick={prev.go} className="label-caps flex items-center gap-1 hover:text-plum">
              <span aria-hidden="true" className="text-base leading-none">‹</span> {prev.label}
            </button>
          )}
        </div>
        <h2 className="text-center text-[1.05rem]">{STEP_TITLES[step]}</h2>
        <div />
      </nav>

      {notice && (
        <div role="alert" className="mt-5 rounded-sm border border-plum bg-white/70 p-3 text-center text-sm">
          {notice}
        </div>
      )}

      {step === "category" && (
        <>
          <ul className="mt-6 overflow-hidden rounded-sm bg-petal shadow-sm">
            {data.categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 border-b border-petal-line px-5 py-6 last:border-0">
                <span className="font-medium">{c.name}</span>
                <button
                  type="button"
                  className="btn-black"
                  onClick={() => {
                    setCategoryId(c.id);
                    setStep("service");
                  }}
                  aria-label={`Select ${c.name}`}
                >
                  Select
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="label-caps mt-4 hover:text-plum"
            onClick={() => {
              setCategoryId(null);
              setStep("service");
            }}
          >
            Show all appointments
          </button>
        </>
      )}

      {step === "service" && (
        <div className="mt-6 space-y-8">
          {data.categories
            .filter((c) => categoryId === null || c.id === categoryId)
            .map((c) => (
              <section key={c.id}>
                <h3 className="mb-3 text-lg font-semibold text-plum">{c.name}</h3>
                <ul className="overflow-hidden rounded-sm bg-petal shadow-sm">
                  {data.services
                    .filter((s) => s.categoryId === c.id)
                    .map((s) => (
                      <ServiceRow key={s.id} service={s} onSelect={() => chooseService(s)} />
                    ))}
                </ul>
              </section>
            ))}
        </div>
      )}

      {step === "location" && service && (
        <div className="mt-6 space-y-6">
          <ServiceCard service={service} />
          <div>
            <p className="label-caps mb-2">With</p>
            <ul className="overflow-hidden rounded-sm bg-petal shadow-sm">
              {[
                { id: "any" as const, name: "Any Available", address: "" },
                ...data.locations.filter((l) => service.locationIds.includes(l.id)),
              ].map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-4 border-b border-petal-line px-5 py-5 last:border-0">
                  <div>
                    {l.address && <p className="label-caps text-ink/70">{l.address}</p>}
                    <p className="font-medium">{l.name}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-black"
                    aria-label={`Select ${l.name}`}
                    onClick={() => {
                      setLocation(l.id);
                      setSlot(null);
                      setStep("time");
                    }}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {step === "time" && service && (
        <div className="mt-6 space-y-6">
          <ServiceCard
            service={service}
            onRemove={() => {
              setService(null);
              setStep("service");
            }}
            location={location === "any" ? undefined : data.locations.find((l) => l.id === location)?.name}
          />
          {addons.length > 0 && (
            <div>
              <p className="label-caps mb-2">Add to appointment</p>
              <div className="grid gap-x-6 gap-y-3 rounded-sm bg-petal p-5 shadow-sm sm:grid-cols-2">
                {addons.map((a) => (
                  <label key={a.id} className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 size-4 accent-black"
                      checked={addonIds.includes(a.id)}
                      onChange={(e) => {
                        setSlot(null);
                        setAddonIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)));
                      }}
                    />
                    <span className="leading-tight">
                      {a.name}
                      <br />
                      <span className="text-sm text-ink/75">
                        + {duration(a.durationMin)} @ {money(a.priceCents)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <TimeGrid
            query={availabilityQuery}
            timezone={data.timezone}
            selected={slot}
            onSelect={(s) => {
              setSlot(s);
              setNotice(null);
            }}
            emptyMessage={`No online openings right now. Please call or text ${data.phone}.`}
          />
          {slot && (
            <div className="fixed inset-x-0 bottom-0 z-10 border-t border-petal-line bg-blush/95 px-4 py-3 backdrop-blur">
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <div className="text-sm leading-tight">
                  <div className="font-semibold">{service.name}</div>
                  <div>{fmtSlot(slot.start, data.timezone)}</div>
                </div>
                <button type="button" className="btn-black shrink-0" onClick={() => setStep("info")}>
                  Continue
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === "info" && service && slot && (
        <InfoStep
          data={data}
          service={service}
          slot={slot}
          location={location}
          addonIds={addonIds}
          chosenAddons={chosenAddons}
          totalPrice={totalPrice}
          totalMin={totalMin}
          onSlotTaken={(msg) => {
            setSlot(null);
            setNotice(msg);
            setStep("time", true);
          }}
        />
      )}

      <footer className="mt-16 text-center text-sm text-ink/70">
        <p>
          {data.phone} · {data.email} · @{data.instagram}
        </p>
      </footer>
    </div>
  );
}

function fmtSlot(iso: string, zone: string) {
  const dt = DateTime.fromISO(iso).setZone(zone);
  return `${dt.toFormat("cccc, LLLL")} ${ordinal(dt.day)}, ${dt.toFormat("yyyy 'at' h:mm a ZZZZ")}`;
}

function ServiceRow({ service, onSelect }: { service: PublicService; onSelect: () => void }) {
  const [open, setOpen] = useState(false);
  const long = service.description.length > 240;
  const text = open || !long ? service.description : service.description.slice(0, 240).trimEnd() + " …";
  return (
    <li className="flex items-start justify-between gap-4 border-b border-petal-line px-5 py-5 last:border-0">
      <div className="min-w-0">
        <p className="font-semibold">{service.name}</p>
        <p className="mt-1 text-sm">
          {duration(service.durationMin)}
          {service.priceCents > 0 && <> @ {money(service.priceCents)}</>}
        </p>
        {service.description && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{text}</p>}
        {long && (
          <button type="button" onClick={() => setOpen((o) => !o)} className="label-caps mt-2 hover:text-plum">
            {open ? "Show less" : "Show all"}
          </button>
        )}
      </div>
      <button type="button" className="btn-black shrink-0" onClick={onSelect} aria-label={`Select ${service.name}`}>
        Select
      </button>
    </li>
  );
}

function ServiceCard({ service, onRemove, location, when }: { service: PublicService; onRemove?: () => void; location?: string; when?: string }) {
  return (
    <div>
      <p className="label-caps mb-2">Appointment</p>
      <div className="relative rounded-sm bg-petal p-5 shadow-sm">
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label="Remove appointment" className="absolute right-4 top-3 text-xl leading-none hover:text-plum">
            ×
          </button>
        )}
        <p className="pr-6 font-semibold">{service.name}</p>
        <p className="mt-1 text-sm">
          {duration(service.durationMin)}
          {service.priceCents > 0 && <> @ {money(service.priceCents)}</>}
          {location && <> · {location}</>}
        </p>
        {when && <p className="mt-2 text-sm font-semibold">{when}</p>}
        {service.description && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm">{service.description}</p>}
      </div>
    </div>
  );
}

function InfoStep(props: {
  data: PublicData;
  service: PublicService;
  slot: Slot;
  location: LocationChoice;
  addonIds: number[];
  chosenAddons: PublicData["addons"];
  totalPrice: number;
  totalMin: number;
  onSlotTaken: (msg: string) => void;
}) {
  const { data, service, slot, location, addonIds, chosenAddons, totalPrice, totalMin } = props;
  const [client, setClient] = useState({ firstName: "", lastName: "", phone: "", email: "", smsOptIn: false });
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const forms = data.forms.filter((f) => service.formIds.includes(f.id));
  const deposit = Math.min(service.depositCents, totalPrice);
  const payOnline = deposit > 0 && data.onlineDeposit;

  const scrollToError = () =>
    requestAnimationFrame(() => document.querySelector("[data-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    // Quick client-side check so people see every missing field at once.
    const errs: Record<string, string> = {};
    if (!client.firstName.trim()) errs.firstName = "First name is required.";
    if (!client.lastName.trim()) errs.lastName = "Last name is required.";
    if (client.phone.replace(/\D/g, "").length < 10) errs.phone = "Enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email.trim())) errs.email = "Enter a valid email address.";
    for (const f of forms.flatMap((x) => x.fields)) {
      if (!f.required) continue;
      const v = answers[String(f.id)];
      const empty = f.type === "checkbox" ? v !== true : f.type === "checkboxlist" ? !Array.isArray(v) || v.length === 0 : !v;
      if (empty) errs[String(f.id)] = f.type === "checkbox" ? "Please check this box to continue." : "This question is required.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Please complete the highlighted fields.");
      scrollToError();
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          locationId: location,
          addonIds,
          startsAt: slot.start,
          client,
          answers,
          clientNotes: notes,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 409 && j.code === "slot_unavailable") {
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
      window.location.href = j.checkoutUrl ?? `/booking/${j.token}?new=1`;
    } catch {
      setFormError("Network problem — please check your connection and try again.");
      setSubmitting(false);
    }
  };

  const set = (k: keyof typeof client) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setClient((c) => ({ ...c, [k]: k === "smsOptIn" ? e.target.checked : e.target.value }));
  const fieldErr = (k: string) =>
    errors[k] ? (
      <p id={`${k}-err`} className="mt-1 text-sm text-red-800" data-error>
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="mt-6 space-y-6">
      <div>
        <p className="label-caps mb-2">Appointment</p>
        <div className="rounded-sm bg-petal p-5 shadow-sm">
          <p className="font-semibold">{service.name}</p>
          <p className="mt-1 text-sm">
            {duration(totalMin)} @ {money(totalPrice)}
          </p>
          {chosenAddons.length > 0 && (
            <ul className="mt-2 text-sm">
              {chosenAddons.map((a) => (
                <li key={a.id}>
                  + {a.name} ({money(a.priceCents)})
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 font-semibold">{fmtSlot(slot.start, data.timezone)}</p>
          <p className="mt-1 text-sm text-ink/75">
            {location === "any"
              ? "Location: any available studio. " + data.locationNote
              : `${data.locations.find((l) => l.id === location)?.name}. ${data.locationNote}`}
          </p>
        </div>
      </div>

      <div className="rounded-sm bg-petal p-5 shadow-sm sm:p-7">
        <h3 className="label-caps mb-4">Your information</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName">First name *</label>
            <input id="firstName" autoComplete="given-name" className="field mt-1" value={client.firstName} onChange={set("firstName")} aria-invalid={!!errors.firstName} aria-describedby={errors.firstName ? "firstName-err" : undefined} />
            {fieldErr("firstName")}
          </div>
          <div>
            <label htmlFor="lastName">Last name *</label>
            <input id="lastName" autoComplete="family-name" className="field mt-1" value={client.lastName} onChange={set("lastName")} aria-invalid={!!errors.lastName} aria-describedby={errors.lastName ? "lastName-err" : undefined} />
            {fieldErr("lastName")}
          </div>
          <div>
            <label htmlFor="phone">Phone *</label>
            <input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="field mt-1" value={client.phone} onChange={set("phone")} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "phone-err" : undefined} />
            {fieldErr("phone")}
          </div>
          <div>
            <label htmlFor="email">Email *</label>
            <input id="email" type="email" autoComplete="email" className="field mt-1" value={client.email} onChange={set("email")} aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
            {fieldErr("email")}
          </div>
        </div>
        <label className="mt-5 flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-black" checked={client.smsOptIn} onChange={set("smsOptIn")} />
          <span>
            Text me appointment confirmations and reminders from {data.businessName}. Message frequency varies; message and data rates may apply. Reply STOP to opt out, HELP for help.
          </span>
        </label>

        <IntakeForm
          forms={forms}
          answers={answers}
          errors={errors}
          onChange={(id, v) => {
            setAnswers((a) => ({ ...a, [id]: v }));
            setErrors(({ [String(id)]: _, ...rest }) => rest);
          }}
        />

        <div className="mt-8 border-t border-petal-line pt-6">
          <label htmlFor="notes">Anything I should know? (optional)</label>
          <textarea id="notes" rows={3} className="field mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </div>
      </div>

      <div className="rounded-sm bg-petal p-5 text-sm shadow-sm sm:p-7">
        <h3 className="label-caps mb-3">Booking policies</h3>
        <ul className="space-y-2">
          {data.policies.map((p) => (
            <li key={p.title}>
              <strong>{p.title}:</strong> {p.body}
            </li>
          ))}
        </ul>
        {deposit > 0 && !payOnline && <p className="mt-4 rounded-sm border border-plum p-3">{data.manualDepositInstructions}</p>}
      </div>

      {formError && (
        <p role="alert" className="text-center text-red-800">
          {formError}
        </p>
      )}
      <div className="flex flex-col items-center gap-2">
        <button type="submit" className="btn-black px-6 py-3 text-sm" disabled={submitting}>
          {submitting ? "Booking…" : payOnline ? `Pay ${money(deposit)} deposit & book` : "Complete appointment"}
        </button>
        {payOnline && (
          <p className="text-center text-xs text-ink/70">
            You&apos;ll be taken to a secure Stripe page. Your card is saved for the no-show fee described in the waiver. Remaining {money(totalPrice - deposit)} is due at your appointment.
          </p>
        )}
      </div>
    </form>
  );
}
