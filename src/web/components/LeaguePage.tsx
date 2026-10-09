"use client";

import { useState } from "react";
import Link from "next/link";
import { useRound } from "../hooks";
import { LeagueBoard, RoundStats, teamName, usd } from "./league";
import { Change } from "../../ui/components/Pills";
import { LeagueChart } from "./LeagueChart";

export function LeaguePage() {
  const [q, setQ] = useState("");
  const { data: r } = useRound();
  const biggest = r ? [...r.teams].sort((a, b) => b.members - a.members).slice(0, 4) : [];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          {r ? <RoundStats r={r} /> : <span />}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ETFs or tickers"
            className="h-10 w-full rounded-full border border-line bg-bg px-4 text-[14px] outline-none focus:border-ink/40 sm:w-64"
            aria-label="Search ETFs or tickers"
          />
        </div>
        <LeagueChart />
        <div className="rounded-[24px] bg-bg p-2 shadow-card md:p-4">
          <LeagueBoard query={q} />
        </div>
      </div>
      <aside className="space-y-4">
        <div className="rounded-[24px] bg-surface p-6">
          <div className="t-label text-muted">How this round pays</div>
          <ul className="mt-4 space-y-2 text-[14px] text-ink/80">
            <li>Ticket: ${r ? usd(r.stake, 0) : "5"} for creators and backers.</li>
            <li>Top half of ETFs win the bottom half&rsquo;s tickets.</li>
            <li>Closer to the best return → bigger share.</li>
            <li>10% of winnings: 5% platform, 5% season pot.</li>
            <li>Creators keep 10% of their backers&rsquo; winnings.</li>
          </ul>
          <Link href="/rules" className="mt-4 inline-block text-[14px] font-medium underline-offset-4 hover:underline">
            Full rules →
          </Link>
        </div>
        {biggest.length > 0 && (
          <div className="rounded-[24px] bg-surface p-6">
            <div className="t-label text-muted">Biggest teams</div>
            <ul className="mt-4 space-y-3">
              {biggest.map((t) => (
                <li key={t.teamKey}>
                  <Link href={`/etf/${t.teamKey}`} className="flex items-center justify-between gap-3 text-[14px] hover:opacity-70">
                    <span className="truncate">{teamName(t)}</span>
                    <span className="t-num shrink-0 text-muted">{t.members} {t.members === 1 ? "ticket" : "tickets"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {r && r.teams[0] && (
          <div className="rounded-[24px] bg-surface p-6">
            <div className="t-label text-muted">Best return so far</div>
            <Link href={`/etf/${r.teams[0].teamKey}`} className="mt-3 block">
              <div className="t-heading text-[22px]">{teamName(r.teams[0])}</div>
              <Change pct={r.teams[0].returnPct} className="mt-1 text-[20px]" />
            </Link>
            <p className="mt-3 text-[12px] text-muted">Prices: {r.priceSource}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
