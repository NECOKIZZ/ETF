"use client";

// The league at a glance, Polymarket style: the top ETFs' returns over the
// round on one chart, with a legend that reads like a scoreboard.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useHistory, useRound } from "../hooks";
import { ReturnChart, SERIES, type Series } from "./ReturnChart";
import { teamName } from "./league";

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;

export function LeagueChart({ roundId }: { roundId?: string }) {
  const { data: r } = useRound(roundId);
  const { data: h } = useHistory(roundId);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!r || !r.teams.length) return null;

  const from = r.entryClose * 1000;
  const to = r.end * 1000;
  const nowAt = Math.min(now, to);
  const running = r.phase === "running" || r.phase === "ended";
  // Top five now; colours follow the ETF (its entry order), not its rank.
  const order = new Map((h?.teams ?? r.teams.map((t) => ({ teamKey: t.teamKey.toLowerCase() }))).map((t, i) => [t.teamKey, i]));
  const top = r.teams
    .slice(0, SERIES.length)
    .map((t) => ({ t, key: t.teamKey.toLowerCase() }))
    .sort((a, b) => (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99))
    .map((x, i) => ({ ...x, color: SERIES[i] }));
  const pts = h?.points ?? [];
  const series: Series[] = top.map(({ t, key, color }) => {
    const p = pts.map((x) => ({ at: x.at, v: x.teams[key] ?? 0 }));
    if (running && p.length && nowAt > p[p.length - 1].at) p.push({ at: nowAt, v: t.returnPct });
    return { key, label: teamName(t), color, points: p };
  });
  const legend = [...top].sort((a, b) => a.t.rank - b.t.rank);

  return (
    <section className="viz-root mb-5 rounded-[24px] bg-bg p-4 shadow-card md:p-6">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {legend.map(({ t, color }) => (
          <Link key={t.teamKey} href={`/etf/${t.teamKey}`} className="flex items-center gap-2 text-[13px] hover:opacity-70">
            <span className="h-0.5 w-3.5 rounded-full" style={{ background: color }} />
            <span className="max-w-[160px] truncate">{teamName(t)}</span>
            <span className={`t-num font-medium ${t.returnPct >= 0 ? "text-up" : "text-down"}`}>{pct(t.returnPct)}</span>
          </Link>
        ))}
        {r.teams.length > top.length && <span className="text-[13px] text-muted">+{r.teams.length - top.length} more below</span>}
      </div>
      <div className="mt-3">
        <ReturnChart series={series} from={from} to={to} now={nowAt} height={260} />
      </div>
    </section>
  );
}
