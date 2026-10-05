// Typed fetchers for the League API (same routes agents use).

import type { RoundView, TeamView } from "../league/view";
import type { PublicStock } from "../league/server";
import type { TxStep } from "../league/actions";

export type { RoundView, TeamView, PublicStock, TxStep };

export interface LeagueConfig {
  chain: "bsc" | "local";
  chainId: number;
  rpcUrl: string;
  explorer: string | null;
  escrow: `0x${string}` | null;
  usdt: `0x${string}`;
  currentRound: string | null;
  buyEnabled: boolean;
  faucet: boolean;
  rules: { minTokens: number; maxTokens: number; maxWeightPct: number; minBasketUsd: number; ticketUsd: number; maxBuyFeePct: number; driftPct: number };
}

export interface MeEntry {
  roundId: string;
  status: string;
  end: number;
  teamKey: `0x${string}`;
  teamName: string;
  role: "creator" | "backer";
  stake: string;
  payout: string;
  claimed: boolean;
  claimable: boolean;
  basket: { token: `0x${string}`; amount: string }[];
}

export interface PlanResponse {
  action: string;
  steps: TxStep[];
  notes: string[];
  teamKey?: `0x${string}`;
  skipped?: { token: string; reason: string }[];
  baw: string[];
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(path, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j as T;
}

export const fetchConfig = () => get<LeagueConfig>("/api/config");
export const fetchStocks = () => get<{ source: string; stocks: PublicStock[] }>("/api/stocks");
export const fetchRound = (id?: string) => get<RoundView>(id ? `/api/rounds/${id}` : "/api/rounds/current");
export const fetchMe = (wallet: string) => get<{ wallet: string; entries: MeEntry[] }>(`/api/me?wallet=${wallet}`);
export const fetchPlan = (body: Record<string, unknown>) => post<PlanResponse>("/api/plan", body);
