# ETF League: UI plan

**Status:** plan for review. Nothing is built yet.
**Goal:** a web app that looks like a polished consumer product in a 4-minute demo. Judging counts product quality and UX for 20%, and the "Web2-adjacent" feel matters.
**Not Kickoff:** this is its own brand. The only thing taken from Kickoff is the *shape language*: rounded, overlapping cards and the fanned card deck, redrawn for stocks.

---

## 1. References and what we take from each

### gloam.trade: calm and premium
- **Type:** huge, *light* headlines (Aeonik 300, tight tracking) over small regular body text. A paid font, so we use a free lookalike (§2).
- **Hero:** one big rounded panel (≈32px radius) filled with a soft, blurred **mint-to-grey gradient**, headline bottom-left, two CTAs (black pill + text link with →), and a small "Scroll to explore ↓" pill bottom-right.
- **Product shown, not described:** live mockups of the real UI inside rounded grey panels (amount fields, token chips, black full-width action button), each with a small UPPERCASE label + one-line caption underneath.
- **Card rows:** soft cards with thin borders and light shadows, scrolling sideways. One animation "seals" cards as they pass a glass slab. We can echo this: **stocks go in, an ETF comes out.**
- **Dark sections inside a light page:** a black rounded panel for "For developers and agents" with a code block. The footer is a black rounded card with an **engraved, etching-style landscape** illustration.
- **Small details:** a top announcement bar ("● Private payroll is live. See how"), a mint pill "Open app ↗", theme switcher (Light / Dark / Auto) in the footer.

### trysleeve.xyz: tokenized stocks done right
- **Type:** Instrument Sans 500 with tight tracking (60px hero at −2.1px; 52px h2 at −1.66px), body 15px; IBM Plex Mono for data.
- **Live ticker strip** under the nav: logo + SPY 772.13 USD … with "price reference, time" at the right.
- **Status pill:** "● Open · closes in 4d 12h" (green text on mint, `rgb(0,116,86)` on `rgb(216,250,235)`). This is the exact pattern for our **round countdown**.
- **Stock cards:** grey card (24px radius), brand logo top-left, "● Market open" pill top-right, big ticker, coloured company name, then **honest data rows** (price feed + value + updated time + contract address; pool + quote + "0.05% above reference").
- **Colour:** white page, `#F4F5F7` surfaces, **deep green** feature card, **mint gradients**, and an **orange vs green split bar** (spend vs invest). That bar is a great way to show an ETF's weights.
- **Numbered steps** (01–04) as a selectable list next to a live mockup; one step is highlighted in black.
- **Plain, exact copy:** "debt security, not a share", "Market open now", real timestamps.

### Kickoff: rounded overlap and the card deck
- **Overlapping rounded "lips":** each landing section is a band with a big top radius that slides **over** the section above (Kickoff overlaps 50–120px). Pages read as a stack of rounded sheets.
- **Stacked step cards:** numbered cards that slightly overlap vertically with soft shadows.
- **The fanned deck:** five 218×305 cards (20px radius) fan out when scrolled into view: offset × 148px sideways, |offset| × 26px down, offset × 7° rotation, 90ms stagger. On hover a card lifts 34px, straightens half-way and scales ×1.07 with a coloured glow.
- **Player card art:** strong brand-colour background, **huge stacked name** (one line filled, one line outlined), crest top-right, Kickoff mark bottom-right.

---

## 2. Design tokens

### Type (all free)
| Role | Font | Use |
|---|---|---|
| Display (light) | **Geist 300**, tracking −0.04em | Hero statements and big section titles: the Gloam feel |
| Headings and UI | **Instrument Sans 500/600**, tracking −0.03em on large sizes | h2/h3, cards, buttons, nav: the Sleeve feel |
| Numbers and data | **IBM Plex Mono 400/500**, tabular numbers | prices, %, countdowns, addresses, payouts |

Scale: 72 / 56 / 40 / 28 / 21 / 17 / 15 / 13 / 11 (uppercase labels at 11px with +0.12em tracking).

### Colour
| Token | Light | Dark | Use |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#0B0B0C` | page |
| `surface` | `#F4F5F7` | `#16171A` | panels, cards |
| `ink` | `#0B0B0C` | `#F4F5F7` | text, primary buttons |
| `muted` | `#5B6270` | `#9AA1AD` | secondary text |
| `line` | `#E7E9ED` | `#24262B` | borders |
| `up` | `#007456` on `#D8FAEB` | `#3DDC97` on `#0E2A20` | gains, "open", winning |
| `down` | `#C2410C` on `#FFEDD5` | `#FB923C` on `#2A1A0E` | losses, "closing" (orange, as in Sleeve) |
| `bnb` | `#F0B90B` | `#F0B90B` | small chain accents only: "on BNB Chain" chip, round number |
| `mint-gradient` | `#EEF2F1 → #CFEBDD → #B8DCCB` | dim variant | hero, featured panels |

Red is never used for "you lost": orange keeps it calm. Green and orange are always paired with ▲/▼ or text, never colour alone.

### Shape and depth
- Radius: pills `999px` · inputs and chips `14px` · cards `24px` · panels `32px` · **stock cards `28px`** · landing bands `48px` top corners.
- Shadows: `0 1px 2px rgb(0 0 0 / .04), 0 8px 24px rgb(0 0 0 / .06)` for cards; lifted cards `0 24px 60px rgb(0 0 0 / .18)` plus a brand-colour glow.
- Grid: 1280px max content, 24px gutters, 16px side padding on phones.

### Motion
- Fast and soft: 180ms for hover, 420ms `cubic-bezier(.2,.8,.2,1)` for reveals.
- Deck fan-out and section lips only on the landing page.
- Number roll for live prices. Countdown ticks every second.
- Everything respects `prefers-reduced-motion`.

---

## 3. Signature components

1. **Ticker strip** (Sleeve). Under the nav on every page: bStock logos, symbol, price (Plex Mono), ▲/▼ 24h, sliding slowly; at the right, "Binance reference · 14:32 UTC". Data: RWA token list + prices.
2. **Round pill** (Sleeve's status pill). `● Round 12 · locks in 2d 04:13:22`, mint when open for entries, orange in the last hour, grey while running ("Running · settles Mon 13:30 UTC").
3. **Stock card** (Kickoff player card, redrawn).
   - Portrait 7:10, 28px radius, the company's brand colour as the background (from a small colour map; fallback taken from the logo).
   - **Huge ticker** stacked twice, one filled and one outlined (`NVDA` / `NVDA`); token logo top-right; ETF League mark bottom-right.
   - A frosted strip at the bottom: price · ▲ 1.24% · "● Market open".
   - Used in the landing deck, in pickers and in ETF composition.
4. **ETF hand.** An ETF *is* a hand of stock cards: its 3–8 cards fanned small (the Kickoff fan at 40% size), with weight % on each card. Shown on ETF rows, ETF pages and share cards. This is our most recognisable visual.
5. **Weight bar** (Sleeve's split bar). One thin bar split into segments per stock (brand colours, 4px gaps), legend below with `NVDA 40%`. Also used live in the create flow while you drag weights.
6. **League table row.** Rank · ETF hand (mini) · name + creator · return so far (big mono, ▲ green / ▼ orange) · team size · "if it wins: +$1.80 per $5" · Back button. The top half is shaded mint, and a dashed line marks the winners' cut-off, so the rule is visible at a glance.
7. **Overlapping rounded bands** (Kickoff lips). Each landing section is a sheet with 48px top corners that overlaps the previous one by 56px with a soft shadow. Colours alternate white → `surface` → mint gradient → black.
8. **Action panel** (Gloam mockup style). Grey rounded panel holding "You pay 100 USDT → You get the ETF", token chips, a black full-width button, and small honest rows: "Creator fee 1% · Route LiquidMesh · Slippage 0.5%".
9. **Payout split card.** Visualises one settled round: losing tickets → 10% take → pot → winners by accuracy. A Sankey-like set of rounded bars, used on results pages and the landing "how it works".
10. **Black developer/agent panel** (Gloam). Dark rounded panel: "Let your agent play", code block with the agent API, "Copy" button.
11. **Share card** (PnL card). 1200×630 image: ETF hand, return, rank, "Round 12 winner". Generated server-side.

---

## 4. Pages

### 4.1 Landing `/`
1. Announcement bar: "● Round 12 is live. Build an ETF in 60 seconds →".
2. Nav: logo · League · Create · Leaderboard · Agents · Docs · theme toggle · **Connect** (black pill).
3. **Hero** (Gloam panel + Sleeve type): mint gradient panel. Headline in Geist Light: **"Build an ETF. Beat the league."** Subline: "Pick real tokenized stocks on BNB Chain, lock your basket, and win the bottom half's stakes every week." CTAs: *Build your ETF* (black) · *See this week's league →*. On the right, the **stock-card deck** fans out (5 cards: NVDA, TSLA, META, MSFT, GOOGL with live prices).
4. Ticker strip.
5. Band: **How it works** in 3 overlapping numbered cards (Kickoff steps) beside a live mockup that changes with the selected step:
   - 01 Pick 3–10 stocks and weights.
   - 02 Lock your basket and a $5 ticket.
   - 03 Top half wins: closer to the best return, bigger share.
6. Band (surface): **This week's league**: the live top-8 table, with the cut-off line.
7. Band (mint): **Two ways to back a creator**. Side-by-side cards: *Buy the ETF* ("you own the stocks; the creator earns 1%") and *Back the team* ("$5 ticket, win with them; creator takes 10% of winnings").
8. Band (white): **Stocks on the field**: grid of stock cards for the eligible bStocks/Ondo tokens, with Sleeve-style honest rows (reference price, token→share ratio, contract).
9. Black band: **Let your agent play**: agent API code and Binance Agentic Wallet.
10. Footer (black rounded card) with an etching-style illustration (a bull over a trading floor), links, theme switch, risk notice.

### 4.2 League `/league`
Round pill and countdown; pot size, ETFs and players. A table of all ETFs (row component 6) with sort and search. A right rail on desktop: "Your entries", "Biggest teams", "Best return so far".

### 4.3 ETF page `/etf/[id]`
- Header: ETF hand (large), name, creator, round status, return so far.
- Weight bar plus a composition table (stock card mini, weight, return, price).
- Performance chart since round start (line, mono axis labels).
- Team: captain + backers (avatars), team stake, "if it wins" odds.
- Action panel with two tabs: **Buy the ETF** (Binance swap with creator fee) and **Back the team** ($5 ticket).

### 4.4 Create `/create` (EARN-style flow, 4 steps)
1. **Pick stocks:** searchable grid of stock cards with filters (bStocks / Ondo, sector). Leveraged funds aren't shown.
2. **Set weights:** sliders plus inputs, "Equal weights" button, must total 100%, max 50% per stock. The weight bar updates live.
3. **Fund:** "You pay $X USDT": split across the basket by live Binance quotes, with a minimum of $10.
4. **Review and enter:** basket preview, buy fee (0–2%) for future backers, the $5 ticket, the plain-language rules. One batch of transactions: approve, swap legs, approve basket, enter.

### 4.5 Portfolio `/me`
Current entries, locked baskets, past rounds with payouts, the claim button, and creator earnings (buy fees + ticket fees).

### 4.6 Leaderboard `/leaderboard`
Tabs: Creators (wins, streak, backers attracted, fees earned) · Backers (win rate, ROI) · Agents.

### 4.7 Results `/round/[n]`
Final ranking, the payout split card, the "verify this settlement" box (inputs hash, link to the published JSON, how to recompute).

### 4.8 Agents `/agents` (after the core works)
Explains agents playing the league through the Binance Agentic Wallet. Lists agent ETFs and gives setup steps.

### 4.9 Rules `/rules`
Plain-English rules, a worked example, risk and "ETF is branding" notice, eligibility (not for restricted countries).

---

## 5. Copy voice
Short, exact, calm, like Gloam and Sleeve. Real numbers and times, no hype words. Always say what something is: "bStocks are tokenized stocks issued by Binance's affiliate…", "ETF here means an on-chain basket, not a regulated fund. Capital is at risk."

## 6. Responsive
- **Phone first for the league table and the ETF page:** rows become stacked cards and the action panel becomes a bottom sheet.
- The deck shrinks to 3 cards on phones; bands keep their lips at 32px.
- 16px side gutter, no sideways scrolling except deliberate card rails.

## 7. Tech
- **Next.js (app router) + Tailwind v4** in this repo under `app/`, reusing `src/engine` and `src/bsc`.
- Fonts via `next/font/google` (Geist, Instrument Sans, IBM Plex Mono).
- **Wallets:** wagmi + viem on BSC (chain 56). Connectors: Binance Wallet (injected), MetaMask, WalletConnect.
- **Binance API calls run server-side only** (API routes), hosted in an allowed region (e.g. Singapore), never from the US.
- **Local development** against a BSC mainnet fork (anvil) with test balances: real tokens and prices, no real money. Mainnet deploy Thursday.
- **Stock-card art** generated in code (brand colour + logo + typography), so there are no image assets to license. Logos come from the Binance token list.
- Dark mode from day one (token-based).

## 8. Build order
| Step | Output |
|---|---|
| 1 | App skeleton: tokens, fonts, nav, footer, theme toggle, ticker strip (live data via API route) |
| 2 | Stock card + deck + ETF hand + weight bar: the signature components, built in a `/ui` showcase page |
| 3 | Landing page with bands |
| 4 | Create flow on the mainnet fork (quotes from the real API, swaps simulated on the fork) |
| 5 | League table + ETF page + back/buy |
| 6 | Portfolio, results, leaderboard |
| 7 | Agents page, share cards, polish, phone pass |

## 9. Decisions needed from you
1. **Name.** "ETF League" is the working name. Keep it or choose another before the logo.
2. **Logo:** a simple mark, e.g. three stacked rounded cards. I can draw a first version.
3. **Footer illustration:** etching-style bull (Gloam-like). I'd draw a simplified line version in SVG; a proper illustration would need an artist or image tool.
4. **WalletConnect project ID** (free at cloud.reown.com) for phone wallets. Optional; Binance Wallet and MetaMask work without it.
5. **Hosting:** Vercel (set region to Singapore) or similar. Needed by Thursday.
