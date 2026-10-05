// GET /api/leaderboard: creators and backers across settled rounds.
import { NextResponse } from "next/server";
import { loadLeaderboard } from "@/league/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadLeaderboard());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
