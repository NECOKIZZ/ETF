// GET /api/rounds/:id/history ("current" for the latest round): chart data,
// each ETF's return, the league median and each stock's move at every saved
// price sample since entries closed.
import { NextResponse } from "next/server";
import { loadHistory } from "@/league/live";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (id !== "current" && !/^\d+$/.test(id)) return NextResponse.json({ error: "bad round id" }, { status: 400 });
  try {
    return NextResponse.json(await loadHistory(id === "current" ? undefined : BigInt(id)), { headers: { "cache-control": "s-maxage=60" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
