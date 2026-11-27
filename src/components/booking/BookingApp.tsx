"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SiteHeader from "./SiteHeader";
import ServiceMenu from "./ServiceMenu";
import SlotPicker from "./SlotPicker";
import DetailsStep from "./DetailsStep";
import { AddonPicker, LocationStep, MobileSummary, Stepper, Summary, slotLabel, type StepDef } from "./flow";
import type { PublicData, PublicService, Slot } from "./types";
import { prettyName } from "@/lib/display";
import { IconArrowRight } from "@/components/landing/icons";
import type { AccountProfile } from "@/components/account/SignInPanel";

type Step = "browse" | "location" | "time" | "details";
type LocationChoice = number | "any";

type Props = {
  data: PublicData;
  initialServiceId?: number;
  /** A time picked from the hero's next openings: opens the time step with it selected. */
  initialSlot?: Slot;
  /** Server-rendered landing sections. */
  hero: React.ReactNode;
  sections: React.ReactNode;
  footer: React.ReactNode;
  /** Signed-in client, if any, and their previous intake answers. */
  initialAccount: AccountProfile | null;
  initialSavedAnswers: Record<string, unknown>;
  accountsEnabled: boolean;
};

export default function BookingApp({ data, initialServiceId, initialSlot, hero, sections, footer, initialAccount, initialSavedAnswers, accountsEnabled }: Props) {
  const [account, setAccount] = useState<AccountProfile | null>(initialAccount);
  const [savedAnswers, setSavedAnswers] = useState<Record<string, unknown>>(initialSavedAnswers);
  const initialService = data.services.find((s) => s.id === initialServiceId) ?? null;
  const slotPicked = !!(initialService && initialSlot && !Number.isNaN(Date.parse(initialSlot.start)));
  const [step, setStepState] = useState<Step>(initialService ? (slotPicked || initialService.locationIds.length === 1 ? "time" : "location") : "browse");
  const [service, setService] = useState<PublicService | null>(initialService);
  const [location, setLocation] = useState<LocationChoice>(initialService && initialService.locationIds.length === 1 ? initialService.locationIds[0] : "any");
  const [addonIds, setAddonIds] = useState<number[]>([]);
  const [slot, setSlot] = useState<Slot | null>(slotPicked ? { start: initialSlot!.start, locationIds: initialSlot!.locationIds.length ? initialSlot!.locationIds : initialService!.locationIds } : null);
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const browseScroll = useRef(0);
  const firstRender = useRef(true);

  // Steps live in browser history so the back button walks back through them.
  const setStep = useCallback((s: Step, replace = false) => {
    setStepState((prev) => {
      if (prev === "browse" && s !== "browse") browseScroll.current = window.scrollY;
      return s;
    });
    if (replace) window.history.replaceState({ step: s }, "");
    else window.history.pushState({ step: s }, "");
  }, []);

  useEffect(() => {
    window.history.replaceState({ step }, "");
    const onPop = (e: PopStateEvent) => setStepState((e.state?.step as Step | undefined) ?? "browse");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move focus and scroll position sensibly on every step change.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      if (step === "browse") return;
    }
    if (step === "browse") {
      requestAnimationFrame(() => window.scrollTo({ top: browseScroll.current, behavior: "instant" as ScrollBehavior }));
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
    }
  }, [step]);

  const chooseService = (s: PublicService) => {
    setService(s);
    setAddonIds([]);
    setSlot(null);
    setNotice(null);
    if (s.locationIds.length > 1) {
      setLocation("any");
      setStep("location");
    } else {
      setLocation(s.locationIds[0]);
      setStep("time");
    }
  };

  const exit = () => setStep("browse");

  const addons = useMemo(() => (service ? data.addons.filter((a) => service.addonIds.includes(a.id)) : []), [service, data.addons]);
  const chosenAddons = addons.filter((a) => addonIds.includes(a.id));
  const multiLocation = !!service && service.locationIds.length > 1;

  if (step === "browse" || !service) {
    return (
      <div id="top" className="min-h-screen bg-rose">
        <SiteHeader businessName={data.businessName} mode="browse" onExit={exit} account={account} accountsEnabled={accountsEnabled} />
        <div className="px-2.5 sm:px-5">
          <main className="mx-auto max-w-[78rem] overflow-clip rounded-[1.75rem] bg-panel shadow-[0_30px_60px_-40px_rgba(58,15,28,0.6)] sm:rounded-[2.25rem]">
            {hero}
            <ServiceMenu data={data} onBook={chooseService} />
            {sections}
          </main>
        </div>
        {footer}
        <StickyBookBar />
      </div>
    );
  }

  const steps: StepDef[] = [
    { key: "service", label: "Service", onGo: exit },
    ...(multiLocation ? [{ key: "location", label: "Location", onGo: () => setStep("location") }] : []),
    { key: "time", label: "Date & time", onGo: () => setStep("time") },
    { key: "details", label: "Your details" },
  ];
  const current = steps.findIndex((s) => s.key === step);
  const titles: Record<Exclude<Step, "browse">, [string, string]> = {
    location: ["Choose a studio", "Pick the location that's easiest for you, or see every open time."],
    time: ["Pick a date & time", addons.length ? "Add any extras, then choose a time that works for you." : "Choose a time that works for you."],
    details: ["Almost done", "Tell me a bit about you, then confirm your booking."],
  };
  const [title, subtitle] = titles[step];
  const query = new URLSearchParams({ serviceId: String(service.id), locationId: String(location), addons: addonIds.join(",") }).toString();
  const summaryProps = { data, service, location, addons: chosenAddons, slot };
  const toDetails = () => slot && setStep("details");

  return (
    <div className="min-h-screen">
      <SiteHeader businessName={data.businessName} mode="booking" onExit={exit} account={account} accountsEnabled={accountsEnabled} />
      <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 sm:px-6 lg:pb-20 lg:pt-10">
        <Stepper steps={steps} current={current} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div key={step} className="min-w-0 animate-rise">
            <h1 ref={headingRef} tabIndex={-1} className="heading text-[clamp(2.3rem,7vw,3.4rem)] outline-none">
              {title}
            </h1>
            <p className="mt-3 text-[1.05rem] text-ink-soft">
              <span className="font-medium text-ink">{prettyName(service.name)}</span> · {subtitle}
            </p>
            {step !== "location" && <MobileSummary {...summaryProps} />}

            {notice && (
              <div role="alert" className="mt-5 rounded-2xl bg-panel px-4 py-3 text-center font-medium ring-1 ring-lacquer">
                {notice}
              </div>
            )}

            {step === "location" && (
              <LocationStep
                data={data}
                service={service}
                onPick={(loc) => {
                  setLocation(loc);
                  setSlot(null);
                  setStep("time");
                }}
              />
            )}

            {step === "time" && (
              <>
                <AddonPicker
                  addons={addons}
                  selected={addonIds}
                  onToggle={(id, on) => {
                    setSlot(null);
                    setAddonIds((ids) => (on ? [...ids, id] : ids.filter((x) => x !== id)));
                  }}
                />
                <h2 className="heading mt-10 text-[1.75rem]">When works for you?</h2>
                <div className="mt-3">
                  <SlotPicker
                    query={query}
                    timezone={data.timezone}
                    selected={slot}
                    onSelect={(s) => {
                      setSlot(s);
                      if (s) setNotice(null);
                    }}
                    emptyMessage={`No online openings right now. Please call or text ${data.phone}.`}
                  />
                </div>
                <div className="mt-6 hidden justify-end sm:flex lg:hidden">
                  <button type="button" className="btn-primary px-8 py-3.5" disabled={!slot} onClick={toDetails}>
                    Continue <IconArrowRight size={16} />
                  </button>
                </div>
              </>
            )}

            {step === "details" && slot && (
              <DetailsStep
                data={data}
                service={service}
                slot={slot}
                location={location}
                addonIds={addonIds}
                chosenAddons={chosenAddons}
                account={account}
                savedAnswers={savedAnswers}
                accountsEnabled={accountsEnabled}
                onSignedIn={(r) => {
                  setAccount(r.account);
                  setSavedAnswers(r.savedAnswers);
                }}
                onSignedOut={() => {
                  setAccount(null);
                  setSavedAnswers({});
                }}
                onSlotTaken={(msg) => {
                  setSlot(null);
                  setNotice(msg);
                  setStep("time", true);
                }}
              />
            )}
          </div>

          <aside className="hidden lg:block" aria-label="Appointment summary">
            <div className="sticky top-24">
              <Summary
                {...summaryProps}
                action={
                  step === "time" ? (
                    <button type="button" className="btn-primary w-full py-3.5" disabled={!slot} onClick={toDetails}>
                      {slot ? "Continue" : "Choose a time"} {slot && <IconArrowRight size={16} />}
                    </button>
                  ) : undefined
                }
              />
            </div>
          </aside>
        </div>
      </main>

      {step === "time" && slot && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-brass bg-panel px-4 py-3 shadow-[0_-12px_30px_-20px_rgba(58,15,28,0.5)] sm:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0 text-sm leading-tight">
              <p className="font-medium">{slotLabel(slot, data.timezone)}</p>
              <p className="truncate text-ink-soft">{prettyName(service.name)}</p>
            </div>
            <button type="button" className="btn-primary shrink-0 px-6 py-3" onClick={toDetails}>
              Continue <IconArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Phone-only "Book" bar that appears once the visitor scrolls past the hero and away from the menu. */
function StickyBookBar() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.getElementById("hero-title")?.closest("section");
    const menu = document.getElementById("services");
    if (!hero || !menu) return;
    let heroVisible = true;
    let menuVisible = false;
    const update = () => setShow(!heroVisible && !menuVisible);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === menu) menuVisible = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    io.observe(menu);
    return () => io.disconnect();
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 px-4 pb-4 transition duration-300 sm:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"}`}
      aria-hidden={!show}
    >
      <a href="#services" tabIndex={show ? 0 : -1} className="btn-primary w-full py-4 shadow-[0_14px_34px_-12px_rgba(58,15,28,0.75)]">
        Book an appointment <IconArrowRight size={18} />
      </a>
    </div>
  );
}
