"use client";

import { useEffect } from "react";

/**
 * Drives the [data-reveal] scroll animations (see globals.css).
 * Anything already on screen when it starts is shown as-is, so there's no flash;
 * everything else eases in as it scrolls into view, including content added later.
 * With reduced motion, or without IntersectionObserver, it does nothing and all
 * content simply stays visible.
 */
export default function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const show = (el: Element) => el.setAttribute("data-revealed", "");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            show(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );

    const seen = new WeakSet<Element>();
    let ready = false;
    const track = (el: Element) => {
      if (seen.has(el) || el.hasAttribute("data-revealed")) return;
      seen.add(el);
      if (!ready) {
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) return show(el);
      }
      io.observe(el);
    };

    document.querySelectorAll("[data-reveal]").forEach(track);
    ready = true;
    root.setAttribute("data-reveal-ready", "");

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.matches("[data-reveal]")) track(n);
          n.querySelectorAll("[data-reveal]").forEach(track);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
      root.removeAttribute("data-reveal-ready");
    };
  }, []);
  return null;
}
