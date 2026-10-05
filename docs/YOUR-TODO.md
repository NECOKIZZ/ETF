# Your to-do list (League of Stocks, BNB Hack)

Deadline: **Sun 11 Oct 2026, 12:00 UTC**. Submit form: https://forms.gle/yToDUzaDMwWnq6R6A · DX report form: https://forms.gle/EUQ39xf54GHjC2ys5

## Now
- [ ] **Design the stock card** (sizes: ~218×312 big, ~150 medium, 34–64 px tiny). Data per stock: logo, ticker, name, price, % change, weight, kind. Send a screenshot, Figma export or sketch.
- [ ] (Optional, 1 min) Live check of "Buy the ETF" in Cloud Shell, paste the output to Claude:
  ```
  cd /tmp/ETF && git pull && npx pnpm install --store-dir /tmp/pnpm-store && npx pnpm buy-plan
  ```
- [ ] Free space in your Cloud Shell home (it's 100% full): `du -sh ~/* ~/.[!.]* 2>/dev/null | sort -h | tail -15`, then delete old projects' `node_modules` you don't need.

## Cloud Shell setup (after every restart)
```
export npm_config_cache=/tmp/npm-cache
cd /tmp && git clone https://github.com/NECOKIZZ/ETF.git   # skip if /tmp/ETF exists; else: cd /tmp/ETF && git pull
cp ~/ETF/.env.local /tmp/ETF/
cd /tmp/ETF && npx pnpm install --store-dir /tmp/pnpm-store
npx pnpm preview      # then Web Preview → port 8080 → add /ui to the address
```

## Before Thursday (mainnet deploy)
- [ ] Make a **new wallet** just for the app (deployer + keeper). Fund on BNB Smart Chain: ~0.01 BNB (gas) + ~$30 USDT (BEP-20) for demo rounds.
- [ ] Put its private key in `.env.local` as `DEPLOYER_PRIVATE_KEY` and `KEEPER_PRIVATE_KEY` (never in chat or git). Tell Claude the **public** address.
- [ ] Pick hosting for the web app: Vercel (set region to Singapore, not the US, because Binance blocks US servers).
- [ ] (Optional) WalletConnect project ID from cloud.reown.com, for phone wallets.

## Thu–Fri (demo)
- [ ] Run demo rounds during US market hours (13:30–20:00 UTC) with a few wallets; record the video (≤ 4 min).

## Sat (DX report: 25% of the score)
- [ ] Rewrite `docs/dx-notes.md` **in your own words** into the DX form. AI-written reports are rejected, so use the notes as facts only.

## Sun before 12:00 UTC
- [ ] Repo public, README final, demo link works, submit both forms.
