// Prices for the crypto slice (BNB, BTC, ETH) from Binance's public spot
// market data: the USDT pair's last price. Stocks use the Web3 RWA reference
// price; crypto isn't in that list, so it needs this second source.
//
// data-api.binance.vision is Binance's market-data-only host; api.binance.com
// is the fallback. No keys needed.

import { BSTOCKS } from "../ui/data/stocks";
import type { PriceSample } from "../league/snapshot";

const HOSTS = ["https://data-api.binance.vision", "https://api.binance.com"];

/** Spot pair for each crypto ticker. */
export const CRYPTO_PAIRS: Record<string, string> = { BNB: "BNBUSDT", BTC: "BTCUSDT", ETH: "ETHUSDT" };

/** Parse "85308.12" into 1e18 fixed point without floats. */
export function usdToE18(x: string): bigint {
  const m = /^(\d+)(?:\.(\d+))?$/.exec(x.trim());
  if (!m) throw new Error(`bad price: ${x}`);
  return BigInt(m[1]) * 10n ** 18n + BigInt((m[2] ?? "").slice(0, 18).padEnd(18, "0"));
}

export async function spotPrices(pairs: string[], fetcher: typeof fetch = fetch): Promise<Record<string, string>> {
  const q = `symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
  let last: unknown;
  for (const host of HOSTS) {
    try {
      const r = await fetcher(`${host}/api/v3/ticker/price?${q}`, { cache: "no-store" } as RequestInit);
      if (!r.ok) throw new Error(`HTTP ${r.status} from ${host}`);
      const rows = (await r.json()) as { symbol: string; price: string }[];
      return Object.fromEntries(rows.map((x) => [x.symbol, x.price]));
    } catch (e) {
      last = e;
    }
  }
  throw last instanceof Error ? last : new Error("spot prices unavailable");
}

/**
 * One price sample per crypto token. `addressOf` maps a ticker to its token on
 * this chain (mainnet by default). A missing pair is simply left out, so the
 * snapshot reports it as missing.
 */
export async function cryptoSamples(
  at = Date.now(),
  addressOf: (ticker: string) => string | undefined = (t) => BSTOCKS.find((s) => s.ticker === t)?.address,
  fetcher: typeof fetch = fetch,
): Promise<Map<string, PriceSample>> {
  const prices = await spotPrices(Object.values(CRYPTO_PAIRS), fetcher);
  const out = new Map<string, PriceSample>();
  for (const [ticker, pair] of Object.entries(CRYPTO_PAIRS)) {
    const addr = addressOf(ticker)?.toLowerCase();
    if (!addr || !prices[pair]) continue;
    out.set(addr, { token: addr, value: usdToE18(prices[pair]), decimals: 18, trading: true, at });
  }
  return out;
}
