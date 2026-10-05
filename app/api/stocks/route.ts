// GET /api/stocks: the league's stocks on this chain, with live prices when
// Binance is reachable, else the bundled snapshot.
import { NextResponse } from "next/server";
import { chainStocks } from "@/league/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await chainStocks());
}
