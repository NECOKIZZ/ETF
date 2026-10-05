// Live check of "Buy the ETF": quotes + unsigned transactions for buying a
// basket with USDT through the Binance trading API, creator fee included.
// Nothing is signed or sent.
//   npx tsx --env-file=.env.local scripts/buy-plan.mts [USDT=20] [WALLET] [CREATOR]
import { planBasketBuy } from "../src/bsc/buyBasket";
import { byTicker } from "../src/ui/data/stocks";

const [usd = "20", wallet = "0x000000000000000000000000000000000000dEaD", creator = "0x1111111111111111111111111111111111111111"] = process.argv.slice(2);
const basket: [string, number][] = [["NVDA", 4000], ["AMD", 3000], ["AVGO", 3000]];
const t0 = Date.now();
const plan = await planBasketBuy({
  tokens: basket.map(([t]) => byTicker(t)!.address),
  weightsBps: basket.map(([, w]) => w),
  usdtIn: BigInt(Math.round(Number(usd) * 100)) * 10n ** 16n,
  wallet,
  creator,
  creatorFeePct: 1,
});
console.log(`$${usd} → ${basket.map(([t, w]) => `${t} ${w / 100}%`).join(", ")} · creator fee ${plan.creatorFeePct}% · ${Date.now() - t0} ms`);
for (const [i, l] of plan.legs.entries()) {
  const t = basket[i][0];
  if (l.error) console.log(`  ❌ ${t}: ${l.error}`);
  else {
    console.log(`  ✅ ${t}: ${Number(l.amountIn) / 1e18} USDT → ${(Number(l.expectedOut) / 1e18).toFixed(6)} ${t} via ${l.vendor} (${l.mode}) router ${l.tx?.to} gas ${l.tx?.gas}${l.rfq ? " · RFQ data" : ""}`);
    console.log(`     approval: ${l.approveTx ? `included, to ${l.approveTx.to}` : "not found in the response"} · spender ${l.spender}`);
  }
}
// One raw swap response, so we can see where Binance puts the approval.
if (process.argv.includes("--raw")) {
  const { buildSwap, quote } = await import("../src/bsc/binanceWeb3");
  const req = { fromTokenAddress: "0x55d398326f99059fF775485246999027B3197955", toTokenAddress: byTicker("NVDA")!.address, amount: 5n * 10n ** 18n, userWalletAddress: wallet, feePercent: 1, referrer: creator };
  const [best] = await quote(req);
  const swap = await buildSwap(req, best.quoteId);
  console.log("raw quote keys:", Object.keys(best).join(", "));
  console.log("raw swap response:", JSON.stringify(swap, (_k, v) => (typeof v === "string" && v.length > 120 ? `${v.slice(0, 60)}…(${v.length} chars)` : v), 2));
}
console.log(plan.ok ? "all legs quoted" : "some legs failed");
