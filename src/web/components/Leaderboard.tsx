"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { short } from "./ConnectButton";
import { useRound } from "../hooks";

interface Board {
  settledRounds: number;
  creators: { wallet: string; name: string; rounds: number; wins: number; bestReturnPct: number; teamTickets: number; won: string }[];
  backers: { wallet: string; tickets: number; wins: number; net: string }[];
}

export function Leaderboard() {
  const [tab, setTab] = useState<"creators" | "backers">("creators");
  const { data, isLoading, error } = useQuery({ queryKey: ["leaderboard"], queryFn: async () => (await fetch("/api/leaderboard")).json() as Promise<Board & { error?: string }> });
  const { data: round } = useRound();
  if (isLoading) return <div className="h-64 animate-pulse rounded-[28px] bg-surface" />;
  if (error || !data || data.error) return <div className="rounded-[28px] bg-surface p-8 text-muted">The leaderboard isn&rsquo;t available right now.</div>;
  const last = round && Number(round.id) > 1 ? Number(round.id) - 1 : null;
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-1 rounded-full bg-surface p-1 text-[14px]">
          {(["creators", "backers"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`h-9 rounded-full px-4 ${tab === t ? "bg-bg font-medium shadow-card" : "text-muted"}`}>
              {t === "creators" ? "Creators" : "Backers"}
            </button>
          ))}
        </div>
        <span className="text-[14px] text-muted">
          {data.settledRounds} settled {data.settledRounds === 1 ? "round" : "rounds"}
          {last && (
            <>
              {" "}· <Link href={`/round/${last}`} className="font-medium text-ink underline-offset-4 hover:underline">last results →</Link>
            </>
          )}
        </span>
      </div>
      <div className="rounded-[24px] bg-bg p-2 shadow-card md:p-4">
        {tab === "creators"
          ? data.creators.map((c, i) => (
              <Row
                key={c.wallet}
                rank={i + 1}
                title={c.name || "Unnamed"}
                sub={short(c.wallet)}
                stats={`${c.rounds} ${c.rounds === 1 ? "round" : "rounds"} · ${c.wins} ${c.wins === 1 ? "win" : "wins"} · best ${c.bestReturnPct >= 0 ? "+" : "−"}${Math.abs(c.bestReturnPct).toFixed(2)}% · ${c.teamTickets} ${c.teamTickets === 1 ? "backer" : "backers"} drawn`}
                net={c.won}
              />
            ))
          : data.backers.map((b, i) => (
              <Row key={b.wallet} rank={i + 1} title={short(b.wallet)} stats={`${b.tickets} ${b.tickets === 1 ? "ticket" : "tickets"} · ${b.wins} ${b.wins === 1 ? "win" : "wins"}`} net={b.net} />
            ))}
        {((tab === "creators" && !data.creators.length) || (tab === "backers" && !data.backers.length)) && <p className="p-8 text-center text-muted">Nothing settled yet.</p>}
      </div>
      <p className="mt-4 text-[12px] text-muted">Net from tickets: payouts minus the $5 ticket, including creator fees. Buy-fee earnings are paid by Binance&rsquo;s swap directly to creators and aren&rsquo;t counted here.</p>
    </div>
  );
}

const signed = (x: string) => (Number(x) >= 0 ? `+$${x}` : `−$${x.slice(1)}`);

/** Same row style as the league table: rank, name, stats, net result. */
function Row({ rank, title, sub, stats, net }: { rank: number; title: string; sub?: string; stats: string; net: string }) {
  const up = Number(net) >= 0;
  return (
    <div className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 md:gap-4">
      <span className="t-num w-5 text-[13px] text-muted">{rank}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{title}</span>
        <span className="block truncate text-[12px] text-muted">
          {sub && <span className="t-num">{sub} · </span>}
          {stats}
        </span>
      </span>
      <span className="text-right">
        <span className={`t-num block text-[15px] ${up ? "text-up" : "text-down"}`}>{signed(net)}</span>
        <span className="text-[11px] text-muted">from tickets</span>
      </span>
    </div>
  );
}
