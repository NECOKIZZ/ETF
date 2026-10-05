// Check a settled round yourself: re-run the settlement from the published
// inputs, compare payouts, and compare the hash with the one on-chain.
//
//   npx tsx scripts/verify.mts <inputs.json path or URL> [roundId]
//   (with BSC_RPC_URL / ESCROW_ADDRESS set, also checks the on-chain hash)

import { readFileSync } from "node:fs";
import type { Hex } from "viem";
import { verifyInputs } from "../src/league/verify";
import { clientsFromEnv } from "../src/league/chain";
import { readRound } from "../src/league/escrow";

const [src, roundArg] = process.argv.slice(2);
if (!src) {
  console.log("usage: verify.mts <inputs.json path or URL> [roundId]");
  process.exit(1);
}
const raw = /^https?:/.test(src) ? await (await fetch(src)).json() : JSON.parse(readFileSync(src, "utf8"));
let onchain: Hex | null = null;
if (process.env.ESCROW_ADDRESS) {
  const { pub } = clientsFromEnv();
  onchain = (await readRound(pub, process.env.ESCROW_ADDRESS as Hex, BigInt(roundArg ?? raw.roundId))).inputsHash;
}
const r = verifyInputs(raw, onchain);
console.log(`inputs hash      ${r.inputsHash}`);
console.log(`recomputed hash  ${r.recomputedHash}`);
console.log(`on-chain hash    ${r.onchainHash ?? "(not checked: set ESCROW_ADDRESS)"}`);
console.log(`payouts          ${r.payoutsMatch ? "all match" : `differ for entries ${r.mismatches.join(", ")}`}`);
console.log(r.ok ? "✓ settlement verified" : "✗ settlement does NOT verify");
process.exit(r.ok ? 0 : 1);
