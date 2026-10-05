// Status pills (Sleeve's "● Open · closes in 4d 12h") and small chips.

type Tone = "up" | "down" | "neutral" | "ink";

const tones: Record<Tone, string> = {
  up: "bg-up-bg text-up",
  down: "bg-down-bg text-down",
  neutral: "bg-surface text-muted border border-line",
  ink: "bg-ink text-bg",
};

export function Pill({ tone = "neutral", dot = false, children, className = "" }: { tone?: Tone; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${tones[tone]} ${className}`}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

/** ▲ 1.24% / ▼ 0.80% — colour is never the only signal. */
export function Change({ pct, className = "" }: { pct: number; className?: string }) {
  const up = pct >= 0;
  return (
    <span className={`t-num inline-flex items-center gap-0.5 ${up ? "text-up" : "text-down"} ${className}`}>
      <span aria-hidden="true" className="text-[0.7em]">{up ? "▲" : "▼"}</span>
      <span className="sr-only">{up ? "up" : "down"}</span>
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
}
