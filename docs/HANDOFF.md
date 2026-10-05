# Handoff for the next session

Repo: github.com/NECOKIZZ/ETF (main). Plan: docs/BNB.md · UI: docs/UI.md · Card design: docs/design/stock-card · Keeper: docs/KEEPER.md · Local demo: docs/LOCAL.md · User tasks: docs/YOUR-TODO.md · DX log: docs/dx-notes.md

## Built (Mon 5 Oct)
- **Contract** `contracts/src/LeagueEscrow.sol`: rounds, `enterCreator`, **`enterCreatorNamed`** (ETF name ≤ 32 bytes, buy fee ≤ 2%, declared weights summing to 10 000 bps), `enterBacker`, keeper `settle` with conservation + ceiling checks, `voidRound` after 3 days, `claim`, `claimBasket`. Views `teamMeta`, `weightsOf`. 23 Foundry tests.
- **Settlement** `src/league/settlement.ts`: team key from **declared weights** (`teamKeyFromWeights`); at start prices a basket may drift 5 points from them and be ≥ $9.50 (entry rule $10, ≤ 50%: `DEFAULT_RULES`; settlement `SETTLE_RULES`). Verification `src/league/verify.ts` + `scripts/verify.mts` + `/api/rounds/:id/verify`.
- **Plans** `src/league/actions.ts` + `src/league/server.ts`: `POST /api/plan` (back, lock, buy-basket, buy-etf, claim, claim-basket) → calldata steps + `baw contract-call` commands. Also `/api/config`, `/api/stocks` (per chain, change since round start), `/api/me`, `/api/leaderboard`, `/api/rounds/:id/inputs`, local-only `/api/faucet` and `/api/rpc`.
- **Agents**: skill `skills/league-of-stocks/` (SKILL.md + read/create/play references) driving the Binance Agentic Wallet (`baw contract-call preview/execute`, Developer Mode) and `scripts/agent.mts` (same plans, local key). Tested on anvil: agent created "Agent Alpha".
- **Web**: wagmi (injected) + react-query. Pages `/`, `/league`, `/etf/[key]`, `/create`, `/me`, `/leaderboard`, `/round/[id]`, `/rules`, `/agents`, `/ui`. Stock card rebuilt from the user's design (`src/ui/components/StockCard.tsx`, sizes big/medium/tiny64/tiny48/tiny34).
- **Tested**: 55 Vitest, 23 Foundry, production build; browser e2e (Playwright with an injected test wallet on anvil): create → back → claim all pass; keeper settled round 2 on a snapshot and it verified.

## Colours
Site chrome uses only the four brand colours (Ink `#0B0B0C`, Paper `#FFFFFF`, Mint `#3DDC97`, Coral `#FF5A36`; everything else is a mix). Stock cards follow the user's card design: each stock's own colour (unique, `src/ui/data/palette.ts`) plus the card's fixed colours (`CARD`). `test/palette.test.ts` enforces both.

## Constraints
- Binance Web3 API and `baw` block this (US) container: live calls run in the user's Cloud Shell (`~/ETF`; home disk cleared on 5 Oct).
- Not deployed to mainnet yet (planned Thursday). Live-verified 5 Oct night: buy plans quote as SWAP via LiquidMesh, router `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`; the approval spender comes in `tx.signatureData` (JSON strings with `approveContract`, = router), parsed by `approvalFromSignatureData`. Not live-verified: RFQ legs (reported as skipped), `baw` contract calls.

## Next
1. Mainnet deploy (DeployLeague.s.sol, allowlist the 39 bStocks), host app + keeper together (shared `data/`), keeper `auto` for demo rounds.
2. A real $5 mainnet buy through the app on Thursday (approve router + swap) to confirm end to end.
3. Polish from the user's review; demo video script; README final.
4. Optional: BSC testnet demo (mock tokens) so the user can click through with MetaMask before mainnet; WalletConnect.
