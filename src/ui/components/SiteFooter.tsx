import { LogoMark } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const cols = [
  { title: "Play", links: ["League", "Create an ETF", "Leaderboard", "Rules"] },
  { title: "Build", links: ["Agents", "API", "Contracts", "Verify a round"] },
  { title: "About", links: ["How it works", "BNB Hack", "GitHub", "Risk notice"] },
];

/** Line-art candle range: a quiet nod to Gloam's engraved landscape. */
function CandleRange() {
  const candles = Array.from({ length: 64 }, (_, i) => {
    const base = 140 - 60 * Math.sin(i / 9) - 30 * Math.sin(i / 3.7) - i * 0.4;
    const body = 14 + ((i * 37) % 23);
    const up = (i * 13) % 5 > 1;
    return { x: 12 + i * 21, y: base - body / 2, body, wick: body + 16 + ((i * 7) % 14), up };
  });
  return (
    <svg viewBox="0 0 1360 220" className="h-auto w-full" aria-hidden="true">
      {candles.map((c) => (
        <g key={c.x} stroke="currentColor" strokeWidth="1.2" fill={c.up ? "none" : "currentColor"} opacity={0.75}>
          <line x1={c.x + 5} x2={c.x + 5} y1={c.y - (c.wick - c.body) / 2} y2={c.y + c.body + (c.wick - c.body) / 2} />
          <rect x={c.x} y={c.y} width="10" height={c.body} rx="2" />
        </g>
      ))}
      <path d="M0 200 C 220 170, 420 205, 680 180 S 1120 150, 1360 190 L1360 220 L0 220 Z" fill="currentColor" opacity="0.08" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="px-3 pb-3 md:px-6 md:pb-6">
      <div className="overflow-hidden rounded-[32px] bg-[#0B0B0C] text-[#F4F5F7] md:rounded-[48px]">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-6 pt-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-12">
          <div>
            <span className="inline-flex items-center gap-2">
              <LogoMark />
              <span className="t-heading text-[19px]">League of Stocks</span>
            </span>
            <p className="t-display mt-6 max-w-[16ch] text-[30px]">Build an ETF. Beat the league.</p>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="t-label text-white/60">{c.title}</div>
              <div className="mt-2 h-px w-6 bg-white/30" />
              <ul className="mt-5 space-y-3 text-[15px] text-white/85">
                {c.links.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-14 flex max-w-[1180px] flex-col gap-4 px-6 md:flex-row md:items-center md:justify-between md:px-12">
          <p className="max-w-[60ch] text-[13px] text-white/55">
            © 2026 League of Stocks. &ldquo;ETF&rdquo; here means an on-chain basket of tokenized stocks, not a regulated fund. Capital is at risk. Not available in restricted
            regions.
          </p>
          <ThemeToggle />
        </div>
        <div className="mt-10 text-white/70">
          <CandleRange />
        </div>
      </div>
    </footer>
  );
}
