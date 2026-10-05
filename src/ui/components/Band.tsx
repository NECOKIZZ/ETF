// Kickoff's overlapping rounded "lips": each section is a sheet whose rounded
// top slides over the section above.

type Tone = "white" | "surface" | "mint" | "black";

const tones: Record<Tone, string> = {
  white: "bg-bg text-ink",
  surface: "bg-surface text-ink",
  mint: "mint-gradient text-ink",
  black: "bg-brand-ink text-brand-paper",
};

export function Band({ tone = "white", overlap = true, children, className = "", z = 1 }: { tone?: Tone; overlap?: boolean; children: React.ReactNode; className?: string; z?: number }) {
  return (
    <section
      className={`relative rounded-t-[32px] md:rounded-t-[48px] ${overlap ? "-mt-8 md:-mt-14" : ""} ${tones[tone]} ${className}`}
      style={{ zIndex: z, boxShadow: overlap ? "0 -12px 40px rgb(0 0 0 / .06)" : undefined }}
    >
      {children}
    </section>
  );
}
