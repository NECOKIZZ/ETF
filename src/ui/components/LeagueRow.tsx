// One ETF in the league table: rank, hand, name, return, team, odds, Back.

import Link from "next/link";
import { EtfChips, type Holding } from "./EtfHand";
import { Change } from "./Pills";

export interface LeagueEntry {
  rank: number;
  name: string;
  creator: string;
  holdings: Holding[];
  returnPct: number;
  team: number;
  /** Profit per $5 ticket if the round ended now (null: this ETF is losing now). */
  ifWins: number | null;
  href?: string;
}

export function LeagueRow({ e, winning }: { e: LeagueEntry; winning: boolean }) {
  const Row = e.href ? Link : "div";
  return (
    <Row href={e.href ?? ""} className={`grid transition hover:bg-surface grid-cols-[28px_auto_1fr_auto] items-center gap-4 rounded-[20px] px-4 py-3 md:grid-cols-[32px_auto_1fr_110px_90px_130px_auto] md:gap-6 ${winning ? "bg-up-bg/50" : ""}`}>
      <span className="t-num text-[15px] text-muted">{e.rank}</span>
      <EtfChips holdings={e.holdings} />
      <div className="min-w-0">
        <div className="truncate font-medium">{e.name}</div>
        <div className="truncate text-[13px] text-muted">by {e.creator}</div>
      </div>
      <Change pct={e.returnPct} className="text-[17px] font-medium md:justify-self-end" />
      <span className="hidden text-[13px] text-muted md:block">
        <span className="t-num text-ink">{e.team}</span> on team
      </span>
      <span className="hidden text-[13px] text-muted md:block">
        {e.ifWins !== null ? (
          <>
            ticket now <span className="t-num text-ink">+${e.ifWins.toFixed(2)}</span>
          </>
        ) : (
          "below the cut"
        )}
      </span>
      <span className="hidden h-9 rounded-full border border-line px-4 text-[13px] font-medium md:inline-flex md:items-center">Back</span>
    </Row>
  );
}

/** `cutAfter`: rows above the winners' line (default: half). */
export function LeagueTable({ entries, cutAfter }: { entries: LeagueEntry[]; cutAfter?: number }) {
  const cut = cutAfter ?? Math.floor(entries.length / 2);
  return (
    <div className="flex flex-col gap-1">
      {entries.map((e, i) => (
        <div key={e.rank}>
          <LeagueRow e={e} winning={i < cut} />
          {i === cut - 1 && (
            <div className="my-2 flex items-center gap-3 px-4 text-[12px] text-muted">
              <span className="h-px flex-1 border-t border-dashed border-line" />
              Top half wins the bottom half&rsquo;s tickets
              <span className="h-px flex-1 border-t border-dashed border-line" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
