"use client";

import Image from "next/image";
import logo from "@/assets/brand/logo.png";
import { IconChevronLeft } from "@/components/landing/icons";

type Props = { businessName: string; mode: "browse" | "booking"; onExit: () => void };

export default function SiteHeader({ businessName, mode, onExit }: Props) {
  const brand = (
    <>
      <Image src={logo} alt="" sizes="120px" className="h-10 w-auto" />
      <span className="sr-only">{businessName}</span>
    </>
  );
  return (
    <header className="on-dark sticky top-0 z-30 border-b border-white/10 bg-noir/90 text-[#fde7f5] backdrop-blur-md">
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
          <a href="#top" className="-ml-1 flex items-center rounded-lg" aria-label={`${businessName}, back to top`}>
            {brand}
          </a>
        ) : (
          <button type="button" onClick={onExit} className="-ml-1 flex items-center rounded-lg" aria-label={`${businessName}, back to services`}>
            {brand}
          </button>
        )}

        {mode === "browse" ? (
          <>
            <nav aria-label="Sections" className="hidden items-center gap-7 text-sm md:flex">
              <a href="#services" className="hover:text-white">
                Services
              </a>
              <a href="#policies" className="hover:text-white">
                Policies
              </a>
              <a href="#prep" className="hover:text-white">
                Prep
              </a>
              <a href="#visit" className="hover:text-white">
                Visit
              </a>
            </nav>
            <a href="#services" className="btn-neon px-5 py-2.5">
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
