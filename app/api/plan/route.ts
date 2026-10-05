// POST /api/plan: the exact transactions for an action (back, lock, buy-basket,
// buy-etf, claim, claim-basket). The browser sends them from the user's
// wallet; agents run them through the Binance Agentic Wallet (see /api/agent).
import { NextResponse } from "next/server";
import { isPlanError, makePlan, type PlanRequest } from "@/league/server";
import { bawCommand } from "@/league/actions";
import type { Address } from "viem";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as (PlanRequest & { format?: "baw" }) | null;
  if (!body?.action || !body.wallet) return NextResponse.json({ error: "action and wallet are required" }, { status: 400 });
  try {
    const plan = await makePlan(body);
    const baw = plan.steps.map((s) => bawCommand(s, body.wallet as Address));
    return NextResponse.json({ ...plan, baw });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: isPlanError(e) ? 400 : 503 });
  }
}
