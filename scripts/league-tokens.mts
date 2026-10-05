// Print the league's allowed tokens (bStocks + the crypto slice) as one
// comma-separated line, for LEAGUE_TOKENS in contracts/script/DeployLeague.s.sol.
//   npx tsx scripts/league-tokens.mts            # all
//   npx tsx scripts/league-tokens.mts --table    # with tickers, to check by eye
import { getAddress } from "viem";
import { BSTOCKS } from "../src/ui/data/stocks";

if (process.argv.includes("--table")) for (const s of BSTOCKS) console.log(`${s.kind.padEnd(6)} ${s.ticker.padEnd(6)} ${s.symbol.padEnd(7)} ${getAddress(s.address)}`);
else console.log(BSTOCKS.map((s) => getAddress(s.address)).join(","));
