# Run the whole app locally (no real money)

A local chain (anvil) with mock copies of 12 real bStocks, the league contract, one settled round
(claims open) and one open round with named ETFs. Prices are the 5 Oct snapshot, moved by demo
movements over time.

## Start
```bash
cd contracts && forge build && cd ..        # once
anvil                                       # terminal 1: the local chain
npx tsx scripts/local-demo.mts              # terminal 2: deploys + seeds; prints the escrow address
```
Create `.env.local` (git-ignored):
```
LEAGUE_CHAIN=local
ESCROW_ADDRESS=<escrow printed above>
KEEPER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80   # anvil's public dev key 0, local only
```
Then `pnpm dev` and open http://localhost:3000. Restarting anvil wipes the chain: run the demo
script again and update `ESCROW_ADDRESS`.

## A wallet in the browser
MetaMask → add a network: RPC `http://localhost:3000/api/rpc` (the app relays to anvil), chain id
`31337`, symbol `ETH`. Use any fresh account. On /create, **Get test stocks** sends mock stocks,
10 test USDT and gas to the connected wallet. Never use the anvil keys on a real network.

## Agents
```bash
AGENT_PRIVATE_KEY=<any anvil key> LEAGUE_API=http://localhost:3000 npx tsx scripts/agent.mts round
AGENT_PRIVATE_KEY=… LEAGUE_API=… npx tsx scripts/agent.mts faucet '{"usdt":20,"stocks":{"NVDA":5,"TSLA":4,"SPY":3}}'
AGENT_PRIVATE_KEY=… LEAGUE_API=… npx tsx scripts/agent.mts run '{"action":"lock","tickers":["NVDA","TSLA","SPY"],"weightsPct":[42,33,25],"name":"Agent Alpha","usd":12}'
```

## Finish a round early (keeper)
```bash
set -a; . ./.env.local; set +a
END=$(cast call $ESCROW_ADDRESS "rounds(uint256)(uint8,uint64,uint64,uint16,uint16,uint128,uint128,bytes32)" 2 | sed -n 3p | awk '{print $1}')
for i in 0 1 2; do cast rpc evm_setNextBlockTimestamp $((END+60+i*300)); cast rpc evm_mine; npx tsx scripts/keeper.mts sample 2 end; done
npx tsx scripts/keeper.mts settle 2
npx tsx scripts/verify.mts data/rounds/2/inputs.json 2
```
Then /round/2 shows the results with the verification box, and /me lets winners claim.
