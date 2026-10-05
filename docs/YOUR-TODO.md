# Your to-do list (League of Stocks, BNB Hack)

Deadline: **Sun 11 Oct 2026, 12:00 UTC**. Submit form: https://forms.gle/yToDUzaDMwWnq6R6A · DX report form: https://forms.gle/EUQ39xf54GHjC2ys5

## Now (Mon–Wed)
- [ ] **Look at the app** in Cloud Shell (commands below). Pages: `/` `/league` `/create` `/me` `/leaderboard` `/rules` `/agents` `/round/1` `/ui`. Tell Claude what to change.
- [ ] **Make the GitHub repo public** (needed for the agent skill install `npx skills add NECOKIZZ/ETF/skills/league-of-stocks`, and for judging).
- [ ] (1 min) Live check of "Buy the ETF" in Cloud Shell, paste the output to Claude. This answers where Binance puts the approval step:
  ```
  cd ~/ETF && npx pnpm buy-plan 20 --raw
  ```
- [ ] **Try the Binance Agentic Wallet** (prize track): on your phone, Binance App → Web3 Wallet → Agentic Wallet; turn on **Developer Mode** there. On a computer outside the US: `npm i -g @binance/agentic-wallet`, then `baw auth signin --json`. Note anything confusing for the DX report.
- [x] Free space in your Cloud Shell home.

## Cloud Shell setup (home folder, now that it has space)
```
cd ~ && git clone https://github.com/NECOKIZZ/ETF.git     # first time only; later: cd ~/ETF && git pull
cd ~/ETF && npx pnpm install
cp .env.example .env.local && nano .env.local               # first time only: paste your Binance keys
npx pnpm dev:8080                                           # then Web Preview → Preview on port 8080
```
Without a deployed contract the pages show "not reachable" for the league. To see everything with
demo data, run the local demo (docs/LOCAL.md: needs Foundry; ask Claude for the Cloud Shell
install commands). Your own browser wallet can't easily reach Cloud Shell's test chain, so test
real clicks on mainnet Thursday with small amounts, or ask Claude for a BSC testnet demo.

## Before Thursday (mainnet deploy)
- [ ] Make a **new wallet** just for the app (deployer + keeper). Fund on BNB Smart Chain: ~0.02 BNB (gas) + ~$40 USDT (BEP-20) for demo rounds.
- [ ] Put its private key in `.env.local` as `DEPLOYER_PRIVATE_KEY` and `KEEPER_PRIVATE_KEY` (never in chat or git). Tell Claude the **public** address.
- [ ] Hosting: the app and the keeper must share the `data/` folder (price samples, settlement inputs). Simplest: one small server in an allowed region (e.g. a Singapore VM) running `pnpm start` and the keeper. Vercel works for the pages but can't keep `data/`.
- [ ] (Optional) WalletConnect project ID from cloud.reown.com, for phone wallets.

## Thu–Fri (demo)
- [ ] Run demo rounds during US market hours (13:30–20:00 UTC) with 4+ ETFs (a round needs at least 4); record the video (≤ 4 min): landing → create → back → league → agent → results + verify.

## Sat (DX report: 25% of the score)
- [ ] Rewrite `docs/dx-notes.md` **in your own words** into the DX form. AI-written reports are rejected, so use the notes as facts only.

## Sun before 12:00 UTC
- [ ] README final, demo link works, submit both forms.
