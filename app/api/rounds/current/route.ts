// GET /api/rounds/current: the latest round with live standings.
import { NextResponse } from "next/server";
import { loadRoundView } from "@/league/live";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const view = await loadRoundView();
    return view ? NextResponse.json(view) : NextResponse.json({ error: "no rounds yet" }, { status: 404 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
