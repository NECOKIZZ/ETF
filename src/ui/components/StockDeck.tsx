"use client";

// The landing deck: stock cards fanned like a hand, Kickoff's fan values
// (offset × 148px, |offset| × 26px, offset × 7°, 90ms stagger, lift on hover).

import { useEffect, useRef, useState } from "react";
import type { StockInfo } from "../data/stocks";
import { StockCard, CARD_W, CARD_H } from "./StockCard";

export function StockDeck({
  stocks,
  changes = {},
  spread = 148,
  cardWidth = CARD_W,
}: {
  stocks: StockInfo[];
  changes?: Record<string, number>;
  spread?: number;
  cardWidth?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const mid = (stocks.length - 1) / 2;
  const k = cardWidth / CARD_W;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative mx-auto" style={{ height: cardWidth * (CARD_H / CARD_W) + 70 * k, width: "100%" }}>
      {stocks.map((s, i) => {
        const off = i - mid;
        const lifted = hover === i;
        const x = off * spread * k;
        const y = Math.abs(off) * 26 * k;
        const rot = off * 7;
        return (
          <div
            key={s.ticker}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="absolute bottom-0 left-1/2 cursor-pointer"
            style={{
              marginLeft: -cardWidth / 2,
              transformOrigin: "bottom center",
              zIndex: lifted ? 20 : 10 - Math.abs(off),
              transition: "transform 520ms cubic-bezier(.2,.8,.2,1), opacity 420ms ease, box-shadow 200ms ease",
              transitionDelay: inView && hover === null ? `${Math.abs(off) * 90}ms` : "0ms",
              transform: inView
                ? `translateX(${x}px) translateY(${lifted ? y - 34 * k : y}px) rotate(${lifted ? rot / 2 : rot}deg) scale(${lifted ? 1.07 : 1})`
                : "translateX(0) translateY(120px) rotate(0deg) scale(0.85)",
              opacity: inView ? 1 : 0,
              borderRadius: 28 * k,
              boxShadow: lifted ? `0 30px 70px rgb(0 0 0 / .32), 0 0 40px color-mix(in oklab, var(--brand-mint) 40%, transparent)` : "0 16px 40px rgb(0 0 0 / .18)",
            }}
          >
            <StockCard stock={s} width={cardWidth} changePct={changes[s.ticker]} />
          </div>
        );
      })}
    </div>
  );
}
