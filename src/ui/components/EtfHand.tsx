// An ETF is a hand of stock cards: its stocks fanned small, weight on each.

import type { StockInfo } from "../data/stocks";
import { StockCard, CARD_SIZES } from "./StockCard";

export interface Holding {
  stock: StockInfo;
  weightPct: number;
}

export function EtfHand({ holdings, size = "tiny64", showWeights = true }: { holdings: Holding[]; size?: "tiny64" | "tiny48"; showWeights?: boolean }) {
  const { w, h } = CARD_SIZES[size];
  const n = holdings.length;
  const mid = (n - 1) / 2;
  const spread = w * 0.62;
  return (
    <div
      className="relative shrink-0"
      style={{ width: w + spread * (n - 1) + w * 0.3, height: h + w * 0.25 }}
      aria-label={holdings.map((x) => `${x.stock.ticker} ${x.weightPct}%`).join(", ")}
    >
      {holdings.map((x, i) => {
        const off = i - mid;
        return (
          <div
            key={x.stock.ticker}
            className="absolute bottom-0 left-1/2"
            style={{
              marginLeft: -w / 2,
              transformOrigin: "bottom center",
              transform: `translateX(${off * spread}px) translateY(${Math.abs(off) * w * 0.06}px) rotate(${off * 6}deg)`,
              zIndex: i + 1, // left to right, like a hand: each card's logo stays visible
              borderRadius: CARD_SIZES[size].r,
              boxShadow: "0 6px 14px -4px rgba(0,0,0,.35)",
            }}
          >
            <StockCard stock={x.stock} size={size} weightPct={showWeights ? x.weightPct : undefined} />
          </div>
        );
      })}
    </div>
  );
}

/** A row of 34px chips, overlapping: the compact ETF for table rows. */
export function EtfChips({ holdings, max = 5 }: { holdings: Holding[]; max?: number }) {
  const shown = holdings.slice(0, max);
  const extra = holdings.length - shown.length;
  return (
    <div className="flex items-center" aria-label={holdings.map((x) => `${x.stock.ticker} ${x.weightPct}%`).join(", ")}>
      {shown.map((x, i) => (
        <div key={x.stock.ticker} style={{ marginLeft: i ? -10 : 0, zIndex: shown.length - i, borderRadius: 10, boxShadow: "0 0 0 2px var(--bg)" }}>
          <StockCard stock={x.stock} size="tiny34" />
        </div>
      ))}
      {extra > 0 && <span className="t-num ml-2 text-[12px] text-muted">+{extra}</span>}
    </div>
  );
}
