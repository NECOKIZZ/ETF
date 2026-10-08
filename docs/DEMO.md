# Demo video: what to show

Notes kept while building the UI (8 Oct), so the demo uses every piece. The demo runs on a copy
of the site with sample data, clearly labelled as demo data on screen. Rendered with HyperFrames.

## Shot list (≤ 4 min)
1. **Landing** (`/`): the header links to page sections only; **Open app ↗**. Scroll to
   **"A round, start to finish"**: the simulated round re-ranks live and settles (top 3 paid, the
   rest lose $5).
2. **Beginner's guide**: opens on the first visit inside the app; click through the 5 steps.
3. **League** (`/league`): the **Polymarket-style chart** (top 5 ETFs' returns over the round, one
   line each, legend as a scoreboard, hover readout), then the table in the landing style: logos
   (3 + "+N"), Winning / Behind / ticket payout now, the dashed **TOP HALF WINS** line.
4. **Create** (`/create`): the counter goes **red "2/3 stocks" → green "3/3 stocks"**, "0/3 crypto",
   and the red **"10/10 · basket full"** flag at 10 picks. Set the weights (kept as is), buy, name,
   lock.
5. **ETF page** (`/etf/<key>`), one laptop screen: the name with overlapping stock logos; the
   return chart **Mon → Fri, one tick per day**, against the dashed league median, with the
   **Round / Per stock** toggle and hover readout; the stock tiles (price, move, weight); the
   **live table with this ETF highlighted**; **"If the round ended now"** with **Back this team**
   and **Buy the ETF** (opens the back/buy panel).
6. **Agents** (`/agents`): one message to paste; the agent plays through the Binance Agentic Wallet.
7. **Results + verify** (`/round/<id>`): payouts, and the verify link recomputing the on-chain hash.
8. **Leaderboard** (`/leaderboard`): creators and backers, same row style.

## Facts to say
- League contract on BSC mainnet, verified source:
  `0x174ad1c93310df3023f2ca1ee23aa46b1182459b`.
- Prices: Binance Web3 API (RWA reference prices), BNB/BTC/ETH from Binance spot.
- Buy the ETF: Binance Web3 swap with the creator's referral fee (0–2%).
- Settlement: open-source engine, inputs published and hashed on-chain; anyone can re-check.
