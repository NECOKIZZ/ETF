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
  const signed = (x: string) => (Number(x) >= 0 ? `+$${x}` : `−$${x.slice(1)}`);
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
      <div className="overflow-x-auto rounded-[28px] border border-line">
        {tab === "creators" ? (
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="text-[12px] text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Creator</th>
                <th className="px-5 py-3 font-medium">Rounds</th>
                <th className="px-5 py-3 font-medium">Wins</th>
                <th className="px-5 py-3 font-medium">Best return</th>
                <th className="px-5 py-3 font-medium">Backers drawn</th>
                <th className="px-5 py-3 text-right font-medium">Net from tickets</th>
              </tr>
            </thead>
            <tbody>
              {data.creators.map((c, i) => (
                <tr key={c.wallet} className="border-b border-line last:border-0">
                  <td className="t-num px-5 py-3 text-muted">{i + 1}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{c.name || "Unnamed"}</div>
                    <div className="t-num text-[12px] text-muted">{short(c.wallet)}</div>
                  </td>
                  <td className="t-num px-5 py-3">{c.rounds}</td>
                  <td className="t-num px-5 py-3">{c.wins}</td>
                  <td className={`t-num px-5 py-3 ${c.bestReturnPct >= 0 ? "text-up" : "text-down"}`}>{c.bestReturnPct.toFixed(2)}%</td>
                  <td className="t-num px-5 py-3">{c.teamTickets}</td>
                  <td className="t-num px-5 py-3 text-right">{signed(c.won)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[480px] text-left text-[14px]">
            <thead className="text-[12px] text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Backer</th>
                <th className="px-5 py-3 font-medium">Tickets</th>
                <th className="px-5 py-3 font-medium">Wins</th>
                <th className="px-5 py-3 text-right font-medium">Net</th>
              </tr>
            </thead>
            <tbody>
              {data.backers.map((b, i) => (
                <tr key={b.wallet} className="border-b border-line last:border-0">
                  <td className="t-num px-5 py-3 text-muted">{i + 1}</td>
                  <td className="t-num px-5 py-3">{short(b.wallet)}</td>
                  <td className="t-num px-5 py-3">{b.tickets}</td>
                  <td className="t-num px-5 py-3">{b.wins}</td>
                  <td className="t-num px-5 py-3 text-right">{signed(b.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {((tab === "creators" && !data.creators.length) || (tab === "backers" && !data.backers.length)) && <p className="p-8 text-center text-muted">Nothing settled yet.</p>}
      </div>
      <p className="mt-4 text-[12px] text-muted">Net from tickets: payouts minus the $5 ticket, including creator fees. Buy-fee earnings are paid by Binance&rsquo;s swap directly to creators and aren&rsquo;t counted here.</p>
    </div>
  );
}
