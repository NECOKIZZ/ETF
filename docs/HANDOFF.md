# Handoff for the next session

Repo: github.com/NECOKIZZ/ETF (main). Plan: docs/BNB.md · UI: docs/UI.md · Keeper: docs/KEEPER.md · User tasks: docs/YOUR-TODO.md · DX log: docs/dx-notes.md

## Done (Mon 5 Oct)
- Engine `src/engine/league.ts`, escrow `contracts/src/LeagueEscrow.sol` (+ fork test with real bStocks), payout-ceiling bug fixed.
- Binance client `src/bsc/*` (signing, RWA data, quotes/swaps with creator referral fee, leveraged-fund ban, buy-the-basket planner).
- Settlement + keeper `src/league/*`, `scripts/keeper.mts`, local demo `scripts/local-demo.mts`, anvil e2e test. 43 Vitest + 21 Foundry tests pass.
- Web: Next.js 16 + Tailwind v4, tokens, `/ui` kit (stock card, deck, ETF hand, weight bar, ticker strip, round pill, league table, bands, footer). Real bStock logos in `public/logos`. API: `/api/stocks`, `/api/rounds/current`, `/api/rounds/:id`, `POST /api/buy-plan`.

## Constraints
- Binance Web3 API blocks this (US) container: live calls run in the user's Cloud Shell (`/tmp/ETF`). Their home disk is full; use /tmp.
- User is redesigning the **stock card**: wait for their design before polishing card-heavy pages.

## Next
1. Agents: Binance Agentic Wallet / Wallet Skills integration ($2k prize): agent creates/backs ETFs via our API.
2. Pages: landing, /league (uses /api/rounds/current), /etf/[id], /create, /me; wallet connect (wagmi, BSC).
3. ETF names (signed by creator), creator buy-fee setting, verify page for settlement inputs.
4. Mainnet deploy Thursday (DeployLeague.s.sol, allowlist the 39 tokens), keeper `auto` for demo rounds.
5. Verify live: `approveTransaction=true` response shape and RFQ legs with fees (scripts/buy-plan.mts).

## Rule: four brand colours only
Ink `#0B0B0C`, Paper `#FFFFFF`, Mint `#3DDC97`, Coral `#FF5A36`. Everything else is a mix of these (docs/UI.md, Colour). `test/palette.test.ts` blocks any other hex in the UI code.
