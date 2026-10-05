// Server-side loaders for the API routes: live prices (Binance, or the latest
// saved sample when Binance isn't reachable) and round views from the chain.

import { rwaTokens } from "../bsc/binanceWeb3";
import { clientsFromEnv, escrowFromEnv } from "./chain";
import { leagueEscrowAbi, readEntries, readRound, roundTokens } from "./escrow";
import { buildSnapshot, sampleFromTokens, type PriceMode, type PriceSample, type Snapshot } from "./snapshot";
import { FileStore } from "./store";
import { buildRoundView, type RoundView } from "./view";
import { tickerOf } from "./registry";

const MODE: PriceMode = (process.env.LEAGUE_PRICE_MODE as PriceMode) ?? "reference";
let liveCache: { at: number; sample: Map<string, PriceSample> } | null = null;

/** Live prices from Binance, cached for 20 s. Null when the API is unreachable. */
export async function livePrices(): Promise<Map<string, PriceSample> | null> {
  if (liveCache && Date.now() - liveCache.at < 20_000) return liveCache.sample;
  if (process.env.LEAGUE_CHAIN === "local") return null; // mock tokens: no live prices
  try {
    const at = Date.now();
    const sample = sampleFromTokens(await rwaTokens(), MODE, at);
    liveCache = { at, sample };
    return sample;
  } catch {
    return null;
  }
}

const one = (sample: Map<string, PriceSample>, tokens: string[]) => buildSnapshot([sample], tokens, 1).prices;

export async function loadRoundView(roundId?: bigint): Promise<RoundView | null> {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const id = roundId ?? ((await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" })) as bigint);
  if (id === 0n) return null;
  const [info, entries, seasonPot, block] = await Promise.all([
    readRound(pub, escrow, id),
    readEntries(pub, escrow, id),
    pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" }) as Promise<bigint>,
    pub.getBlock(),
  ]);
  const tokens = roundTokens(entries);
  const store = new FileStore();
  const saved = (phase: "start" | "end") => store.loadSamples(id, phase).map((s) => s.sample);

  // Start prices: the saved start samples, else (entries still open) current prices.
  // Current prices: live Binance, else the latest saved end sample, else the start.
  const live = await livePrices();
  const startSamples = saved("start");
  const endSamples = saved("end");
  const start: Map<string, Snapshot> = startSamples.length
    ? buildSnapshot(startSamples, tokens, 1).prices
    : live
      ? one(live, tokens)
      : new Map();
  const now: Map<string, Snapshot> = endSamples.length
    ? buildSnapshot(endSamples, tokens, 1).prices
    : live
      ? one(live, tokens)
      : start;
  const priceSource = endSamples.length ? "saved end samples" : live ? `Binance ${MODE} price, live` : "saved start samples";

  return buildRoundView({ info, entries, start, now, nowSec: Number(block.timestamp), seasonPot, tickerOf, priceSource });
}
