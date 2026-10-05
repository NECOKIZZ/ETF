// An ETF is a hand of stock cards: its stocks fanned small, weight on each.

import type { StockInfo } from "../data/stocks";
import { StockCard, CARD_H, CARD_W } from "./StockCard";

export interface Holding {
  stock: StockInfo;
  weightPct: number;
}

export function EtfHand({ holdings, cardWidth = 64, showWeights = true }: { holdings: Holding[]; cardWidth?: number; showWeights?: boolean }) {
  const n = holdings.length;
  const mid = (n - 1) / 2;
  const spread = cardWidth * 0.5;
  const cardH = (cardWidth * CARD_H) / CARD_W;
  const width = cardWidth + spread * (n - 1) + cardWidth * 0.25;
  return (
    <div className="relative shrink-0" style={{ width, height: cardH + cardWidth * 0.22 }} aria-label={holdings.map((h) => `${h.stock.ticker} ${h.weightPct}%`).join(", ")}>
      {holdings.map((h, i) => {
        const off = i - mid;
        return (
          <div
            key={h.stock.ticker}
            className="absolute bottom-0 left-1/2"
            style={{
              marginLeft: -cardWidth / 2,
              transformOrigin: "bottom center",
              transform: `translateX(${off * spread}px) translateY(${Math.abs(off) * cardWidth * 0.06}px) rotate(${off * 8}deg)`,
              zIndex: i + 1, // left to right, like cards held in a hand: each ticker's start stays visible
              borderRadius: cardWidth * 0.128,
              boxShadow: "0 4px 12px rgb(0 0 0 / .18)",
            }}
          >
            <StockCard stock={h.stock} width={cardWidth} compact weightPct={showWeights ? h.weightPct : undefined} />
          </div>
        );
      })}
    </div>
  );
}
