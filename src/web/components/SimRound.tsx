"use client";

// Landing page: a simulated round that plays on a loop. Six ETFs move with
// random prices, re-rank as they go, then settle with the league's real
// payout rule (top half wins, split by accuracy). Labelled as a simulation;
// no chain or API calls.

import { useEffect, useRef, useState } from "react";
import { LogoStack } from "../../ui/components/LogoStack";

type Etf = { name: string; by: string; tickers: string[] };

const ETFS: Etf[] = [
  { name: "AI Chips Max", by: "maya.bnb", tickers: ["NVDA", "AMD", "TSM"] },
  { name: "Big Tech Five", by: "0x3f…a1c9", tickers: ["META", "GOOGL", "MSFT"] },
  { name: "Steady Index", by: "kofi", tickers: ["SPY", "QQQ", "MSFT"] },
  { name: "Fintech Rails", by: "lena.eth", tickers: ["COIN", "HOOD", "SPY"] },
  { name: "Speed & Chips", by: "0x91…07be", tickers: ["TSLA", "NVDA", "AVGO"] },
  { name: "Cloud Kings", by: "ade", tickers: ["MSFT", "ORCL", "GOOGL"] },
];
// A mid-round snapshot: what the server renders and what reduced motion shows.
const START = [1.42, 0.88, 0.31, -0.24, -0.71, -1.18];

const ROW = 64;
const TICK_MS = 450;
const RUN_TICKS = 30; // ≈ 13 s of play for a 60-minute round
const HOLD_TICKS = 11; // settled result stays up ≈ 5 s
const STAKE = 5;

type Phase = "running" | "settled";
interface State {
  round: number;
  tick: number;
  returns: number[];
  drift: number[];
  phase: Phase;
  payouts: number[] | null;
}

const rank = (returns: number[]) => returns.map((r, i) => [r, i] as const).sort((a, b) => b[0] - a[0]).map(([, i]) => i);

/** The league's rule: k = n//2 + 1, m = k-th smallest gap to the best; win if gap < m; split 90% of losing tickets by (1/(1+D/m))^6. */
function settle(returns: number[]): number[] {
  const best = Math.max(...returns);
  const d = returns.map((r) => best - r);
  const k = Math.floor(returns.length / 2) + 1;
  const m = [...d].sort((a, b) => a - b)[k - 1] || 1e-9;
  const win = d.map((x) => x < m);
  const losers = win.filter((w) => !w).length;
  const pot = losers * STAKE * 0.9;
  const a = d.map((x, i) => (win[i] ? Math.pow(1 / (1 + x / m), 6) : 0));
  const sum = a.reduce((s, x) => s + x, 0);
  return a.map((x, i) => (win[i] ? STAKE + (pot * x) / sum : 0));
}

const fresh = (round: number, returns = START.map(() => 0)): State => ({
  round,
  tick: 0,
  returns,
  drift: ETFS.map(() => (Math.random() - 0.5) * 0.12),
  phase: "running",
  payouts: null,
});

function step(s: State): State {
  if (s.phase === "settled") return s.tick >= HOLD_TICKS ? fresh(s.round + 1) : { ...s, tick: s.tick + 1 };
  if (s.tick >= RUN_TICKS) return { ...s, phase: "settled", tick: 0, payouts: settle(s.returns) };
  const returns = s.returns.map((r, i) => Math.round((r + s.drift[i] + (Math.random() - 0.5) * 0.32) * 100) / 100);
  return { ...s, tick: s.tick + 1, returns };
}

const usd = (x: number) => `$${x.toFixed(2)}`;

export function SimRound() {
  const [s, setS] = useState<State>(() => ({ ...fresh(14, START), tick: 11, drift: ETFS.map(() => 0) }));
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    if (box.current) io.observe(box.current);
    setS((x) => ({ ...x, drift: ETFS.map(() => (Math.random() - 0.5) * 0.12) }));
    const t = setInterval(() => {
      if (visible && !document.hidden) setS(step);
    }, TICK_MS);
    return () => {
      clearInterval(t);
      io.disconnect();
    };
  }, []);

  const order = rank(s.returns);
  const pos = new Map(order.map((i, p) => [i, p]));
  const half = Math.floor(ETFS.length / 2);
  const progress = s.phase === "settled" ? 1 : s.tick / RUN_TICKS;
  const minsLeft = Math.ceil(60 * (1 - progress));
  const winners = s.payouts?.filter((p) => p > 0).length ?? half;
  const pot = (ETFS.length - winners) * STAKE * 0.9;

  return (
    <div ref={box} className="mx-auto w-full max-w-[520px] rounded-[24px] bg-bg p-5 shadow-lift md:p-6" aria-label="A simulated Median Markets round">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted">Round {s.round} · simulation</div>
          <div className="mt-0.5 text-[15px] font-medium">6 ETFs, $5 tickets</div>
        </div>
        {s.phase === "running" ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] font-medium">
            <span className="size-3 animate-spin rounded-full border-[1.5px] border-muted border-t-transparent" aria-hidden="true" />
            {`Live · ${minsLeft} min left`}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-up-bg px-3 py-1 text-[13px] font-medium text-up">
            <span aria-hidden="true">✓</span> Settled · top {winners} paid
          </span>
        )}
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-soft" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="relative mt-3" style={{ height: ETFS.length * ROW }}>
        {/* The cut: everything above it wins. */}
        <div className="absolute inset-x-0 z-0 flex items-center gap-2" style={{ top: half * ROW - 9 }}>
          <span className="h-px flex-1 border-t border-dashed border-line" />
          <span className="t-label text-[10px] text-muted">top half wins</span>
          <span className="h-px flex-1 border-t border-dashed border-line" />
        </div>
        {ETFS.map((e, i) => {
          const p = pos.get(i)!;
          const r = s.returns[i];
          const paid = s.payouts?.[i];
          return (
            <div
              key={e.name}
              className="absolute inset-x-0 z-10 flex items-center gap-3 transition-transform duration-700 ease-soft"
              style={{ transform: `translateY(${p * ROW + (p >= half ? 10 : 0)}px)`, height: ROW - 10 }}
            >
              <span className="t-num w-4 text-[13px] text-muted">{p + 1}</span>
              <LogoStack tickers={e.tickers} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{e.name}</span>
                <span className="block truncate text-[12px] text-muted">by {e.by}</span>
              </span>
              <span className="text-right">
                <span className={`t-num block text-[15px] ${r >= 0 ? "text-up" : "text-down"}`}>
                  {r >= 0 ? "+" : "−"}
                  {Math.abs(r).toFixed(2)}%
                </span>
                {paid === undefined ? (
                  <span className={`mt-0.5 inline-block rounded-full px-2 text-[11px] font-medium ${p < half ? "bg-up-bg text-up" : "bg-surface text-muted"}`}>
                    {p < half ? "Winning" : "Behind"}
                  </span>
                ) : paid > 0 ? (
                  <span className="t-num mt-0.5 inline-block rounded-full bg-up-bg px-2 text-[11px] font-medium text-up">+{usd(paid - STAKE)}</span>
                ) : (
                  <span className="t-num mt-0.5 inline-block rounded-full bg-down-bg px-2 text-[11px] font-medium text-down">−{usd(STAKE)}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-4 text-[13px] text-muted">
        <span>
          Pot <span className="t-num text-ink">{usd(pot)}</span> from {ETFS.length - winners} losing tickets
        </span>
        <span>Simulated prices</span>
      </div>
    </div>
  );
}
