import { describe, it, expect } from "vitest";
import type { Hex } from "viem";
import { settleRound, maxPayoutOf, type ChainEntry, type RoundInput } from "../src/league/settlement";
import { teamKeyOf, teamKeyFromWeights } from "../src/bsc/basket";
import type { Snapshot } from "../src/league/snapshot";

const E18 = 10n ** 18n;
const STAKE = 5n * E18;
const T = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Hex; // token address
const W = (n: number) => `0x${(0xabc000 + n).toString(16).padStart(40, "0")}` as Hex; // wallet

// Ten tokens at $100, 18 decimals.
const TOKENS = Array.from({ length: 10 }, (_, i) => T(i + 1));
const snap = (prices: Record<string, number>): Map<string, Snapshot> =>
  new Map(
    Object.entries(prices).map(([t, usd]) => [t.toLowerCase(), { token: t.toLowerCase(), value: BigInt(Math.round(usd * 1e6)) * 10n ** 12n, decimals: 18, samples: 3 }]),
  );
const flat = (usd: number) => Object.fromEntries(TOKENS.map((t) => [t, usd]));

/** A creator entry with a basket of `tokens` ($ amounts) and the matching team key. */
function creator(index: number, wallet: number, tokens: Hex[], usd: number[], startPrice = 100): ChainEntry {
  const amounts = usd.map((u) => (BigInt(u) * E18) / BigInt(startPrice));
  const values = usd.map((u) => BigInt(u) * E18);
  return { index, wallet: W(wallet), teamKey: teamKeyOf(tokens, values), isCreator: true, basket: { tokens, amounts } };
}
const backer = (index: number, wallet: number, teamKey: Hex): ChainEntry => ({ index, wallet: W(wallet), teamKey, isCreator: false });

function round(entries: ChainEntry[], end: Record<string, number>, extra: Partial<RoundInput> = {}): RoundInput {
  return { roundId: 1n, stake: STAKE, capMultiple: 100, maxBackers: 20, seasonPot: 0n, entries, start: snap(flat(100)), end: snap(end), priceProblems: [], ...extra };
}

const conserves = (inp: RoundInput, s: ReturnType<typeof settleRound>) =>
  s.payouts.reduce((a, b) => a + b, 0n) + s.platformCut + s.seasonIn === STAKE * BigInt(inp.entries.length) + s.seasonOut;

describe("settleRound", () => {
  // Four creators on disjoint baskets; token i ends at 100 + growth[i].
  const [a, b, c, d] = [0, 1, 2, 3].map((k) => creator(k, k, TOKENS.slice(k * 2, k * 2 + 3), [5, 4, 3]));
  const end = { ...flat(100), [TOKENS[0]]: 110, [TOKENS[1]]: 108, [TOKENS[2]]: 104, [TOKENS[3]]: 103, [TOKENS[4]]: 101, [TOKENS[6]]: 95 };

  it("scores teams by their captain's basket and conserves the contract totals", () => {
    const inp = round([a, b, c, d, backer(4, 10, a.teamKey)], end);
    const s = settleRound(inp);
    expect(s.void).toBeNull();
    expect(conserves(inp, s)).toBe(true);
    expect(s.teams.map((t) => t.isWinner)).toEqual([true, true, false, false]);
    expect(s.payouts[0] > STAKE && s.payouts[4] > STAKE).toBe(true); // captain + backer win
    expect(s.payouts[2]).toBe(0n);
    expect(s.payouts[0] > s.payouts[4]).toBe(true); // captain also gets the 10% fee
  });

  it("refunds a basket whose team key doesn't match it", () => {
    const bad = { ...creator(4, 9, TOKENS.slice(7, 10), [4, 4, 4]), teamKey: a.teamKey };
    const s = settleRound(round([a, b, c, d, bad], end));
    expect(s.statuses[4]).toEqual({ kind: "refunded", reason: "team-key-mismatch" });
    expect(s.payouts[4]).toBe(STAKE);
  });

  it("refunds an ineligible basket, and its backers", () => {
    const small = creator(4, 9, TOKENS.slice(7, 10), [2, 2, 2]); // $6 < $10
    const inp = round([a, b, c, d, small, backer(5, 11, small.teamKey)], end);
    const s = settleRound(inp);
    expect(s.statuses[4]).toEqual({ kind: "refunded", reason: "ineligible-basket" });
    expect(s.statuses[5]).toEqual({ kind: "refunded", reason: "no-valid-team" });
    expect(s.payouts[4]).toBe(STAKE);
    expect(s.payouts[5]).toBe(STAKE);
    expect(conserves(inp, s)).toBe(true);
  });

  it("a clone joins the first team as a member", () => {
    const clone = creator(4, 9, TOKENS.slice(0, 3), [10, 8, 6]); // same weights as `a`, double size
    expect(clone.teamKey).toBe(a.teamKey);
    const s = settleRound(round([a, b, c, d, clone], end));
    expect(s.statuses[4]).toEqual({ kind: "playing", team: a.teamKey.toLowerCase(), captain: false });
    expect(s.teams[0].members).toBe(2);
  });

  it("a missing or not-trading price voids the round and refunds everyone", () => {
    const s = settleRound(round([a, b, c, d], end, { priceProblems: [TOKENS[0]] }));
    expect(s.void).toBe("PriceProblem");
    expect(s.payouts.every((p) => p === STAKE)).toBe(true);
  });

  it("fewer than 4 valid teams voids the round", () => {
    const s = settleRound(round([a, b, c], end));
    expect(s.void).toBe("TooFewTeams");
    expect(s.payouts.every((p) => p === STAKE)).toBe(true);
  });

  it("the inputs hash is deterministic", () => {
    const inp = round([a, b, c, d], end);
    expect(settleRound(inp).inputsHash).toBe(settleRound(inp).inputsHash);
  });

  it("random big rounds: conservation and every payout within the contract ceiling", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let round_ = 0; round_ < 60; round_++) {
      const nTeams = 4 + Math.floor(rnd() * 30);
      const entries: ChainEntry[] = [];
      const endPrices: Record<string, number> = flat(100);
      for (const t of TOKENS) endPrices[t] = 90 + rnd() * 20;
      let w = 0;
      for (let k = 0; k < nTeams; k++) {
        const toks = [...TOKENS].sort(() => rnd() - 0.5).slice(0, 3);
        const c_ = creator(entries.length, w++, toks, [4 + Math.floor(rnd() * 5), 4, 3]);
        if (entries.some((e) => e.teamKey === c_.teamKey)) continue;
        entries.push(c_);
        const nb = Math.floor(rnd() * 21);
        for (let j = 0; j < nb; j++) entries.push(backer(entries.length, w++, c_.teamKey));
      }
      const inp = round(entries, endPrices);
      const s = settleRound(inp);
      expect(conserves(inp, s)).toBe(true);
      const ceiling = maxPayoutOf(STAKE, 100, 20);
      expect(s.payouts.every((p) => p >= 0n && p <= ceiling)).toBe(true);
    }
  });
});

describe("declared weights (enterCreatorNamed)", () => {
  const others = [1, 2, 3].map((k) => creator(k, k, TOKENS.slice(k * 2 + 1, k * 2 + 4), [5, 4, 3]));
  const end = flat(101);
  /** Declared 40/35/25, bought at entry for $10; `startPrices` are the round-start prices. */
  function named(startPrices: number[], declared = [4000, 3500, 2500]): ChainEntry {
    const tokens = [TOKENS[0], TOKENS[8], TOKENS[9]];
    const amounts = [4, 3.5, 2.5].map((u) => BigInt(Math.round(u * 1e6)) * 10n ** 12n / 100n);
    return { index: 0, wallet: W(0), teamKey: teamKeyFromWeights(tokens, declared), isCreator: true, basket: { tokens, amounts, weightsBps: declared } };
  }
  const run = (e: ChainEntry, startPrices: number[]) =>
    settleRound(round([e, ...others.map((o, i) => ({ ...o, index: i + 1 }))], end, { start: snap({ ...flat(100), [TOKENS[0]]: startPrices[0], [TOKENS[8]]: startPrices[1], [TOKENS[9]]: startPrices[2] }) }));

  it("keeps a creator whose basket drifted a little between entry and round start", () => {
    // The first stock rose 6% and the others fell 3%: weights ≈ 41.6/34.3/24.1, value ≈ $9.89.
    const s = run(named([100, 100, 100]), [106, 97, 97]);
    expect(s.statuses[0]).toEqual({ kind: "playing", team: named([100, 100, 100]).teamKey.toLowerCase(), captain: true });
  });

  it("refunds a basket far from its declared weights", () => {
    const e = named([100, 100, 100], [2000, 3500, 4500]); // declares 20/35/45 but locked 40/35/25
    expect(run(e, [100, 100, 100]).statuses[0]).toEqual({ kind: "refunded", reason: "weights-mismatch" });
  });

  it("refunds a key that doesn't match the declared weights", () => {
    const e = { ...named([100, 100, 100]), teamKey: teamKeyFromWeights([TOKENS[0], TOKENS[8], TOKENS[9]], [5000, 2500, 2500]) };
    expect(run(e, [100, 100, 100]).statuses[0]).toEqual({ kind: "refunded", reason: "team-key-mismatch" });
  });
});

describe("verifyInputs", () => {
  it("re-derives a settlement from its published inputs, and catches tampering", async () => {
    const { verifyInputs } = await import("../src/league/verify");
    const [a, b, c, d] = [0, 1, 2, 3].map((k) => creator(k, k, TOKENS.slice(k * 2, k * 2 + 3), [5, 4, 3]));
    const s = settleRound(round([a, b, c, d, backer(4, 10, a.teamKey)], { ...flat(100), [TOKENS[0]]: 110, [TOKENS[6]]: 95 }));
    const published = JSON.parse(JSON.stringify(s.inputs));
    expect(verifyInputs(published, s.inputsHash).ok).toBe(true);

    const tampered = JSON.parse(JSON.stringify(s.inputs));
    tampered.entries[2].payout = "123"; // claims a payout the maths doesn't give
    const r = verifyInputs(tampered, s.inputsHash);
    expect(r.ok).toBe(false);
    expect(r.mismatches).toEqual([2]);
  });
});
