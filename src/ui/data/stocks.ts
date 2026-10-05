// bStocks on BSC: a snapshot of Binance's RWA token list (5 Oct 2026, ~11:40
// UTC) used for the UI showcase and as a fallback when the live API is not
// reachable. Live pages read the same fields from /rwa/tokens.
//
// Leveraged funds (TQQQ, SOXL, KORU, MUU, INTW, SNXX, MVLL) are left out:
// they are banned from the league.

import { cardColor, inkFor } from "./palette";

export interface StockInfo {
  symbol: string;   // token symbol, e.g. NVDAB
  ticker: string;   // underlying ticker, e.g. NVDA
  name: string;     // company / fund name
  kind: "stock" | "etf";
  price: number;    // USD per token
  address: `0x${string}`;
  /** Card background: one of the brand colours (src/ui/data/palette.ts). */
  color: string;
  /** Text colour on the card. */
  ink: "light" | "dark";
  /** Company logo, from Binance's token list (saved under public/logos). */
  logo?: string;
}

type Raw = Omit<StockInfo, "color" | "ink" | "logo">;

const s = (
  symbol: string,
  ticker: string,
  name: string,
  price: number,
  address: string,
  _ink?: "light" | "dark",
  kind: "stock" | "etf" = "stock",
): Raw => ({ symbol, ticker, name, price, address: address as `0x${string}`, kind });

// Most recognisable first.
const RAW: Raw[] = [
  s("NVDAB", "NVDA", "NVIDIA", 235.28, "0x02fca66c1d1afb4e2a7884261eb00f63598a7436", "dark"),
  s("TSLAB", "TSLA", "Tesla", 369.14, "0x5b1910eaad6450e50f816082aa078c41f10c292f"),
  s("METAB", "META", "Meta Platforms", 726.65, "0x7425889fe94f9d693e8daefe88bcced6acfef4c0"),
  s("MSFTB", "MSFT", "Microsoft", 520.17, "0x80106cb3ead06659a5ad19df39d9b4733863b9b0"),
  s("GOOGLB", "GOOGL", "Alphabet", 343.73, "0x3f53de71c126bdabae20f9cd64848d317f6c3238"),
  s("AMDB", "AMD", "AMD", 627.41, "0x75fd4cf6f8392e41e70391d60c90c0d5211603a1"),
  s("AVGOB", "AVGO", "Broadcom", 355.45, "0x76682c454467b3a1150ad8b6a92fc5ee2c21d7ed"),
  s("TSMB", "TSM", "TSMC", 482.28, "0xab78b89b5bb00236be0b4b20704cbfa04efc711c"),
  s("PLTRB", "PLTR", "Palantir", 189.55, "0x0ca5d51d0277bd006fd9607d3e560785ebad8222"),
  s("ORCLB", "ORCL", "Oracle", 142.62, "0x4684d9887fc1c71cba7bab8e88835cec217eb598"),
  s("COINB", "COIN", "Coinbase", 188.05, "0x585bde7c54abb5ccd7791f923d6c2187635f3952"),
  s("HOODB", "HOOD", "Robinhood", 114.42, "0xa394dcea3fd3847fd793afbfd163e2e3858b7c65", "dark"),
  s("MSTRB", "MSTR", "Strategy", 164.6, "0xe87afb3076aeb0f9b14e368de8145ae6a2826a14", "dark"),
  s("CRCLB", "CRCL", "Circle", 83.85, "0x80f3d493ebce97e343c53d29a137942416b4ffc0"),
  s("ARMB", "ARM", "Arm Holdings", 307.61, "0xd42a79ebb7f527f40faecd196ffb47ad5e8d6f8c"),
  s("QCOMB", "QCOM", "Qualcomm", 185.98, "0x5f7a56e877b9130608bf8be962621011182fefe1"),
  s("INTCB", "INTC", "Intel", 114.65, "0xe614e2fc6c787035ff51f452e8e826bfd32d5283"),
  s("MUB", "MU", "Micron", 1070.32, "0xcdf2f3e0fa43c47a6662a91c9e4a7c5f69762699"),
  s("MRVLB", "MRVL", "Marvell", 273.2, "0x16cd4fe7e8880ecc3ba222795229e20489fc2c76"),
  s("IBMB", "IBM", "IBM", 223.96, "0xfa273b076feb8c0fb34e554ae341082323d016a3"),
  s("BABAB", "BABA", "Alibaba", 107.71, "0x4ef9d3062c7f6eba4aae4990c5036598c6eff4ec"),
  s("NBISB", "NBIS", "Nebius", 243.42, "0xe256bc2a4f5297f8ba6f043f180a46300ecbcbb1", "dark"),
  s("CRWVB", "CRWV", "CoreWeave", 90.0, "0x33e7317e17838fee56b10fe8d0b9ca6ca3090c95"),
  s("RKLBB", "RKLB", "Rocket Lab", 73.83, "0xc8da12cbcce7c45180692a6420b0076e03a5179a"),
  s("SPCXB", "SPCX", "SpaceX", 159.1, "0xbe9d156892e55e7154bcd3cb0fea677f9d3103e1"),
  s("SNDKB", "SNDK", "Sandisk", 1726.2, "0x3ee4df61bd4f867e349beae8bfe07bc31b4850fb"),
  s("WDCB", "WDC", "Western Digital", 421.46, "0xebe29695f8047c13d36e7a790ca8c1b239ffad1c"),
  s("LITEB", "LITE", "Lumentum", 1085.25, "0x64748bea17b6d19e242adf20425de2440c656142"),
  s("GLWB", "GLW", "Corning", 163.73, "0x740e075cbbea22a082b9d6679e65e82767875b6a"),
  s("SKHYB", "SKHY", "SK hynix", 194.32, "0xca750ef65f295bbecd685abf54e82caf297bdb61"),
  s("AAOIB", "AAOI", "Applied Optoelectronics", 115.77, "0x10343ef7da3301493d7ecb647d68a288c6c1db2f"),
  s("AXTIB", "AXTI", "AXT Inc", 86.17, "0x9bdc8b470dbf89dbcb123587c6f5e49cca3463be"),
  s("CBRSB", "CBRS", "Cerebras", 173.97, "0xe81c6bb0266cd68b4f17278531dd03ea1f12da4e"),
  s("NOKB", "NOK", "Nokia", 10.48, "0x7c4d7a180d737dd5a70d8065a90e6746a69c37ea"),
  s("QNTB", "QNT", "Quantum", 46.37, "0xd721c192d612db77621df57a9fab38418033c02e"),
  s("SPYB", "SPY", "SPDR S&P 500 ETF", 770.79, "0x7138b48df7d98d7e3cc221bfe7192d0a178182d8", "light", "etf"),
  s("QQQB", "QQQ", "Invesco QQQ", 749.45, "0x205812cdbed920aff76c6580abd681a46d11efc7", "light", "etf"),
  s("EWYB", "EWY", "iShares MSCI South Korea", 191.36, "0xbe82f76637dba2c114c41df856c2c51e522e2cb8", "light", "etf"),
  s("DRAMB", "DRAM", "Memory ETF", 61.63, "0x93862d63fd9fd488b1328e9b47717d75e994a84b", "light", "etf"),
];

/** Tickers with a logo saved in public/logos/<TICKER>.png (Binance's bStock logos). */
export const LOGOS = new Set<string>([
  "AAOI", "AMD", "ARM", "AVGO", "AXTI", "BABA", "CBRS", "COIN", "CRCL", "CRWV",
  "DRAM", "EWY", "GLW", "GOOGL", "HOOD", "IBM", "INTC", "LITE", "META", "MRVL",
  "MSFT", "MSTR", "MU", "NBIS", "NOK", "NVDA", "ORCL", "PLTR", "QCOM", "QNT",
  "QQQ", "RKLB", "SKHY", "SNDK", "SPCX", "SPY", "TSLA", "TSM", "WDC",
]);

export const BSTOCKS: StockInfo[] = RAW.map((r, i) => ({
  ...r,
  color: cardColor(i),
  ink: inkFor(cardColor(i)),
  logo: LOGOS.has(r.ticker) ? `/logos/${r.ticker}.png` : undefined,
}));

export const byTicker = (t: string): StockInfo | undefined => BSTOCKS.find((x) => x.ticker === t);

/**
 * Showcase-only movement numbers (% since round start). Deterministic so the
 * page renders the same on server and client. Live pages use real snapshots.
 */
export function demoChangePct(ticker: string): number {
  let h = 0;
  for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Math.round((((h % 900) - 380) / 100) * 100) / 100; // about −3.8% … +5.2%
}
