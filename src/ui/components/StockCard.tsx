// Stock card: Kickoff's player card redrawn for stocks (docs/UI.md §3.3).
// Portrait card in one of the brand colours (ink, mint or paper), huge ticker stacked twice (filled + outlined),
// logo top-right, League of Stocks mark bottom-right, frosted price strip.
//
// Everything is sized in `em` off the card's own font-size, so one design
// scales from the landing deck (218px) down to a chip in an ETF hand (56px).

import type { StockInfo } from "../data/stocks";
import { LogoMark } from "./Logo";
import { BRAND } from "../data/palette";

export const CARD_W = 218;
export const CARD_H = 312;

export interface StockCardProps {
  stock: StockInfo;
  /** Rendered width in px; height follows the 7:10 ratio. */
  width?: number;
  changePct?: number;
  /** Shows a weight badge instead of the price strip (ETF hands). */
  weightPct?: number;
  logoUrl?: string;
  /** Hide the bottom strip entirely (tiny cards). */
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StockCard({ stock, width = CARD_W, changePct, weightPct, logoUrl, compact, className = "", style }: StockCardProps) {
  const dark = stock.ink === "dark";
  const logo = logoUrl ?? stock.logo;
  const fg = dark ? BRAND.ink : BRAND.paper;
  const len = stock.ticker.length;
  // Fit the ticker to the card: ~0.68em per glyph (semibold, tight) across
  // ~11.4em of usable width (the card is 13.6em wide).
  const tickerEm = Math.min(4.2, 11.4 / (len * 0.68));

  return (
    <div
      className={`relative overflow-hidden select-none ${className}`}
      style={{
        width,
        height: (width * CARD_H) / CARD_W,
        fontSize: (width / CARD_W) * 16,
        borderRadius: "1.75em",
        background: stock.color,
        color: fg,
        // A paper card needs an edge to stand off a paper page.
        boxShadow: stock.color === BRAND.paper ? "inset 0 0 0 1px rgb(0 0 0 / .08)" : undefined,
        ...style,
      }}
      aria-label={`${stock.name} (${stock.ticker}) card`}
    >
      {/* Light sheen + depth, like a printed card. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 70% at 0% 0%, rgb(255 255 255 / ${dark ? 0.35 : 0.22}), transparent 55%), radial-gradient(90% 60% at 100% 100%, rgb(0 0 0 / ${dark ? 0.12 : 0.28}), transparent 60%)`,
        }}
      />

      {/* The company logo as a large, clear watermark, blended into the card colour. */}
      {logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute max-w-none"
          style={{
            width: "118%",
            right: "-38%",
            bottom: compact ? "-30%" : "-8%",
            transform: "rotate(-12deg)",
            borderRadius: "50%",
            filter: "grayscale(1) contrast(1.25)",
            mixBlendMode: dark ? "multiply" : "screen",
            opacity: dark ? 0.22 : 0.3,
          }}
        />
      )}

      {/* Top row: kind chip + logo */}
      <div className="absolute flex items-center justify-between" style={{ top: "0.9em", left: "0.9em", right: "0.9em" }}>
        {!compact ? (
          <span
            className="font-medium uppercase"
            style={{ fontSize: "0.62em", letterSpacing: "0.12em", padding: "0.35em 0.8em", borderRadius: 999, background: dark ? "rgb(0 0 0 / .08)" : "rgb(255 255 255 / .16)" }}
          >
            {stock.kind === "etf" ? "Fund" : "bStock"}
          </span>
        ) : (
          <span />
        )}
        <span
          className="grid place-items-center overflow-hidden font-semibold"
          style={{
            width: logo ? "2.5em" : "2.1em",
            height: logo ? "2.5em" : "2.1em",
            borderRadius: 999,
            background: dark ? BRAND.ink : BRAND.paper,
            color: dark ? BRAND.paper : BRAND.ink,
            fontSize: "0.95em",
            boxShadow: "0 2px 8px rgb(0 0 0 / .18)",
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={`${stock.name} logo`} className="size-full object-cover" />
          ) : (
            stock.ticker[0]
          )}
        </span>
      </div>

      {/* Huge stacked ticker */}
      <div
        className="absolute font-sans font-semibold uppercase"
        style={{ left: "0.55em", right: "0.4em", top: compact ? "26%" : "21%", fontSize: `${tickerEm}em`, lineHeight: 0.86, letterSpacing: "-0.05em" }}
      >
        <div>{stock.ticker}</div>
        <div className="ticker-outline" style={{ ["--outline" as string]: fg, opacity: 0.9 }}>
          {stock.ticker}
        </div>
        {!compact && (
          <div
            className="font-sans font-medium normal-case"
            style={{ fontSize: `${0.82 / tickerEm}em`, letterSpacing: "-0.01em", marginTop: "0.9em", opacity: 0.85, lineHeight: 1.2 }}
          >
            {stock.name}
          </div>
        )}
      </div>

      {/* Bottom: frosted strip with price, or a weight badge */}
      {weightPct !== undefined ? (
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between" style={{ padding: "0 0.8em 0.8em" }}>
          <span
            className="t-num font-medium"
            style={{ fontSize: "1.5em", padding: "0.15em 0.5em", borderRadius: "0.6em", background: dark ? "rgb(255 255 255 / .55)" : "rgb(0 0 0 / .28)" }}
          >
            {weightPct}%
          </span>
        </div>
      ) : (
        !compact && (
          <div
            className="absolute flex items-center justify-between"
            style={{
              left: "0.6em",
              right: "0.6em",
              bottom: "0.6em",
              padding: "0.55em 0.7em",
              borderRadius: "1.1em",
              background: dark ? "rgb(255 255 255 / .55)" : "rgb(0 0 0 / .26)",
              backdropFilter: "blur(10px)",
            }}
          >
            <span className="leading-tight">
              <span className="t-num block font-medium" style={{ fontSize: "1em" }}>
                ${stock.price.toFixed(2)}
              </span>
              {changePct !== undefined && (
                <span className="t-num block" style={{ fontSize: "0.72em", opacity: 0.9 }}>
                  {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </span>
              )}
            </span>
            <LogoMark size={(width / CARD_W) * 22} />
          </div>
        )
      )}
    </div>
  );
}
