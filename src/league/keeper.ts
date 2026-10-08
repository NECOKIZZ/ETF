// Keeper jobs shared by the CLI (scripts/keeper.mts) and the cron route
// (/api/keeper/tick): open a round, take a price sample, settle, and tick,
// which does whichever of those is due. Times go by chain time, as the
// contract does (on BSC that is wall-clock time; on anvil it can be moved).

import { formatEther, parseEther, type Hex } from "viem";
import { rwaTokens } from "../bsc/binanceWeb3";
import { cryptoSamples } from "../bsc/cryptoPrices";
import { clientsFromEnv, escrowFromEnv } from "./chain";
import { leagueEscrowAbi, readEntries, readRound, roundTokens, submitSettlement } from "./escrow";
import { livePrices } from "./live";
import { cryptoTokensForChain } from "./registry";
import { settleRound, type Settlement } from "./settlement";
import { buildSnapshot, sampleFromTokens, type PriceMode } from "./snapshot";
import { getStore, type LeagueStore, type Phase } from "./store";

export interface OpenOptions {
  entryMin: number;
  runMin: number;
  stake?: string; // USDT
  cap?: number;
  maxBackers?: number;
}

export interface SettleOptions {
  mode?: PriceMode;
  windowMin?: number;
  minSamples?: number;
  dryRun?: boolean;
}

export interface TickOptions {
  mode: PriceMode;
  /** Samples to take in each window (start and end). */
  samples: number;
  /** Minutes between samples. */
  everyMin: number;
  windowMin: number;
  /** Open a new round when none is open. */
  autoOpen?: OpenOptions & { hoursUtc?: [from: number, to: number] };
}

const isLocal = () => process.env.LEAGUE_CHAIN === "local";

async function chainNowMs() {
  const { pub } = clientsFromEnv();
  return Number((await pub.getBlock()).timestamp) * 1000;
}

export async function openRound(o: OpenOptions) {
  const { pub, wallet, account, chain } = clientsFromEnv(true);
  const escrow = escrowFromEnv();
  const now = Math.floor((await chainNowMs()) / 1000);
  const entryClose = now + Math.round(o.entryMin * 60);
  const end = entryClose + Math.round(o.runMin * 60);
  const hash = await wallet!.writeContract({
    address: escrow,
    abi: leagueEscrowAbi,
    functionName: "openRound",
    args: [BigInt(entryClose), BigInt(end), parseEther(o.stake ?? "5"), o.cap ?? 100, o.maxBackers ?? 20],
    account: account!,
    chain,
  });
  const r = await pub.waitForTransactionReceipt({ hash });
  if (r.status !== "success") throw new Error(`openRound reverted: ${hash}`);
  const id = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" });
  return { roundId: id, entryClose, end, hash };
}

/** One price sample of every token (Binance RWA + spot crypto; demo prices on the local chain). */
export async function takeSample(roundId: bigint, phase: Phase, mode: PriceMode, store: LeagueStore = getStore()) {
  if (isLocal()) {
    // Mock tokens: demo prices, stamped with chain time (anvil's clock can be moved forward).
    const at = await chainNowMs();
    const s = await livePrices();
    if (!s) throw new Error("no local demo prices (run scripts/local-demo.mts first)");
    for (const p of s.values()) p.at = at;
    return { at, tokens: s.size, where: await store.saveSample(roundId, phase, s, at), warning: null };
  }
  const at = Date.now();
  const s = sampleFromTokens(await rwaTokens(), mode, at);
  let warning: string | null = null;
  try {
    for (const [k, v] of await cryptoSamples(at)) s.set(k, v);
  } catch (e) {
    warning = `crypto prices unavailable: ${e instanceof Error ? e.message : e}`;
  }
  return { at, tokens: s.size, where: await store.saveSample(roundId, phase, s, at), warning };
}

/** Settle from the samples saved inside each window (start: entryClose…+window, end: end…+window). */
export async function settleFromSamples(roundId: bigint, o: SettleOptions = {}, store: LeagueStore = getStore()) {
  const windowMs = (o.windowMin ?? 30) * 60_000;
  const minSamples = o.minSamples ?? 3;
  const { pub, wallet, account, chain } = clientsFromEnv(!o.dryRun);
  const escrow = escrowFromEnv();

  const info = await readRound(pub, escrow, roundId);
  if (info.status !== "Open") throw new Error(`round ${roundId} is ${info.status}`);
  if (!o.dryRun && (await chainNowMs()) < info.end * 1000) throw new Error("round has not ended yet");
  const entries = await readEntries(pub, escrow, roundId);
  const tokens = roundTokens(entries);
  const inWindow = async (phase: Phase, from: number) =>
    (await store.loadSamples(roundId, phase)).filter((s) => s.at >= from && s.at <= from + windowMs).map((s) => s.sample);
  const [startSamples, endSamples] = await Promise.all([inWindow("start", info.entryClose * 1000), inWindow("end", info.end * 1000)]);
  const start = buildSnapshot(startSamples, tokens, minSamples);
  const end = buildSnapshot(endSamples, tokens, minSamples);
  const problems = [...start.problems, ...end.problems].map((p) => `${p.token}:${p.reason}`);
  const seasonPot = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" })) as bigint;

  const settlement = settleRound({
    roundId,
    stake: info.stake,
    capMultiple: info.capMultiple,
    maxBackers: info.maxBackers,
    seasonPot,
    entries,
    start: start.prices,
    end: end.prices,
    priceProblems: problems,
    cryptoTokens: cryptoTokensForChain(),
  });
  const where = await store.saveInputs(roundId, settlement.inputs);
  let hash: Hex | null = null;
  if (!o.dryRun) hash = await submitSettlement(pub, wallet!, escrow, roundId, settlement, account!, chain);
  return { settlement, entries: entries.length, problems, where, hash };
}

export function describeSettlement(s: Settlement) {
  return [
    ...s.teams.map((t) => `${t.isWinner ? "WIN " : "    "} ${t.captain} ${(Number(t.ret) / 1e10).toFixed(3)}% (${t.members} on team)`),
    `platform ${formatEther(s.platformCut)}, season in ${formatEther(s.seasonIn)}, season out ${formatEther(s.seasonOut)}, void=${s.void ?? "no"}`,
  ];
}

/**
 * Do whatever is due, once. Safe to call every few minutes from a cron:
 *  - entries closed, round running: take start samples (up to `samples`, `everyMin` apart) inside the start window
 *  - round ended: take end samples the same way, then settle once there are enough (or the window has passed)
 *  - no round open and autoOpen set: open the next one
 * Returns a log of what it did.
 */
export async function tick(o: TickOptions, store: LeagueStore = getStore()): Promise<string[]> {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const log: string[] = [];
  const now = await chainNowMs();
  const windowMs = o.windowMin * 60_000;
  const everyMs = o.everyMin * 60_000;
  const count = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" });

  let open = 0;
  for (let id = count > 3n ? count - 2n : 1n; id <= count; id++) {
    const info = await readRound(pub, escrow, id);
    if (info.status !== "Open") continue;
    open++;
    const startAt = info.entryClose * 1000;
    const endAt = info.end * 1000;
    if (now < startAt) {
      log.push(`round ${id}: entries open for ${Math.round((startAt - now) / 60_000)} more min`);
      continue;
    }
    const phase: Phase = now < endAt ? "start" : "end";
    const from = phase === "start" ? startAt : endAt;
    const all = await store.loadSamples(id, phase);
    const saved = all.filter((s) => s.at >= from && s.at <= from + windowMs).length;
    const lastAt = all.at(-1)?.at ?? 0;
    let have = saved;
    if (now <= from + windowMs && saved < o.samples) {
      if (now - lastAt < everyMs) {
        log.push(`round ${id}: next ${phase} sample in ${Math.ceil((everyMs - (now - lastAt)) / 60_000)} min`);
        continue;
      }
      const s = await takeSample(id, phase, o.mode, store);
      have++;
      log.push(`round ${id}: ${phase} sample ${have}/${o.samples} (${s.tokens} tokens)${s.warning ? `; ${s.warning}` : ""}`);
    }
    if (phase === "start") {
      if (have >= o.samples || now > from + windowMs) log.push(`round ${id}: running, ends in ${Math.round((endAt - now) / 60_000)} min`);
      continue;
    }
    if (have < o.samples && now <= from + windowMs) continue;
    // Ended and the end samples are in. Past the window with too few, settling refunds everyone.
    const r = await settleFromSamples(id, { mode: o.mode, windowMin: o.windowMin, minSamples: o.samples }, store);
    log.push(`round ${id}: settled (${r.entries} entries, void=${r.settlement.void ?? "no"}, tx ${r.hash})`);
    open--;
  }

  const ao = o.autoOpen;
  if (open === 0 && ao) {
    const hour = new Date().getUTCHours();
    const [from, to] = ao.hoursUtc ?? [0, 24];
    if (hour >= from && hour < to) {
      const r = await openRound(ao);
      log.push(`opened round ${r.roundId}: entries close ${new Date(r.entryClose * 1000).toISOString()}, ends ${new Date(r.end * 1000).toISOString()}`);
    } else log.push(`no round open; auto-open waits for ${from}:00–${to}:00 UTC`);
  } else if (open === 0) log.push("no round open");
  return log;
}

/** Tick options from the environment (the cron route uses these). */
export function tickOptionsFromEnv(): TickOptions {
  const num = (k: string, d: number) => (process.env[k] ? Number(process.env[k]) : d);
  const entryMin = process.env.KEEPER_OPEN_ENTRY_MIN;
  const runMin = process.env.KEEPER_OPEN_RUN_MIN;
  const hours = process.env.KEEPER_OPEN_HOURS_UTC?.match(/^(\d+)-(\d+)$/);
  return {
    mode: (process.env.LEAGUE_PRICE_MODE as PriceMode) ?? "reference",
    samples: num("KEEPER_SAMPLES", 3),
    everyMin: num("KEEPER_EVERY_MIN", 4),
    windowMin: num("KEEPER_WINDOW_MIN", 30),
    autoOpen:
      entryMin && runMin
        ? { entryMin: Number(entryMin), runMin: Number(runMin), hoursUtc: hours ? [Number(hours[1]), Number(hours[2])] : undefined }
        : undefined,
  };
}
