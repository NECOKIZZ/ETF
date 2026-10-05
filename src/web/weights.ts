// Basket weight helpers for the create flow (pure, tested).

/**
 * Equal weights in whole percents summing to 100. Crypto gets at most its
 * equal share, and together no more than the cap; the stocks share the rest.
 */
export function equalWeights(picks: { ticker: string; crypto: boolean }[], maxCryptoPct: number): Record<string, number> {
  const w: Record<string, number> = {};
  if (!picks.length) return w;
  const stocks = picks.filter((p) => !p.crypto);
  const crypto = picks.filter((p) => p.crypto);
  const spread = (group: typeof picks, total: number) => {
    const base = Math.floor(total / group.length);
    group.forEach((p, i) => (w[p.ticker] = base + (i < total - base * group.length ? 1 : 0)));
  };
  if (!stocks.length || !crypto.length) {
    spread(picks, 100);
    return w;
  }
  const perCrypto = Math.min(Math.floor(100 / picks.length), Math.floor(maxCryptoPct / crypto.length));
  crypto.forEach((p) => (w[p.ticker] = perCrypto));
  spread(stocks, 100 - perCrypto * crypto.length);
  return w;
}
