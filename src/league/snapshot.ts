// Price snapshots for scoring a round.
//
// One /rwa/tokens call returns every token's price, token→share ratio and
// market status, so a "sample" is one call. A snapshot averages several
// samples over a window (time-weighted by equal spacing) so one odd print
// can't swing a round.
//
// Token value (USD per token, 18-decimal fixed point):
//   "reference" mode: referencePrice × tokenToShareRatio (the underlying share
//                     price, including reinvested dividends) — the default;
//   "onchain" mode:   tokenPrice (the on-chain token price) — demo rounds,
//                     since bStocks trade 24/7.

import { decimalToE18, tokenValueE18, type RwaToken } from "../bsc/binanceWeb3";

export type PriceMode = "reference" | "onchain";

export interface PriceSample {
  token: string;        // lower-case contract address
  value: bigint;        // USD per token, 1e18
  decimals: number;
  trading: boolean;     // statusInfo.reasonCode === "TRADING"
  at: number;           // unix ms when sampled
}

/** One sample from a /rwa/tokens response. */
export function sampleFromTokens(tokens: RwaToken[], mode: PriceMode, at: number): Map<string, PriceSample> {
  const out = new Map<string, PriceSample>();
  for (const t of tokens) {
    const token = t.tokenContractAddress.toLowerCase();
    let value: bigint;
    try {
      value = mode === "reference" ? tokenValueE18(t.referencePrice, t.tokenToShareRatio) : decimalToE18(t.tokenPrice);
    } catch {
      continue; // missing or malformed price: the token simply has no sample
    }
    out.set(token, {
      token,
      value,
      decimals: Number(t.decimals),
      trading: t.statusInfo?.reasonCode === "TRADING",
      at,
    });
  }
  return out;
}

export interface Snapshot {
  token: string;
  value: bigint;        // mean of the sample values, 1e18
  decimals: number;
  samples: number;
}

export type SnapshotProblem = { token: string; reason: "missing" | "not-trading" | "too-few-samples" };

/**
 * Average the samples for each token. A token is a problem (and voids any
 * round that scores it) if it is missing, ever not TRADING, or has fewer than
 * `minSamples` samples.
 */
export function buildSnapshot(
  samples: Map<string, PriceSample>[],
  tokens: string[],
  minSamples: number,
): { prices: Map<string, Snapshot>; problems: SnapshotProblem[] } {
  const prices = new Map<string, Snapshot>();
  const problems: SnapshotProblem[] = [];
  for (const raw of tokens) {
    const token = raw.toLowerCase();
    const got = samples.map((s) => s.get(token)).filter((x): x is PriceSample => !!x);
    if (got.length === 0) {
      problems.push({ token, reason: "missing" });
      continue;
    }
    if (got.some((g) => !g.trading)) {
      problems.push({ token, reason: "not-trading" });
      continue;
    }
    if (got.length < minSamples) {
      problems.push({ token, reason: "too-few-samples" });
      continue;
    }
    const sum = got.reduce((acc, g) => acc + g.value, 0n);
    prices.set(token, { token, value: sum / BigInt(got.length), decimals: got[0].decimals, samples: got.length });
  }
  return { prices, problems };
}

/** USD value (1e18) of `amount` base units of a token at `price`. */
export const valueOf = (amount: bigint, price: Snapshot): bigint => (amount * price.value) / 10n ** BigInt(price.decimals);
