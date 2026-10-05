// List tokenized stocks on BSC from the Binance Web3 RWA Data API.
//   npx tsx scripts/rwa-tokens.mts [ondo|bstock] [--raw | --logos]
import { rwaTokens, BinanceW3Error, type RwaPlatform } from "../src/bsc/binanceWeb3";
import { exclusionReason } from "../src/bsc/tokens";

const platform = process.argv.find((a) => a === "ondo" || a === "bstock") as RwaPlatform | undefined;
const raw = process.argv.includes("--raw");
const logos = process.argv.includes("--logos");

const t0 = Date.now();
try {
  const tokens = await rwaTokens({ platformId: platform });
  console.error(`${tokens.length} tokens in ${Date.now() - t0} ms, ${tokens.filter((t) => !exclusionReason(t)).length} allowed in the league`);
  if (raw) console.log(JSON.stringify(tokens, null, 2));
  else if (logos) for (const t of tokens) console.log(`${t.underlyingTicker}\t${t.tokenLogoUrl}`);
  else {
    const kind: Record<number, string> = { 1: "stock", 2: "pre-ipo", 3: "etf" };
    console.log(["symbol", "ticker", "platform", "type", "session", "status", "tokenPrice", "league", "name", "address"].join("\t"));
    for (const t of tokens)
      console.log(
        [
          t.tokenSymbol,
          t.underlyingTicker,
          t.platformId,
          kind[t.assetType] ?? t.assetType,
          t.statusInfo?.marketStatus,
          t.statusInfo?.reasonCode,
          Number(t.tokenPrice).toFixed(2),
          exclusionReason(t) ? `NO:${exclusionReason(t)}` : "ok",
          t.underlyingName,
          t.tokenContractAddress,
        ].join("\t"),
      );
  }
} catch (e) {
  if (e instanceof BinanceW3Error) console.error(`API error: status=${e.status} code=${e.code} ${e.message} (${e.path})`);
  else console.error(e);
  process.exit(1);
}
