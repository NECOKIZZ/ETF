"use client";

// Client islands for the landing page: the hero deck and round pill with live
// data, and the stock grid.

import Link from "next/link";
import { StockDeck } from "../../ui/components/StockDeck";
import { StockCard } from "../../ui/components/StockCard";
import { BSTOCKS, byTicker } from "../../ui/data/stocks";
import { useRound, useStocks } from "../hooks";
import { RoundStats } from "./league";

export function useLive() {
  const { data } = useStocks();
  const prices: Record<string, number> = {};
  const changes: Record<string, number> = {};
  for (const s of data?.stocks ?? []) {
    prices[s.ticker] = s.price;
    if (s.changePct !== null) changes[s.ticker] = s.changePct;
  }
  return { prices, changes, ready: !!data };
}

export function HeroDeck() {
  const { prices, changes } = useLive();
  const big = ["TSLA", "META", "NVDA", "MSFT"].map((t) => byTicker(t)!);
  const medium = ["TSLA", "META", "NVDA", "MSFT", "GOOGL"].map((t) => byTicker(t)!);
  return (
    <>
      <div className="hidden xl:block">
        <StockDeck stocks={big} prices={prices} changes={changes} />
      </div>
      <div className="hidden md:block xl:hidden">
        <StockDeck stocks={medium} prices={prices} changes={changes} size="medium" />
      </div>
      <div className="md:hidden">
        <StockDeck stocks={medium.slice(1, 4)} prices={prices} changes={changes} size="medium" />
      </div>
    </>
  );
}

export function HeroRound() {
  const { data: r } = useRound();
  if (!r) return <span className="inline-block h-7 w-56 animate-pulse rounded-full bg-white/50" />;
  return <RoundStats r={r} />;
}

export function StockField({ limit = 12 }: { limit?: number }) {
  const { prices, changes, ready } = useLive();
  const { data } = useStocks();
  const onChain = new Set(data?.stocks.map((s) => s.ticker));
  const list = BSTOCKS.filter((s) => !ready || onChain.has(s.ticker)).slice(0, limit);
  return (
    <div className="flex flex-wrap justify-center gap-4 md:justify-start">
      {list.map((s) => (
        <Link key={s.ticker} href={`/create?add=${s.ticker}`} className="transition duration-300 ease-soft hover:-translate-y-1">
          <StockCard stock={s} size="medium" price={prices[s.ticker]} changePct={changes[s.ticker]} />
        </Link>
      ))}
    </div>
  );
}
