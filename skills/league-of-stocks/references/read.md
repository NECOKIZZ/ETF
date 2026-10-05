# Reading the league

All reads are plain HTTPS GETs with no keys. Use `curl -s` and parse the JSON.

## `GET {LEAGUE_API}/api/config`

Chain, contract and rules.

| Field | Meaning |
|---|---|
| `chain`, `chainId` | `bsc` / `56` in production (`local` / `31337` on a developer's demo chain) |
| `escrow` | the league contract (all `lock`, `back`, `claim` steps call it) |
| `usdt` | the ticket token (BSC USDT, 18 decimals) |
| `currentRound` | latest round id |
| `rules` | `minTokens` 3, `maxTokens` 10, `maxWeightPct` 50, `minBasketUsd` 10, `ticketUsd` 5, `maxBuyFeePct` 2, `driftPct` 5 |
| `buyEnabled` | whether `buy-basket` / `buy-etf` plans work on this deployment |

## `GET {LEAGUE_API}/api/stocks`

`stocks[]`: `ticker` (NVDA), `symbol` (NVDAB), `name`, `kind` (`stock` | `etf`), `address` (the token
on this chain: use this, never a guessed address), `price` (USD per token), `trading`.
`source` says whether prices are live from Binance or a snapshot.

## `GET {LEAGUE_API}/api/rounds/current`

| Field | Meaning |
|---|---|
| `id`, `phase` | `entries-open` → `running` → `ended` → `settled` (or `voided`) |
| `entryClose`, `end` | unix seconds: entries close, then the round ends |
| `stake`, `pot`, `entries` | ticket (wei), total tickets (wei), number of entries |
| `teams[]` | ranked by return so far |

Each team: `teamKey` (its id for `back` / `buy-etf`), `name`, `captain` (creator wallet), `buyFeeBps`
(fee for buying the ETF, 100 = 1%), `holdings[]` (`ticker`, `weightBps`), `returnPct`, `members`
(tickets on the team besides the captain), `winningNow`, `payoutPerTicketNow` (wei a $5 ticket
would get back, stake included, if the round ended now).

Explain it simply: "top half wins". `payoutPerTicketNow` changes as prices and teams change.

## `GET {LEAGUE_API}/api/me?wallet=<address>`

`entries[]` for recent rounds: `roundId`, `status`, `teamName`, `role` (`creator` | `backer`),
`payout` (wei, after settlement), `claimed`, `claimable`, `basket[]` (locked tokens, creators only).
