/** The studio's type wordmark: the name in spaced capitals with the rest of the business name set small beneath. */
export default function Wordmark({ businessName, size = "md", tone = "oxblood" }: { businessName: string; size?: "md" | "lg"; tone?: "oxblood" | "light" }) {
  const [first, ...rest] = businessName.split(" ");
  return (
    <span className="flex flex-col leading-none">
      <span className={`heading tracking-[0.12em] [margin-right:-0.12em] ${size === "lg" ? "text-[1.9rem]" : "text-[1.55rem]"}`}>{first}</span>
      {rest.length > 0 && (
        <span className={`mt-0.5 font-medium uppercase tracking-[0.32em] ${size === "lg" ? "mt-1 text-[0.62rem]" : "text-[0.58rem]"} ${tone === "light" ? "text-brass-light" : ""}`}>{rest.join(" ")}</span>
      )}
    </span>
  );
}
