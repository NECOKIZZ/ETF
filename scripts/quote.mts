// Check that a basket buy can pay the ETF creator a fee through the Binance
// Web3 trading API. Builds quotes and an UNSIGNED swap transaction only:
// nothing is signed or sent, no funds move.
//
//   npx tsx --env-file=.env.local scripts/quote.mts [TOKEN_ADDRESS] [USDT_AMOUNT] [WALLET] [FEE_PCT]
//
// Defaults: NVDAB, $10 of USDT, a placeholder wallet, 1% fee to a placeholder creator.
import { quote, buildSwap, BinanceW3Error, type SwapRequest } from "../src/bsc/binanceWeb3";

const USDT = "0x55d398326f99059fF775485246999027B3197955"; // BSC USDT, 18 decimals
const NVDAB = "0x02fca66c1d1afb4e2a7884261eb00f63598a7436";
const PLACEHOLDER_WALLET = "0x000000000000000000000000000000000000dEaD";
const PLACEHOLDER_CREATOR = "0x1111111111111111111111111111111111111111";

const [token = NVDAB, usd = "10", wallet = PLACEHOLDER_WALLET, feePct = "1"] = process.argv.slice(2);
const amount = BigInt(Math.round(Number(usd) * 100)) * 10n ** 16n;

const base: SwapRequest = { fromTokenAddress: USDT, toTokenAddress: token, amount, userWalletAddress: wallet };
const withFee: SwapRequest = { ...base, feePercent: Number(feePct), referrer: PLACEHOLDER_CREATOR };

async function step<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t0 = Date.now();
  try {
    const out = await fn();
    console.log(`\n✅ ${label} (${Date.now() - t0} ms)`);
    return out;
  } catch (e) {
    const msg = e instanceof BinanceW3Error ? `code=${e.code} ${e.message}` : String(e);
    console.log(`\n❌ ${label} (${Date.now() - t0} ms): ${msg}`);
    return undefined;
  }
}

const show = (routes: { vendorName: string; executionMode: string; toTokenAmount: string; quoteId: string }[]) => {
  for (const r of routes)
    console.log(`   ${r.vendorName.padEnd(14)} ${r.executionMode.padEnd(5)} out=${(Number(r.toTokenAmount) / 1e18).toFixed(6)}`);
};

console.log(`Buying $${usd} of ${token} with USDT, wallet ${wallet}, creator fee ${feePct}%`);

const plain = await step("1. Quote without a fee", () => quote(base));
if (plain) show(plain);

const fee = await step(`2. Quote with a ${feePct}% creator fee`, () => quote(withFee));
if (fee) show(fee);

const best = fee?.[0] ?? plain?.[0];
if (best) {
  const tx = await step(`3. Build the swap with the creator fee (route: ${best.vendorName}, ${best.executionMode})`, () =>
    buildSwap(withFee, best.quoteId),
  );
  if (tx) {
    console.log(`   mode=${tx.executionMode} to=${tx.tx?.to} gas=${tx.tx?.gas} minReceive=${tx.tx?.minReceiveAmount}`);
    console.log(`   rfq data present: ${tx.rfq ? "yes" : "no"}`);
    console.log(`   raw keys: ${Object.keys(tx).join(", ")}`);
  }
}
