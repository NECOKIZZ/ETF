// A round's history for the charts: each ETF's return, the league median and
// each stock's change at every saved price sample (start, the keeper's
// half-hourly "live" samples, end). Same basket maths as settlement.

import { basketReturn } from "../engine/league";
import type { ChainEntry } from "./settlement";
import type { PriceSample, Snapshot } from "./snapshot";

const RET_TO_PCT = 1e10; // basketReturn is 1e12 fixed point; ÷1e10 gives percent

export interface HistoryTeam {
  teamKey: string;
  tickers: string[];
}

export interface HistoryPoint {
  /** ms since epoch */
  at: number;
  /** teamKey → return in percent */
  teams: Record<string, number>;
  median: number;
  /** ticker → change in percent */
  stocks: Record<string, number>;
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Captains' baskets (one per team) and the history points, oldest first, at most `maxPoints` (evenly thinned). */
export function buildHistory(opts: {
  entries: ChainEntry[];
  start: Map<string, Snapshot>;
  samples: { at: number; sample: Map<string, PriceSample> }[];
  tickerOf: (token: string) => string | null;
  maxPoints?: number;
}): { teams: HistoryTeam[]; points: HistoryPoint[] } {
  const seen = new Set<string>();
  const captains = opts.entries.filter((e) => {
    const k = e.teamKey.toLowerCase();
    if (!e.isCreator || !e.basket || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const tokens = [...new Set(captains.flatMap((c) => c.basket!.tokens.map((t) => t.toLowerCase())))];
  const startOf = (t: string) => opts.start.get(t)?.value ?? 0n;

  let samples = [...opts.samples].sort((a, b) => a.at - b.at);
  const max = opts.maxPoints ?? 240;
  if (samples.length > max) {
    const step = (samples.length - 1) / (max - 1);
    samples = Array.from({ length: max }, (_, i) => samples[Math.round(i * step)]);
  }

  const points = samples.map(({ at, sample }) => {
    // A token missing from this sample keeps its start price (no move).
    const nowOf = (t: string) => sample.get(t)?.value ?? startOf(t);
    const teams: Record<string, number> = {};
    for (const c of captains) {
      const b = c.basket!;
      const toks = b.tokens.map((t) => t.toLowerCase());
      teams[c.teamKey.toLowerCase()] = round2(Number(basketReturn(b.amounts, toks.map(startOf), toks.map(nowOf))) / RET_TO_PCT);
    }
    const stocks: Record<string, number> = {};
    for (const t of tokens) {
      const s0 = startOf(t);
      const ticker = opts.tickerOf(t);
      if (s0 > 0n && ticker) stocks[ticker] = round2((Number(((nowOf(t) - s0) * 10n ** 8n) / s0) / 1e8) * 100);
    }
    return { at, teams, median: round2(median(Object.values(teams))), stocks };
  });

  return {
    teams: captains.map((c) => ({ teamKey: c.teamKey.toLowerCase(), tickers: c.basket!.tokens.map((t) => opts.tickerOf(t) ?? t) })),
    points,
  };
}
