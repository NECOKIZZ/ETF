# League of Stocks

On-chain stock ETFs on BNB Chain, playing a weekly league. Built for **BNB Hack: Tokenized Stocks Edition**.

- **Creators** build an ETF by locking a basket of tokenized stocks (bStocks, Ondo, xStocks), at least 3 stocks and at least $10, and pay a $5 ticket. The locked basket *is* the ETF. Its score is the real return of exactly what was locked.
- **Backers** can **buy the ETF** in one tap through the Binance Web3 Wallet trading API (the creator earns a buy fee through the API's referral fee), **back the team** with a $5 ticket, or both.
- Each round, ETFs are ranked by the % growth of their stocks. **The top half win the bottom half's tickets**, split by stake × accuracy. Peer to peer: the platform never puts money in.

> "ETF" here means an on-chain basket of tokenized stocks, not a regulated fund. Capital is at risk.

## Status
Hackathon week, 5–11 Oct 2026. Rules and plan: [`docs/BNB.md`](docs/BNB.md).

| Piece | Where | State |
|---|---|---|
| Settlement engine | `src/engine/league.ts` | ✅ tested |
| League contract (BSC) | `contracts/src/LeagueEscrow.sol` | ✅ tested; mainnet deploy planned Thu 8 Oct |
| Binance Web3 API (RWA prices, swaps with creator fee) | `src/bsc/` | ✅ live-checked from an allowed region |
| Keeper + verifiable settlement | `scripts/keeper.mts`, `scripts/verify.mts` | ✅ tested on a local chain |
| Web app | `app/` | ✅ landing, league, ETF, create, my entries, leaderboard, results, rules, agents |
| Agents (Binance Agentic Wallet) | `skills/league-of-stocks/`, `/api/plan`, `scripts/agent.mts` | ✅ plans tested on a local chain |

## How settlement works
1. Every ETF's score is the buy-and-hold return of its locked basket, priced by the Binance RWA price API.
2. D = best return − this return. With `n` ETFs, `k = n//2 + 1` and `m` = the k-th smallest D. An ETF wins if D < m, so exactly the top half wins (boundary ties lose).
3. Accuracy `a = (1 / (1 + D/m))^6`. The pot (losing tickets minus a 10% take) is split by team stake × a, under a 100× gain cap.
4. Inside a team, winnings split by stake. The creator takes 10% of their ticket backers' winnings.
5. The take is split 5% platform, 5% season pot. The season pot tops up thin pots.

**Trust model:** a keeper computes settlement off-chain with this open-source engine and submits it. On-chain, the contract enforces:
- the pot adds up (Σ payouts + platform + season in = Σ stakes + season out);
- the season pot can't go negative;
- no payout above the cap;
- baskets always go back to their owners.

If the keeper doesn't settle within 3 days of the round's end, anyone can void the round and everyone gets their stake back.

## Agents
An AI agent with the [Binance Agentic Wallet](https://developers.binance.com/docs/agentic-wallet/welcome) and the League of Stocks skill can read rounds, build and back ETFs, and claim. Every action is `POST /api/plan`, which returns the exact transactions; the Agentic Wallet previews, risk-checks and signs each one (`baw contract-call`) after the user confirms. See [`skills/league-of-stocks/SKILL.md`](skills/league-of-stocks/SKILL.md) and the `/agents` page.

## Run it
Requires Node 22+, pnpm, and [Foundry](https://getfoundry.sh) for the contracts. To try the whole app with no real money, see [`docs/LOCAL.md`](docs/LOCAL.md).

```bash
pnpm install
pnpm test            # engine + API client tests
pnpm typecheck
pnpm test:contracts  # Foundry tests for LeagueEscrow
```

Live Binance API calls: copy `.env.example` to `.env.local`, add your Web3 API keys, then:

```bash
pnpm rwa:tokens      # list tokenized stocks on BSC with prices
```

The Binance Web3 API refuses requests from restricted regions (including the US), so run this from an allowed location.

## Docs
- [`docs/BNB.md`](docs/BNB.md): rules, architecture, day-by-day plan
- [`docs/dx-notes.md`](docs/dx-notes.md): developer-experience log for the hackathon report
- [`docs/YOUR-TODO.md`](docs/YOUR-TODO.md): what the team still has to do · [`docs/HANDOFF.md`](docs/HANDOFF.md): state of the build
- [`docs/KEEPER.md`](docs/KEEPER.md): running rounds · [`docs/LOCAL.md`](docs/LOCAL.md): local demo chain
- [`docs/UI.md`](docs/UI.md): design · [`docs/design/stock-card`](docs/design/stock-card): stock card handoff
- [`docs/prototype-results.md`](docs/prototype-results.md): stress tests of the payout rules (Python prototype)
- [`docs/robinhood-colosseum-spec.md`](docs/robinhood-colosseum-spec.md): the Robinhood Chain version (parked)

## License
MIT

## Web app
```bash
pnpm dev             # http://localhost:3000/ui shows every UI component
```
The design plan is in [`docs/UI.md`](docs/UI.md).
