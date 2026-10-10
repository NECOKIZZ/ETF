// Mock league data for the walkthrough video. Every number here is made up:
// rounds, ETFs, prices, wallets. The shapes match the app's real API.

import { BSTOCKS } from "../../../src/ui/data/stocks.ts";

export const CHAMPION_WALLET = "0xc4a3916b2e8f0d47a1b53e9c02f7d6a85e1b4c39";
export const ME = "0x8f3a62b1d0c94e7a55e1c0de4b2f9a3c7d1e91c2";

const H = 3_600_000;
export const ROUNDS = {
  6: { entryClose: Date.UTC(2026, 8, 28, 13, 30), end: Date.UTC(2026, 9, 2, 20, 0) },
  7: { entryClose: Date.UTC(2026, 9, 5, 13, 30), end: Date.UTC(2026, 9, 9, 20, 0) },
  8: { entryClose: Date.UTC(2026, 9, 12, 13, 30), end: Date.UTC(2026, 9, 16, 20, 0) },
} as const;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(2 * Math.PI * r());

const hex = (s: string, len: number) => {
  let h = 2166136261;
  let out = "";
  while (out.length < len) {
    for (const c of s + out.length) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    out += h.toString(16).padStart(8, "0");
  }
  return out.slice(0, len);
};
const key = (name: string) => `0x${hex(`team:${name}`, 64)}`;
const addr = (name: string) => `0x${hex(`wallet:${name}`, 40)}`;
const wei = (usd: number) => (BigInt(Math.round(usd * 1e6)) * 10n ** 12n).toString();

// Drift and volatility per stock, in % per hour. Tuned so the top of the table changes hands during the round.
const STYLE: Record<string, [number, number]> = {
  NVDA: [0.07, 0.42], AMD: [0.075, 0.5], AVGO: [0.06, 0.38], TSM: [0.05, 0.3], ARM: [0.06, 0.55],
  MSFT: [0.03, 0.22], GOOGL: [0.04, 0.25], META: [0.045, 0.3], PLTR: [0.05, 0.6], TSLA: [-0.01, 0.7],
  COIN: [0.02, 0.8], HOOD: [0.03, 0.75], CRCL: [-0.02, 0.85], MSTR: [0.0, 0.9], BNB: [0.035, 0.35], BTC: [0.02, 0.4], ETH: [0.01, 0.5],
  MU: [0.09, 0.7], SNDK: [0.08, 0.8], WDC: [0.05, 0.55], SKHY: [0.07, 0.6], DRAM: [0.06, 0.5],
  SPY: [0.015, 0.12], QQQ: [0.02, 0.16], RKLB: [0.02, 0.9], SPCX: [0.01, 0.7], CRWV: [0.03, 0.95], NBIS: [0.04, 0.85], ORCL: [0.02, 0.35],
  LITE: [0.05, 0.65], AAOI: [0.04, 0.9], GLW: [0.02, 0.3], MRVL: [0.04, 0.5], IBM: [-0.01, 0.2], INTC: [-0.02, 0.45], QCOM: [0.0, 0.3], NOK: [-0.01, 0.35],
  BABA: [0.01, 0.5], EWY: [0.015, 0.25],
};

const HOURS = 110;
function paths(seed: number) {
  const r = rng(seed);
  const out = new Map<string, number[]>();
  for (const s of BSTOCKS) {
    const [d, v] = STYLE[s.ticker] ?? [0.01, 0.4];
    const p = [0];
    for (let i = 1; i <= HOURS; i++) p.push(p[i - 1] + d + v * gauss(r) * 0.55);
    out.set(s.ticker, p);
  }
  return out;
}
const PATHS: Record<number, Map<string, number[]>> = { 6: paths(66), 7: paths(1207), 8: paths(88) };

/** % change of a stock since the round's start, at time `at`. */
export function chg(round: 6 | 7 | 8, ticker: string, at: number) {
  const p = PATHS[round].get(ticker)!;
  const h = Math.max(0, (at - ROUNDS[round].entryClose) / H);
  const i = Math.min(Math.floor(h), HOURS - 1);
  const f = Math.min(1, h - i);
  return p[i] + (p[i + 1] - p[i]) * f;
}

interface Team {
  name: string;
  captain: string;
  holdings: [string, number][]; // ticker, weight %
  members: number;
  basket: number;
  fee: number; // bps
}
const T = (name: string, captain: string, holdings: [string, number][], members: number, basket: number, fee = 100): Team => ({ name, captain, holdings, members, basket, fee });

export const TEAMS: Team[] = [
  T("AI Chips Max", addr("kemi"), [["NVDA", 30], ["AMD", 25], ["AVGO", 20], ["TSM", 15], ["ARM", 10]], 24, 180, 100),
  T("Champion", CHAMPION_WALLET, [["MU", 20], ["NVDA", 20], ["AMD", 15], ["SKHY", 15], ["META", 10], ["BTC", 10], ["BNB", 10]], 41, 500, 50),
  T("Memory Supercycle", addr("dami"), [["MU", 25], ["SNDK", 25], ["WDC", 20], ["SKHY", 20], ["DRAM", 10]], 17, 120, 150),
  T("Crypto Rails", addr("tobi"), [["COIN", 30], ["HOOD", 25], ["CRCL", 20], ["MSTR", 15], ["BNB", 10]], 12, 60, 200),
  T("Index Hugger", addr("ada"), [["SPY", 50], ["QQQ", 30], ["MSFT", 20]], 6, 250, 0),
  T("Rocket Fuel", addr("zainab"), [["RKLB", 35], ["PLTR", 30], ["TSLA", 20], ["SPCX", 15]], 14, 45, 150),
  T("Neo Clouds", addr("chidi"), [["CRWV", 30], ["NBIS", 30], ["ORCL", 25], ["MSFT", 15]], 9, 75, 100),
  T("Optical Gang", addr("femi"), [["LITE", 30], ["AAOI", 25], ["GLW", 25], ["MRVL", 20]], 7, 40, 100),
  T("Old Tech Revival", addr("bisi"), [["IBM", 30], ["INTC", 30], ["QCOM", 25], ["NOK", 15]], 4, 30, 50),
  T("Asia Tilt", addr("lin"), [["BABA", 30], ["EWY", 25], ["TSM", 25], ["SKHY", 20]], 5, 55, 100),
  T("Tesla & Friends", addr("musa"), [["TSLA", 40], ["NVDA", 30], ["GOOGL", 30]], 11, 90, 100),
  T("Stablecoin Season", addr("ngozi"), [["CRCL", 40], ["COIN", 40], ["ETH", 20]], 3, 25, 100),
  T("Big Five", addr("sam"), [["META", 20], ["MSFT", 20], ["GOOGL", 20], ["NVDA", 20], ["TSLA", 20]], 15, 150, 100),
  T("Steady Eddie", addr("eddie"), [["SPY", 40], ["MSFT", 30], ["GOOGL", 30]], 2, 20, 0),
];
export const KEY = Object.fromEntries(TEAMS.map((t) => [t.name, key(t.name)]));
export const CREATED = T("Silicon Summer", ME, [["NVDA", 25], ["AMD", 25], ["AVGO", 25], ["TSM", 25]], 1, 12, 100);

const stock = (t: string) => BSTOCKS.find((s) => s.ticker === t)!;
const teamRet = (round: 6 | 7 | 8, t: Team, at: number) => t.holdings.reduce((s, [tk, w]) => s + (w / 100) * chg(round, tk, at), 0);

export interface State {
  current: 7 | 8;
  backed: boolean;
  created: boolean;
  /** The basket has been bought (wallet balances show it). */
  bought: boolean;
  claimed: boolean;
}

export function roundView(id: 6 | 7 | 8, at: number, st: State) {
  const R = ROUNDS[id];
  const phase = id === 6 ? "settled" : at < R.entryClose ? "entries-open" : at < R.end ? "running" : "ended";
  const started = phase !== "entries-open";
  let teams = id === 8 && st.created ? [...TEAMS, CREATED] : TEAMS;
  teams = teams.map((t) => ({ ...t, members: id === 8 ? Math.max(1, Math.round(t.members / 3)) + (t.name === "AI Chips Max" && st.backed ? 1 : 0) : t.members }));
  const end = id === 6 ? R.end : at;
  const rows = teams.map((t) => ({ t, ret: started ? teamRet(id, t, Math.min(end, R.end)) : 0 }));
  rows.sort((a, b) => b.ret - a.ret);
  // Settlement, as the engine does it: top half wins, split by tickets × accuracy.
  const n = rows.length;
  const best = rows[0].ret;
  const D = rows.map((r) => best - r.ret);
  const k = Math.floor(n / 2) + 1;
  const m = [...D].sort((a, b) => a - b)[k - 1] || 1e-9;
  const win = D.map((d) => started && d < m);
  const acc = D.map((d) => Math.pow(1 / (1 + d / m), 6));
  const losers = rows.reduce((s, r, i) => s + (win[i] ? 0 : r.t.members), 0);
  const pot = losers * 5 * 0.9;
  const wsum = rows.reduce((s, r, i) => s + (win[i] ? r.t.members * acc[i] : 0), 0) || 1;
  return {
    id: String(id),
    status: id === 6 ? "Settled" : "Open",
    entryClose: R.entryClose / 1000,
    end: R.end / 1000,
    stake: wei(5),
    entries: teams.reduce((s, t) => s + t.members, 0),
    pot: wei(teams.reduce((s, t) => s + t.members, 0) * 5),
    phase,
    refunded: 0,
    priceSource: "Binance Web3 reference prices · BNB, BTC, ETH: Binance spot",
    inputsHash: id === 6 ? `0x${hex("inputs6", 64)}` : `0x${"0".repeat(64)}`,
    teams: rows.map(({ t, ret }, i) => ({
      teamKey: key(t.name),
      rank: i + 1,
      name: t.name,
      buyFeeBps: t.fee,
      captain: t.captain,
      official: t.captain === CHAMPION_WALLET,
      basketValue: wei(t.basket),
      holdings: t.holdings.map(([tk, w]) => ({ token: stock(tk).address.toLowerCase(), ticker: tk, weightBps: w * 100 })),
      returnPct: Math.round(ret * 1e4) / 1e4,
      members: t.members,
      winningNow: win[i],
      payoutPerTicketNow: wei(win[i] ? 5 + 0.9 * ((pot * acc[i]) / wsum) : 0),
    })),
  };
}

export function history(id: 6 | 7 | 8, at: number, st: State) {
  const R = ROUNDS[id];
  const teams = id === 8 && st.created ? [...TEAMS, CREATED] : TEAMS;
  const stop = Math.min(id === 6 ? R.end : at, R.end);
  const points = [];
  for (let t = R.entryClose; t <= stop; t += H) {
    const rets = teams.map((x) => teamRet(id, x, t));
    const sorted = [...rets].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    points.push({
      at: t,
      teams: Object.fromEntries(teams.map((x, i) => [key(x.name), Math.round(rets[i] * 1e4) / 1e4])),
      median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
      stocks: Object.fromEntries(BSTOCKS.map((s) => [s.ticker, Math.round(chg(id, s.ticker, t) * 1e4) / 1e4])),
    });
  }
  return {
    roundId: String(id),
    entryClose: R.entryClose / 1000,
    end: R.end / 1000,
    teams: teams.map((x) => ({ teamKey: key(x.name), tickers: x.holdings.map((h) => h[0]) })),
    points,
  };
}

export function stocks(at: number, st: State) {
  const running = st.current === 7;
  return {
    source: "Binance Web3 reference prices",
    stocks: BSTOCKS.map((s) => {
      // Between rounds the strip shows last round's moves.
      const c = running ? chg(7, s.ticker, at) : chg(7, s.ticker, ROUNDS[7].end);
      return {
        symbol: s.symbol,
        ticker: s.ticker,
        name: s.name,
        kind: s.kind,
        address: s.address,
        logo: `/logos/${s.ticker}.png`,
        color: s.color,
        colorLight: s.colorLight,
        price: Math.round(s.price * (1 + c / 100) * 100) / 100,
        trading: true,
        changePct: Math.round(c * 100) / 100,
      };
    }),
  };
}

export const config = {
  chain: "bsc",
  chainId: 56,
  rpcUrl: "https://bsc-dataseed.bnbchain.org",
  explorer: "https://bscscan.com",
  escrow: "0x174ad1c93310df3023f2ca1ee23aa46b1182459b",
  usdt: "0x55d398326f99059ff775485246999027b3197955",
  currentRound: "7",
  buyEnabled: true,
  faucet: false,
  rules: { minTokens: 3, minStocks: 3, maxCryptoPct: 20, maxTokens: 10, maxWeightPct: 50, minBasketUsd: 10, ticketUsd: 5, maxBuyFeePct: 2, driftPct: 5 },
};

export function me(st: State) {
  const tok = (t: string) => ({ token: stock(t).address.toLowerCase(), amount: wei(1) });
  const e = (roundId: string, status: string, teamName: string, role: "creator" | "backer", payout: number, claimable: boolean, basket: string[] = []) => ({
    roundId,
    status,
    end: ROUNDS[Number(roundId) as 6 | 7 | 8].end / 1000,
    teamKey: key(teamName),
    teamName,
    role,
    stake: wei(5),
    payout: wei(payout),
    claimed: false,
    claimable: claimable && !st.claimed,
    basket: basket.map(tok),
  });
  return {
    wallet: ME,
    entries: [
      ...(st.created ? [e("8", "Open", "Silicon Summer", "creator", 0, false, ["NVDA", "AMD", "AVGO", "TSM"])] : []),
      ...(st.backed ? [e("8", "Open", "AI Chips Max", "backer", 0, false)] : []),
      e("7", "Open", "Rocket Fuel", "backer", 0, false),
      e("6", "Settled", "Memory Supercycle", "creator", 13.2, true, ["MU", "SNDK", "WDC", "SKHY", "DRAM"]),
      e("6", "Settled", "Big Five", "backer", 0, false),
    ],
  };
}

export const leaderboard = {
  settledRounds: 6,
  creators: [
    ["Champion", CHAMPION_WALLET, 3, 3, 6.84, 96, "212.40"],
    ["Memory Supercycle", addr("dami"), 6, 4, 9.12, 58, "141.75"],
    ["AI Chips Max", addr("kemi"), 6, 4, 7.31, 71, "118.20"],
    ["Crypto Rails", addr("tobi"), 5, 3, 11.4, 30, "64.90"],
    ["Big Five", addr("sam"), 6, 3, 4.02, 44, "38.15"],
    ["Rocket Fuel", addr("zainab"), 4, 2, 8.77, 26, "21.60"],
    ["Index Hugger", addr("ada"), 6, 3, 2.1, 12, "9.80"],
    ["Old Tech Revival", addr("bisi"), 3, 0, -1.2, 5, "-15.00"],
  ].map(([name, wallet, rounds, wins, bestReturnPct, teamTickets, won]) => ({ name, wallet, rounds, wins, bestReturnPct, teamTickets, won })),
  backers: [
    [addr("whale1"), 18, 13, "96.30"],
    [ME, 9, 6, "41.85"],
    [addr("b3"), 12, 7, "33.10"],
    [addr("b4"), 6, 4, "20.45"],
    [addr("b5"), 10, 5, "4.20"],
    [addr("b6"), 7, 2, "-17.60"],
  ].map(([wallet, tickets, wins, net]) => ({ wallet, tickets, wins, net })),
};

export const verify = { inputsHash: `0x${hex("inputs6", 64)}`, recomputedHash: `0x${hex("inputs6", 64)}`, onchainHash: `0x${hex("inputs6", 64)}`, payoutsMatch: true, ok: true };

const TO = "0x174ad1c93310df3023f2ca1ee23aa46b1182459b";
const step = (label: string, kind = "call") => ({ kind, label, to: TO, data: "0x", value: "0" });
export function plan(body: { action: string; tickers?: string[]; teamKey?: string; usdt?: number; name?: string; roundId?: string }) {
  const teamName = TEAMS.find((t) => key(t.name) === body.teamKey?.toLowerCase())?.name ?? "this ETF";
  switch (body.action) {
    case "back":
      return { action: "back", steps: [step("Approve 5 USDT for the league", "approve"), step(`Back ${teamName} in round 8`, "back")], notes: [], baw: [] };
    case "buy-etf": {
      const t = TEAMS.find((x) => x.name === teamName)!;
      return {
        action: "buy-etf",
        steps: [step(`Approve ${body.usdt} USDT for the swap`, "approve"), ...t.holdings.map(([tk, w]) => step(`Buy ${tk} with ${((body.usdt ?? 0) * w) / 100} USDT via Binance`, "swap"))],
        notes: [`${t.fee / 100}% of each swap goes to the creator, through Binance's referral fee.`],
        baw: [],
      };
    }
    case "buy-basket": {
      const usdt = body.usdt ?? 0;
      const w = (body as { weightsPct?: number[] }).weightsPct ?? [];
      return {
        action: "buy-basket",
        steps: [step(`Approve ${usdt} USDT for the swap`, "approve"), ...(body.tickers ?? []).map((t, i) => step(`Buy ${t} with ${((usdt * (w[i] ?? 0)) / 100).toFixed(2)} USDT via Binance`, "swap"))],
        notes: [],
        baw: [],
      };
    }
    case "lock":
      return {
        action: "lock",
        teamKey: key("Silicon Summer"),
        steps: [...(body.tickers ?? []).map((t) => step(`Approve ${t} for the league`, "approve")), step("Approve the 5 USDT ticket", "approve"), step(`Lock the basket and enter "${body.name}"`, "lock")],
        notes: [],
        baw: [],
      };
    case "claim":
      return { action: "claim", steps: [step("Claim round 6: $13.20 and your 5 stocks", "claim")], notes: [], baw: [] };
    default:
      return { action: body.action, steps: [step(body.action)], notes: [], baw: [] };
  }
}
