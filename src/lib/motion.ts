import type { CSSProperties } from "react";

/** Style for staggering [data-reveal] elements, e.g. revealDelay(i * 90). */
export function revealDelay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

/** Index variable for .reveal-pop children (each pops in a little after the last). */
export function popIndex(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}
