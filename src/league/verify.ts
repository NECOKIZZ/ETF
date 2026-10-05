// Re-run a settlement from its published inputs and check it: the payouts
// must come out the same, and the inputs must hash to what the keeper put
// on-chain (LeagueEscrow.rounds(id).inputsHash).

import type { Hex } from "viem";
import { hashInputs, settleRound, type ChainEntry, type RoundInput } from "./settlement";
import type { Snapshot } from "./snapshot";
import type { LeagueParams } from "../engine/league";

interface PublishedInputs {
  roundId: string;
  stake: string;
  capMultiple: number;
  seasonPot: string;
  params: Record<string, unknown> & { capMultiple: string };
  rules: { minTokens: number; maxWeightBps: number; minValue: string };
  prices: { start: SnapRow[]; end: SnapRow[]; problems: string[] };
  entries: {
    index: number;
    wallet: Hex;
    teamKey: Hex;
    isCreator: boolean;
    basket: { tokens: Hex[]; amounts: string[]; weightsBps?: number[] | null } | null;
    payout: string;
  }[];
}
type SnapRow = { token: string; value: string; decimals: number; samples: number };

export interface VerifyResult {
  inputsHash: Hex;
  recomputedHash: Hex;
  payoutsMatch: boolean;
  mismatches: number[];
  onchainHash: Hex | null;
  ok: boolean;
}

const snaps = (rows: SnapRow[]) => new Map<string, Snapshot>(rows.map((r) => [r.token, { token: r.token, value: BigInt(r.value), decimals: r.decimals, samples: r.samples }]));

export function verifyInputs(raw: unknown, onchainHash: Hex | null = null): VerifyResult {
  const inp = raw as PublishedInputs;
  const entries: ChainEntry[] = inp.entries.map((e) => ({
    index: e.index,
    wallet: e.wallet,
    teamKey: e.teamKey,
    isCreator: e.isCreator,
    basket: e.basket
      ? { tokens: e.basket.tokens, amounts: e.basket.amounts.map(BigInt), ...(e.basket.weightsBps ? { weightsBps: e.basket.weightsBps } : {}) }
      : undefined,
  }));
  const input: RoundInput = {
    roundId: BigInt(inp.roundId),
    stake: BigInt(inp.stake),
    capMultiple: inp.capMultiple,
    maxBackers: 0, // not used by the settlement maths
    seasonPot: BigInt(inp.seasonPot),
    entries,
    start: snaps(inp.prices.start),
    end: snaps(inp.prices.end),
    priceProblems: inp.prices.problems,
  };
  const params = { ...inp.params, capMultiple: BigInt(inp.params.capMultiple) } as unknown as LeagueParams;
  const rules = { ...inp.rules, minValue: BigInt(inp.rules.minValue) };
  const s = settleRound(input, params, rules);
  const mismatches = inp.entries.filter((e) => s.payouts[e.index].toString() !== e.payout).map((e) => e.index);
  const inputsHash = hashInputs(raw);
  const match = s.inputsHash === inputsHash && mismatches.length === 0;
  return {
    inputsHash,
    recomputedHash: s.inputsHash,
    payoutsMatch: mismatches.length === 0,
    mismatches,
    onchainHash,
    ok: match && (onchainHash === null || onchainHash.toLowerCase() === inputsHash.toLowerCase()),
  };
}
