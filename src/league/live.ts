// Server-side loaders for the API routes: live prices (Binance, or the latest
// saved sample when Binance isn't reachable) and round views from the chain.

import { existsSync, readFileSync } from "node:fs";
import { rwaTokens } from "../bsc/binanceWeb3";
import { cryptoSamples } from "../bsc/cryptoPrices";
import { BSTOCKS, demoChangePct } from "../ui/data/stocks";
import { clientsFromEnv, escrowFromEnv } from "./chain";
import { leagueEscrowAbi, readEntries, readRound, readTeamMeta, roundTokens } from "./escrow";
import { buildSnapshot, sampleFromTokens, type PriceMode, type PriceSample, type Snapshot } from "./snapshot";
import { getStore } from "./store";
import { buildRoundView, type RoundView } from "./view";
import { buildHistory } from "./history";
import { cryptoTokensForChain, tickerOf } from "./registry";

const MODE: PriceMode = (process.env.LEAGUE_PRICE_MODE as PriceMode) ?? "reference";
let liveCache: { at: number; sample: Map<string, PriceSample> } | null = null;

/**
 * Local demo chain: the mock tokens' snapshot prices, moved by the showcase
 * movement (demoChangePct) with a slow wobble, so standings change over time.
 */
function localDemoPrices(): Map<string, PriceSample> | null {
  const f = process.env.LEAGUE_DATA_DIR ? `${process.env.LEAGUE_DATA_DIR}/local-demo.json` : "data/local-demo.json";
  if (!existsSync(f)) return null;
  const { tokens } = JSON.parse(readFileSync(f, "utf8")) as { tokens: Record<string, string> };
  const at = Date.now();
  const wobble = 0.75 + 0.25 * Math.sin(at / 600_000);
  const m = new Map<string, PriceSample>();
  for (const [ticker, addr] of Object.entries(tokens)) {
    const s = BSTOCKS.find((x) => x.ticker === ticker);
    if (!s) continue;
    const price = s.price * (1 + (demoChangePct(ticker) / 100) * wobble);
    const token = addr.toLowerCase();
    m.set(token, { token, value: BigInt(Math.round(price * 1e6)) * 10n ** 12n, decimals: 18, trading: true, at });
  }
  return m;
}

/** Live prices from Binance, cached for 20 s. Null when the API is unreachable. */
export async function livePrices(): Promise<Map<string, PriceSample> | null> {
  if (process.env.LEAGUE_CHAIN === "local") return localDemoPrices(); // mock tokens: demo prices
  if (liveCache && Date.now() - liveCache.at < 20_000) return liveCache.sample;
  try {
    const at = Date.now();
    const sample = sampleFromTokens(await rwaTokens(), MODE, at);
    // Crypto slice: Binance spot prices (a failure leaves crypto out, not the stocks).
    for (const [k, v] of await cryptoSamples(at).catch(() => new Map())) sample.set(k, v);
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
  const store = getStore();
  const saved = async (phase: "start" | "end") => (await store.loadSamples(id, phase)).map((s) => s.sample);

  // Start prices: the saved start samples, else (entries still open) current prices.
  // Current prices: live Binance, else the latest saved end sample, else the start.
  const [live, startSamples, endSamples] = await Promise.all([livePrices(), saved("start"), saved("end")]);
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
  const priceSource = endSamples.length
    ? "saved end samples"
    : process.env.LEAGUE_CHAIN === "local"
      ? "local demo prices"
      : live
        ? `Binance ${MODE} price, live`
        : "saved start samples";

  const meta = await readTeamMeta(pub, escrow, id, entries.filter((e) => e.isCreator).map((e) => e.teamKey));
  return buildRoundView({ info, entries, start, now, nowSec: Number(block.timestamp), seasonPot, tickerOf, priceSource, meta, cryptoTokens: cryptoTokensForChain() });
}

/** A round's chart data: every ETF's return, the median and each stock's move at each saved sample. */
export async function loadHistory(roundId?: bigint) {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const id = roundId ?? ((await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" })) as bigint);
  const [info, entries] = await Promise.all([readRound(pub, escrow, id), readEntries(pub, escrow, id)]);
  const store = getStore();
  const [start, liveS, end] = await Promise.all([store.loadSamples(id, "start"), store.loadSamples(id, "live"), store.loadSamples(id, "end")]);
  const base = { roundId: id.toString(), entryClose: info.entryClose, end: info.end };
  if (!start.length) return { ...base, teams: [], points: [] };
  const startSnap = buildSnapshot(start.map((s) => s.sample), roundTokens(entries), 1).prices;
  const h = buildHistory({ entries, start: startSnap, samples: [{ at: info.entryClose * 1000, sample: start[0].sample }, ...liveS, ...end], tickerOf });
  return { ...base, ...h };
}
