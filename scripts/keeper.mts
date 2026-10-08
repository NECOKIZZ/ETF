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
//   tick   [--samples 3] [--every-min 4] [--window-min 30] [--mode …] [--open 60/60] [--open-hours 13-20]
//          Does whatever is due once (start/end samples, settle, and with --open
//          opens the next round when none is open). The hosted app runs the same
//          thing from a cron at /api/keeper/tick.
//   status <roundId>
//
// Env: BINANCE_W3_API_KEY/SECRET_KEY, ESCROW_ADDRESS, KEEPER_PRIVATE_KEY,
//      BSC_RPC_URL, LEAGUE_CHAIN (bsc|local), LEAGUE_DATA_DIR (default ./data),
//      SUPABASE_URL + SUPABASE_SECRET_KEY (store samples in Supabase instead).

import { clientsFromEnv, escrowFromEnv } from "../src/league/chain";
import { readEntries, readRound } from "../src/league/escrow";
import { describeSettlement, openRound, settleFromSamples, takeSample, tick } from "../src/league/keeper";
import type { PriceMode } from "../src/league/snapshot";
import { getStore, type Phase } from "../src/league/store";
import { formatEther } from "viem";

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string, def?: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const flag = (name: string) => args.includes(`--${name}`);
const mode = () => (opt("mode", "reference") as PriceMode) ?? "reference";
const store = getStore();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

async function open() {
  const r = await openRound({
    entryMin: Number(opt("entry-min", "60")),
    runMin: Number(opt("run-min", "60")),
    stake: opt("stake", "5"),
    cap: Number(opt("cap", "100")),
    maxBackers: Number(opt("max-backers", "20")),
  });
  log(`opened round ${r.roundId}: entries close ${new Date(r.entryClose * 1000).toISOString()}, ends ${new Date(r.end * 1000).toISOString()} (tx ${r.hash})`);
}

async function sample(roundId: bigint, phase: Phase) {
  const s = await takeSample(roundId, phase, mode(), store);
  if (s.warning) log(s.warning);
  log(`saved ${phase} sample (${s.tokens} tokens) → ${s.where}`);
}

async function settle(roundId: bigint) {
  const dry = flag("dry-run");
  const r = await settleFromSamples(roundId, { mode: mode(), windowMin: Number(opt("window-min", "30")), minSamples: Number(opt("min-samples", "3")), dryRun: dry }, store);
  log(`round ${roundId}: ${r.entries} entries, ${r.settlement.teams.length} teams`);
  for (const line of describeSettlement(r.settlement)) log(`  ${line}`);
  if (r.problems.length) log(`  price problems: ${r.problems.join(", ")}`);
  log(`  inputs → ${r.where} (hash ${r.settlement.inputsHash})`);
  log(dry ? "dry run: nothing sent" : `settled round ${roundId} (tx ${r.hash})`);
}

async function auto(roundId: bigint) {
  const n = Number(opt("samples", "3"));
  const every = Number(opt("every-min", "5")) * 60_000;
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrowFromEnv(), roundId);
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
      await sample(roundId, phase);
      if (i < n - 1) await sleep(every);
    }
  }
  await settle(roundId);
}

async function runTick() {
  const o = opt("open")?.match(/^(\d+)\/(\d+)$/);
  const h = opt("open-hours")?.match(/^(\d+)-(\d+)$/);
  const lines = await tick(
    {
      mode: mode(),
      samples: Number(opt("samples", "3")),
      everyMin: Number(opt("every-min", "4")),
      windowMin: Number(opt("window-min", "30")),
      autoOpen: o ? { entryMin: Number(o[1]), runMin: Number(o[2]), hoursUtc: h ? [Number(h[1]), Number(h[2])] : undefined } : undefined,
    },
    store,
  );
  for (const l of lines) log(l);
}

async function status(roundId: bigint) {
  const { pub } = clientsFromEnv();
  const info = await readRound(pub, escrowFromEnv(), roundId);
  const entries = await readEntries(pub, escrowFromEnv(), roundId);
  log(`round ${roundId}: ${info.status}, ${entries.length} entries, stake ${formatEther(info.stake)}`);
  log(`  entries close ${new Date(info.entryClose * 1000).toISOString()}, ends ${new Date(info.end * 1000).toISOString()}`);
  log(`  samples: start ${(await store.loadSamples(roundId, "start")).length}, end ${(await store.loadSamples(roundId, "end")).length}`);
}

const id = () => {
  if (!args[1]) throw new Error("round id required");
  return BigInt(args[1]);
};

try {
  if (cmd === "open") await open();
  else if (cmd === "sample") await sample(id(), args[2] as Phase);
  else if (cmd === "settle") await settle(id());
  else if (cmd === "auto") await auto(id());
  else if (cmd === "tick") await runTick();
  else if (cmd === "status") await status(id());
  else console.log("usage: keeper.mts open|sample|settle|auto|tick|status (see the header of this file)");
} catch (e) {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
