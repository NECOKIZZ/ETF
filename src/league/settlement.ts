// Round settlement: on-chain entries + price snapshots → payouts for
// LeagueEscrow.settle(), plus the published inputs anyone can recompute.
//
//   1. Check every creator's locked basket at the START prices: eligible
//      (≥ 3 tokens, ≤ 50% each, ≥ $10, checked at entry; at settlement prices
//      may have drifted, so ≤ 55% and ≥ $9.50) and its team key matches.
//      A creator who declared weights (enterCreatorNamed) gets the key of
//      those weights, and the start-price weights must be within 5 points of
//      them. Without declared weights, the key must match the start-price
//      weights exactly. An invalid entry is refunded its stake.
//   2. Teams = valid creators grouped by team key, in entry order. The first
//      valid creator is the captain; the team's return is the captain's basket
//      return (clones have the same weights, so the same return to ~1%).
//   3. Backers count only if their team has a valid captain.
//   4. Run the engine. A void round refunds everyone.
//
// Conservation holds for the contract's totals: refunds pay back exactly what
// they put in, and the engine conserves the rest.

import { encodeAbiParameters, keccak256, toBytes, type Hex } from "viem";
import {
  DEFAULT_LEAGUE_PARAMS,
  basketEligibility,
  basketReturn,
  basketWeightsBps,
  settleLeague,
  type EligibilityRules,
  type LeagueParams,
  type LeagueTeam,
  type LeagueVoidReason,
} from "../engine/league";
import { teamKeyFromWeights, teamKeyOf } from "../bsc/basket";
import { valueOf, type Snapshot } from "./snapshot";

export interface ChainEntry {
  index: number;
  wallet: Hex;
  teamKey: Hex;
  isCreator: boolean;
  /** On-chain claim state (not used by settlement). */
  claimed?: boolean;
  payout?: bigint;
  /** weightsBps: declared at entry (enterCreatorNamed); absent for plain enterCreator. */
  basket?: { tokens: Hex[]; amounts: bigint[]; weightsBps?: number[] };
}

export interface RoundInput {
  roundId: bigint;
  stake: bigint;
  capMultiple: number;
  maxBackers: number;
  seasonPot: bigint;
  entries: ChainEntry[];
  start: Map<string, Snapshot>;
  end: Map<string, Snapshot>;
  /** Tokens whose snapshot failed (missing / not trading): voids the round. */
  priceProblems: string[];
}

/** Rules a basket must meet when it is entered (the app and agents enforce these). */
export const DEFAULT_RULES: EligibilityRules = { minTokens: 3, maxWeightBps: 5000, minValue: 10n * 10n ** 18n };

/** How far prices may move a basket between entry and round start. */
export const DRIFT_BPS = 500;

/** The same rules at settlement, loosened by the drift allowance. */
export const SETTLE_RULES: EligibilityRules = {
  minTokens: DEFAULT_RULES.minTokens,
  maxWeightBps: DEFAULT_RULES.maxWeightBps + DRIFT_BPS,
  minValue: (DEFAULT_RULES.minValue * BigInt(10_000 - DRIFT_BPS)) / 10_000n,
};

export type EntryStatus =
  | { kind: "playing"; team: Hex; captain: boolean }
  | { kind: "refunded"; reason: "ineligible-basket" | "team-key-mismatch" | "weights-mismatch" | "no-valid-team" | "missing-price" };

export interface Settlement {
  void: LeagueVoidReason | "PriceProblem" | null;
  payouts: bigint[]; // one per entry, contract order
  platformCut: bigint;
  seasonIn: bigint;
  seasonOut: bigint;
  statuses: EntryStatus[];
  teams: { teamKey: Hex; captain: Hex; ret: bigint; members: number; isWinner: boolean }[];
  inputs: Record<string, unknown>;
  inputsHash: Hex;
}

const lower = (x: string) => x.toLowerCase();

export function settleRound(
  input: RoundInput,
  params: LeagueParams = { ...DEFAULT_LEAGUE_PARAMS, capMultiple: BigInt(input.capMultiple) },
  rules: EligibilityRules = SETTLE_RULES,
): Settlement {
  const n = input.entries.length;
  const statuses: EntryStatus[] = new Array(n);
  const refundAll = (reason: Settlement["void"]): Settlement => finish(reason, input.entries.map(() => input.stake), 0n, 0n, 0n, []);

  // 1. Validate creators.
  const teamOrder: Hex[] = [];
  const teams = new Map<Hex, { captain: ChainEntry; ret: bigint; members: ChainEntry[] }>();
  let anyMissingPrice = false;
  for (const e of input.entries) {
    if (!e.isCreator) continue;
    const b = e.basket;
    if (!b || b.tokens.length === 0) {
      statuses[e.index] = { kind: "refunded", reason: "ineligible-basket" };
      continue;
    }
    const startP = b.tokens.map((t) => input.start.get(lower(t)));
    const endP = b.tokens.map((t) => input.end.get(lower(t)));
    if (startP.some((p) => !p) || endP.some((p) => !p)) {
      statuses[e.index] = { kind: "refunded", reason: "missing-price" };
      anyMissingPrice = true;
      continue;
    }
    const values = b.amounts.map((a, i) => valueOf(a, startP[i]!));
    if (basketEligibility(b.tokens, values, rules) !== null) {
      statuses[e.index] = { kind: "refunded", reason: "ineligible-basket" };
      continue;
    }
    const declared = b.weightsBps;
    const key = declared ? teamKeyFromWeights(b.tokens, declared) : teamKeyOf(b.tokens, values);
    if (lower(key) !== lower(e.teamKey)) {
      statuses[e.index] = { kind: "refunded", reason: "team-key-mismatch" };
      continue;
    }
    if (declared) {
      const measured = basketWeightsBps(values);
      if (measured.some((w, i) => Math.abs(w - declared[i]) > DRIFT_BPS)) {
        statuses[e.index] = { kind: "refunded", reason: "weights-mismatch" };
        continue;
      }
    }
    const teamKey = lower(e.teamKey) as Hex;
    const team = teams.get(teamKey);
    if (team) {
      team.members.push(e);
      statuses[e.index] = { kind: "playing", team: teamKey, captain: false };
    } else {
      // Return in common units: value per base unit, so decimals cancel out.
      const ret = basketReturn(
        b.amounts,
        startP.map((p) => p!.value * 10n ** BigInt(18 - p!.decimals)),
        endP.map((p) => p!.value * 10n ** BigInt(18 - p!.decimals)),
      );
      teams.set(teamKey, { captain: e, ret, members: [e] });
      teamOrder.push(teamKey);
      statuses[e.index] = { kind: "playing", team: teamKey, captain: true };
    }
  }

  // A scored token without a price voids the whole round (spec: stale/paused feed).
  if (input.priceProblems.length > 0 || anyMissingPrice) return refundAll("PriceProblem");

  // 2. Backers.
  for (const e of input.entries) {
    if (e.isCreator) continue;
    const team = teams.get(lower(e.teamKey) as Hex);
    if (!team) {
      statuses[e.index] = { kind: "refunded", reason: "no-valid-team" };
      continue;
    }
    team.members.push(e);
    statuses[e.index] = { kind: "playing", team: lower(e.teamKey) as Hex, captain: false };
  }

  // 3. Engine, members in entry order.
  const engineTeams: LeagueTeam[] = [];
  const memberIndex: number[][] = [];
  for (const key of teamOrder) {
    const t = teams.get(key)!;
    const members = [...t.members].sort((a, b) => a.index - b.index);
    engineTeams.push({ ret: t.ret, entries: members.map((m) => ({ stake: input.stake, isCaptain: m === t.captain })) });
    memberIndex.push(members.map((m) => m.index));
  }
  const r = settleLeague(engineTeams, params, input.seasonPot);

  const payouts = input.entries.map(() => input.stake); // refunds by default
  if (r.void) {
    return finish(r.void, payouts, 0n, 0n, 0n, teamSummary(false));
  }
  for (const eo of r.entries) payouts[memberIndex[eo.team][eo.entry]] = eo.payout;
  return finish(null, payouts, r.platformCut, r.seasonIn, r.seasonOut, teamSummary(true));

  function teamSummary(scored: boolean) {
    return teamOrder.map((key, i) => {
      const t = teams.get(key)!;
      return { teamKey: key, captain: t.captain.wallet, ret: t.ret, members: memberIndex[i].length, isWinner: scored && r.teams[i].isWinner };
    });
  }

  function finish(
    voidReason: Settlement["void"],
    pays: bigint[],
    platformCut: bigint,
    seasonIn: bigint,
    seasonOut: bigint,
    teamRows: Settlement["teams"],
  ): Settlement {
    for (let i = 0; i < n; i++) if (!statuses[i]) statuses[i] = { kind: "refunded", reason: "missing-price" };
    const inputs = {
      version: 1,
      roundId: input.roundId.toString(),
      stake: input.stake.toString(),
      capMultiple: input.capMultiple,
      seasonPot: input.seasonPot.toString(),
      params: { ...params, capMultiple: params.capMultiple.toString() },
      rules: { ...rules, minValue: rules.minValue.toString() },
      prices: {
        start: [...input.start.values()].map((p) => ({ token: p.token, value: p.value.toString(), decimals: p.decimals, samples: p.samples })),
        end: [...input.end.values()].map((p) => ({ token: p.token, value: p.value.toString(), decimals: p.decimals, samples: p.samples })),
        problems: input.priceProblems,
      },
      entries: input.entries.map((e) => ({
        index: e.index,
        wallet: e.wallet,
        teamKey: e.teamKey,
        isCreator: e.isCreator,
        basket: e.basket ? { tokens: e.basket.tokens, amounts: e.basket.amounts.map(String), weightsBps: e.basket.weightsBps ?? null } : null,
        status: statuses[e.index],
        payout: pays[e.index].toString(),
      })),
      teams: teamRows.map((t) => ({ ...t, ret: t.ret.toString() })),
      result: { void: voidReason, platformCut: platformCut.toString(), seasonIn: seasonIn.toString(), seasonOut: seasonOut.toString() },
    };
    return {
      void: voidReason,
      payouts: pays,
      platformCut,
      seasonIn,
      seasonOut,
      statuses,
      teams: teamRows,
      inputs,
      inputsHash: hashInputs(inputs),
    };
  }
}

/** keccak256 of the canonical JSON (keys in construction order). */
export const hashInputs = (inputs: unknown): Hex => keccak256(toBytes(JSON.stringify(inputs)));

/** The contract's per-entry ceiling: stake × (1 + capMultiple × (1 + maxBackers)). */
export const maxPayoutOf = (stake: bigint, capMultiple: number, maxBackers: number) =>
  stake * (1n + BigInt(capMultiple) * (1n + BigInt(maxBackers)));

/** ABI-encoded arguments for LeagueEscrow.settle (for logs / dry runs). */
export const encodeSettleArgs = (roundId: bigint, s: Settlement) =>
  encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint128[]" }, { type: "uint256" }, { type: "uint256" }, { type: "uint256" }, { type: "bytes32" }],
    [roundId, s.payouts, s.platformCut, s.seasonIn, s.seasonOut, s.inputsHash],
  );
