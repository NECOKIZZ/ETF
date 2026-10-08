// Chart history: ETF returns, the median and stock moves at each sample.
import { describe, it, expect } from "vitest";
import { buildHistory, median } from "../src/league/history";
import type { ChainEntry } from "../src/league/settlement";
import type { PriceSample, Snapshot } from "../src/league/snapshot";

const E18 = 10n ** 18n;
const A = "0x00000000000000000000000000000000000000aa";
const B = "0x00000000000000000000000000000000000000bb";
const tickers: Record<string, string> = { [A]: "AAA", [B]: "BBB" };
const snap = (v: number): Snapshot => ({ token: "", value: BigInt(v) * E18, decimals: 18, samples: 1 });
const sample = (at: number, a: number, b: number) =>
  ({ at, sample: new Map<string, PriceSample>([[A, { token: A, value: BigInt(a) * E18, decimals: 18, trading: true, at }], [B, { token: B, value: BigInt(b) * E18, decimals: 18, trading: true, at }]]) });
const creator = (i: number, key: string, amounts: [bigint, bigint]): ChainEntry => ({ index: i, wallet: `0x${String(i).padStart(40, "0")}`, teamKey: key as `0x${string}`, isCreator: true, basket: { tokens: [A, B], amounts } });

describe("round history", () => {
  it("median handles odd, even and empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });

  it("computes each ETF's return, the median and stock moves; one line per team", () => {
    const entries = [
      creator(0, "0x01", [1n, 0n]), // all A
      creator(1, "0x02", [0n, 1n]), // all B
      creator(2, "0x02", [0n, 2n]), // clone of team 2: not a second line
      { index: 3, wallet: "0x0000000000000000000000000000000000000003", teamKey: "0x01", isCreator: false } as ChainEntry,
    ];
    const start = new Map([[A, snap(100)], [B, snap(200)]]);
    const h = buildHistory({ entries, start, samples: [sample(2, 110, 190), sample(1, 100, 200)], tickerOf: (t) => tickers[t] ?? null });
    expect(h.teams).toEqual([{ teamKey: "0x01", tickers: ["AAA", "BBB"] }, { teamKey: "0x02", tickers: ["AAA", "BBB"] }]);
    expect(h.points.map((p) => p.at)).toEqual([1, 2]); // sorted
    expect(h.points[0].teams).toEqual({ "0x01": 0, "0x02": 0 });
    expect(h.points[1].teams).toEqual({ "0x01": 10, "0x02": -5 });
    expect(h.points[1].median).toBe(2.5);
    expect(h.points[1].stocks).toEqual({ AAA: 10, BBB: -5 });
  });

  it("thins long histories evenly, keeping the first and last", () => {
    const entries = [creator(0, "0x01", [1n, 1n])];
    const start = new Map([[A, snap(100)], [B, snap(100)]]);
    const samples = Array.from({ length: 1000 }, (_, i) => sample(i, 100 + (i % 7), 100));
    const h = buildHistory({ entries, start, samples, tickerOf: (t) => tickers[t] ?? null, maxPoints: 50 });
    expect(h.points).toHaveLength(50);
    expect(h.points[0].at).toBe(0);
    expect(h.points.at(-1)!.at).toBe(999);
  });
});
