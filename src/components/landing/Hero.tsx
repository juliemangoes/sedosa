import Image from "next/image";
import logo from "@/assets/brand/logo.png";
import logoMask from "@/assets/brand/logo-mask.png";
import portrait from "@/assets/brand/portrait.png";
import type { PublicData } from "@/components/booking/types";
import { placesLabel } from "@/lib/display";
import { IconArrowRight, IconClock, IconPin, Sparkle } from "./icons";

export default function Hero({ data }: { data: PublicData }) {
  const where = placesLabel(data.locations.map((l) => l.city)) || "Georgia";
  const mask = `url(${logoMask.src})`;
  return (
    <section aria-labelledby="hero-title" className="on-dark relative isolate overflow-hidden bg-noir text-[#fde7f5]">
      {/* Drifting glow + satin backdrop */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 size-[34rem] animate-drift rounded-full bg-neon/25 blur-[120px]" />
        <div className="absolute -bottom-48 right-[-10rem] size-[38rem] animate-drift rounded-full bg-[#9b2f86]/30 blur-[140px] [animation-delay:-8s] [animation-duration:20s]" />
        <div className="absolute left-1/3 top-1/2 size-[18rem] animate-drift rounded-full bg-neon/10 blur-[100px] [animation-delay:-4s] [animation-duration:24s]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_60%)]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-5 px-4 pb-14 pt-6 sm:gap-8 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:pb-24 lg:pt-14">
        <div className="relative order-2 text-center lg:order-1 lg:text-left">
          <p className="kicker animate-rise text-[0.8rem] text-neon-soft sm:text-sm">Welcome to my booking site ♡</p>
          <h1 id="hero-title" className="relative mt-3 animate-rise [animation-delay:80ms]">
            <span className="sr-only">{data.businessName}</span>
            <span className="relative mx-auto block w-[min(100%,22rem)] sm:w-[min(100%,30rem)] lg:mx-0 lg:-ml-3 lg:w-[min(100%,34rem)]">
              <Image src={logo} alt="" loading="eager" sizes="(min-width: 1024px) 34rem, 90vw" className="h-auto w-full" />
              <span aria-hidden="true" className="logo-shine pointer-events-none absolute inset-0 animate-shine" style={{ maskImage: mask, WebkitMaskImage: mask }} />
              <Sparkle className="absolute -right-1 top-[18%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff] [animation-delay:400ms]" size={14} />
              <Sparkle className="absolute bottom-[14%] left-[2%] animate-twinkle text-neon-soft [animation-delay:1.6s]" size={11} />
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl animate-rise text-lg leading-relaxed text-[#f6d9ec] [animation-delay:160ms] sm:text-xl lg:mx-0">
            Brows, Korean lash lifts, PMU &amp; waxing in {where}. Pick a service, choose a time and you&apos;re booked in minutes.
          </p>

          <div className="mt-7 flex animate-rise flex-col [animation-delay:240ms] sm:flex-row sm:justify-center lg:justify-start">
            <a href="#services" className="group btn-neon animate-cta-glow px-8 py-4 text-sm">
              Book an appointment <IconArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>

          <ul className="mt-8 flex flex-wrap justify-center gap-2.5 text-[0.95rem] lg:justify-start">
            <li className="flex animate-rise items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-white/10 [animation-delay:320ms]">
              <IconClock className="shrink-0 text-neon" />
              <span>{data.hoursHeadline}</span>
            </li>
            <li className="flex animate-rise items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 ring-1 ring-white/10 [animation-delay:400ms]">
              <IconPin className="shrink-0 text-neon" />
              <span>{where}</span>
            </li>
          </ul>
        </div>

        <div className="relative order-1 mx-auto w-40 animate-rise sm:w-64 lg:order-2 lg:w-full lg:max-w-[30rem]">
          <div className="relative animate-float">
            <div aria-hidden="true" className="absolute inset-[8%] -z-10 animate-breathe rounded-full bg-neon/40 blur-3xl" />
            <Image
              src={portrait}
              alt={`Your artist at ${data.businessName}`}
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 30rem, (min-width: 640px) 16rem, 10rem"
              className="h-auto w-full drop-shadow-[0_0_40px_rgba(255,92,191,0.35)]"
              placeholder="blur"
            />
          </div>
          <Sparkle className="absolute left-[6%] top-[8%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff]" size={22} />
          <Sparkle className="absolute bottom-[12%] right-[4%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff] [animation-delay:900ms]" size={18} />
          <Sparkle className="absolute right-[14%] top-[2%] animate-twinkle text-neon-soft [animation-delay:1.5s]" size={12} />
          <Sparkle className="absolute bottom-[28%] left-[-2%] animate-twinkle text-neon-soft [animation-delay:2.1s]" size={10} />
        </div>
      </div>
    </section>
  );
}
