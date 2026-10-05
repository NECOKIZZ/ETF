# Keeper: running rounds

The keeper opens rounds, samples prices from Binance, and settles. Run it where the Binance Web3 API is reachable (e.g. Google Cloud Shell; not from the US).

## Commands
```bash
pnpm keeper open --entry-min 60 --run-min 60      # entries close in 60 min, round runs 60 min after that
pnpm keeper auto <roundId> --samples 3 --every-min 5 [--mode onchain]
                                                   # waits, samples at start and end, then settles
pnpm keeper sample <roundId> start|end            # one price sample (saved to data/rounds/<id>/)
pnpm keeper settle <roundId> --dry-run            # preview payouts, nothing sent
pnpm keeper settle <roundId>                      # submit settlement
pnpm keeper status <roundId>
```
**Price modes:**
- `reference` (default): share price × token→share ratio. Use for real rounds during US market hours.
- `onchain`: the token's on-chain price. bStocks trade 24/7, so this works for demo rounds at any time.

**Environment (`.env.local`):**
- `BINANCE_W3_API_KEY`, `BINANCE_W3_SECRET_KEY`
- `ESCROW_ADDRESS`
- `KEEPER_PRIVATE_KEY`
- `BSC_RPC_URL`
- `LEAGUE_CHAIN` (`bsc` or `local`)

## What settle does
1. Reads every entry and locked basket from the contract.
2. Averages the saved samples inside each window: `entryClose … +30 min` and `end … +30 min`. A token that is missing, not trading, or has fewer than 3 samples voids the round, and everyone is refunded.
3. Checks each basket at the start prices (≥ 3 stocks, ≤ 50% each, ≥ $10, team key matches). An invalid entry is refunded. Backers of a team with no valid captain are refunded.
4. Runs the engine and submits the payouts. Writes `data/rounds/<id>/inputs.json`, whose keccak hash goes on-chain, so anyone can recompute the result.

## Local demo (no real money)
```bash
cd contracts && forge build && cd ..
anvil                                             # terminal 1
npx tsx scripts/local-demo.mts                    # deploys mocks + escrow, seeds round 1 with 5 creators, 7 backers, samples
LEAGUE_CHAIN=local ESCROW_ADDRESS=<printed> \
KEEPER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  pnpm keeper settle 1                            # anvil's public dev key #0
```
