// The cron keeper on a local chain (anvil): ticks alone open a round, take the
// start and end samples, settle, and open the next round. Skipped when anvil or
// the forge build output is missing (cd contracts && forge build).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createPublicClient, createTestClient, createWalletClient, http, toHex, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import { erc20Abi, leagueEscrowAbi, readRound } from "../src/league/escrow";
import { teamKeyFromWeights } from "../src/bsc/basket";
import { BSTOCKS } from "../src/ui/data/stocks";
import { FileStore } from "../src/league/store";
import { tick, type TickOptions } from "../src/league/keeper";

const ANVIL = [process.env.ANVIL_BIN, `${homedir()}/.foundry/bin/anvil`, "/usr/local/bin/anvil"].find((p) => p && existsSync(p));
const ART = (file: string, name: string) => `contracts/out/${file}/${name}.json`;
const haveArtifacts = existsSync(ART("LeagueEscrow.sol", "LeagueEscrow")) && existsSync(ART("LeagueEscrow.t.sol", "MockToken"));
const run = ANVIL && haveArtifacts ? describe : describe.skip;

const PORT = 8900 + Math.floor(Math.random() * 300);
const RPC = `http://127.0.0.1:${PORT}`;
const MNEMONIC = "test test test test test test test test test test test junk"; // anvil's public dev mnemonic
const acct = (i: number) => mnemonicToAccount(MNEMONIC, { addressIndex: i });
const E18 = 10n ** 18n;
const STAKE = 5n * E18;
const mintAbi = [
  ...erc20Abi,
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
] as const;

run("keeper tick on anvil", () => {
  let anvil: ChildProcess;
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
  const test = createTestClient({ chain: foundry, mode: "anvil", transport: http(RPC) });
  const w = (i: number) => createWalletClient({ account: acct(i), chain: foundry, transport: http(RPC) });

  beforeAll(async () => {
    anvil = spawn(ANVIL!, ["--port", String(PORT), "--silent"], { stdio: "ignore" });
    for (let i = 0; i < 50; i++) {
      try {
        await pub.getBlockNumber();
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error("anvil did not start");
  }, 20_000);
  afterAll(() => anvil?.kill());

  async function deploy(file: string, name: string, args: unknown[]): Promise<Address> {
    const j = JSON.parse(readFileSync(ART(file, name), "utf8"));
    const hash = await w(0).deployContract({ abi: j.abi, bytecode: j.bytecode.object as Hex, args });
    return (await pub.waitForTransactionReceipt({ hash })).contractAddress!;
  }
  async function send(i: number, address: Address, abi: readonly unknown[], functionName: string, args: unknown[]) {
    const hash = await w(i).writeContract({ address, abi: abi as never, functionName: functionName as never, args: args as never });
    expect((await pub.waitForTransactionReceipt({ hash })).status).toBe("success");
  }
  const warp = async (seconds: number) => {
    await test.increaseTime({ seconds });
    await test.mine({ blocks: 1 });
  };

  it("runs a whole round from ticks alone", async () => {
    const tickers = ["NVDA", "AMD", "TSM", "MSFT", "META", "GOOGL"];
    const usdt = await deploy("LeagueEscrow.t.sol", "MockToken", ["USDT"]);
    const addr: Record<string, Address> = {};
    for (const t of tickers) addr[t] = await deploy("LeagueEscrow.t.sol", "MockToken", [t]);
    const escrow = await deploy("LeagueEscrow.sol", "LeagueEscrow", [usdt, acct(0).address]);
    for (const t of tickers) await send(0, escrow, leagueEscrowAbi, "setTokenAllowed", [addr[t], true]);

    const dir = mkdtempSync(join(tmpdir(), "league-tick-"));
    writeFileSync(join(dir, "local-demo.json"), JSON.stringify({ tokens: addr }));
    Object.assign(process.env, {
      LEAGUE_CHAIN: "local",
      BSC_RPC_URL: RPC,
      ESCROW_ADDRESS: escrow,
      KEEPER_PRIVATE_KEY: toHex(acct(0).getHdKey().privateKey!),
      LEAGUE_DATA_DIR: dir,
    });
    delete process.env.SUPABASE_URL;
    const store = new FileStore(dir);
    const opts: TickOptions = { mode: "onchain", samples: 3, everyMin: 4, windowMin: 30, autoOpen: { entryMin: 10, runMin: 60 } };
    const t = async () => (await tick(opts, store)).join("\n");

    expect(await t()).toMatch(/opened round 1/);
    expect(await t()).toMatch(/round 1: entries open/);

    // Four creators, three stocks each, equal weights, $13.50 a basket.
    const baskets = [["NVDA", "AMD", "TSM"], ["MSFT", "META", "GOOGL"], ["NVDA", "MSFT", "META"], ["AMD", "TSM", "GOOGL"]];
    for (let c = 0; c < 4; c++) {
      const who = c + 1;
      const tokens = baskets[c].map((t) => addr[t]);
      const amounts = baskets[c].map((t) => (45n * E18 * 10n ** 5n) / BigInt(Math.round(BSTOCKS.find((s) => s.ticker === t)!.price * 1e6)));
      const weights = [3334, 3333, 3333];
      await send(0, usdt, mintAbi, "mint", [acct(who).address, STAKE]);
      await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
      for (let k = 0; k < 3; k++) {
        await send(0, tokens[k], mintAbi, "mint", [acct(who).address, amounts[k]]);
        await send(who, tokens[k], erc20Abi, "approve", [escrow, amounts[k]]);
      }
      await send(who, escrow, leagueEscrowAbi, "enterCreatorNamed", [1n, teamKeyFromWeights(tokens, weights), tokens, amounts, weights, `ETF ${who}`, 100]);
    }

    // Entries close: three start samples, four minutes apart.
    await warp(10 * 60 + 5);
    expect(await t()).toMatch(/start sample 1\/3/);
    expect(await t()).toMatch(/next start sample in/);
    await warp(4 * 60);
    expect(await t()).toMatch(/start sample 2\/3/);
    await warp(4 * 60);
    expect(await t()).toMatch(/start sample 3\/3/);
    expect(await t()).toMatch(/running, ends in/);

    // Round ends: three end samples, settle with the third, then open round 2.
    await warp(60 * 60);
    expect(await t()).toMatch(/end sample 1\/3/);
    await warp(4 * 60);
    expect(await t()).toMatch(/end sample 2\/3/);
    await warp(4 * 60);
    const last = await t();
    expect(last).toMatch(/end sample 3\/3/);
    expect(last).toMatch(/round 1: settled \(4 entries/);
    expect(last).toMatch(/opened round 2/);

    expect((await readRound(pub, escrow, 1n)).status).toBe("Settled");
    const inputs = (await store.loadInputs(1n)) as { entries: unknown[] };
    expect(inputs.entries).toHaveLength(4);
    expect((await store.loadSamples(1n, "start")).length).toBe(3);
    // While the round ran, the keeper also saved chart samples.
    expect((await store.loadSamples(1n, "live")).length).toBeGreaterThan(0);
  }, 120_000);
});
