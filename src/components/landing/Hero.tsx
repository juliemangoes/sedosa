import Image from "next/image";
import logo from "@/assets/brand/logo.png";
import logoMask from "@/assets/brand/logo-mask.png";
import portrait from "@/assets/brand/portrait.png";
import type { PublicData } from "@/components/booking/types";
import { categoryLabel, placesLabel } from "@/lib/display";
import CategoryIcon from "./CategoryIcon";
import { IconArrowRight, IconChevronDown, IconClock, IconPin, Sparkle } from "./icons";

/**
 * Phones & tablets: a "poster" — portrait with the chrome logo overlapping it,
 * one line, a full-width Book button and category shortcuts, sized to fit the
 * first screen. Desktop: two columns at viewport height with a scroll cue.
 */
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

      <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-6xl flex-col justify-center px-4 pb-14 pt-5 sm:px-6 sm:pb-20 lg:min-h-[min(calc(100svh-4rem),54rem)] lg:pb-24 lg:pt-10">
        <div className="grid grid-cols-1 justify-items-center [grid-template-areas:'kicker''portrait''logo''text'] lg:grid-cols-[1.1fr_0.9fr] lg:content-center lg:justify-items-start lg:gap-x-12 lg:[grid-template-areas:'kicker_portrait''logo_portrait''text_portrait']">
          <p className="kicker animate-rise text-center text-[0.78rem] text-neon-soft [grid-area:kicker] sm:text-sm lg:self-end lg:text-left">Welcome to my booking site ♡</p>

          <div className="relative mt-3 w-[min(62vw,16rem)] animate-settle [grid-area:portrait] sm:w-72 lg:mt-0 lg:w-full lg:max-w-[30rem] lg:self-center lg:justify-self-end">
            <div className="relative animate-float">
              <div aria-hidden="true" className="absolute inset-[8%] -z-10 animate-breathe rounded-full bg-neon/40 blur-3xl" />
              <Image
                src={portrait}
                alt={`Your artist at ${data.businessName}`}
                loading="eager"
                fetchPriority="high"
                sizes="(min-width: 1024px) 30rem, (min-width: 640px) 18rem, 62vw"
                className="h-auto w-full drop-shadow-[0_0_40px_rgba(255,92,191,0.35)]"
                placeholder="blur"
              />
            </div>
            <Sparkle className="absolute left-[6%] top-[8%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff]" size={22} />
            <Sparkle className="absolute bottom-[12%] right-[4%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff] [animation-delay:900ms]" size={18} />
            <Sparkle className="absolute right-[14%] top-[2%] animate-twinkle text-neon-soft [animation-delay:1.5s]" size={12} />
            <Sparkle className="absolute bottom-[28%] left-[-2%] animate-twinkle text-neon-soft [animation-delay:2.1s]" size={10} />
          </div>

          <h1 id="hero-title" className="relative z-10 -mt-[14%] w-[min(92vw,23rem)] animate-settle [animation-delay:90ms] [grid-area:logo] sm:-mt-20 sm:w-[30rem] lg:-ml-3 lg:mt-3 lg:w-[min(100%,34rem)]">
            <span className="sr-only">{data.businessName}</span>
            <span className="relative block">
              <Image src={logo} alt="" loading="eager" fetchPriority="high" sizes="(min-width: 1024px) 34rem, (min-width: 640px) 30rem, 92vw" className="h-auto w-full" />
              <span aria-hidden="true" className="logo-shine pointer-events-none absolute inset-0 animate-shine" style={{ maskImage: mask, WebkitMaskImage: mask }} />
              <Sparkle className="absolute -right-1 top-[18%] animate-twinkle text-white drop-shadow-[0_0_8px_#fff] [animation-delay:400ms]" size={14} />
            </span>
          </h1>

          <div className="flex w-full flex-col items-center text-center [grid-area:text] lg:items-start lg:text-left">
            <p className="mt-2 max-w-md animate-rise text-[1.08rem] leading-relaxed text-[#f6d9ec] [animation-delay:160ms] sm:mt-4 sm:max-w-xl sm:text-xl">
              Brows, Korean lash lifts, PMU &amp; waxing in {where}.<span className="hidden sm:inline"> Pick a service, choose a time and you&apos;re booked in minutes.</span>
            </p>

            <a href="#services" className="group btn-neon mt-6 w-full max-w-sm animate-rise animate-cta-glow px-8 py-4 text-sm [animation-delay:240ms] sm:w-auto">
              Book an appointment <IconArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </a>

            <nav aria-label="Jump to a category" className="mt-6 w-full animate-rise [animation-delay:320ms]">
              <ul className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-24px),transparent)] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 sm:[mask-image:none] lg:justify-start">
                {data.categories.map((c) => (
                  <li key={c.id} className="shrink-0">
                    <a
                      href={`#cat-${c.id}`}
                      className="flex items-center gap-2 rounded-full bg-white/[0.07] px-3.5 py-2 text-sm ring-1 ring-white/12 transition hover:bg-white/[0.14] hover:ring-neon/50"
                    >
                      <CategoryIcon name={c.name} size={17} className="text-neon" />
                      {categoryLabel(c.name)}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <p className="mt-5 flex animate-rise flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-[#e9c9de] [animation-delay:400ms] lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <IconClock size={16} className="text-neon" /> {data.hoursHeadline}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <IconPin size={16} className="text-neon" /> {where}
              </span>
            </p>
          </div>
        </div>
      </div>

      <a
        href="#services"
        className="absolute bottom-20 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-[#e9c9de] transition hover:text-white lg:flex"
        aria-label="Scroll to the menu"
      >
        <span className="kicker text-xs">Explore the menu</span>
        <IconChevronDown className="animate-bounce [animation-duration:2s]" />
      </a>

      {/* Soft curve into the menu */}
      <svg aria-hidden="true" viewBox="0 0 1440 64" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-px h-8 w-full text-blush sm:h-12 lg:h-16">
        <path d="M0 64V40C240 8 480 0 720 0s480 8 720 40v24H0Z" fill="currentColor" />
      </svg>
    </section>
  );
}
