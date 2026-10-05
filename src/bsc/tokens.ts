// Which tokenized stocks may go into a league ETF.
//
// Rule: leveraged and inverse funds are banned (a 3× fund would win most
// rounds by volatility alone, rewarding gambling over stock picking). They are
// detected from the fund names Binance returns, plus a backstop ticker list,
// because the RWA API has no "leverage" field.

import type { RwaToken } from "./binanceWeb3";

/** Known leveraged / inverse tickers (underlying), backstop for the name check. */
export const LEVERAGED_TICKERS = new Set([
  "TQQQ", "SQQQ", "SOXL", "SOXS", "UPRO", "SPXU", "SPXL", "SPXS", "SSO", "SDS", "QLD", "QID",
  "TNA", "TZA", "LABU", "LABD", "FNGU", "FNGD", "TECL", "TECS", "NVDL", "NVDU", "TSLL", "TSLQ",
  "KORU", "YINN", "YANG", "UVXY", "SVXY", "BITX", "MSTU", "MSTX", "CONL", "MUU", "INTW", "SNXX",
]);

const LEVERAGE_NAME = /\b\d(\.\d+)?x\b|leverag|inverse|\bultra|\bbull\b|\bbear\b|daily target|daily .*\b(long|short)\b/i;

export function isLeveraged(t: Pick<RwaToken, "underlyingTicker" | "underlyingName" | "tokenName">): boolean {
  if (LEVERAGED_TICKERS.has((t.underlyingTicker ?? "").toUpperCase())) return true;
  return LEVERAGE_NAME.test(`${t.underlyingName ?? ""} ${t.tokenName ?? ""}`);
}

export type ExclusionReason = "leveraged" | "not-trading" | "pre-ipo";

/** Why a token can't go into a league ETF, or null if it can. */
export function exclusionReason(t: RwaToken): ExclusionReason | null {
  if (t.assetType === 2) return "pre-ipo"; // no reliable reference price
  if (isLeveraged(t)) return "leveraged";
  if (t.statusInfo && t.statusInfo.reasonCode !== "TRADING") return "not-trading";
  return null;
}

export const leagueEligible = (tokens: RwaToken[]): RwaToken[] => tokens.filter((t) => exclusionReason(t) === null);
