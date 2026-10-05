// "Buy the ETF": split a USDT amount across a basket by weight and build one
// Binance-aggregated swap per stock, each paying the ETF's creator a fee via
// the trading API's referral fee (feePercent + fromTokenReferrerWalletAddress).
//
// The backer's wallet signs the returned transactions in order: for each leg,
// an approval (if needed) then the swap. RFQ legs (some stock routes) return
// EIP-712 data to sign and submit instead of a transaction.

import { quote, buildSwap, type SwapTx, type QuoteRoute } from "./binanceWeb3";
import { splitBuy, clampCreatorFee } from "./basket";

export const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";

export interface BuyLegPlan {
  token: string;
  weightBps: number;
  amountIn: string; // USDT base units
  expectedOut: string | null; // token base units, after the creator fee
  vendor: string | null;
  mode: "SWAP" | "RFQ" | null;
  tx: SwapTx["tx"] | null;
  rfq: SwapTx["rfq"] | null;
  error: string | null;
}

export interface BuyPlan {
  usdtIn: string;
  creator: string;
  creatorFeePct: number;
  legs: BuyLegPlan[];
  ok: boolean;
}

export interface BuyApi {
  quote: typeof quote;
  buildSwap: typeof buildSwap;
}

export async function planBasketBuy(
  opts: {
    tokens: string[];
    weightsBps: number[];
    usdtIn: bigint;
    wallet: string;
    creator: string;
    creatorFeePct?: number;
    slippagePercent?: number;
  },
  api: BuyApi = { quote, buildSwap },
): Promise<BuyPlan> {
  const fee = clampCreatorFee(opts.creatorFeePct);
  const legs = splitBuy(opts.tokens, opts.weightsBps, opts.usdtIn);
  const out: BuyLegPlan[] = [];
  for (const leg of legs) {
    const req = {
      fromTokenAddress: BSC_USDT,
      toTokenAddress: leg.token,
      amount: leg.amountIn,
      userWalletAddress: opts.wallet,
      feePercent: fee > 0 ? fee : undefined,
      referrer: fee > 0 ? opts.creator : undefined,
      slippagePercent: opts.slippagePercent,
    };
    const base: BuyLegPlan = { token: leg.token, weightBps: leg.weightBps, amountIn: leg.amountIn.toString(), expectedOut: null, vendor: null, mode: null, tx: null, rfq: null, error: null };
    try {
      const routes: QuoteRoute[] = await api.quote(req);
      const best = routes[0];
      if (!best) throw new Error("no route");
      const swap = await api.buildSwap(req, best.quoteId);
      out.push({ ...base, expectedOut: best.toTokenAmount, vendor: best.vendorName, mode: swap.executionMode, tx: swap.tx ?? null, rfq: swap.rfq ?? null });
    } catch (e) {
      out.push({ ...base, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { usdtIn: opts.usdtIn.toString(), creator: opts.creator, creatorFeePct: fee, legs: out, ok: out.every((l) => !l.error) };
}
