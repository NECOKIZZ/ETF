// GET /api/rounds/:id/inputs: the settlement inputs the keeper published
// (prices, entries, payouts). Hashes to the round's on-chain inputsHash.
import { NextResponse } from "next/server";
import { FileStore } from "@/league/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad round id" }, { status: 400 });
  const inputs = new FileStore().loadInputs(BigInt(id));
  return inputs ? NextResponse.json(inputs) : NextResponse.json({ error: "not settled yet" }, { status: 404 });
}
