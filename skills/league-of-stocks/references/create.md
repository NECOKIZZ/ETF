# Build an ETF and enter it

A creator (1) buys 3 to 10 stocks with USDT, then (2) locks them in the league with a $5 ticket.
The first creator of a basket is its **captain** and names it. Someone who locks the same stocks
at the same weights (to 1%) joins that team instead of starting a new one.

## 0. Agree the ETF with the user

- **Stocks:** at least 3 stocks or funds, up to 10 assets in all, from `/api/stocks` (leveraged funds are not listed and not allowed).
- **Crypto (optional):** BNB, BTC and/or ETH (`kind: crypto`), together at most 20% of the weights. BNB is bought and locked as WBNB.
- **Weights:** whole percents summing to 100, none above 50.
- **Size:** at least $10 of stocks. Suggest about $10.50 or more: swap fees and price moves can push
  a basket bought for exactly $10 under the minimum before the round starts.
- **Name:** 1 to 32 characters. **Buy fee:** 0% to 2% (default 1%), paid by people who later buy
  this ETF through the app; it goes to the creator's wallet.
- Needs: the stocks' cost + 5 USDT ticket + a little BNB for gas.

Check the round first (`/api/rounds/current`): `phase` must be `entries-open`, and one wallet can
have only one entry per round.

## 1. Buy the stocks

For each stock, swap its share of the USDT with the Agentic Wallet (follow the
`binance-agentic-wallet` skill's market-order rules, including its security pre-check and polling):

```bash
baw market-order swap --fromTokenQty <usdt × weight> --fromToken 0x55d398326f99059fF775485246999027B3197955 --toToken <stock address from /api/stocks> --binanceChainId 56 --json
baw market-order list --orderId <orderId> --json   # poll until FINISHED or FAILED
```

Only continue when every swap is `FINISHED`. If one fails, tell the user and ask what to do.

## 2. Lock the basket and enter

```bash
curl -s -X POST {LEAGUE_API}/api/plan -H 'content-type: application/json' -d '{
  "action": "lock",
  "wallet": "<agent wallet>",
  "tickers": ["NVDA", "AMD", "TSM"],
  "weightsPct": [40, 35, 25],
  "name": "AI Chips",
  "buyFeePct": 1
}'
```

- By default it locks the wallet's **whole balance** of each chosen stock. To lock less, add
  `"amounts": ["<wei>", …]` in the same order as `tickers`.
- `notes` may warn that a stock's share at current prices is far from the declared weight. Over
  5 points apart at round start refunds the entry (the ticket comes back, nothing is lost but gas).
  Show the warning; the user may buy a little more of one stock first.
- Steps: one approval per stock not yet approved, the ticket approval, then `enterCreatorNamed`.
  Run them with the flow in SKILL.md. Report the `teamKey`.
