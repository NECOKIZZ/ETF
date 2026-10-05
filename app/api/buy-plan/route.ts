// POST /api/buy-plan  { tokens, weightsBps, usdt, wallet, creator, feePct? }
// → the quotes and transactions to buy an ETF's basket via Binance, with the
// creator's fee. Server-side only: the Binance keys never reach the browser.
import { NextResponse } from "next/server";
import { parseUnits, isAddress } from "viem";
import { planBasketBuy } from "@/bsc/buyBasket";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as {
    tokens?: string[];
    weightsBps?: number[];
    usdt?: string;
    wallet?: string;
    creator?: string;
    feePct?: number;
  } | null;
  if (!b?.tokens?.length || b.tokens.length !== b.weightsBps?.length || !b.usdt || !b.wallet || !b.creator) {
    return NextResponse.json({ error: "tokens, weightsBps, usdt, wallet and creator are required" }, { status: 400 });
  }
  if (![...b.tokens, b.wallet, b.creator].every((a) => isAddress(a))) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const usdtIn = parseUnits(b.usdt, 18);
  if (usdtIn < parseUnits("1", 18) || usdtIn > parseUnits("10000", 18)) {
    return NextResponse.json({ error: "amount must be between 1 and 10,000 USDT" }, { status: 400 });
  }
  const plan = await planBasketBuy({ tokens: b.tokens, weightsBps: b.weightsBps, usdtIn, wallet: b.wallet, creator: b.creator, creatorFeePct: b.feePct });
  return NextResponse.json(plan, { status: plan.ok ? 200 : 207 });
}
