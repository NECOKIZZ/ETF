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
  /** Who must be allowed to spend the USDT: the approval Binance returned, else the quote's approve target, else the router. */
  spender: string | null;
  /** An approval transaction Binance included (approveTransaction=true), if any. */
  approveTx: { to: string; data: string } | null;
  error: string | null;
}

/**
 * With `approveTransaction=true`, Binance puts the approval inside
 * `tx.signatureData`: an array of JSON *strings*, e.g.
 * '{"approveContract":"0xB444…", …}' (seen live on 5 Oct; undocumented, see
 * docs/dx-notes.md). Returns the spender, and approve calldata if present.
 */
export function approvalFromSignatureData(swap: Record<string, unknown>): { spender: string | null; data: string | null } {
  const sd = (swap.tx as { signatureData?: unknown } | undefined)?.signatureData;
  for (const item of Array.isArray(sd) ? sd : []) {
    let o: unknown = item;
    if (typeof item === "string") {
      try {
        o = JSON.parse(item);
      } catch {
        continue;
      }
    }
    if (!o || typeof o !== "object") continue;
    const rec = o as Record<string, unknown>;
    const spender = typeof rec.approveContract === "string" ? rec.approveContract : null;
    const data = Object.values(rec).find((v): v is string => typeof v === "string" && /^0x095ea7b3/i.test(v)) ?? null;
    if (spender || data) return { spender: spender ?? (data ? spenderOfApprove(data) : null), data };
  }
  return { spender: null, data: null };
}

/** Fallback: any {to, data} object under an "approve…" key. */
export function findApproveTx(swap: Record<string, unknown>): { to: string; data: string } | null {
  for (const [k, v] of Object.entries(swap)) {
    if (!/approv/i.test(k) || !v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    if (typeof o.to === "string" && typeof o.data === "string") return { to: o.to, data: o.data };
    if (typeof o.tx === "object" && o.tx) {
      const t = o.tx as Record<string, unknown>;
      if (typeof t.to === "string" && typeof t.data === "string") return { to: t.to, data: t.data };
    }
  }
  return null;
}

/** The spender named inside an ERC-20 approve(spender, amount) calldata. */
export function spenderOfApprove(data: string): string | null {
  return /^0x095ea7b3/i.test(data) && data.length >= 74 ? `0x${data.slice(34, 74)}` : null;
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
    const base: BuyLegPlan = { token: leg.token, weightBps: leg.weightBps, amountIn: leg.amountIn.toString(), expectedOut: null, vendor: null, mode: null, tx: null, rfq: null, spender: null, approveTx: null, error: null };
    try {
      const routes: QuoteRoute[] = await api.quote(req);
      const best = routes[0];
      if (!best) throw new Error("no route");
      const swap = await api.buildSwap(req, best.quoteId);
      const fromSig = approvalFromSignatureData(swap);
      const approveTx = findApproveTx(swap) ?? (fromSig.data ? { to: req.fromTokenAddress, data: fromSig.data } : null);
      const spender = fromSig.spender ?? (approveTx && spenderOfApprove(approveTx.data)) ?? best.approveTarget ?? swap.tx?.to ?? null;
      out.push({ ...base, expectedOut: best.toTokenAmount, vendor: best.vendorName, mode: swap.executionMode, tx: swap.tx ?? null, rfq: swap.rfq ?? null, spender, approveTx });
    } catch (e) {
      out.push({ ...base, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { usdtIn: opts.usdtIn.toString(), creator: opts.creator, creatorFeePct: fee, legs: out, ok: out.every((l) => !l.error) };
}
