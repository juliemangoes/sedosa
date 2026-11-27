/**
 * The studio's type wordmark: the name in spaced capitals with the rest of the
 * business name set small beneath, spread to exactly the same width.
 */
export default function Wordmark({ businessName, size = "md", tone = "oxblood" }: { businessName: string; size?: "md" | "lg"; tone?: "oxblood" | "light" }) {
  const [first, ...rest] = businessName.split(" ");
  const sub = rest.join(" ");
  return (
    <span className="inline-flex flex-col leading-none">
      <span className={`heading tracking-[0.12em] [margin-right:-0.12em] ${size === "lg" ? "text-[1.9rem]" : "text-[1.55rem]"}`}>{first}</span>
      {sub && (
        // w-0 + min-w-full: the line takes the name's width without widening it, and the letters spread edge to edge.
        <span className={`relative flex w-0 min-w-full justify-between font-medium uppercase ${size === "lg" ? "mt-1.5 text-[0.6rem]" : "mt-1 text-[0.5rem]"} ${tone === "light" ? "text-brass-light" : ""}`}>
          <span className="sr-only">{sub}</span>
          {[...sub].map((ch, i) =>
            ch === " " ? (
              <span key={i} aria-hidden="true" className="w-[0.3em]" />
            ) : (
              <span key={i} aria-hidden="true">
                {ch}
              </span>
            ),
          )}
        </span>
      )}
    </span>
  );
}
