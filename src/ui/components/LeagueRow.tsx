// One ETF in the league table, in the landing page's round style: rank,
// logos (3 + "+N"), name, return, and whether it's winning right now.

import Link from "next/link";
import type { Holding } from "./EtfHand";
import { LogoStack } from "./LogoStack";

export interface LeagueEntry {
  rank: number;
  name: string;
  creator: string;
  holdings: Holding[];
  /** null: the round hasn't started, so there is no score yet (not 0%). */
  returnPct: number | null;
  team: number;
  /** Profit per $5 ticket if the round ended now (null: this ETF is losing now). */
  ifWins: number | null;
  href?: string;
  /** Entered by Champion, the league's own agent. */
  official?: boolean;
}

const pct = (x: number) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(2)}%`;

export function LeagueRow({ e, winning }: { e: LeagueEntry; winning: boolean }) {
  const Row = e.href ? Link : "div";
  return (
    <Row href={e.href ?? ""} className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 transition hover:bg-surface md:gap-4">
      <span className="t-num w-5 text-[13px] text-muted">{e.rank}</span>
      <span className="w-[92px] shrink-0 sm:w-[104px]">
        <LogoStack tickers={e.holdings.map((h) => h.stock.ticker)} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-[15px] font-medium">
          <span className="truncate">{e.name}</span>
          {e.official && <OfficialBadge />}
        </span>
        <span className="block truncate text-[12px] text-muted">by {e.creator}</span>
      </span>
      <span className="hidden text-[12px] text-muted sm:block">
        <span className="t-num text-ink">{e.team}</span> on team
      </span>
      <span className="shrink-0 text-right sm:w-24">
        <span className={`t-num block text-[15px] ${e.returnPct === null ? "text-muted" : e.returnPct >= 0 ? "text-up" : "text-down"}`}>{e.returnPct === null ? "—" : pct(e.returnPct)}</span>
        {e.returnPct === null ? (
          <span className="mt-0.5 inline-block rounded-full bg-surface px-2 text-[11px] font-medium text-muted">Not started</span>
        ) : winning ? (
          <span className="t-num mt-0.5 inline-block rounded-full bg-up-bg px-2 text-[11px] font-medium text-up">{e.ifWins !== null ? `+$${e.ifWins.toFixed(2)}` : "Winning"}</span>
        ) : (
          <span className="mt-0.5 inline-block rounded-full bg-surface px-2 text-[11px] font-medium text-muted">Behind</span>
        )}
      </span>
    </Row>
  );
}

/** `cutAfter`: rows above the winners' line (default: half; -1: no line). */
export function LeagueTable({ entries, cutAfter }: { entries: LeagueEntry[]; cutAfter?: number }) {
  const cut = cutAfter ?? Math.floor(entries.length / 2);
  return (
    <div className="flex flex-col">
      {entries.map((e, i) => (
        <div key={e.rank}>
          <LeagueRow e={e} winning={i < cut} />
          {i === cut - 1 && i < entries.length - 1 && (
            <div className="my-1.5 flex items-center gap-2 px-3">
              <span className="h-px flex-1 border-t border-dashed border-line" />
              <span className="t-label text-[10px] text-muted">top half wins</span>
              <span className="h-px flex-1 border-t border-dashed border-line" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Marks the league's own agent, Champion. */
export function OfficialBadge({ big }: { big?: boolean }) {
  return (
    <span
      title="Official agent of Median Markets"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-mint font-medium text-brand-ink ${big ? "h-7 px-3 text-[13px]" : "h-5 px-2 text-[11px]"}`}
    >
      ✓ Official
    </span>
  );
}
