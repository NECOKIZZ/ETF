"use client";

// One ETF, on one laptop screen: its return over the round against the league
// median (or each stock's), its stocks, where it sits in the live table, and
// what a $5 ticket would get if the round ended now, with Back and Buy.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useHistory, useRound, useStocks } from "../hooks";
import type { RoundView, TeamView } from "../api";
import { LogoStack } from "../../ui/components/LogoStack";
import { fmtPrice } from "../../ui/components/StockCard";
import { RoundPill } from "../../ui/components/RoundPill";
import { OfficialBadge } from "../../ui/components/LeagueRow";
import { ActionPanel } from "./ActionPanel";
import { holdingsOf, teamName, usd } from "./league";
import { short } from "./ConnectButton";
import { Container } from "./Shell";
import { ReturnChart, SERIES, type Series } from "./ReturnChart";

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;
const tone = (v: number) => (v >= 0 ? "text-up" : "text-down");
const medianOf = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0;
};

export function EtfPage({ teamKey, roundId }: { teamKey: string; roundId?: string }) {
  const { data: r, isLoading, error } = useRound(roundId);
  const { data: hist } = useHistory(roundId);
  const { data: stocks } = useStocks();
  const [mode, setMode] = useState<"round" | "stocks">("round");
  const [action, setAction] = useState<"back" | "buy" | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) return <Container className="py-16"><div className="h-[640px] animate-pulse rounded-[28px] bg-surface" /></Container>;
  const t = r?.teams.find((x) => x.teamKey.toLowerCase() === teamKey.toLowerCase());
  if (error || !r || !t)
    return (
      <Container className="py-24 text-center">
        <p className="text-muted">{error ? error.message : "This ETF isn't in the current round."}</p>
        <Link href="/league" className="mt-4 inline-block font-medium underline">
          Back to the league
        </Link>
      </Container>
    );

  const key = t.teamKey.toLowerCase();
  const holdings = holdingsOf(t);
  const live = new Map(stocks?.stocks.map((s) => [s.ticker, s]) ?? []);
  const med = medianOf(r.teams.map((x) => x.returnPct));
  const running = r.phase === "running" || r.phase === "ended";
  const from = r.entryClose * 1000;
  const to = r.end * 1000;
  const nowAt = Math.min(now, to);

  // Chart lines: saved history, plus the live point while the round runs.
  const pts = hist?.points ?? [];
  const withNow = <T,>(xs: { at: number; v: T }[], v: T) => (running && xs.length && nowAt > xs[xs.length - 1].at ? [...xs, { at: nowAt, v }] : xs);
  const series: Series[] =
    mode === "round"
      ? [
          { key: "median", label: "median", color: "var(--muted)", dashed: true, points: withNow(pts.map((p) => ({ at: p.at, v: p.median })), med) },
          { key, label: teamName(t), color: "var(--up)", strong: true, points: withNow(pts.map((p) => ({ at: p.at, v: p.teams[key] ?? 0 })), t.returnPct) },
        ]
      : holdings.slice(0, SERIES.length).map((h, i) => ({
          key: h.stock.ticker,
          label: h.stock.ticker,
          color: SERIES[i],
          points: withNow(
            pts.filter((p) => p.stocks[h.stock.ticker] !== undefined).map((p) => ({ at: p.at, v: p.stocks[h.stock.ticker] })),
            live.get(h.stock.ticker)?.changePct ?? 0,
          ),
        }));

  return (
    <Container className="pb-6 pt-6 md:pt-8">
      {/* Title row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/league${roundId ? `?round=${roundId}` : ""}`} className="text-[13px] text-muted hover:text-ink">
            ←&nbsp; Round {r.id}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <h1 className="t-display text-[38px] md:text-[46px]">{teamName(t)}</h1>
            {t.official && <OfficialBadge big />}
            <LogoStack tickers={holdings.map((h) => h.stock.ticker)} size={32} max={holdings.length} />
          </div>
          <p className="mt-2 text-[14px] text-muted">
            by <span className="t-num text-ink">{short(t.captain)}</span> &nbsp;·&nbsp; {t.members} {t.members === 1 ? "backer" : "backers"} &nbsp;·&nbsp; basket locked{" "}
            <span className="t-num text-ink">${usd(t.basketValue)}</span> &nbsp;·&nbsp; buy fee {t.buyFeeBps / 100}%
          </p>
        </div>
        <RoundPill round={Number(r.id)} locksAt={from} endsAt={to} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_372px]">
        {/* Chart + stocks */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className="rounded-[28px] bg-bg p-5 shadow-card md:px-7 md:py-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap gap-x-12 gap-y-3">
                <div>
                  <div className="t-label text-muted">Return since round start</div>
                  <div className={`t-num mt-1.5 text-[44px] font-medium leading-none tracking-[-0.04em] md:text-[52px] ${tone(t.returnPct)}`}>{pct(t.returnPct)}</div>
                </div>
                <div>
                  <div className="t-label text-muted">League median</div>
                  <div className={`t-num mt-2.5 text-[22px] ${tone(med)}`}>{pct(med)}</div>
                  <div className="mt-1 text-[12px] text-muted">
                    <span className={`t-num ${tone(t.returnPct - med)}`}>
                      {t.returnPct - med >= 0 ? "+" : "−"}
                      {Math.abs(t.returnPct - med).toFixed(2)}
                    </span>{" "}
                    pts {t.returnPct - med >= 0 ? "above" : "below"} it
                  </div>
                </div>
                <div>
                  <div className="t-label text-muted">Rank</div>
                  <div className="t-num mt-2.5 text-[22px]">
                    {t.rank} <span className="text-muted">/ {r.teams.length}</span>
                  </div>
                  <div className={`mt-1 text-[12px] ${t.winningNow ? "text-up" : "text-muted"}`}>{t.winningNow ? "In the top half" : "Below the cut"}</div>
                </div>
              </div>
              <div className="flex gap-1 rounded-full bg-surface p-1 text-[12px]" role="group" aria-label="Chart">
                {(["round", "stocks"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`h-7 rounded-full px-3 ${mode === m ? "bg-bg font-medium shadow-card" : "text-muted"}`}>
                    {m === "round" ? "Round" : "Per stock"}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <ReturnChart series={series} from={from} to={to} now={nowAt} height={300} empty={r.phase === "entries-open" ? "The chart starts when entries close." : "No price samples yet."} />
            </div>
          </section>

          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            {holdings.map((h) => {
              const l = live.get(h.stock.ticker);
              return (
                <div key={h.stock.ticker} className="flex items-center gap-3 rounded-[20px] bg-bg px-4 py-3.5 shadow-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/logos/${h.stock.ticker}.png`} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2 whitespace-nowrap">
                      <span className="text-[15px] font-semibold">{h.stock.ticker}</span>
                      {l?.changePct != null && <span className={`t-num text-[13px] ${tone(l.changePct)}`}>{pct(l.changePct)}</span>}
                    </div>
                    <div className="mt-0.5 flex justify-between gap-2 whitespace-nowrap text-[12px]">
                      <span className="t-num">{fmtPrice(l?.price ?? h.stock.price)}</span>
                      <span className="t-num text-muted" title="Weight in the basket">
                        {h.weightPct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live table + action */}
        <div className="flex flex-col gap-3.5">
          <LiveTable r={r} me={key} median={med} />
          <section className="rounded-[28px] bg-brand-ink p-5 text-brand-paper md:px-6">
            <div className="t-label text-brand-paper/55">If the round ended now</div>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className={`t-num text-[40px] font-medium leading-none tracking-[-0.04em] ${t.winningNow ? "text-brand-mint" : "text-brand-paper/70"}`}>
                ${t.winningNow ? usd(t.payoutPerTicketNow) : "0.00"}
              </span>
              <span className="text-[13px] text-brand-paper/60">back on a ${usd(r.stake, 0)} ticket</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={r.phase !== "entries-open"}
                onClick={() => setAction("back")}
                className="h-11 rounded-full bg-brand-mint text-[14px] font-semibold text-brand-ink transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {r.phase === "entries-open" ? `Back this team · $${usd(r.stake, 0)}` : "Entries closed"}
              </button>
              <button type="button" onClick={() => setAction("buy")} className="h-11 rounded-full border border-brand-paper/25 text-[14px] font-medium transition hover:bg-brand-paper/10">
                Buy the ETF
              </button>
            </div>
            <p className="mt-2.5 text-[11px] text-brand-paper/50">
              Back: a ${usd(r.stake, 0)} ticket that wins with this team. Buy: own the {holdings.length} stocks; the creator earns {t.buyFeeBps / 100}%.
            </p>
          </section>
        </div>
      </div>

      {action && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-brand-ink/40 p-4 backdrop-blur-sm" onClick={() => setAction(null)}>
          <div role="dialog" aria-modal="true" aria-label={action === "back" ? "Back this team" : "Buy the ETF"} className="relative w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setAction(null)} className="absolute -top-10 right-0 text-[14px] text-brand-paper" aria-label="Close">
              Close ✕
            </button>
            <div className="rounded-[32px] bg-bg">
              <ActionPanel r={r} t={t} initialTab={action} />
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}

/** The table around this ETF: the top rows, the cut, and this ETF highlighted even when it's further down. */
function LiveTable({ r, me, median }: { r: RoundView; me: string; median: number }) {
  const winners = r.teams.filter((x) => x.winningNow).length || Math.floor(r.teams.length / 2);
  const mine = r.teams.findIndex((x) => x.teamKey.toLowerCase() === me);
  const rows: (TeamView | "gap")[] = mine < 8 ? r.teams.slice(0, 8) : [...r.teams.slice(0, 6), "gap", r.teams[mine]];
  const shown = rows.filter((x) => x !== "gap").length;
  return (
    <section className="flex flex-1 flex-col rounded-[28px] bg-bg p-5 shadow-card md:px-6">
      <div className="flex items-baseline justify-between">
        <h2 className="t-heading text-[20px]">Live table</h2>
        <Link href="/league" className="text-[12px] text-muted hover:text-ink">
          Full table →
        </Link>
      </div>
      <div className="text-[12px] text-muted">{r.teams.length} ETFs · re-ranked on every price update</div>
      <div className="mt-2.5 flex flex-col">
        {rows.map((x, i) =>
          x === "gap" ? (
            <div key="gap" className="t-num px-2.5 py-1 text-[12px] text-muted">
              ⋮
            </div>
          ) : (
            <div key={x.teamKey}>
              {x.rank === winners + 1 && (
                <div className="my-1 flex items-center gap-2">
                  <span className="flex-1 border-t border-dashed border-line" />
                  <span className="t-label text-[10px] text-muted">Top half wins · median {pct(median)}</span>
                  <span className="flex-1 border-t border-dashed border-line" />
                </div>
              )}
              <Link
                href={`/etf/${x.teamKey}`}
                className={`flex h-10 items-center gap-2.5 rounded-[14px] px-2.5 ${x.teamKey.toLowerCase() === me ? "bg-up-bg ring-[1.5px] ring-inset ring-brand-mint" : "hover:bg-surface"}`}
                aria-current={x.teamKey.toLowerCase() === me ? "page" : undefined}
              >
                <span className="t-num w-4 text-[12px] text-muted">{x.rank}</span>
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{teamName(x)}</span>
                <LogoStack tickers={x.holdings.flatMap((h) => (h.ticker ? [h.ticker] : []))} size={20} />
                <span className={`t-num w-16 text-right text-[13px] ${tone(x.returnPct)}`}>{pct(x.returnPct)}</span>
              </Link>
            </div>
          ),
        )}
      </div>
      {r.teams.length > shown && <div className="mt-auto pt-2 text-[12px] text-muted">+{r.teams.length - shown} more ETFs</div>}
    </section>
  );
}
