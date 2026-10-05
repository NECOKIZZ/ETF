// Server-side helpers behind the API routes: the public config the browser
// and agents need, the league's stocks on the current chain, a wallet's
// entries, and transaction plans. Binance keys never leave the server.

import { existsSync, readFileSync } from "node:fs";
import { formatUnits, getAddress, isAddress, type Address, type Hex } from "viem";
import { BSTOCKS, type StockInfo } from "../ui/data/stocks";
import { chainFromEnv, clientsFromEnv, escrowFromEnv, rpcFromEnv } from "./chain";
import { erc20Abi, leagueEscrowAbi, readEntries, readRound, readTeamMeta, type RoundInfo } from "./escrow";
import { livePrices, loadRoundView } from "./live";
import { DEFAULT_RULES, DRIFT_BPS } from "./settlement";
import { basketWeightsBps } from "../engine/league";
import { planBack, planClaim, planClaimBasket, planLock, buyPlanSteps, normaliseWeights, type TxStep } from "./actions";
import { planBasketBuy, BSC_USDT } from "../bsc/buyBasket";
import { isLeveraged } from "../bsc/tokens";

export const isLocal = () => process.env.LEAGUE_CHAIN === "local";

function demoFile(): { usdt: Address; tokens: Record<string, Address> } | null {
  const f = process.env.LEAGUE_DATA_DIR ? `${process.env.LEAGUE_DATA_DIR}/local-demo.json` : "data/local-demo.json";
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

export interface PublicStock {
  symbol: string;
  ticker: string;
  name: string;
  kind: "stock" | "etf";
  address: Address;
  logo: string | null;
  color: string;
  colorLight: string;
  price: number;
  trading: boolean | null;
}

/** League stocks with this chain's addresses (mock copies on the local demo chain). */
export async function chainStocks(): Promise<{ source: string; stocks: PublicStock[] }> {
  const live = await livePrices();
  const demo = isLocal() ? demoFile() : null;
  const list: { s: StockInfo; address: Address }[] = isLocal()
    ? BSTOCKS.filter((s) => demo?.tokens[s.ticker]).map((s) => ({ s, address: getAddress(demo!.tokens[s.ticker]) }))
    : BSTOCKS.map((s) => ({ s, address: getAddress(s.address) }));
  const stocks = list.map(({ s, address }) => {
    const p = live?.get(address.toLowerCase());
    return {
      symbol: s.symbol,
      ticker: s.ticker,
      name: s.name,
      kind: s.kind,
      address,
      logo: s.logo ?? null,
      color: s.color,
      colorLight: s.colorLight,
      price: p ? Number(p.value) / 1e18 : s.price,
      trading: p ? p.trading : null,
    };
  });
  return { source: live ? "binance-live" : isLocal() ? "local-demo (snapshot prices)" : "snapshot-2026-10-05", stocks };
}

export async function publicConfig() {
  const chain = chainFromEnv();
  let escrow: Address | null = null;
  let usdt: Address = BSC_USDT as Address;
  let currentRound: string | null = null;
  try {
    escrow = escrowFromEnv();
    const { pub } = clientsFromEnv();
    const [stakeToken, count] = await Promise.all([
      pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" }),
      pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" }),
    ]);
    usdt = stakeToken;
    currentRound = count > 0n ? count.toString() : null;
  } catch {
    // No escrow yet: the app still renders, with entering disabled.
  }
  return {
    chain: isLocal() ? "local" : "bsc",
    chainId: chain.id,
    rpcUrl: isLocal() ? rpcFromEnv() : (process.env.NEXT_PUBLIC_BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org"),
    explorer: isLocal() ? null : "https://bscscan.com",
    escrow,
    usdt,
    currentRound,
    /** Buying through Binance only works on BSC mainnet. */
    buyEnabled: !isLocal() && !!process.env.BINANCE_W3_API_KEY,
    faucet: isLocal(),
    rules: {
      minTokens: DEFAULT_RULES.minTokens,
      maxTokens: 10,
      maxWeightPct: DEFAULT_RULES.maxWeightBps / 100,
      minBasketUsd: Number(DEFAULT_RULES.minValue / 10n ** 18n),
      ticketUsd: 5,
      maxBuyFeePct: 2,
      driftPct: DRIFT_BPS / 100,
    },
  };
}

/** A wallet's entries in the most recent rounds, with what it can claim. */
export async function loadMe(wallet: Address, lastRounds = 6) {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const count = Number(await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" }));
  const ids = Array.from({ length: Math.min(lastRounds, count) }, (_, i) => BigInt(count - i));
  const rows = await Promise.all(
    ids.map(async (id) => {
      const idx = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryIndex", args: [id, wallet] });
      if (idx === 0n) return null;
      const [info, e] = await Promise.all([
        readRound(pub, escrow, id),
        pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryAt", args: [id, idx - 1n] }),
      ]);
      const [meta] = [await readTeamMeta(pub, escrow, id, [e.teamKey])];
      let basket: { token: Address; amount: string }[] = [];
      if (e.isCreator) {
        const [tokens, amounts] = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "basketOf", args: [id, wallet] });
        basket = tokens.map((t, i) => ({ token: t, amount: amounts[i].toString() }));
      }
      const done = info.status === "Settled" || info.status === "Voided";
      return {
        roundId: id.toString(),
        status: info.status,
        end: info.end,
        teamKey: e.teamKey,
        teamName: meta.get(e.teamKey.toLowerCase())?.name ?? "",
        role: e.isCreator ? "creator" : "backer",
        stake: info.stake.toString(),
        payout: e.payout.toString(),
        claimed: e.claimed,
        claimable: done && !e.claimed,
        basket,
      };
    }),
  );
  return rows.filter((r) => r !== null);
}

// ---------------------------------------------------------------------------
// Plans: the exact transactions for an action, for the browser or an agent.
// ---------------------------------------------------------------------------

export type PlanRequest =
  | { action: "back"; wallet: string; teamKey: string; roundId?: string }
  | { action: "lock"; wallet: string; tickers: string[]; weightsPct: number[]; name: string; buyFeePct?: number; roundId?: string; amounts?: string[] }
  | { action: "buy-basket"; wallet: string; tickers: string[]; weightsPct: number[]; usdt: number; creator?: string; feePct?: number }
  | { action: "buy-etf"; wallet: string; teamKey: string; usdt: number; roundId?: string }
  | { action: "claim"; wallet: string; roundId: string }
  | { action: "claim-basket"; wallet: string; roundId: string };

export interface Plan {
  action: PlanRequest["action"];
  steps: TxStep[];
  notes: string[];
  teamKey?: Hex;
  skipped?: { token: string; reason: string }[];
}

class PlanError extends Error {}
export const isPlanError = (e: unknown): e is Error => e instanceof PlanError;

const usd = (x: bigint) => Number(formatUnits(x, 18));

async function openRound(roundId?: string): Promise<RoundInfo> {
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const id = roundId ? BigInt(roundId) : await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "roundCount" });
  if (id === 0n) throw new PlanError("no round is open yet");
  const info = await readRound(pub, escrow, id);
  const now = Number((await pub.getBlock()).timestamp);
  if (info.status !== "Open" || now >= info.entryClose) throw new PlanError(`round ${id} is not taking entries`);
  return info;
}

export async function makePlan(req: PlanRequest): Promise<Plan> {
  if (!isAddress(req.wallet)) throw new PlanError("wallet must be an address");
  const wallet = getAddress(req.wallet);
  const { pub } = clientsFromEnv();
  const escrow = escrowFromEnv();
  const usdt = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "stakeToken" });
  const allowance = (token: Address, spender: Address) => pub.readContract({ address: token, abi: erc20Abi, functionName: "allowance", args: [wallet, spender] });
  const { stocks } = await chainStocks();
  const byTicker = (t: string) => {
    const s = stocks.find((x) => x.ticker === t.toUpperCase());
    if (!s) throw new PlanError(`unknown or banned stock: ${t}`);
    return s;
  };

  const notEntered = async (id: bigint) => {
    const idx = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "entryIndex", args: [id, wallet] });
    if (idx !== 0n) throw new PlanError(`this wallet already has an entry in round ${id} (one per wallet)`);
  };

  switch (req.action) {
    case "back": {
      const info = await openRound(req.roundId);
      await notEntered(info.id);
      const teamKey = req.teamKey as Hex;
      const captain = await pub.readContract({ address: escrow, abi: leagueEscrowAbi, functionName: "captainOf", args: [info.id, teamKey] });
      if (/^0x0+$/.test(captain)) throw new PlanError("no team with that key in this round");
      const meta = await readTeamMeta(pub, escrow, info.id, [teamKey]);
      const steps = planBack({ escrow, usdt, roundId: info.id, stake: info.stake, teamKey, allowance: await allowance(usdt, escrow), teamName: meta.get(teamKey.toLowerCase())?.name });
      return { action: "back", steps, notes: [`Ticket: ${usd(info.stake)} USDT. Entries close ${new Date(info.entryClose * 1000).toISOString()}.`] };
    }

    case "lock": {
      const info = await openRound(req.roundId);
      await notEntered(info.id);
      const picks = req.tickers.map(byTicker);
      if (picks.length < DEFAULT_RULES.minTokens || picks.length > 10) throw new PlanError("a basket has 3 to 10 stocks");
      if (new Set(picks.map((p) => p.ticker)).size !== picks.length) throw new PlanError("each stock once");
      if (picks.some((p) => isLeveraged({ underlyingTicker: p.ticker, underlyingName: p.name, tokenName: p.name }))) throw new PlanError("leveraged funds are banned");
      const name = (req.name ?? "").trim();
      if (!name || new TextEncoder().encode(name).length > 32) throw new PlanError("name: 1 to 32 bytes");
      const feeBps = Math.round((req.buyFeePct ?? 1) * 100);
      if (feeBps < 0 || feeBps > 200) throw new PlanError("buy fee: 0% to 2%");
      const weights = normaliseWeights(req.weightsPct);
      if (weights.some((w) => w > DEFAULT_RULES.maxWeightBps)) throw new PlanError("no stock above 50%");
      const tokens = picks.map((p) => p.address);
      // Lock what the wallet holds (or the amounts given).
      const amounts = req.amounts?.length
        ? req.amounts.map((a) => BigInt(a))
        : await Promise.all(tokens.map((t) => pub.readContract({ address: t, abi: erc20Abi, functionName: "balanceOf", args: [wallet] })));
      if (amounts.some((a) => a === 0n)) throw new PlanError(`the wallet holds none of: ${picks.filter((_, i) => amounts[i] === 0n).map((p) => p.ticker).join(", ")}`);
      const values = amounts.map((a, i) => (a * BigInt(Math.round(picks[i].price * 1e6))) / 10n ** 6n);
      const total = values.reduce((s, v) => s + v, 0n);
      const notes: string[] = [];
      if (total < DEFAULT_RULES.minValue) throw new PlanError(`basket is worth $${usd(total).toFixed(2)}; the minimum is $10`);
      const measured = basketWeightsBps(values);
      measured.forEach((m, i) => {
        if (Math.abs(m - weights[i]) > DRIFT_BPS / 2)
          notes.push(`${picks[i].ticker} is ${(m / 100).toFixed(1)}% of the basket at current prices but you declared ${(weights[i] / 100).toFixed(1)}%. More than ${DRIFT_BPS / 100} points apart at round start refunds the entry.`);
      });
      const allowances: Record<string, bigint> = {};
      for (const t of [...tokens, usdt]) allowances[t.toLowerCase()] = await allowance(t, escrow);
      const { teamKey, steps } = planLock({
        escrow,
        usdt,
        roundId: info.id,
        stake: info.stake,
        tokens,
        amounts,
        weightsBps: weights,
        name,
        buyFeeBps: feeBps,
        allowances,
        symbols: Object.fromEntries(picks.map((p) => [p.address.toLowerCase(), p.symbol])),
      });
      notes.unshift(`Basket worth $${usd(total).toFixed(2)} at current prices, plus the ${usd(info.stake)} USDT ticket.`);
      return { action: "lock", steps, notes, teamKey };
    }

    case "buy-basket":
    case "buy-etf": {
      if (isLocal()) throw new PlanError("buying through Binance only works on BSC mainnet; on the local demo chain use the faucet");
      let tickers: PublicStock[];
      let weights: number[];
      let creator: Address;
      let feePct: number;
      if (req.action === "buy-etf") {
        const view = await loadRoundView(req.roundId ? BigInt(req.roundId) : undefined);
        const team = view?.teams.find((t) => t.teamKey.toLowerCase() === req.teamKey.toLowerCase());
        if (!team) throw new PlanError("no team with that key");
        tickers = team.holdings.map((h) => stocks.find((s) => s.address.toLowerCase() === h.token.toLowerCase())!).filter(Boolean);
        weights = team.holdings.map((h) => h.weightBps);
        creator = getAddress(team.captain);
        feePct = team.buyFeeBps / 100;
      } else {
        tickers = req.tickers.map(byTicker);
        weights = normaliseWeights(req.weightsPct);
        creator = req.creator && isAddress(req.creator) ? getAddress(req.creator) : wallet;
        feePct = creator === wallet ? 0 : (req.feePct ?? 1);
      }
      if (!(req.usdt >= 1 && req.usdt <= 10_000)) throw new PlanError("amount: 1 to 10,000 USDT");
      const usdtIn = BigInt(Math.round(req.usdt * 1e6)) * 10n ** 12n;
      const plan = await planBasketBuy({ tokens: tickers.map((t) => t.address), weightsBps: weights, usdtIn, wallet, creator, creatorFeePct: feePct });
      const spenders = [...new Set(plan.legs.map((l) => (l.spender ?? l.tx?.to ?? "").toLowerCase()).filter(Boolean))];
      const allow = new Map<string, bigint>();
      for (const sp of spenders) allow.set(sp, await allowance(usdt, sp as Address));
      const { steps, skipped } = buyPlanSteps(plan, usdt, (sp) => allow.get(sp.toLowerCase()) ?? 0n, (t) => stocks.find((s) => s.address.toLowerCase() === t.toLowerCase())?.symbol ?? t);
      const notes = [`${req.usdt} USDT split across ${tickers.length} stocks by weight.`];
      if (feePct > 0) notes.push(`${feePct}% creator fee goes to ${creator}, taken from the USDT by Binance's swap.`);
      if (skipped.length) notes.push(`Not included: ${skipped.map((s) => `${s.token} (${s.reason})`).join("; ")}.`);
      return { action: req.action, steps, notes, skipped };
    }

    case "claim":
      return { action: "claim", steps: planClaim(escrow, BigInt(req.roundId)), notes: ["Pays your payout (or refund) and returns a creator's basket."] };
    case "claim-basket":
      return { action: "claim-basket", steps: planClaimBasket(escrow, BigInt(req.roundId)), notes: ["Only needed if a stock was paused when you claimed."] };
  }
}
