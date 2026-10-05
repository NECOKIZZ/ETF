// GET /api/stocks: the league's stocks with live prices when Binance is
// reachable, else the bundled snapshot.
import { NextResponse } from "next/server";
import { BSTOCKS } from "@/ui/data/stocks";
import { livePrices } from "@/league/live";

export const dynamic = "force-dynamic";

export async function GET() {
  const live = await livePrices();
  const stocks = BSTOCKS.map((s) => {
    const p = live?.get(s.address.toLowerCase());
    return {
      symbol: s.symbol,
      ticker: s.ticker,
      name: s.name,
      kind: s.kind,
      address: s.address,
      logo: s.logo ?? null,
      color: s.color,
      colorLight: s.colorLight,
      price: p ? Number(p.value) / 1e18 : s.price,
      trading: p ? p.trading : null,
    };
  });
  return NextResponse.json({ source: live ? "binance-live" : "snapshot-2026-10-05", stocks });
}
