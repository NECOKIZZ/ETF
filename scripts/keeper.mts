// League of Stocks keeper. Runs rounds on LeagueEscrow.
//
//   npx tsx --env-file=.env.local scripts/keeper.mts <command> [options]
//
//   open   --entry-min 60 --run-min 60 [--stake 5] [--cap 100] [--max-backers 20]
//          Opens a round: entries close in --entry-min minutes, the round ends
//          --run-min minutes after that.
//   sample <roundId> start|end
//          Takes one price sample from Binance (/rwa/tokens) and saves it.
//   settle <roundId> [--mode reference|onchain] [--window-min 30] [--min-samples 3] [--dry-run]
//          Settles from the saved samples taken inside each window
//          (start: entryClose … +window, end: end … +window).
//   auto   <roundId> [--samples 3] [--every-min 5] [--mode …]
//          Waits for the round, samples at start and end, then settles.
//   status <roundId>
//
// Env: BINANCE_W3_API_KEY/SECRET_KEY, ESCROW_ADDRESS, KEEPER_PRIVATE_KEY,
//      BSC_RPC_URL, LEAGUE_CHAIN (bsc|local), LEAGUE_DATA_DIR (default ./data).

import { parseEther, formatEther } from "viem";
import { rwaTokens } from "../src/bsc/binanceWeb3";
import { clientsFromEnv, escrowFromEnv } from "../src/league/chain";
import { leagueEscrowAbi, readEntries, readRound, roundTokens, submitSettlement } from "../src/league/escrow";
import { buildSnapshot, sampleFromTokens, type PriceMode } from "../src/league/snapshot";
import { settleRound } from "../src/league/settlement";
import { FileStore, type Phase } from "../src/league/store";
import { livePrices } from "../src/league/live";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);
const store = new FileStore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function open() {
  const { pub, wallet, account, chain } = clientsFromEnv(true);
  const escrow = escrowFromEnv();
  const now = Math.floor(Date.now() / 1000);
  const entryClose = now + Number(opt("entry-min", "60")) * 60;
  const end = entryClose + Number(opt("run-min", "60")) * 60;
  const stake = parseEther(opt("stake", "5")!);
  const hash = await wallet!.writeContract({
    address: escrow,
    abi: leagueEscrowAbi,
    functionName: "openRound",
    args: [BigInt(entryClose), BigInt(end), stake, Number(opt("cap", "100")), Number(opt("max-backers", "20"))],
    account: account!,
    chain,
  });
  await pub.waitForTransactionReceipt({ hash });
  const id = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" });
  log(`opened round ${id}: entries close ${new Date(entryClose * 1000).toISOString()}, ends ${new Date(end * 1000).toISOString()} (tx ${hash})`);
}

async function sample(roundId: bigint, phase: Phase, mode: PriceMode) {
  // Local demo chain: demo prices for the mock tokens, stamped with chain time
  // (anvil's clock can be moved forward to end a round early).
  if (process.env.LEAGUE_CHAIN === "local") {
    const { pub } = clientsFromEnv();
    const at = Number((await pub.getBlock()).timestamp) * 1000;
    const s = await livePrices();
    if (!s) throw new Error("no local demo prices (run scripts/local-demo.mts first)");
    for (const p of s.values()) p.at = at;
    return log(`saved ${phase} sample (${s.size} local demo tokens) → ${store.saveSample(roundId, phase, s, at)}`);
  }
  const at = Date.now();
  const tokens = await rwaTokens();
  const s = sampleFromTokens(tokens, mode, at);
  const file = store.saveSample(roundId, phase, s, at);
  log(`saved ${phase} sample (${s.size} tokens, ${Date.now() - at} ms) → ${file}`);
}

async function settle(roundId: bigint) {
  const mode = (opt("mode", "reference") as PriceMode) ?? "reference";
  const windowMs = Number(opt("window-min", "30")) * 60_000;
  const minSamples = Number(opt("min-samples", "3"));
  const dry = flag("dry-run");
  const { pub, wallet, account, chain } = clientsFromEnv(!dry);
  const escrow = escrowFromEnv();

  const info = await readRound(pub, escrow, roundId);
  if (info.status !== "Open") throw new Error(`round ${roundId} is ${info.status}`);
  const chainNow = Number((await pub.getBlock()).timestamp); // the contract goes by chain time
  if (!dry && chainNow < info.end) throw new Error("round has not ended yet");
  const entries = await readEntries(pub, escrow, roundId);
  const tokens = roundTokens(entries);
  const inWindow = (phase: Phase, from: number) =>
    store
      .loadSamples(roundId, phase)
      .filter((s) => s.at >= from && s.at <= from + windowMs)
      .map((s) => s.sample);
  const startSamples = inWindow("start", info.entryClose * 1000);
  const endSamples = inWindow("end", info.end * 1000);
  const start = buildSnapshot(startSamples, tokens, minSamples);
  const end = buildSnapshot(endSamples, tokens, minSamples);
  const problems = [...start.problems, ...end.problems].map((p) => `${p.token}:${p.reason}`);
  const seasonPot = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" })) as bigint;

  const s = settleRound({
    roundId,
    stake: info.stake,
    capMultiple: info.capMultiple,
    maxBackers: info.maxBackers,
    seasonPot,
    entries,
    start: start.prices,
    end: end.prices,
    priceProblems: problems,
  });
  const file = store.saveInputs(roundId, s.inputs);
  log(`round ${roundId}: ${entries.length} entries, ${s.teams.length} teams, void=${s.void ?? "no"}`);
  for (const t of s.teams) log(`  ${t.isWinner ? "WIN " : "    "} ${t.captain} ${(Number(t.ret) / 1e10).toFixed(3)}% (${t.members} on team)`);
  log(`  platform ${formatEther(s.platformCut)}, season in ${formatEther(s.seasonIn)}, season out ${formatEther(s.seasonOut)}`);
  if (problems.length) log(`  price problems: ${problems.join(", ")}`);
  log(`  inputs → ${file} (hash ${s.inputsHash})`);
  if (dry) return log("dry run: nothing sent");
  const hash = await submitSettlement(pub, wallet!, escrow, roundId, s, account!, chain);
  log(`settled round ${roundId} (tx ${hash})`);
}

async function auto(roundId: bigint) {
  const mode = (opt("mode", "reference") as PriceMode) ?? "reference";
  const n = Number(opt("samples", "3"));
  const every = Number(opt("every-min", "5")) * 60_000;
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrow(), roundId);
  for (const [phase, at] of [
    ["start", info.entryClose * 1000],
    ["end", info.end * 1000],
  ] as const) {
    const wait = at - Date.now();
    if (wait > 0) {
      log(`waiting ${Math.round(wait / 60000)} min for ${phase}…`);
      await sleep(wait + 5_000);
    }
    for (let i = 0; i < n; i++) {
      await sample(roundId, phase, mode);
      if (i < n - 1) await sleep(every);
    }
  }
  await settle(roundId);
}
const escrow = escrowFromEnv;

async function status(roundId: bigint) {
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrowFromEnv(), roundId);
  const entries = await readEntries(pub, escrowFromEnv(), roundId);
  log(`round ${roundId}: ${info.status}, ${entries.length} entries, stake ${formatEther(info.stake)}`);
  log(`  entries close ${new Date(info.entryClose * 1000).toISOString()}, ends ${new Date(info.end * 1000).toISOString()}`);
  log(`  samples: start ${store.loadSamples(roundId, "start").length}, end ${store.loadSamples(roundId, "end").length}`);
}

const id = () => {
  if (!args[1]) throw new Error("round id required");
  return BigInt(args[1]);
};

try {
  if (cmd === "open") await open();
  else if (cmd === "sample") await sample(id(), args[2] as Phase, (opt("mode", "reference") as PriceMode) ?? "reference");
  else if (cmd === "settle") await settle(id());
  else if (cmd === "auto") await auto(id());
  else if (cmd === "status") await status(id());
  else console.log("usage: keeper.mts open|sample|settle|auto|status (see the header of this file)");
} catch (e) {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
