// Stock card, built from the design handoff (docs/design/stock-card/README.md).
// Black card, the stock's own colour glowing up from below, a huge ticker
// (solid + outline), the logo as a watermark, and a white price bar.
//
// Sizes: big 218×312 (landing deck) · medium 150×215 (pickers) ·
// tiny64 64×84 (ETF hands) · tiny48 48×62 · tiny34 34×34 (table rows).

import type { StockInfo } from "../data/stocks";
import { CARD } from "../data/palette";
import { CardAddButton } from "./CardAddButton";

export type CardSize = "big" | "medium" | "tiny64" | "tiny48" | "tiny34";

export const CARD_SIZES: Record<CardSize, { w: number; h: number; r: number }> = {
  big: { w: 218, h: 312, r: 22 },
  medium: { w: 150, h: 215, r: 16 },
  tiny64: { w: 64, h: 84, r: 12 },
  tiny48: { w: 48, h: 62, r: 10 },
  tiny34: { w: 34, h: 34, r: 10 },
};

export interface StockCardProps {
  stock: StockInfo;
  size?: CardSize;
  /** Live price; defaults to the stock's listed price. */
  price?: number;
  changePct?: number;
  weightPct?: number;
  /** Show the weight pill on a big card. */
  showWeight?: boolean;
  /** The + button on a big card. */
  onAdd?: () => void;
  addLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

const display = "var(--font-archivo), ui-sans-serif, system-ui, sans-serif";
const mono = "var(--font-jbmono), ui-monospace, monospace";

const tickerPx = (len: number, big: boolean) => (big ? (len >= 5 ? 50 : len === 4 ? 60 : 72) : len >= 5 ? 34 : len === 4 ? 41 : 50);

export function fmtPrice(p: number) {
  return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmtChange(pct: number) {
  return `${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(2)}%`;
}

function glow(c: string, l: string): React.CSSProperties {
  return {
    position: "absolute",
    inset: -30,
    filter: "blur(18px)",
    background: [
      `radial-gradient(38% 22% at 28% 52%, ${c} 0%, transparent 100%)`,
      `radial-gradient(30% 34% at 66% 40%, ${c} 0%, transparent 100%)`,
      `radial-gradient(34% 16% at 64% 74%, ${l} 0%, transparent 100%)`,
      `radial-gradient(28% 14% at 30% 80%, ${l} 0%, transparent 100%)`,
      `linear-gradient(180deg, ${CARD.black} 0%, ${CARD.black} 20%, ${c} 48%, ${c} 60%, ${l} 82%, ${l} 100%)`,
    ].join(","),
  };
}

function LogoBadge({ stock, px, logoPx, ring }: { stock: StockInfo; px: number; logoPx: number; ring?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: px, height: px, background: CARD.white, boxShadow: ring ? "0 0 0 2px rgba(255,255,255,.25)" : undefined }}
    >
      {stock.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={stock.logo} alt={stock.ticker} width={logoPx} height={logoPx} className="rounded-full object-cover" style={{ width: logoPx, height: logoPx, transform: "scale(1.22)" }} />
      ) : (
        <span style={{ fontFamily: display, fontWeight: 900, fontSize: logoPx * 0.6, color: CARD.text }}>{stock.ticker[0]}</span>
      )}
    </div>
  );
}

function Watermark({ stock, px, right, top }: { stock: StockInfo; px: number; right: number; top: number }) {
  if (!stock.logo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={stock.logo}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full object-contain"
      style={{ width: px, height: px, right, top, transform: "rotate(-14deg)", opacity: 0.16, filter: "grayscale(1) brightness(1.6)", clipPath: "circle(41%)" }}
    />
  );
}

function Ticker({ text, px }: { text: string; px: number }) {
  const solid: React.CSSProperties = { fontFamily: display, fontSize: px, fontWeight: 900, lineHeight: 0.86, letterSpacing: "-0.05em", color: CARD.white, whiteSpace: "nowrap" };
  return (
    <>
      <div style={solid}>{text}</div>
      <div aria-hidden="true" style={{ ...solid, color: "transparent", WebkitTextStroke: "1.2px rgba(255,255,255,.9)" }}>
        {text}
      </div>
    </>
  );
}

export function StockCard({ stock, size = "big", price, changePct, weightPct, showWeight, onAdd, addLabel, className = "", style }: StockCardProps) {
  const { w, h, r } = CARD_SIZES[size];
  const c = stock.color;
  const l = stock.colorLight;
  const p = price ?? stock.price;
  const up = (changePct ?? 0) >= 0;
  const label = `${stock.name} (${stock.ticker})`;
  const base: React.CSSProperties = { position: "relative", width: w, height: h, borderRadius: r, overflow: "hidden", background: CARD.black, flexShrink: 0, fontFamily: display, ...style };

  if (size === "tiny34") {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ ...base, background: `linear-gradient(180deg, ${CARD.black} 0%, ${c} 75%)` }} title={label} aria-label={label}>
        <LogoBadge stock={stock} px={22} logoPx={14} />
      </div>
    );
  }

  if (size === "tiny64" || size === "tiny48") {
    const t64 = size === "tiny64";
    return (
      <div className={className} style={base} aria-label={weightPct !== undefined ? `${label} ${weightPct}%` : label}>
        <div style={{ position: "absolute", inset: -10, filter: "blur(6px)", background: `linear-gradient(180deg, ${CARD.black} 0%, ${c} 40%, ${l} 80%)` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-between" style={{ padding: t64 ? "8px 4px 6px" : "7px 2px 6px" }}>
          <LogoBadge stock={stock} px={t64 ? 26 : 22} logoPx={t64 ? 17 : 14} />
          <div className="flex flex-col items-center" style={{ gap: 3 }}>
            <div style={{ fontSize: t64 ? 12 : 10, fontWeight: 900, letterSpacing: "-0.04em", color: CARD.text }}>{stock.ticker}</div>
            {t64 && weightPct !== undefined && (
              <div style={{ fontFamily: mono, fontSize: 8, fontWeight: 600, color: CARD.text, background: CARD.white, borderRadius: 999, padding: "2px 6px" }}>{weightPct}%</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const big = size === "big";
  const changeEl = changePct !== undefined && (
    <div style={{ fontSize: big ? 10 : 9, fontWeight: 600, color: up ? CARD.up : CARD.down }}>
      <span className="sr-only">{up ? "up" : "down"} </span>
      {fmtChange(changePct)}
    </div>
  );

  return (
    <div className={className} style={{ ...base, boxShadow: big ? "0 24px 48px -18px rgba(0,0,0,.6)" : undefined }} aria-label={`${label} card`}>
      <div style={glow(c, l)} />
      {big ? <Watermark stock={stock} px={170} right={-38} top={118} /> : <Watermark stock={stock} px={118} right={-28} top={80} />}
      <div className="absolute inset-0 flex flex-col" style={{ padding: big ? 15 : 10 }}>
        <div className="flex items-center justify-between">
          <div className="flex" style={{ gap: 5 }}>
            <div style={{ fontSize: big ? 8 : 7, fontWeight: 700, letterSpacing: "0.12em", color: CARD.white, padding: big ? "5px 9px" : "4px 7px", borderRadius: 999, background: "rgba(255,255,255,.16)" }}>
              {stock.kind === "etf" ? "FUND" : stock.kind === "crypto" ? "CRYPTO" : "BSTOCK"}
            </div>
            {big && showWeight && weightPct !== undefined && (
              <div style={{ fontFamily: mono, fontSize: 8, fontWeight: 600, color: CARD.text, padding: "5px 8px", borderRadius: 999, background: CARD.white }}>{weightPct}%</div>
            )}
          </div>
          <LogoBadge stock={stock} px={big ? 30 : 22} logoPx={big ? 20 : 14} ring={big} />
        </div>
        <div className="flex flex-col" style={{ marginTop: big ? 24 : 16 }}>
          <Ticker text={stock.ticker} px={tickerPx(stock.ticker.length, big)} />
          {big && <div style={{ marginTop: 10, fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,.92)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stock.name}</div>}
        </div>
        {big ? (
          <div className="mt-auto flex items-center justify-between" style={{ padding: "9px 10px 9px 13px", borderRadius: 16, background: CARD.white, boxShadow: "0 6px 18px -6px rgba(0,0,0,.25)" }}>
            <div className="flex flex-col" style={{ gap: 2, fontFamily: mono }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: CARD.text, letterSpacing: "-0.02em" }}>{fmtPrice(p)}</div>
              {changeEl}
            </div>
            <CardAddButton onAdd={onAdd} label={addLabel ?? `Add ${stock.ticker}`} />
          </div>
        ) : (
          <div className="mt-auto flex flex-col" style={{ gap: 1, padding: "7px 10px", borderRadius: 11, background: CARD.white, fontFamily: mono }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: CARD.text }}>{fmtPrice(p)}</div>
            {changeEl}
          </div>
        )}
      </div>
    </div>
  );
}
