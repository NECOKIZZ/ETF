// A round as the UI shows it: teams, their baskets, live return, and what a
// $5 ticket would get "if the round ended now". It reuses the real settlement
// code with the current prices as the end snapshot, so the odds shown are the
// exact payouts the keeper would submit at these prices.

import type { Hex } from "viem";
import { settleRound, type ChainEntry } from "./settlement";
import { valueOf, type Snapshot } from "./snapshot";
import { basketWeightsBps } from "../engine/league";
import type { RoundInfo } from "./escrow";

export interface HoldingView {
  token: Hex;
  ticker: string | null; // null when the token isn't in the registry
  weightBps: number;
}

export interface TeamView {
  teamKey: Hex;
  rank: number;
  /** The captain's chosen name; "" for an unnamed team. */
  name: string;
  /** Fee the creator asks from people who buy the ETF, in bps. */
  buyFeeBps: number;
  captain: Hex;
  /** USD value of the captain's basket at round start (or now, before start), 18 decimals. */
  basketValue: string;
  holdings: HoldingView[];
  /** Live return so far, percent (e.g. 2.147). */
  returnPct: number;
  members: number;
  winningNow: boolean;
  /** Payout per $5 ticket if the round ended at these prices (stake included). */
  payoutPerTicketNow: string;
}

export interface RoundView {
  id: string;
  status: RoundInfo["status"];
  entryClose: number;
  end: number;
  stake: string;
  entries: number;
  pot: string; // total stakes
  phase: "entries-open" | "running" | "ended" | "settled" | "voided";
  teams: TeamView[];
  refunded: number;
  priceSource: string;
  /** Hash of the published settlement inputs (zero until settled). */
  inputsHash: Hex;
}

export function buildRoundView(opts: {
  info: RoundInfo;
  entries: ChainEntry[];
  start: Map<string, Snapshot>;
  now: Map<string, Snapshot>;
  nowSec: number;
  seasonPot: bigint;
  tickerOf: (token: string) => string | null;
  priceSource: string;
  meta?: Map<string, { name: string; buyFeeBps: number }>;
}): RoundView {
  const { info, entries, start, now } = opts;
  const phase: RoundView["phase"] =
    info.status === "Settled" ? "settled" : info.status === "Voided" ? "voided" : opts.nowSec < info.entryClose ? "entries-open" : opts.nowSec < info.end ? "running" : "ended";

  const s = settleRound({
    roundId: info.id,
    stake: info.stake,
    capMultiple: info.capMultiple,
    maxBackers: info.maxBackers,
    seasonPot: opts.seasonPot,
    entries,
    start,
    end: now,
    priceProblems: [],
  });

  const teams: TeamView[] = s.teams.map((t) => {
    // The captain (not a later clone with the same team key) defines the basket.
    const captain = entries.find((e) => e.isCreator && e.wallet.toLowerCase() === t.captain.toLowerCase() && e.teamKey.toLowerCase() === t.teamKey)!;
    const b = captain.basket!;
    const values = b.tokens.map((tok, i) => {
      const p = start.get(tok.toLowerCase());
      return p ? valueOf(b.amounts[i], p) : 0n;
    });
    // Declared weights when the creator gave them, else measured at start.
    const w = b.weightsBps ?? basketWeightsBps(values);
    const meta = opts.meta?.get(t.teamKey.toLowerCase());
    // A plain ticket's payout: any playing non-captain member, else the captain.
    const member = entries.find(
      (e) => e.teamKey.toLowerCase() === t.teamKey && e.wallet.toLowerCase() !== t.captain.toLowerCase() && s.statuses[e.index].kind === "playing",
    );
    const ref = member ?? captain;
    return {
      teamKey: t.teamKey,
      rank: 0,
      name: meta?.name ?? "",
      buyFeeBps: meta?.buyFeeBps ?? 100,
      captain: t.captain,
      basketValue: values.reduce((a, v) => a + v, 0n).toString(),
      holdings: b.tokens.map((tok, i) => ({ token: tok, ticker: opts.tickerOf(tok), weightBps: w[i] })),
      returnPct: Number(t.ret) / 1e10,
      members: t.members,
      winningNow: s.void === null && t.isWinner,
      payoutPerTicketNow: s.payouts[ref.index].toString(),
    };
  });
  teams.sort((a, b) => b.returnPct - a.returnPct);
  teams.forEach((t, i) => (t.rank = i + 1));

  return {
    id: info.id.toString(),
    status: info.status,
    entryClose: info.entryClose,
    end: info.end,
    stake: info.stake.toString(),
    entries: entries.length,
    pot: info.totalStakes.toString(),
    phase,
    teams,
    refunded: s.statuses.filter((x) => x.kind === "refunded").length,
    priceSource: opts.priceSource,
    inputsHash: info.inputsHash,
  };
}
