"use client";

// The landing deck: big stock cards fanned like a hand (design handoff):
// rotate offset × 7°, drop |offset| × 18px, overlap −30px; hover lifts 22px,
// cuts the rotation to 40% and scales 1.04. Cards deal in when scrolled to.

import { useEffect, useRef, useState } from "react";
import type { StockInfo } from "../data/stocks";
import { StockCard, type CardSize } from "./StockCard";

export function StockDeck({
  stocks,
  changes = {},
  prices = {},
  size = "big",
  onAdd,
}: {
  stocks: StockInfo[];
  changes?: Record<string, number>;
  prices?: Record<string, number>;
  size?: Extract<CardSize, "big" | "medium">;
  onAdd?: (s: StockInfo) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const mid = (stocks.length - 1) / 2;
  const overlap = size === "big" ? 30 : 22;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return setInView(true);
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setInView(true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex items-start justify-center" style={{ padding: "10px 0 40px" }}>
      {stocks.map((s, i) => {
        const off = i - mid;
        const h = hover === i;
        const rot = off * 7;
        const ty = Math.abs(off) * 18;
        return (
          <div
            key={s.ticker}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="relative cursor-pointer"
            style={{
              margin: `0 -${overlap}px`,
              zIndex: h ? 50 : 20 - Math.abs(Math.round(off * 2)),
              transition: "transform .35s cubic-bezier(.2,.8,.2,1), opacity .42s ease",
              transitionDelay: inView && hover === null ? `${Math.abs(off) * 70}ms` : "0ms",
              transform: inView
                ? `translateY(${ty - (h ? 22 : 0)}px) rotate(${h ? rot * 0.4 : rot}deg) scale(${h ? 1.04 : 1})`
                : "translateY(90px) rotate(0deg) scale(.9)",
              opacity: inView ? 1 : 0,
            }}
          >
            <StockCard stock={s} size={size} price={prices[s.ticker]} changePct={changes[s.ticker]} onAdd={onAdd ? () => onAdd(s) : undefined} />
          </div>
        );
      })}
    </div>
  );
}
