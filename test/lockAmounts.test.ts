import { describe, expect, it } from "vitest";
import { lockAmounts, usdOf } from "../src/bsc/basket";

const e18 = (x: number) => BigInt(Math.round(x * 1e6)) * 10n ** 12n;

describe("lockAmounts: lock the basket asked for, never the whole wallet", () => {
  // $12 basket: NVDA 40%, AMD 40%, ETH 20%.
  const weightsBps = [4000, 4000, 2000];
  const prices = [235, 160, 4000];

  it("leftover tokens in the wallet don't swamp the weights", () => {
    // The wallet holds lots of NVDA/AMD from earlier, and exactly the ETH bought now.
    const balances = [e18(25), e18(15), e18(0.0006)];
    const amounts = lockAmounts({ usd: 12, weightsBps, prices, balances });
    expect(usdOf(amounts, prices)).toBeCloseTo(12, 1); // not $6,283
    const shares = amounts.map((a, i) => usdOf([a], [prices[i]]) / 12);
    expect(shares[2]).toBeCloseTo(0.2, 2); // ETH stays 20%
  });

  it("caps at what the wallet holds (e.g. after swap slippage)", () => {
    const balances = [e18(0.02), e18(0.03), e18(0.0005)]; // a bit under target
    const amounts = lockAmounts({ usd: 12, weightsBps, prices, balances });
    expect(amounts).toEqual(balances);
  });

  it("locks nothing without a price or an amount", () => {
    expect(lockAmounts({ usd: 0, weightsBps, prices, balances: [e18(1), e18(1), e18(1)] })).toEqual([0n, 0n, 0n]);
    expect(lockAmounts({ usd: 12, weightsBps, prices: [0, 160, 4000], balances: [e18(1), e18(1), e18(1)] })[0]).toBe(0n);
  });
});
