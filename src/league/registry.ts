// Token address → stock info, for the real bStocks and for the local demo's
// mock copies (data/local-demo.json maps ticker → mock address).

import { existsSync, readFileSync } from "node:fs";
import { BSTOCKS, type StockInfo } from "../ui/data/stocks";

let cache: Map<string, StockInfo> | null = null;

export function tokenRegistry(): Map<string, StockInfo> {
  if (cache) return cache;
  const m = new Map<string, StockInfo>();
  for (const s of BSTOCKS) m.set(s.address.toLowerCase(), s);
  const demo = process.env.LEAGUE_DATA_DIR ? `${process.env.LEAGUE_DATA_DIR}/local-demo.json` : "data/local-demo.json";
  if (process.env.LEAGUE_CHAIN === "local" && existsSync(demo)) {
    const { tokens } = JSON.parse(readFileSync(demo, "utf8")) as { tokens: Record<string, string> };
    for (const [ticker, addr] of Object.entries(tokens)) {
      const s = BSTOCKS.find((x) => x.ticker === ticker);
      if (s) m.set(addr.toLowerCase(), s);
    }
  }
  cache = m;
  return m;
}

export const tickerOf = (token: string): string | null => tokenRegistry().get(token.toLowerCase())?.ticker ?? null;
