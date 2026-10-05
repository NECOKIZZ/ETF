// Seed the LOCAL demo chain (anvil), no real money: mock USDT + mock copies of
// real bStocks, the escrow, and two rounds:
//   round 1: five named ETFs and seven backers, settled (claims are open)
//   round 2: six named ETFs and ten backers, entries open for two days
// Price samples go in data/rounds/<id>/ like the keeper's.
//
//   anvil                                   # in another terminal
//   npx tsx scripts/local-demo.mts          # prints ESCROW_ADDRESS
//   then run the app with LEAGUE_CHAIN=local ESCROW_ADDRESS=0x… (docs/LOCAL.md)
//
// Needs `cd contracts && forge build` first (reads the compiled contracts).

import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createTestClient, createWalletClient, http, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import { leagueEscrowAbi, erc20Abi } from "../src/league/escrow";
import { teamKeyFromWeights } from "../src/bsc/basket";
import { FileStore } from "../src/league/store";
import { readEntries, readRound, readTeamMeta, submitSettlement } from "../src/league/escrow";
import { settleRound } from "../src/league/settlement";
import { buildSnapshot } from "../src/league/snapshot";
import type { PriceSample } from "../src/league/snapshot";
import { BSTOCKS } from "../src/ui/data/stocks";

const RPC = process.env.BSC_RPC_URL ?? "http://127.0.0.1:8545";
const MNEMONIC = "test test test test test test test test test test test junk"; // anvil's public dev mnemonic
const acct = (i: number) => mnemonicToAccount(MNEMONIC, { addressIndex: i });
const E18 = 10n ** 18n;
const STAKE = 5n * E18;

const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
const test = createTestClient({ chain: foundry, mode: "anvil", transport: http(RPC) });
const w = (i: number) => createWalletClient({ account: acct(i), chain: foundry, transport: http(RPC) });
const art = (file: string, name: string) => {
  const j = JSON.parse(readFileSync(`contracts/out/${file}/${name}.json`, "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object as Hex };
};
const mint = [{ type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] }] as const;

async function deploy(file: string, name: string, args: unknown[]) {
  const { abi, bytecode } = art(file, name);
  const r = await pub.waitForTransactionReceipt({ hash: await w(0).deployContract({ abi, bytecode, args }) });
  return r.contractAddress!;
}
async function send(i: number, address: Address, abi: readonly unknown[], fn: string, args: unknown[]) {
  const r = await pub.waitForTransactionReceipt({ hash: await w(i).writeContract({ address, abi: abi as never, functionName: fn as never, args: args as never }) });
  if (r.status !== "success") throw new Error(`${fn} failed`);
}

// Mock copies of real bStocks and the crypto slice (WBNB, BTCB, ETH), at their snapshot prices.
const PICKS = ["NVDA", "TSLA", "META", "MSFT", "GOOGL", "AMD", "AVGO", "TSM", "COIN", "HOOD", "SPY", "QQQ", "BNB", "BTC", "ETH"];
const stocks = PICKS.map((t) => BSTOCKS.find((s) => s.ticker === t)!);

// Anvil only funds wallets 0-9: give every wallet we use some gas money.
for (let i = 0; i <= 17; i++) await test.setBalance({ address: acct(i).address, value: 100n * E18 });

const usdt = await deploy("LeagueEscrow.t.sol", "MockToken", ["USDT"]);
const addr: Record<string, Address> = {};
for (const s of stocks) addr[s.ticker] = await deploy("LeagueEscrow.t.sol", "MockToken", [s.symbol]);
const escrow = await deploy("LeagueEscrow.sol", "LeagueEscrow", [usdt, acct(0).address]);
for (const s of stocks) await send(0, escrow, leagueEscrowAbi, "setTokenAllowed", [addr[s.ticker], true]);
// Seed the season pot so thin rounds get a top-up.
await send(0, usdt, mint, "mint", [acct(0).address, 50n * E18]);
await send(0, usdt, erc20Abi, "approve", [escrow, 50n * E18]);
await send(0, escrow, leagueEscrowAbi, "fundSeason", [50n * E18]);

const price = (t: string) => stocks.find((s) => s.ticker === t)!.price;
const store = new FileStore();
const sampleAt = (at: number, factor: (t: string) => number) =>
  new Map<string, PriceSample>(
    stocks.map((s) => {
      const token = addr[s.ticker].toLowerCase();
      return [token, { token, value: BigInt(Math.round(s.price * factor(s.ticker) * 1e6)) * 10n ** 12n, decimals: 18, trading: true, at }];
    }),
  );

type Creator = [name: string, wallet: number, basket: [ticker: string, usd: number][], buyFeePct: number];

async function enterRound(roundId: bigint, creators: Creator[], backers: [number, string][]) {
  const keys: Record<string, Hex> = {};
  for (const [name, who, basket, fee] of creators) {
    const tokens = basket.map(([t]) => addr[t]);
    const amounts = basket.map(([t, usd]) => (BigInt(Math.round(usd * 1e6)) * E18) / BigInt(Math.round(price(t) * 1e6)));
    const total = basket.reduce((s, [, u]) => s + u, 0);
    const weights = basket.map(([, u]) => Math.round((u / total) * 10_000));
    weights[0] += 10_000 - weights.reduce((a, b) => a + b, 0);
    const key = teamKeyFromWeights(tokens, weights);
    keys[name] = key;
    await send(0, usdt, mint, "mint", [acct(who).address, STAKE]);
    await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
    for (let k = 0; k < tokens.length; k++) {
      await send(0, tokens[k], mint, "mint", [acct(who).address, amounts[k]]);
      await send(who, tokens[k], erc20Abi, "approve", [escrow, amounts[k]]);
    }
    await send(who, escrow, leagueEscrowAbi, "enterCreatorNamed", [roundId, key, tokens, amounts, weights, name, Math.round(fee * 100)]);
  }
  for (const [who, team] of backers) {
    await send(0, usdt, mint, "mint", [acct(who).address, STAKE]);
    await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
    await send(who, escrow, leagueEscrowAbi, "enterBacker", [roundId, keys[team]]);
  }
  return keys;
}

// ---- Round 1: played and settled ----------------------------------------
let now = Number((await pub.getBlock()).timestamp);
const r1Close = now + 600;
const r1End = r1Close + 3600;
await send(0, escrow, leagueEscrowAbi, "openRound", [BigInt(r1Close), BigInt(r1End), STAKE, 100, 20]);
const R1: Creator[] = [
  ["Silicon Crown", 1, [["NVDA", 6], ["AMD", 4], ["AVGO", 3], ["TSM", 2]], 1],
  ["Crypto Rails", 2, [["COIN", 5], ["HOOD", 5], ["NVDA", 3]], 1.5],
  ["Index Plus", 3, [["SPY", 6], ["QQQ", 4], ["MSFT", 3]], 0.5],
  ["Big Tech Hold", 4, [["META", 5], ["GOOGL", 5], ["MSFT", 5]], 1],
  ["Speed Run", 5, [["TSLA", 6], ["NVDA", 4], ["COIN", 3]], 2],
];
await enterRound(1n, R1, [[6, "Silicon Crown"], [7, "Silicon Crown"], [8, "Silicon Crown"], [9, "Crypto Rails"], [10, "Index Plus"], [11, "Index Plus"], [12, "Big Tech Hold"]]);

const MOVES: Record<string, number> = { NVDA: 2.4, TSLA: -1.8, META: 0.6, MSFT: 0.3, GOOGL: -0.4, AMD: 3.1, AVGO: 1.2, TSM: 0.9, COIN: -2.6, HOOD: -1.1, SPY: 0.2, QQQ: 0.5, BNB: 1.5, BTC: -0.8, ETH: 2.0 };
for (let i = 0; i < 3; i++) {
  const atStart = (r1Close + 60 + i * 300) * 1000;
  store.saveSample(1n, "start", sampleAt(atStart, () => 1), atStart);
  const atEnd = (r1End + 60 + i * 300) * 1000;
  store.saveSample(1n, "end", sampleAt(atEnd, (t) => 1 + MOVES[t] / 100), atEnd);
}
await test.setNextBlockTimestamp({ timestamp: BigInt(r1End + 1) });
await test.mine({ blocks: 1 });

{
  const info = await readRound(pub as never, escrow, 1n);
  const entries = await readEntries(pub as never, escrow, 1n);
  const tokens = Object.values(addr).map((a) => a.toLowerCase());
  const start = buildSnapshot(store.loadSamples(1n, "start").map((x) => x.sample), tokens, 3);
  const end = buildSnapshot(store.loadSamples(1n, "end").map((x) => x.sample), tokens, 3);
  const seasonPot = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" })) as bigint;
  const s = settleRound({ roundId: 1n, stake: info.stake, capMultiple: info.capMultiple, maxBackers: info.maxBackers, seasonPot, entries, start: start.prices, end: end.prices, priceProblems: [] });
  store.saveInputs(1n, s.inputs);
  await submitSettlement(pub as never, w(0) as never, escrow, 1n, s, acct(0), foundry);
  const meta = await readTeamMeta(pub as never, escrow, 1n, s.teams.map((t) => t.teamKey));
  for (const t of s.teams) console.log(`  round 1 ${t.isWinner ? "WIN " : "    "}${meta.get(t.teamKey)?.name} ${(Number(t.ret) / 1e10).toFixed(2)}%`);
}

// ---- Round 2: entries open --------------------------------------------------
now = Number((await pub.getBlock()).timestamp);
const r2Close = now + 2 * 86_400;
const r2End = r2Close + 3 * 86_400;
await send(0, escrow, leagueEscrowAbi, "openRound", [BigInt(r2Close), BigInt(r2End), STAKE, 100, 20]);
const R2: Creator[] = [
  ["AI Chips Max", 1, [["NVDA", 5], ["AMD", 4], ["TSM", 3], ["AVGO", 3]], 1],
  ["Fintech Rails", 2, [["COIN", 5], ["HOOD", 4], ["SPY", 3]], 1.5],
  ["Steady Index", 3, [["SPY", 5], ["QQQ", 5], ["MSFT", 2]], 0.5],
  ["Big Tech Five", 4, [["META", 3], ["GOOGL", 3], ["MSFT", 3], ["NVDA", 3], ["TSLA", 3]], 1],
  ["Speed & Chips", 5, [["TSLA", 5], ["NVDA", 4], ["AVGO", 3]], 2],
  ["Cloud Kings", 6, [["MSFT", 5], ["GOOGL", 4], ["META", 3], ["QQQ", 2]], 1],
  // A crypto slice: BTC + BNB = 2.4 of 12.4 = 19.4% (cap 20%).
  ["Chips & Coins", 17, [["NVDA", 4], ["AMD", 3], ["TSM", 3], ["BTC", 1.2], ["BNB", 1.2]], 1],
];
await enterRound(2n, R2, [[7, "AI Chips Max"], [8, "AI Chips Max"], [9, "AI Chips Max"], [10, "Fintech Rails"], [11, "Steady Index"], [12, "Steady Index"], [13, "Big Tech Five"], [14, "Speed & Chips"], [15, "Cloud Kings"], [16, "AI Chips Max"]]);
// Start samples at the snapshot prices; the app moves "now" prices over time.
for (let i = 0; i < 3; i++) {
  const at = (r2Close + 60 + i * 300) * 1000;
  store.saveSample(2n, "start", sampleAt(at, () => 1), at);
}

const info = { chainId: foundry.id, rpc: RPC, escrow, usdt, roundId: "2", tokens: addr, creators: Object.fromEntries([...R1, ...R2].map(([n, who]) => [n, acct(who).address])) };
writeFileSync("data/local-demo.json", JSON.stringify(info, null, 2));
console.log(`escrow ${escrow}\nusdt ${usdt}\nround 1 settled, round 2 open (${R2.length} ETFs) → data/local-demo.json`);
