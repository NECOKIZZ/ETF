"use client";

import Link from "next/link";
import { useRound, useStocks } from "../hooks";
import { EtfHand } from "../../ui/components/EtfHand";
import { WeightBar } from "../../ui/components/WeightBar";
import { StockCard, fmtPrice } from "../../ui/components/StockCard";
import { Change, Pill } from "../../ui/components/Pills";
import { RoundPill } from "../../ui/components/RoundPill";
import { ActionPanel } from "./ActionPanel";
import { holdingsOf, teamName, usd } from "./league";
import { short } from "./ConnectButton";
import { Container } from "./Shell";

export function EtfPage({ teamKey, roundId }: { teamKey: string; roundId?: string }) {
  const { data: r, isLoading, error } = useRound(roundId);
  const { data: stocks } = useStocks();
  if (isLoading) return <Container className="py-16"><div className="h-96 animate-pulse rounded-[32px] bg-surface" /></Container>;
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
  const holdings = holdingsOf(t);
  const live = new Map(stocks?.stocks.map((s) => [s.ticker, s]) ?? []);
  const winners = r.teams.filter((x) => x.winningNow).length;

  return (
    <Container className="pt-10">
      <Link href="/league" className="text-[14px] text-muted hover:text-ink">
        ← The league
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="rounded-[32px] bg-surface p-6 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <RoundPill round={Number(r.id)} locksAt={r.entryClose * 1000} endsAt={r.end * 1000} />
              <Pill tone={t.winningNow ? "up" : "neutral"}>
                #{t.rank} of {r.teams.length} · {t.winningNow ? "above the cut" : "below the cut"}
              </Pill>
            </div>
            <div className="mt-6 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="t-heading text-[40px] md:text-[52px]">{teamName(t)}</h1>
                <p className="mt-2 text-[14px] text-muted">
                  by <span className="t-num text-ink">{short(t.captain)}</span> · {t.members + 1} {t.members ? "tickets" : "ticket"} on the team · buy fee {t.buyFeeBps / 100}%
                </p>
                <div className="mt-6 text-[13px] text-muted">Return so far</div>
                <Change pct={t.returnPct} className="text-[40px] font-medium" />
              </div>
              <EtfHand holdings={holdings} />
            </div>
          </div>

          <div className="mt-6 rounded-[32px] border border-line p-6 md:p-8">
            <div className="t-label text-muted">Composition</div>
            <div className="mt-5">
              <WeightBar holdings={holdings} />
            </div>
            <div className="mt-6 divide-y divide-line">
              {holdings.map((h) => {
                const l = live.get(h.stock.ticker);
                return (
                  <div key={h.stock.ticker} className="grid grid-cols-[34px_minmax(0,1fr)_auto_auto] items-center gap-4 py-3">
                    <StockCard stock={h.stock} size="tiny34" />
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold">{h.stock.ticker}</div>
                      <div className="truncate text-[12px] text-muted">{h.stock.name}</div>
                    </div>
                    <div className="t-num text-[14px] text-muted">{h.weightPct}%</div>
                    <div className="flex flex-col items-end">
                      <span className="t-num text-[14px]">{fmtPrice(l?.price ?? h.stock.price)}</span>
                      {l?.changePct != null && <Change pct={l.changePct} className="text-[12px]" />}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[12px] text-muted">
              Basket locked by the creator: ${usd(t.basketValue)} at round-start prices. Weights as declared. Prices: {r.priceSource}.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat k="Team tickets" v={`${t.members + 1}`} />
            <Stat k="Ticket now" v={t.winningNow ? `$${usd(t.payoutPerTicketNow)}` : "$0.00"} />
            <Stat k="Winners now" v={`${winners} of ${r.teams.length}`} />
          </div>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ActionPanel r={r} t={t} />
        </div>
      </div>
    </Container>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[24px] bg-surface p-5">
      <div className="text-[13px] text-muted">{k}</div>
      <div className="t-num mt-1 text-[24px]">{v}</div>
    </div>
  );
}
