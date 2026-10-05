# Back a team, buy an ETF, claim

All three use the plan flow in SKILL.md: `POST {LEAGUE_API}/api/plan`, show, confirm, then
preview and execute each step with `baw contract-call`.

## Back a team ($5 ticket)

```json
{ "action": "back", "wallet": "<agent wallet>", "teamKey": "<teamKey from /api/rounds/current>" }
```

Steps: the USDT ticket approval (if needed), then `enterBacker`. The ticket rides with the team:
if the ETF finishes in the top half, the ticket wins a share of the losers' tickets (the creator
takes 10% of a backer's winnings as a fee); otherwise it's lost. One entry per wallet per round.
Teams have a member limit; the API says so if a team is full.

## Buy a creator's ETF

```json
{ "action": "buy-etf", "wallet": "<agent wallet>", "teamKey": "<teamKey>", "usdt": 25 }
```

Splits the USDT across the ETF's stocks by its weights and returns one Binance aggregator swap per
stock, with the creator's buy fee (`buyFeeBps`) paid to the creator by Binance's referral fee. The
stocks go to the agent's wallet; nothing is locked. Steps: USDT approvals for Binance's router,
then the swaps. `skipped` lists any stock whose route needs a signed RFQ order instead of a
transaction; tell the user, who can buy that one with `baw market-order swap`.

Quotes go stale: run the steps right after planning. If a swap preview fails, plan again.

## Claim

```json
{ "action": "claim", "wallet": "<agent wallet>", "roundId": "<id>" }
```

After a round is settled or voided (`/api/me` shows `claimable: true`): pays the payout (or the
refund) and returns a creator's locked stocks. If a stock was paused at that moment, its tokens
stay safe in the contract; plan `claim-basket` later to retry.
