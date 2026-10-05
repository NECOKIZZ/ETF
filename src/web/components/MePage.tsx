"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnection } from "wagmi";
import { useMe, usePlanRunner, useStocks } from "../hooks";
import { ConnectButton } from "./ConnectButton";
import { TxSteps } from "./TxSteps";
import { usd } from "./league";
import { Pill } from "../../ui/components/Pills";
import { StockCard } from "../../ui/components/StockCard";
import { BSTOCKS } from "../../ui/data/stocks";
import type { MeEntry } from "../api";

export function MePage() {
  const { isConnected } = useConnection();
  const { data, isLoading, error } = useMe();
  if (!isConnected)
    return (
      <div className="rounded-[28px] bg-surface p-10 text-center">
        <p className="mb-5 text-muted">Connect your wallet to see your entries.</p>
        <ConnectButton size="md" />
      </div>
    );
  if (isLoading) return <div className="h-48 animate-pulse rounded-[28px] bg-surface" />;
  if (error) return <div className="rounded-[28px] bg-surface p-8 text-muted">Couldn&rsquo;t load your entries: {error.message}</div>;
  if (!data?.entries.length)
    return (
      <div className="rounded-[28px] bg-surface p-10 text-center">
        <p className="text-muted">No entries in recent rounds yet.</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link href="/create" className="inline-flex h-11 items-center rounded-full bg-ink px-5 font-medium text-bg">Build an ETF</Link>
          <Link href="/league" className="inline-flex h-11 items-center rounded-full border border-line px-5 font-medium">Back a team</Link>
        </div>
      </div>
    );
  const claimable = data.entries.filter((e) => e.claimable);
  return (
    <div className="space-y-4">
      {claimable.length > 0 && (
        <p className="text-[14px]">
          <span className="font-medium">{claimable.length} to claim.</span> <span className="text-muted">Claiming sends your payout (or refund) and returns locked stocks.</span>
        </p>
      )}
      {data.entries.map((e) => (
        <EntryCard key={e.roundId} e={e} />
      ))}
    </div>
  );
}

function EntryCard({ e }: { e: MeEntry }) {
  const runner = usePlanRunner();
  const { data: stocks } = useStocks();
  const [done, setDone] = useState(false);
  const payout = BigInt(e.payout);
  const stake = BigInt(e.stake);
  const settled = e.status === "Settled" || e.status === "Voided";
  const result = !settled ? null : e.status === "Voided" ? "refund" : payout > stake ? "won" : payout === stake ? "refund" : "lost";
  const tone = result === "won" ? "up" : result === "lost" ? "down" : "neutral";
  const ticker = (addr: string) => stocks?.stocks.find((s) => s.address.toLowerCase() === addr.toLowerCase())?.ticker;
  return (
    <div className="rounded-[28px] border border-line p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill>Round {e.roundId}</Pill>
            <Pill tone={tone as never}>{settled ? (result === "won" ? "Won" : result === "lost" ? "Lost" : "Refunded") : e.status === "Open" ? "In play" : e.status}</Pill>
            <Pill tone="ink">{e.role === "creator" ? "Creator" : "Backer"}</Pill>
          </div>
          <Link href={`/etf/${e.teamKey}?round=${e.roundId}`} className="t-heading mt-3 block text-[24px] hover:opacity-70">
            {e.teamName || `ETF ${e.teamKey.slice(2, 8)}`}
          </Link>
        </div>
        <div className="text-right">
          <div className="text-[13px] text-muted">{settled ? "Payout" : "Ticket"}</div>
          <div className="t-num text-[26px]">${usd(settled ? payout : stake)}</div>
        </div>
      </div>
      {e.basket.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[13px] text-muted">Locked:</span>
          {e.basket.map((b) => {
            const t = ticker(b.token);
            const s = BSTOCKS.find((x) => x.ticker === t);
            return s ? <StockCard key={b.token} stock={s} size="tiny34" /> : <span key={b.token} className="t-num text-[12px]">{b.token.slice(0, 8)}</span>;
          })}
        </div>
      )}
      {(e.claimable || (done && !e.claimed)) && (
        <div className="mt-5">
          {done ? (
            <p className="text-[14px] text-up">Claimed.</p>
          ) : (
            <button
              type="button"
              disabled={runner.busy}
              onClick={() => runner.run({ action: "claim", roundId: e.roundId }, { onDone: () => setDone(true) })}
              className="h-11 rounded-full bg-ink px-6 text-[15px] font-medium text-bg disabled:opacity-40"
            >
              {runner.busy ? "Working…" : payout > 0n ? `Claim $${usd(payout)}${e.basket.length ? " + your stocks" : ""}` : e.basket.length ? "Get your stocks back" : "Close entry"}
            </button>
          )}
          <TxSteps plan={runner.plan} states={runner.states} hashes={runner.hashes} error={runner.error} />
        </div>
      )}
      {e.claimed && <p className="mt-4 text-[13px] text-up">Claimed.</p>}
    </div>
  );
}
