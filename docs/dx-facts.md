# DX report: fact sheet, sorted by the form's 7 questions

Facts only, as short bullets. **Write the report yourself, in your own words.** The judges reject AI-written reports. Use this sheet as your memory aid, not as text to copy.

- Lines marked **✍ YOU** need something only you know (your time, your feelings, the exact page you were on).
- "Vague feedback does not count": for each doc issue, open the page and note its URL and the section heading.
- Full log with more detail: `docs/dx-notes.md`.

---

## 1. Onboarding: time from opening the docs to the first successful call, and where you got stuck

- ✍ YOU: when you opened the docs (Mon 5 Oct, what time?) and how long sign-up and the API key took.
- The first call ("which chains do you support?") came from a US cloud machine and was refused: `code 40304`, "Service not available due to compliance restriction".
- That refusal still returned HTTP 200, so normal error checks see "success".
- The message never says *location* is the problem. We worked it out ourselves.
- Our request signing was right on the first try. Nearly all the lost time went on the location block, not the API.
- First success came from Google Cloud Shell (outside the US): RWA token list, 488 tokens in ~0.6 s.
- ✍ YOU: total time from opening the docs to that first success, and how it felt to switch machines.
- The `llms.txt` / `llms-full.txt` links (meant for AI tools) returned HTTP 202 with an empty body when fetched outside a browser, from the US machine. They might work elsewhere.

## 2. Documentation issues: which page, and where on it

✍ YOU: for each one, open the page and add its URL plus the section heading.

- **RWA tokens endpoint page** (`/api/v1/dex/market/rwa/tokens`): no example response, and fields are described in prose without exact names.
  - "Market status" is really `statusInfo.marketStatus`, and it holds the *session* (`premarket`).
  - The listed codes (TRADING, MARKET_CLOSED…) are in a different field, `reasonCode`.
  - We guessed wrong, and our first printout had blank names and status.
- **Same page, `tokenToShareRatio`:** the page doesn't say the ratio changes with dividends, or that token price = share price × ratio.
  - Verified: PBRon 24.4657 × 1.0380 = 25.3954.
- **Same page, platforms:** only `ondo` and `bstock` exist, yet the hackathon lists xStocks. Nothing explains how to find xStocks.
- **Swap endpoint page, `approveTransaction=true`:** the page doesn't say where the approval appears in the response.
  - It turned out to be in `tx.signatureData`, an undocumented array of JSON *strings* holding `approveContract`.
- **Swap / quote pages:** these response fields aren't described: `routerResult`, `approveTarget`, `feeAmount`, `actualSwapAmount`, `tradeFee`, `signatureData`.
- **General / authentication page:** the response envelope isn't documented.
  - We found the `code` / `"000000"` success value / `data` layout by guessing.
  - Errors arrive as HTTP 200.
- **Agentic Wallet "Skills" reference page (developers.binance.com):** it lists swaps, transfers, limit orders and prediction markets only.
  - `contract-call` and `sign-message` (behind Developer Mode) appear only in the skill source on GitHub: `binance-skills-hub/.../binance-agentic-wallet/references/external-sign.md` (skill v1.12.0, CLI ≥ 1.10.0).
- **Market-hours fields:** sessions aren't explained.
  - At 11:20 UTC, "next close" was 13:29 and "next open" was 13:31, so close came before open.
  - `openState` was `true` during pre-market.
  - For bStocks the session field is empty, and nothing says what empty means.
- Nowhere in the docs: a list of blocked countries or regions, or a warning that the block applies to where your *code runs* (cloud, AI tools, hosting).

## 3. API pitfalls: errors, edge cases, latency

- Errors come back as HTTP 200 with an error code inside (`40304` for the location block).
- Location blocking behaves differently on each Binance host, all seen from the same US machine:
  - Web3 API: HTTP 200 with error code 40304.
  - `api.binance.com`: HTTP 451.
  - `data-api.binance.vision`: works normally.
- The same stock can come back as a normal SWAP or as RFQ (sign a message, submit an order, poll). There's no way to know which in advance, so the app must support both.
- Gas limit is always 450,000, which looks fixed rather than estimated. Gas price was ~0.06 gwei, so the real cost is fractions of a cent.
- Only one route came back (LiquidMesh), via router `0xB44446b0c8E56988c34f7Ff73Ae904982b5FdDA5`.
- The public BSC RPC refused log searches over ~2,000 blocks (`-32005 limit exceeded`).
- Latency we measured:

| Call | Time |
|---|---|
| RWA list | 360–825 ms |
| Quote | 268–370 ms |
| Swap build | ~326 ms |
| Full 3-stock basket quote + build | ~2 s |

- The creator fee worked exactly: with 1%, NVIDIA received fell by exactly 1% (0.042485 → 0.042060), and $5 in gave a $0.05 fee.

## 4. AI stack: Wallet Skills, Agentic Wallet, CLI

- ✍ YOU: did you get `baw auth signin` working from a non-US computer? Developer Mode on your phone? How long, and what confused you?
- **Worked well:**
  - `preview` → `execute` with simulation and risk flags. It's exactly right for showing a player what will happen before they sign.
  - `--json` output on every command makes scripting easy.
- **Missing or confusing:**
  - Contract calls are only documented in the GitHub skill, not on the website (see section 2).
  - Developer Mode can only be turned on in the Binance App, and there's no sandbox or testnet, so you can't test contract calls without a phone, an account and an allowed region.
  - `baw market-order swap` has no integrator or referral fee. An agent buying a creator's ETF the normal way pays the creator nothing.
    - Our workaround: build the swap with the trading API (fee included) and have the agent sign it with `contract-call`.
    - The cost: the user sees a raw transaction instead of a friendly swap preview.
  - The skill and the developer API use different stock-list URLs and filters:
    - Skill: `bapi/.../rwa/stock/detail/list/ai?type=1|2|3`, where type 2 is xStocks-style.
    - Developer API: `/dex/market/rwa/tokens?platformId=ondo|bstock`, which has no xStocks.
  - An expired campaign file (`campaign.md`, 17 Aug – 1 Sep 2026) still ships inside the skill in October, so every agent has to read it and then ignore it.
  - US-hosted AI coding tools are blocked entirely. Our AI assistant could never test against the live API, even though Binance is promoting AI agents.

## 5. Tokenized-stock specifics

- **Liquidity:** the bStock NVIDIA route was USDT → WBNB (Genius) → NVDAB (PancakeSwap V2).
  - That's two hops through BNB, so bStock liquidity sits in BNB pools.
  - Price impact at $5–10 was tiny (0.003%).
- **Slippage:**
  - The default was 1% in one check; `minReceiveAmount` was about 2% below the quote in another.
  - The quoted price (≈ $235.38) was within ~0.03% of `tokenPrice` ($235.30) on $10.
- **Outside market hours:**
  - Ondo tokens report `premarket` and similar sessions.
  - bStocks report an empty session and `reasonCode` TRADING all the time (24/7?), and nothing says so.
- **On-chain vs reference price:** for Ondo tokens, price = reference share price × `tokenToShareRatio`, which grows with dividends. Using the share price alone gives the wrong return.
- **bStocks vs Ondo vs xStocks in practice:**

| | Count in our list | How it behaved |
|---|---|---|
| bStocks | ~46–60 | Simple swaps, 24/7, no ratio |
| Ondo | the rest of 488 | Session hours, share ratio |
| xStocks | 0 | Not in the developer API at all |

- **Leveraged funds** (TQQQ, SOXL) are mixed in as `assetType` 3 next to plain SPY, with no leverage flag. We had to filter them by ticker.
- **bStocks in contracts:** they behave as normal tokens, and a brand-new contract could hold them with no allowlist. This was undocumented; we tested it on a mainnet fork.
- **Crypto prices:** BNB, BTC and ETH aren't in the RWA price list, so we used a second source (Binance spot). Two kinds of price in one game.
- ✍ YOU: anything you noticed on the real $10 buy (slippage, what the wallet showed, fees).

## 6. Redesign: how you'd rebuild it so someone can call it the moment they land

Ideas from our experience. ✍ YOU: pick the ones you believe in and say them your way.

- A "try it" console on the docs page that makes a real call in the browser, with a sandbox key and no sign-up.
- Clear errors:
  - A real HTTP status (403/451).
  - A message that says "your server's region (US) is blocked".
  - A link to the list of allowed regions.
- A test environment reachable from any region (for CI, cloud IDEs and AI agents).
- An example response for every endpoint, and a typed schema (OpenAPI).
- One stock list shared by the API and the skills, covering all three platforms.
- Return the approval as a normal transaction, not JSON strings inside `signatureData`.

## 7. Capabilities you want added

- One "price of any token on BSC" endpoint (stocks plus crypto).
- A `leveraged` flag (and leverage factor) on RWA tokens.
- xStocks in the developer RWA endpoints.
- Historical prices for the RWA tokens (we sample our own for charts).
- A way to know SWAP vs RFQ before building, and to confirm that creator fees work on RFQ.
- A referral/integrator fee in `baw market-order swap`.
- A testnet or sandbox for the Agentic Wallet.
- A TypeScript SDK with types for responses.
- Batch quotes: one call for a whole basket (we make one quote and one swap call per stock).
