// Seed a complete demo round on a LOCAL chain (anvil), no real money:
// mock USDT + mock copies of real bStocks, the escrow, four creators, backers,
// and fake price samples in data/rounds/<id>/ so `keeper settle` works.
//
//   anvil                                   # in another terminal
//   npx tsx scripts/local-demo.mts          # prints ESCROW_ADDRESS
//   LEAGUE_CHAIN=local ESCROW_ADDRESS=0x… KEEPER_PRIVATE_KEY=<anvil key 0> \
//     npx tsx scripts/keeper.mts settle 1 --min-samples 3
//
// Needs `cd contracts && forge build` first (reads the compiled contracts).

import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, createTestClient, createWalletClient, http, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import { leagueEscrowAbi, erc20Abi } from "../src/league/escrow";
import { teamKeyOf } from "../src/bsc/basket";
import { FileStore } from "../src/league/store";
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

// Mock copies of real bStocks, at their real prices.
const PICKS = ["NVDA", "TSLA", "META", "MSFT", "GOOGL", "AMD", "AVGO", "TSM", "COIN", "HOOD", "SPY", "QQQ"];
const stocks = PICKS.map((t) => BSTOCKS.find((s) => s.ticker === t)!);

// Anvil only funds wallets 0-9: give every wallet we use some gas money.
for (let i = 0; i <= 12; i++) await test.setBalance({ address: acct(i).address, value: 100n * E18 });

const usdt = await deploy("LeagueEscrow.t.sol", "MockToken", ["USDT"]);
const addr: Record<string, Address> = {};
for (const s of stocks) addr[s.ticker] = await deploy("LeagueEscrow.t.sol", "MockToken", [s.symbol]);
const escrow = await deploy("LeagueEscrow.sol", "LeagueEscrow", [usdt, acct(0).address]);
for (const s of stocks) await send(0, escrow, leagueEscrowAbi, "setTokenAllowed", [addr[s.ticker], true]);

const now = Number((await pub.getBlock()).timestamp);
const entryClose = now + 600;
const end = entryClose + 3600;
await send(0, escrow, leagueEscrowAbi, "openRound", [BigInt(entryClose), BigInt(end), STAKE, 100, 20]);
const roundId = 1n;

// Creators: [name, wallet index, basket [ticker, $]]
const CREATORS: [string, number, [string, number][]][] = [
  ["Silicon Crown", 1, [["NVDA", 6], ["AMD", 4], ["AVGO", 3], ["TSM", 2]]],
  ["Crypto Rails", 2, [["COIN", 5], ["HOOD", 5], ["NVDA", 3]]],
  ["Index Plus", 3, [["SPY", 6], ["QQQ", 4], ["MSFT", 3]]],
  ["Big Tech Hold", 4, [["META", 5], ["GOOGL", 5], ["MSFT", 5]]],
  ["Speed Run", 5, [["TSLA", 6], ["NVDA", 4], ["COIN", 3]]],
];
const price = (t: string) => stocks.find((s) => s.ticker === t)!.price;
const keys: Record<string, Hex> = {};
for (const [name, who, basket] of CREATORS) {
  const tokens = basket.map(([t]) => addr[t]);
  const amounts = basket.map(([t, usd]) => (BigInt(Math.round(usd * 1e6)) * E18) / BigInt(Math.round(price(t) * 1e6)));
  const values = basket.map(([, usd]) => BigInt(usd) * E18);
  const key = teamKeyOf(tokens, values);
  keys[name] = key;
  await send(0, usdt, mint, "mint", [acct(who).address, STAKE]);
  await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
  for (let k = 0; k < tokens.length; k++) {
    await send(0, tokens[k], mint, "mint", [acct(who).address, amounts[k]]);
    await send(who, tokens[k], erc20Abi, "approve", [escrow, amounts[k]]);
  }
  await send(who, escrow, leagueEscrowAbi, "enterCreator", [roundId, key, tokens, amounts]);
}
// Backers: wallets 6-12 spread over three teams.
const BACKERS: [number, string][] = [[6, "Silicon Crown"], [7, "Silicon Crown"], [8, "Silicon Crown"], [9, "Crypto Rails"], [10, "Index Plus"], [11, "Index Plus"], [12, "Big Tech Hold"]];
for (const [who, team] of BACKERS) {
  await send(0, usdt, mint, "mint", [acct(who).address, STAKE]);
  await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
  await send(who, escrow, leagueEscrowAbi, "enterBacker", [roundId, keys[team]]);
}

// Fake price samples: 3 at the start, 3 at the end (moves are demo values).
const MOVES: Record<string, number> = { NVDA: 2.4, TSLA: -1.8, META: 0.6, MSFT: 0.3, GOOGL: -0.4, AMD: 3.1, AVGO: 1.2, TSM: 0.9, COIN: -2.6, HOOD: -1.1, SPY: 0.2, QQQ: 0.5 };
const store = new FileStore();
const sampleAt = (at: number, factor: (t: string) => number) =>
  new Map<string, PriceSample>(
    stocks.map((s) => {
      const token = addr[s.ticker].toLowerCase();
      return [token, { token, value: BigInt(Math.round(s.price * factor(s.ticker) * 1e6)) * 10n ** 12n, decimals: 18, trading: true, at }];
    }),
  );
for (let i = 0; i < 3; i++) {
  const atStart = (entryClose + 60 + i * 300) * 1000;
  store.saveSample(roundId, "start", sampleAt(atStart, () => 1), atStart);
  const atEnd = (end + 60 + i * 300) * 1000;
  store.saveSample(roundId, "end", sampleAt(atEnd, (t) => 1 + MOVES[t] / 100), atEnd);
}

// Move the chain past the end so the round can be settled.
await test.setNextBlockTimestamp({ timestamp: BigInt(end + 1) });
await test.mine({ blocks: 1 });

const info = { chainId: foundry.id, rpc: RPC, escrow, usdt, roundId: roundId.toString(), tokens: addr, creators: Object.fromEntries(CREATORS.map(([n, who]) => [n, acct(who).address])) };
writeFileSync("data/local-demo.json", JSON.stringify(info, null, 2));
console.log(`escrow ${escrow}\nround ${roundId}: ${CREATORS.length} creators, ${BACKERS.length} backers, samples saved\n→ data/local-demo.json`);
