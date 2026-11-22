/** Line icons for service categories, picked from the category name. */

type Kind = "brows" | "lashes" | "packages" | "removal" | "pmu" | "waxing" | "other";

export function categoryKind(name: string): Kind {
  const n = name.toLowerCase();
  if (/remov/.test(n)) return "removal";
  if (/package|bundle|\+/.test(n)) return "packages";
  if (/lash|kll/.test(n)) return "lashes";
  if (/pmu|ombr|powder|microblad/.test(n)) return "pmu";
  if (/wax/.test(n)) return "waxing";
  if (/brow/.test(n)) return "brows";
  return "other";
}

export default function CategoryIcon({ name, size = 22, className = "" }: { name: string; size?: number; className?: string }) {
  const kind = categoryKind(name);
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    className,
  };
  switch (kind) {
    case "brows":
      return (
        <svg {...p}>
          <path d="M3 13.5c3-4.5 8.5-6 13.5-4.6 1.8.5 3.3 1.4 4.5 2.6" />
          <path d="M3 13.5c4-2.3 9-2.7 13.6-1.2" />
          <path d="M7 17.5h10" opacity=".45" />
        </svg>
      );
    case "lashes":
      return (
        <svg {...p}>
          <path d="M3 13c2.5-3 5.6-4.5 9-4.5s6.5 1.5 9 4.5" />
          <path d="M3 13c2.5 2.6 5.6 3.9 9 3.9s6.5-1.3 9-3.9" />
          <circle cx="12" cy="12.8" r="2.3" />
          <path d="M6 9.2 4.8 7M9 7.9l-.6-2.4M12 7.5V5M15 7.9l.6-2.4M18 9.2 19.2 7" />
        </svg>
      );
    case "packages":
      return (
        <svg {...p}>
          <path d="M9 3c.4 3.6 2.4 5.6 6 6-3.6.4-5.6 2.4-6 6-.4-3.6-2.4-5.6-6-6 3.6-.4 5.6-2.4 6-6Z" />
          <path d="M17.5 13c.25 2.2 1.3 3.25 3.5 3.5-2.2.25-3.25 1.3-3.5 3.5-.25-2.2-1.3-3.25-3.5-3.5 2.2-.25 3.25-1.3 3.5-3.5Z" />
        </svg>
      );
    case "removal":
      return (
        <svg {...p}>
          <path d="M3 12c2.5-3 5.6-4.5 9-4.5s6.5 1.5 9 4.5c-2.5 3-5.6 4.5-9 4.5S5.5 15 3 12Z" />
          <circle cx="12" cy="12" r="2.3" />
          <path d="M4 20 20 4" opacity=".55" />
        </svg>
      );
    case "pmu":
      return (
        <svg {...p}>
          <path d="m14.5 4.5 5 5L9 20H4v-5L14.5 4.5Z" />
          <path d="m12.5 6.5 5 5" />
          <path d="M4 15h3.5" opacity=".5" />
        </svg>
      );
    case "waxing":
      return (
        <svg {...p}>
          <path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5Z" />
          <path d="M9.2 14.6a2.9 2.9 0 0 0 2.6 2.6" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M12 2.5c.6 5.2 4.3 8.9 9.5 9.5-5.2.6-8.9 4.3-9.5 9.5-.6-5.2-4.3-8.9-9.5-9.5 5.2-.6 8.9-4.3 9.5-9.5Z" />
        </svg>
      );
  }
}
