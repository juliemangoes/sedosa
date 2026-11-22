"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import logo from "@/assets/brand/logo.png";
import { IconChevronLeft } from "@/components/landing/icons";

type Props = { businessName: string; mode: "browse" | "booking"; onExit: () => void };

const navLink =
  "relative py-1 transition-colors hover:text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-center after:scale-x-0 after:bg-neon after:transition-transform after:duration-300 hover:after:scale-x-100";

export default function SiteHeader({ businessName, mode, onExit }: Props) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const brand = (
    <>
      <Image src={logo} alt="" sizes="120px" className="h-10 w-auto transition duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_12px_rgba(255,92,191,0.75)]" />
      <span className="sr-only">{businessName}</span>
    </>
  );
  return (
    <header
      className={`on-dark sticky top-0 z-30 border-b text-[#fde7f5] backdrop-blur-md transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled ? "border-white/10 bg-noir/95 shadow-[0_12px_32px_-14px_rgba(0,0,0,0.7)]" : "border-transparent bg-noir/80"
      }`}
    >
      {mode === "browse" && (
        <a
          href="#services"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-neon focus:px-5 focus:py-2.5 focus:font-semibold focus:text-black"
        >
          Skip to services
        </a>
      )}
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {mode === "browse" ? (
          <a href="#top" className="group -ml-1 flex items-center rounded-lg" aria-label={`${businessName}, back to top`}>
            {brand}
          </a>
        ) : (
          <button type="button" onClick={onExit} className="group -ml-1 flex items-center rounded-lg" aria-label={`${businessName}, back to services`}>
            {brand}
          </button>
        )}

        {mode === "browse" ? (
          <>
            <nav aria-label="Sections" className="hidden items-center gap-7 text-sm md:flex">
              <a href="#services" className={navLink}>
                Services
              </a>
              <a href="#policies" className={navLink}>
                Policies
              </a>
              <a href="#prep" className={navLink}>
                Prep
              </a>
              <a href="#visit" className={navLink}>
                Visit
              </a>
            </nav>
            <a href="#services" className="btn-neon px-5 py-2.5 hover:-translate-y-px">
              Book now
            </a>
          </>
        ) : (
          <button type="button" onClick={onExit} className="btn-ghost px-4 py-2.5">
            <IconChevronLeft size={16} /> All services
          </button>
        )}
      </div>
    </header>
  );
}
