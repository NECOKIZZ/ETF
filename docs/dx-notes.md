# Developer Experience notes: Binance Web3 API

Raw notes for the DX report (25% of the BNB Hack score). The report itself goes in the form at the end: https://forms.gle/EUQ39xf54GHjC2ys5

**How these notes work:** Claude logs what happens while building, in plain language. The team adds anything they run into. Before submitting, rewrite each point in your own words; the judges reject AI-written reports.

Each entry: **what we tried → what happened → why it matters**. The technical detail is underneath, for the report.

## Log

### Mon 5 Oct: signing up
- **What we tried:** created a developer account and an API key (the password-like code that lets our app talk to Binance).
- **What happened:** _(team: add how long it took and anything confusing)_

### Mon 5 Oct: first API call was blocked because of location
- **What we tried:** our very first request to Binance, just asking "which blockchains do you support?". It came from our cloud development computer, which happens to be in the US.
- **What happened:** Binance refused everything, even this basic question, with the message "Service not available due to compliance restriction".
- **Why it matters:**
  - The message doesn't say the problem is *location*. We had to work it out ourselves by checking where our computer was.
  - The response was marked "success" at the web level (HTTP 200) even though it was an error, so normal error checks miss it.
  - There's no list in the docs of which countries are blocked, or any hint that the hackathon's country rules also apply to the computers your code runs on.
- _Technical detail:_ every endpoint, including `/api/v1/dex/aggregator/supported/chain`, returned HTTP 200 with `code: 40304`. Responses took ~230–350 ms. Our keys and request signing were correct: the server got far enough to check our location.

### Mon 5 Oct: AI coding tools running in the US are blocked too
- **What we tried:** we build with an AI coding assistant. It runs on cloud computers that, like most AI services, are hosted in the US.
- **What happened:** the assistant can't make a single live call to the Binance API, so it can't test its own code against the real service. We have to copy the code to a computer in an allowed country and run it there by hand.
- **Why it matters:**
  - Binance is actively promoting AI agents (Agentic Wallet, Wallet Skills, the special prizes for them), but much of the AI infrastructure those agents run on is in the US.
  - A developer outside the US can still be blocked just because their tools are hosted there.
  - Nothing in the docs warns about this or suggests a workaround, such as a test environment open from any location, or a clear list of allowed hosting regions.

### Mon 5 Oct: first successful call, from Google Cloud Shell
- **What we tried:** ran the same "list all tokenized stocks on BSC" request from Google Cloud Shell, a free browser-based terminal, instead of our US cloud computer.
- **What happened:** it worked. **488 tokens came back in about 0.6 seconds**: roughly 60 bStocks and the rest Ondo. No xStocks showed up in this list.
- **Why it matters:**
  - Time from first reading the docs to a successful call was mostly spent on the location block, not on the API itself. Signing requests worked first time.
  - The docs list xStocks as a hackathon option, but the stock-list endpoint only knows two platforms (`ondo`, `bstock`). Builders who want xStocks need another way to find them.
- _Technical detail:_ `GET /api/v1/dex/market/rwa/tokens?binanceChainId=56`, 603 ms. Our first printout showed addresses and prices but **blank names and market status**. Cause: our code guessed the field names wrong, because the docs describe fields in prose without exact names or an example response (see the next entry).

### Mon 5 Oct: reading a real response, and three surprises
- **What we tried:** printed the raw response to see the real field names.
- **What happened:** the data is rich (name, ticker, logo, price, market cap, volume, market session), but it didn't match what we expected from the docs:
  1. **Names differ from the docs' wording.** The docs talk about "market status"; the real data has `marketStatus` *inside* a `statusInfo` box, and it holds the trading session (`"premarket"`). The codes the docs list (TRADING, MARKET_CLOSED…) are in a different field, `reasonCode`. We only found this by trial and error.
  2. **A token isn't always exactly one share.** Each Ondo token has a `tokenToShareRatio`, for example 1.038 shares of Petrobras per token. The token's price = share price × that ratio, and the ratio grows when dividends are paid. Anyone tracking returns from the share price alone gets the wrong number. This matters a lot for us, because our game ranks ETFs by return. The docs mention the ratio, but not that it changes over time or how it relates to the price.
  3. **Confusing market-hours times.** At 11:20 UTC (pre-market), "next close" was 13:29 and "next open" was 13:31, so close came before open. It looks like pre-market ends at 13:29 and regular trading starts at 13:31, with a 2-minute gap, but nothing explains how sessions work. `openState` was `true` during pre-market.
- **Why it matters:** builders need an example response for every endpoint. A stock app needs to know exactly when prices are "live" (regular session) vs pre-market, and how to compute a true return.
- _Technical detail:_ fields seen include `tokenSymbol`, `tokenName`, `underlyingTicker`, `assetType` (1 stock, 3 ETF; e.g. EWZon is a real ETF), `tokenPrice`, `referencePrice`, `tokenToShareRatio`, `statusInfo{openState, marketStatus, reasonCode, reasonMsg, nextOpenTime, nextCloseTime}`. Check: PBRon `referencePrice` 24.4657 × ratio 1.0380 = 25.3954 = `tokenPrice` exactly. 825 ms on the second call.

### Mon 5 Oct: the bStocks list
- **What we tried:** listed only Binance's own bStocks.
- **What happened:** 46 bStocks came back in 0.36 seconds, all marked TRADING. They include big names (NVIDIA, Microsoft, Tesla, Meta, Google, AMD, Broadcom) and fund-style tokens (SPY, QQQ), plus **leveraged funds** such as TQQQ and SOXL (3× daily moves).
- **Why it matters:**
  - For bStocks the "session" field is empty, while Ondo tokens say "premarket". We guess that's because bStocks trade 24/7, but the docs don't say what an empty session means.
  - The list doesn't flag which funds are leveraged; you have to know the tickers. Any app that ranks or compares returns has to filter those out by hand.
- _Technical detail:_ `platformId=bstock`, 46 tokens, `statusInfo.marketStatus` empty, `reasonCode` TRADING for all. `assetType` 3 (ETF) covers both plain index funds (SPY) and leveraged ones (TQQQ, SOXL), with no leverage field.

### Mon 5 Oct: buying a stock with a creator fee works
- **What we tried:** asked Binance for the price of buying $10 of NVIDIA (bStock) with USDT, once normally and once with a 1% fee paid to an ETF creator, then had it build the actual purchase transaction (not sent, no money moved).
- **What happened:** all three steps worked first time, each in about 0.3 seconds. With the fee, the NVIDIA received dropped by exactly 1% (0.042485 → 0.042060). The fee feature is what our whole creator business model relies on, so this was the biggest risk and it's cleared.
- **Why it matters / what could be better:**
  - Only **one route** came back (LiquidMesh). For a $10 buy that's fine; for big buys a single source means more slippage risk.
  - The docs warn that stock tokens may use a different "RFQ" style of trade that needs an extra signature, but this bStock trade was a normal swap. The docs don't say which stocks use which style or when, so we have to support both.
  - The response had a field called `routerResult` that the docs don't describe.
  - Gas limit came back as 450,000, high for a simple swap. Worth checking real cost on mainnet.
- _Technical detail:_ `/aggregator/quote` 370 ms (no fee) and 268 ms (`feePercent=1.00`, `feeSource=FROM_TOKEN`); `/aggregator/swap` 326 ms with `fromTokenReferrerWalletAddress`, `executionMode=SWAP`, router `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`. Implied price ≈ $235.38 vs listed `tokenPrice` $235.30 (~0.03% spread on $10). `minReceiveAmount` set ~2% below the quote by auto-slippage.

### Mon 5 Oct: bStocks can be locked in our contract
- **What we tried:** on a copy of BSC mainnet, moved real NVIDIA, Microsoft and Tesla bStocks plus USDT into our league contract and back out.
- **What happened:** it worked. bStocks behave like normal tokens: no allowlist blocked a brand-new contract from holding them. This wasn't documented anywhere; we had to test it.
- _Technical detail:_ Foundry fork test `contracts/test/LeagueEscrowFork.t.sol`. bStock contracts are small proxies (no standard EIP-1967 slot), so you can't easily read the token logic. The public BSC RPC refused log searches over ~2,000 blocks (`-32005 limit exceeded`).

### Mon 5 Oct: other snags noticed while building
- **The "docs for AI agents" files didn't load for our tools.** The hackathon page links `llms.txt` and `llms-full.txt` for feeding the docs to an AI agent. When our tools downloaded them outside a browser, the server answered "202" with an empty file. That defeats the purpose of files meant for AI agents. _(Detail: `curl` to `web3.binance.com/en/dev-docs/llms-full.txt` returned HTTP 202, 0 bytes, from a US cloud machine; may also be the location block.)_
- **The response "envelope" isn't documented.** We had to guess how success and errors are wrapped (a `code` field, `"000000"` for success?, `data` holding the result). Errors arrive as HTTP 200 with an error code inside.
- **"Include approval" is unclear.** The swap endpoint has `approveTransaction=true` to include the token-approval step, but the docs don't show where that approval appears in the response. (Answered by the live check below: it's hidden in `tx.signatureData`.)
- **Two styles of trade, no way to know in advance.** A stock purchase can come back as a normal swap or as "RFQ" (sign a message, submit an order, poll for the result). An app must handle both, and the docs don't say which stocks use which or whether creator fees work on RFQ.

### Mon 5 Oct (night): the full "buy the ETF" check, from Cloud Shell
- **What we tried:** asked for prices and unsigned purchase transactions for a $20 basket (NVIDIA 40%, AMD 30%, Broadcom 30%) with a 1% creator fee, and printed one full raw response.
- **What happened:** all three stocks quoted in about 2 seconds in total, all as normal swaps (not RFQ), all through LiquidMesh and the same router contract. The 1% fee was taken exactly ($5 in → $0.05 fee, $4.95 swapped).
- **Where the approval hides:** we asked for the approval step to be included (`approveTransaction=true`). There is no approval transaction in the response. Instead, `tx.signatureData` is a list of **JSON written as text inside the JSON**, holding `approveContract` (the address you must approve, the same as the router). Nothing in the docs mentions `signatureData`, and having to parse text inside JSON is easy to miss. We only found it by printing the raw response.
- **How bStocks are actually bought:** the NVIDIA route was USDT → WBNB (Genius) → NVDAB (PancakeSwap V2): two hops through BNB, meaning bStock liquidity sits in BNB pools. Price impact was tiny at this size (0.003%), but it's useful to know the route depends on BNB-pair liquidity.
- **Small things:** the gas limit is 450,000 for every swap (looks like a fixed number, not an estimate); gas price was ~0.06 gwei, so a swap costs a fraction of a cent; slippage defaulted to 1%; the quote returns `approveTarget`, `feeAmount`, `actualSwapAmount`, `tradeFee`, none of which are described in the docs we were given.

### Mon 5 Oct (evening): building the agent integration
- **The website and the skill disagree about what the Agentic Wallet can do.** The Agentic Wallet docs pages describe swaps, transfers, limit orders and prediction markets only; we nearly concluded an agent couldn't use our contract at all. The skill's source on GitHub (`binance-skills-hub`) has `contract-call` and `sign-message` commands behind a "Developer Mode" switch. We only found them by reading the skill files. _(Detail: developers.binance.com Agentic Wallet "Skills" reference page vs `skills/binance-web3/binance-agentic-wallet/references/external-sign.md`, skill v1.12.0, CLI ≥ 1.10.0.)_
- **Developer Mode can only be turned on in the Binance App.** Fine for safety, but it means an agent developer can't test contract calls without a phone, an account and (presumably) an allowed region. There's no sandbox or testnet mode for the Agentic Wallet. We couldn't run `baw` at all from our US-based tools.
- **Agents can't earn a fee for an app.** `baw market-order swap` has no integrator/referral fee option, while the trading API does (`feePercent` + referrer). So when an agent buys a creator's ETF through the normal swap command, the creator earns nothing. Our workaround: build the swap with the trading API (fee included) and have the agent sign it with `contract-call`. That works but shows the agent a raw transaction instead of a friendly swap preview.
- **Two different stock lists.** The skill tells agents to look up stocks at `www.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/market/token/rwa/stock/detail/list/ai?type=1|2|3`, where type 1 = Ondo, 2 = xStocks-style, 3 = bStock. The developer API we were given uses `/api/v1/dex/market/rwa/tokens` with `platformId=ondo|bstock` and no xStocks. Different URLs, different filters, different coverage, and the docs don't mention each other.
- **An expired campaign still ships inside the skill.** `campaign.md` (bStock AI trading competition, 17 Aug–1 Sep 2026) is still in the skill in October, and every agent is told to read its validity dates and ignore it. That's extra instructions every agent has to process, and a risk of an agent acting on stale rules.
- **What worked well:** the two-step `preview` → `execute` flow with simulation and risk flags is exactly what a game like ours needs: the agent can show the player what each transaction does before signing. JSON output (`--json`) on every command makes it easy to script.

### Mon 5 Oct: a rule we had to fix in our own design (for context)
- Our first settlement checked each basket's weights and $10 minimum at the round-start price. Real prices move between entry and start, so honest creators could have been refunded. Binance's price API was fine; we fixed our rules (declared weights stored on-chain, 5-point drift allowed). Worth a sentence in the report only as "what we learned: prices keep moving between entry and round start".

## Sections the report asks for (fill in from the log on Saturday)

### Onboarding: time from reading the docs to the first successful call; what got in the way

### Documentation issues: which page, where, and what was wrong or missing

### API pitfalls: confusing errors, edge cases, latency

### AI stack: Wallet Skills, Agentic Wallet, CLI — what worked, what's missing

### Tokenized-stock specifics: liquidity, slippage, market hours, on-chain vs reference price, bStocks vs Ondo vs xStocks

### How you'd redesign the developer platform

### Capabilities you wish existed: missing endpoints, SDKs, features
