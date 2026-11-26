"use client";

import { useEffect, useState } from "react";
import { IconChevronLeft } from "@/components/landing/icons";
import Wordmark from "@/components/landing/Wordmark";
import type { AccountProfile } from "@/components/account/SignInPanel";

type Props = {
  businessName: string;
  mode: "browse" | "booking";
  onExit: () => void;
  account?: AccountProfile | null;
  accountsEnabled?: boolean;
};

function AccountLink({ account }: { account: AccountProfile | null }) {
  const initial = (account?.firstName || account?.email || "?").slice(0, 1).toUpperCase();
  return (
    <a
      href="/account"
      className="group flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm sm:pr-2"
      aria-label={account ? `My account${account.firstName ? `, signed in as ${account.firstName}` : ""}` : "Sign in to your account"}
    >
      <span
        aria-hidden="true"
        className={`grid size-10 place-items-center rounded-full transition duration-200 ${
          account ? "font-display bg-oxblood text-lg text-brass-light" : "ring-1 ring-oxblood group-hover:bg-oxblood group-hover:text-plaster"
        }`}
      >
        {account ? (
          initial
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <circle cx="12" cy="8.5" r="3.8" />
            <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
          </svg>
        )}
      </span>
      <span className="hidden text-[0.8rem] font-medium uppercase tracking-[0.14em] lg:inline">{account ? "My account" : "Sign in"}</span>
    </a>
  );
}

const navLink = "py-2 text-[0.8rem] font-medium uppercase tracking-[0.16em] underline-offset-[0.5em] hover:underline";

export default function SiteHeader({ businessName, mode, onExit, account = null, accountsEnabled = false }: Props) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`on-rose sticky top-0 z-30 bg-rose text-oxblood transition-shadow duration-300 ${
        scrolled ? "shadow-[0_1px_0_var(--color-brass),0_14px_30px_-20px_rgba(58,15,28,0.6)]" : ""
      }`}
    >
      {mode === "browse" && (
        <a
          href="#services"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-oxblood focus:px-5 focus:py-2.5 focus:text-plaster"
        >
          Skip to services
        </a>
      )}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {mode === "browse" ? (
          <a href="#top" className="rounded-lg" aria-label={`${businessName}, back to top`}>
            <Wordmark businessName={businessName} />
          </a>
        ) : (
          <button type="button" onClick={onExit} className="rounded-lg text-left" aria-label={`${businessName}, back to services`}>
            <Wordmark businessName={businessName} />
          </button>
        )}

        {mode === "browse" ? (
          <>
            <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
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
            <div className="flex items-center gap-2 sm:gap-3">
              {(accountsEnabled || account) && <AccountLink account={account} />}
              <a href="#services" className="btn-primary min-h-0 px-5 py-2.5">
                Book now
              </a>
            </div>
          </>
        ) : (
          <button type="button" onClick={onExit} className="btn-secondary min-h-0 px-4 py-2.5">
            <IconChevronLeft size={16} /> All services
          </button>
        )}
      </div>
    </header>
  );
}
