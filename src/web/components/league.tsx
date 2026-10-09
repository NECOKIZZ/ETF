"use client";

// Turning API round data into the UI components' shapes.

import { BSTOCKS } from "../../ui/data/stocks";
import type { Holding } from "../../ui/components/EtfHand";
import type { LeagueEntry } from "../../ui/components/LeagueRow";
import { LeagueTable } from "../../ui/components/LeagueRow";
import { RoundPill } from "../../ui/components/RoundPill";
import type { RoundView, TeamView } from "../api";
import { useRound } from "../hooks";
import { short } from "./ConnectButton";

export const usd = (wei: string | bigint, dp = 2) => (Number(BigInt(wei) / 10n ** 12n) / 1e6).toFixed(dp);

export function holdingsOf(t: TeamView): Holding[] {
  return t.holdings
    .map((h) => ({ stock: BSTOCKS.find((s) => s.ticker === h.ticker)!, weightPct: Math.round(h.weightBps / 100) }))
    .filter((h) => h.stock);
}

export const teamName = (t: TeamView) => t.name || `ETF ${t.teamKey.slice(2, 8)}`;

export function toEntry(t: TeamView, stake: string): LeagueEntry {
  const pay = BigInt(t.payoutPerTicketNow);
  return {
    rank: t.rank,
    name: teamName(t),
    creator: short(t.captain),
    holdings: holdingsOf(t),
    returnPct: t.returnPct,
    team: t.members + 1,
    ifWins: t.winningNow && pay > BigInt(stake) ? Number(usd(pay - BigInt(stake))) : null,
    href: `/etf/${t.teamKey}`,
    official: t.official,
  };
}

export function RoundStats({ r }: { r: RoundView }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <RoundPill round={Number(r.id)} locksAt={r.entryClose * 1000} endsAt={r.end * 1000} />
      <span className="text-[14px] text-muted">
        <span className="t-num text-ink">{r.teams.length}</span> ETFs · <span className="t-num text-ink">{r.entries}</span> tickets · pot{" "}
        <span className="t-num text-ink">${usd(r.pot, 0)}</span>
      </span>
    </div>
  );
}

export function LeagueBoard({ limit, query = "", roundId }: { limit?: number; query?: string; roundId?: string }) {
  const { data: r, error, isLoading } = useRound(roundId);
  if (isLoading) return <div className="h-64 animate-pulse rounded-[24px] bg-surface" />;
  if (error || !r)
    return (
      <div className="rounded-[24px] bg-surface p-8 text-muted">
        {error ? `The league is not reachable right now (${error.message}).` : "No round yet."} The first round opens soon.
      </div>
    );
  const q = query.trim().toLowerCase();
  const teams = r.teams.filter((t) => !q || teamName(t).toLowerCase().includes(q) || t.holdings.some((h) => h.ticker?.toLowerCase().includes(q)));
  const entries = teams.slice(0, limit).map((t) => ({ ...toEntry(t, r.stake), href: `/etf/${t.teamKey}${roundId ? `?round=${roundId}` : ""}` }));
  if (!entries.length) return <div className="rounded-[24px] bg-surface p-8 text-muted">No ETFs match.</div>;
  const winners = r.teams.filter((t) => t.winningNow).length || Math.floor(r.teams.length / 2);
  return <LeagueTable entries={entries} cutAfter={q ? -1 : winners} />;
}
