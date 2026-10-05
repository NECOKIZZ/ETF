// End-to-end round on a local chain (anvil): deploy → enter → settle with the
// keeper code → claim. Skipped when anvil or the forge build output is missing:
//   cd contracts && forge build   (then)   pnpm test
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createPublicClient, createTestClient, createWalletClient, http, type Address, type Hex } from "viem";
import { foundry } from "viem/chains";
import { mnemonicToAccount } from "viem/accounts";
import { leagueEscrowAbi, erc20Abi, readEntries, readRound, roundTokens, submitSettlement } from "../src/league/escrow";
import { settleRound } from "../src/league/settlement";
import { teamKeyOf } from "../src/bsc/basket";
import type { Snapshot } from "../src/league/snapshot";

const ANVIL = [process.env.ANVIL_BIN, `${homedir()}/.foundry/bin/anvil`, "/usr/local/bin/anvil"].find((p) => p && existsSync(p));
const ART = (file: string, name: string) => `contracts/out/${file}/${name}.json`;
const haveArtifacts = existsSync(ART("LeagueEscrow.sol", "LeagueEscrow")) && existsSync(ART("LeagueEscrow.t.sol", "MockToken"));
const run = ANVIL && haveArtifacts ? describe : describe.skip;

const PORT = 8600 + Math.floor(Math.random() * 300);
const RPC = `http://127.0.0.1:${PORT}`;
const MNEMONIC = "test test test test test test test test test test test junk"; // anvil's public dev mnemonic
const acct = (i: number) => mnemonicToAccount(MNEMONIC, { addressIndex: i });
const E18 = 10n ** 18n;
const STAKE = 5n * E18;

const mockTokenAbi = [
  ...erc20Abi,
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
] as const;

function artifact(file: string, name: string): { abi: unknown[]; bytecode: Hex } {
  const j = JSON.parse(readFileSync(ART(file, name), "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object };
}

run("end-to-end round on anvil", () => {
  let anvil: ChildProcess;
  const pub = createPublicClient({ chain: foundry, transport: http(RPC) });
  const test = createTestClient({ chain: foundry, mode: "anvil", transport: http(RPC) });
  const walletFor = (i: number) => createWalletClient({ account: acct(i), chain: foundry, transport: http(RPC) });

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
    const { abi, bytecode } = artifact(file, name);
    const hash = await walletFor(0).deployContract({ abi, bytecode, args });
    const r = await pub.waitForTransactionReceipt({ hash });
    return r.contractAddress!;
  }
  async function send(i: number, address: Address, abi: readonly unknown[], functionName: string, args: unknown[]) {
    const hash = await walletFor(i).writeContract({ address, abi: abi as never, functionName: functionName as never, args: args as never });
    const r = await pub.waitForTransactionReceipt({ hash });
    expect(r.status).toBe("success");
  }

  it("enters, settles with the keeper code, and pays out exactly", async () => {
    const keeper = acct(0);
    const usdt = await deploy("LeagueEscrow.t.sol", "MockToken", ["USDT"]);
    const stocks: Address[] = [];
    for (let i = 0; i < 8; i++) stocks.push(await deploy("LeagueEscrow.t.sol", "MockToken", [`S${i}`]));
    const escrow = await deploy("LeagueEscrow.sol", "LeagueEscrow", [usdt, keeper.address]);
    for (const s of stocks) await send(0, escrow, leagueEscrowAbi, "setTokenAllowed", [s, true]);

    const now = Number((await pub.getBlock()).timestamp);
    await send(0, escrow, leagueEscrowAbi, "openRound", [BigInt(now + 3600), BigInt(now + 7200), STAKE, 100, 20]);
    const roundId = 1n;

    // Four creators, $100 start price for every stock, $12 baskets on different stocks.
    const baskets: Address[][] = [stocks.slice(0, 3), stocks.slice(2, 5), stocks.slice(4, 7), [stocks[0], stocks[5], stocks[7]]];
    const keys: Hex[] = [];
    for (let c = 0; c < 4; c++) {
      const who = c + 1;
      const amounts = [5n, 4n, 3n].map((usd) => (usd * E18) / 100n);
      const key = teamKeyOf(baskets[c], [5n, 4n, 3n].map((u) => u * E18));
      keys.push(key);
      await send(0, usdt, mockTokenAbi, "mint", [acct(who).address, STAKE]);
      await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
      for (let k = 0; k < 3; k++) {
        await send(0, baskets[c][k], mockTokenAbi, "mint", [acct(who).address, amounts[k]]);
        await send(who, baskets[c][k], erc20Abi, "approve", [escrow, amounts[k]]);
      }
      await send(who, escrow, leagueEscrowAbi, "enterCreator", [roundId, key, baskets[c], amounts]);
    }
    // Two backers on creator 1's team.
    for (const who of [5, 6]) {
      await send(0, usdt, mockTokenAbi, "mint", [acct(who).address, STAKE]);
      await send(who, usdt, erc20Abi, "approve", [escrow, STAKE]);
      await send(who, escrow, leagueEscrowAbi, "enterBacker", [roundId, keys[0]]);
    }

    // Round ends.
    await test.increaseTime({ seconds: 7300 });
    await test.mine({ blocks: 1 });

    // Keeper: read the chain, snapshot prices, settle.
    const info = await readRound(pub, escrow, roundId);
    const entries = await readEntries(pub, escrow, roundId);
    expect(entries).toHaveLength(6);
    const tokens = roundTokens(entries);
    const px = (usd: (i: number) => number): Map<string, Snapshot> =>
      new Map(stocks.map((s, i) => [s.toLowerCase(), { token: s.toLowerCase(), value: BigInt(usd(i) * 100) * 10n ** 16n, decimals: 18, samples: 3 }]));
    const start = px(() => 100);
    const end = px((i) => [112, 106, 101, 99, 97, 95, 92, 90][i]); // early stocks did best
    const seasonPot = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" })) as bigint;
    const s = settleRound({ roundId, stake: info.stake, capMultiple: info.capMultiple, maxBackers: info.maxBackers, seasonPot, entries, start, end, priceProblems: [] });
    expect(tokens.length).toBe(8);
    expect(s.void).toBeNull();
    await submitSettlement(pub, walletFor(0), escrow, roundId, s, keeper, foundry);
    expect((await readRound(pub, escrow, roundId)).status).toBe("Settled");

    // Everyone claims; balances match the settlement exactly.
    for (const e of entries) {
      const who = [1, 2, 3, 4, 5, 6].find((i) => acct(i).address.toLowerCase() === e.wallet.toLowerCase())!;
      await send(who, escrow, leagueEscrowAbi, "claim", [roundId]);
      const bal = (await pub.readContract({ address: usdt, abi: erc20Abi, functionName: "balanceOf", args: [e.wallet] })) as bigint;
      expect(bal).toBe(s.payouts[e.index]);
      if (e.basket) {
        for (let k = 0; k < e.basket.tokens.length; k++) {
          const tb = (await pub.readContract({ address: e.basket.tokens[k], abi: erc20Abi, functionName: "balanceOf", args: [e.wallet] })) as bigint;
          expect(tb >= e.basket.amounts[k]).toBe(true); // basket returned
        }
      }
    }
    // What's left in the escrow is exactly platform + season pot.
    const left = (await pub.readContract({ address: usdt, abi: erc20Abi, functionName: "balanceOf", args: [escrow] })) as bigint;
    const platform = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "platformBalance" })) as bigint;
    const season = (await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "seasonPot" })) as bigint;
    expect(left).toBe(platform + season);
    // Returns: creator 1 +7.25%, creator 4 +0.83% (holds stock 0 at +12%), creator 2 −0.67%,
    // creator 3 −4.9%. Top half = creators 1 and 4; creator 1's team includes both backers.
    expect(s.teams.filter((t) => t.isWinner).map((t) => t.captain.toLowerCase())).toEqual([acct(1).address.toLowerCase(), acct(4).address.toLowerCase()]);
    expect(s.payouts[4]).toBeGreaterThan(STAKE); // backers won with their creator
  }, 120_000);
});
