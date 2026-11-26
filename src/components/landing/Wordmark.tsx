/** The studio's type wordmark: the name in Bodoni with the rest of the business name set small beneath. */
export default function Wordmark({ businessName, size = "md", tone = "oxblood" }: { businessName: string; size?: "md" | "lg"; tone?: "oxblood" | "light" }) {
  const [first, ...rest] = businessName.split(" ");
  return (
    <span className="flex flex-col leading-none">
      <span className={`font-display font-medium tracking-[0.02em] ${size === "lg" ? "text-3xl" : "text-[1.7rem]"}`}>{first}</span>
      {rest.length > 0 && (
        <span className={`mt-0.5 font-medium uppercase tracking-[0.32em] ${size === "lg" ? "mt-1 text-[0.62rem]" : "text-[0.58rem]"} ${tone === "light" ? "text-brass-light" : ""}`}>{rest.join(" ")}</span>
      )}
    </span>
  );
}
