// GET /api/rounds/:id/verify: re-run the settlement from the published inputs
// and compare with the hash on-chain. Anyone can do the same offline with
// scripts/verify.mts.
import { NextResponse } from "next/server";
import { getStore } from "@/league/store";
import { verifyInputs } from "@/league/verify";
import { clientsFromEnv, escrowFromEnv } from "@/league/chain";
import { readRound } from "@/league/escrow";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad round id" }, { status: 400 });
  const inputs = await getStore().loadInputs(BigInt(id));
  if (!inputs) return NextResponse.json({ error: "not settled yet" }, { status: 404 });
  try {
    const { pub } = clientsFromEnv();
    const info = await readRound(pub, escrowFromEnv(), BigInt(id));
    return NextResponse.json(verifyInputs(inputs, info.inputsHash));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
