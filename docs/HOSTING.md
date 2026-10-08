# Hosting: Vercel + Supabase + a cron

The app runs on **Vercel** (pinned to Frankfurt in `vercel.json`: the Binance Web3 API refuses
US requests, and Vercel's default region is in the US). Keeper data (price samples, settlement
inputs) lives in **Supabase**, since Vercel has no lasting disk. The keeper runs as a web route,
`/api/keeper/tick`, called every 5 minutes by **cron-job.org**. No server to look after.

The owner/deployer key never goes to Vercel. Only the keeper's key does.

## 1. Supabase (once)
1. Project in **Central EU (Frankfurt)**.
2. **SQL Editor → New query**: paste `supabase/schema.sql` → **Run**. Run it again after an update
   that changes it (8 Oct: chart samples, the `live` phase); it is safe to re-run.
3. Note for step 2:
   - **Project URL** (Project Settings → Data API, or the **Connect** button): `https://<ref>.supabase.co`
   - A **secret key** (Project Settings → API Keys → Secret keys, `sb_secret_…`). The legacy
     `service_role` key works too.

## 2. Vercel (once)
1. vercel.com → **Add New → Project → Import** `NECOKIZZ/ETF`. Framework: Next.js (detected).
2. **Environment Variables** (Production):

| Name | Value |
|---|---|
| `BINANCE_W3_API_KEY`, `BINANCE_W3_SECRET_KEY` | your Binance Web3 API keys |
| `SUPABASE_URL` | Project URL from step 1 |
| `SUPABASE_SECRET_KEY` | secret key from step 1 |
| `KEEPER_PRIVATE_KEY` | the keeper wallet's key (from `.env.local`) |
| `CRON_SECRET` | a long random string: `openssl rand -hex 32` |
| `ESCROW_ADDRESS` | the LeagueEscrow address, once deployed (redeploy after adding it) |

   Optional: `LEAGUE_PRICE_MODE=onchain` for demo rounds outside US market hours (default
   `reference`); `KEEPER_OPEN_ENTRY_MIN` + `KEEPER_OPEN_RUN_MIN` (e.g. `60` and `60`) to open
   the next round automatically, and `KEEPER_OPEN_HOURS_UTC=13-19` to only open then.
3. **Deploy.** Every push to `main` redeploys.
4. Check Binance is reachable from Frankfurt: open `https://<app>.vercel.app/api/stocks`.
   `"source":"binance-live"` = good. A `snapshot-…` source means Binance refused the region:
   set `"regions": ["sin1"]` in `vercel.json` (Singapore) and push.

Changing an environment variable needs a redeploy: Deployments → ⋯ → Redeploy.

## 3. The keeper cron (cron-job.org, free)
1. Sign up at cron-job.org → **Create cronjob**.
2. URL `https://<app>.vercel.app/api/keeper/tick`, schedule **every 5 minutes**.
3. **Advanced → Headers**: `Authorization` = `Bearer <your CRON_SECRET>`.
4. Save, then **Test run**. The response lists what the tick did, e.g.
   `{"ok":true,"log":["round 1: entries open for 42 more min"]}`.

While a round runs, ticks also save a price sample every 30 minutes (`KEEPER_HISTORY_MIN`) for
the charts on the league and ETF pages. Each tick takes the start samples (3, 4 minutes apart) once entries close, the end samples once
the round ends, then settles, and with auto-open set, opens the next round. If ticks stop during
a sampling window, the round can't be priced and settles as a full refund.

## Running a round by hand (Cloud Shell)
Opening a round only needs the keeper key and the chain. With `.env.local` holding the same
`SUPABASE_*` values, the CLI and the cron share data:
```bash
cd ~/ETF && npx pnpm keeper open --entry-min 60 --run-min 60
npx pnpm keeper tick                       # one tick by hand, same as the cron
npx pnpm keeper settle <id> --dry-run      # preview payouts
```
