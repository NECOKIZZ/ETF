import { describe, it, expect } from "vitest";
import { decodeFunctionData, type Address } from "viem";
import { planLock, planBack, normaliseWeights, buyPlanSteps, bawCommand } from "../src/league/actions";
import { findApproveTx, spenderOfApprove } from "../src/bsc/buyBasket";
import { leagueEscrowAbi, erc20Abi } from "../src/league/escrow";
import { teamKeyFromWeights } from "../src/bsc/basket";

const A = (n: number) => `0x${n.toString(16).padStart(40, "0")}` as Address;
const ESCROW = A(0xe5c);
const USDT = A(0x05d);
const [NVDA, TSLA, SPY] = [A(1), A(2), A(3)];

describe("normaliseWeights", () => {
  it("returns integer bps summing to 10 000", () => {
    const w = normaliseWeights([33.3, 33.3, 33.3]);
    expect(w.reduce((a, b) => a + b, 0)).toBe(10_000);
    expect(normaliseWeights([42, 33, 25])).toEqual([4200, 3300, 2500]);
  });
});

describe("planLock", () => {
  it("approves what is missing, then enters with the declared-weight team key", () => {
    const { teamKey, steps } = planLock({
      escrow: ESCROW, usdt: USDT, roundId: 2n, stake: 5n * 10n ** 18n,
      tokens: [NVDA, TSLA, SPY], amounts: [1n, 2n, 3n], weightsBps: [42, 33, 25], name: "Test", buyFeeBps: 100,
      allowances: { [TSLA.toLowerCase()]: 2n }, // TSLA already approved
    });
    expect(teamKey).toBe(teamKeyFromWeights([NVDA, TSLA, SPY], [4200, 3300, 2500]));
    expect(steps.map((s) => s.kind)).toEqual(["approve", "approve", "approve", "enter-creator"]);
    expect(steps.slice(0, 3).map((s) => s.to)).toEqual([NVDA, SPY, USDT]);
    const enter = decodeFunctionData({ abi: leagueEscrowAbi, data: steps[3].data });
    expect(enter.functionName).toBe("enterCreatorNamed");
    expect(enter.args).toEqual([2n, teamKey, [NVDA, TSLA, SPY], [1n, 2n, 3n], [4200, 3300, 2500], "Test", 100]);
  });
});

describe("planBack", () => {
  it("skips the approval when the ticket is already allowed", () => {
    const steps = planBack({ escrow: ESCROW, usdt: USDT, roundId: 2n, stake: 5n, teamKey: `0x${"ab".repeat(32)}`, allowance: 5n });
    expect(steps).toHaveLength(1);
    expect(decodeFunctionData({ abi: leagueEscrowAbi, data: steps[0].data }).functionName).toBe("enterBacker");
  });
  it("gives a Binance Agentic Wallet command for each step", () => {
    const [s] = planBack({ escrow: ESCROW, usdt: USDT, roundId: 2n, stake: 5n, teamKey: `0x${"ab".repeat(32)}` });
    expect(bawCommand(s, A(9))).toMatch(/^baw contract-call preview --binanceChainId 56 --from 0x0+9 --to 0x0+5d --value 0 --inputData 0x095ea7b3/);
  });
});

describe("buy plan → steps", () => {
  const approveData = (spender: Address) => `0x095ea7b3${spender.slice(2).padStart(64, "0")}${"f".repeat(64)}`;
  it("finds an approval Binance included, and its spender", () => {
    const swap = { tx: { to: A(0xb0b) }, approveTransaction: { to: USDT, data: approveData(A(0xa11)) } };
    expect(findApproveTx(swap)).toEqual({ to: USDT, data: approveData(A(0xa11)) });
    expect(spenderOfApprove(approveData(A(0xa11)))).toBe(A(0xa11));
  });
  it("approves each spender once for the sum of its legs, then swaps; RFQ legs are reported", () => {
    const leg = (token: Address, amountIn: string, mode = "SWAP") => ({ token, amountIn, mode, tx: { to: A(0xb0b), data: "0x12", value: "0" }, spender: A(0xa11), error: null });
    const { steps, skipped } = buyPlanSteps({ legs: [leg(NVDA, "4"), leg(TSLA, "3"), leg(SPY, "3", "RFQ")] }, USDT, () => 0n, (t) => t);
    expect(steps.map((s) => s.kind)).toEqual(["approve", "swap", "swap"]);
    const ap = decodeFunctionData({ abi: erc20Abi, data: steps[0].data });
    expect(ap.args).toEqual([A(0xa11), 7n]);
    expect(skipped).toEqual([{ token: SPY, reason: expect.stringMatching(/RFQ/) }]);
  });
});
