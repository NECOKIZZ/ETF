// GET /api/rounds/:id: one round with standings (live, or final once settled).
import { NextResponse } from "next/server";
import { loadRoundView } from "@/league/live";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return NextResponse.json({ error: "bad round id" }, { status: 400 });
  try {
    const view = await loadRoundView(BigInt(id));
    return view ? NextResponse.json(view) : NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
