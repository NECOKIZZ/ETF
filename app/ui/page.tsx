// Component showcase: every signature piece from docs/UI.md §3 on one page.
// Data: the bStock snapshot in src/ui/data/stocks.ts; movements are demo values.

import { BSTOCKS, byTicker, demoChangePct, type StockInfo } from "@/ui/data/stocks";
import { AnnouncementBar, SiteHeader } from "@/ui/components/SiteHeader";
import { SiteFooter } from "@/ui/components/SiteFooter";
import { TickerStrip } from "@/ui/components/TickerStrip";
import { RoundPill } from "@/ui/components/RoundPill";
import { StockCard } from "@/ui/components/StockCard";
import { StockDeck } from "@/ui/components/StockDeck";
import { EtfHand, type Holding } from "@/ui/components/EtfHand";
import { WeightBar } from "@/ui/components/WeightBar";
import { LeagueTable, type LeagueEntry } from "@/ui/components/LeagueRow";
import { Band } from "@/ui/components/Band";
import { Button } from "@/ui/components/Button";
import { Pill, Change } from "@/ui/components/Pills";

export const metadata = { title: "UI kit · League of Stocks" };

const st = (t: string): StockInfo => byTicker(t)!;
const changes = Object.fromEntries(BSTOCKS.map((s) => [s.ticker, demoChangePct(s.ticker)]));
const hold = (...pairs: [string, number][]): Holding[] => pairs.map(([t, w]) => ({ stock: st(t), weightPct: w }));

const AI_CHIPS = hold(["NVDA", 40], ["AMD", 25], ["AVGO", 20], ["TSM", 15]);

const LEAGUE: LeagueEntry[] = [
  { rank: 1, name: "Silicon Crown", creator: "0x7a3…91c", holdings: AI_CHIPS, returnPct: 3.41, team: 14, ifWins: 2.86 },
  { rank: 2, name: "Space & Speed", creator: "orbit.bnb", holdings: hold(["SPCX", 40], ["RKLB", 30], ["TSLA", 30]), returnPct: 2.07, team: 9, ifWins: 1.94 },
  { rank: 3, name: "Crypto Rails", creator: "0x11d…e02", holdings: hold(["COIN", 35], ["HOOD", 35], ["CRCL", 30]), returnPct: 1.12, team: 21, ifWins: 0.88 },
  { rank: 4, name: "Index Plus", creator: "calm.bnb", holdings: hold(["SPY", 50], ["QQQ", 30], ["MSFT", 20]), returnPct: 0.36, team: 6, ifWins: 0.41 },
  { rank: 5, name: "Memory Lane", creator: "0x5be…a77", holdings: hold(["MU", 40], ["SNDK", 30], ["WDC", 30]), returnPct: -0.52, team: 4, ifWins: 0 },
  { rank: 6, name: "Big Tech Hold", creator: "0x903…3f1", holdings: hold(["META", 34], ["GOOGL", 33], ["MSFT", 33]), returnPct: -1.18, team: 11, ifWins: 0 },
  { rank: 7, name: "Global Chips", creator: "seoul.bnb", holdings: hold(["SKHY", 40], ["TSM", 30], ["EWY", 30]), returnPct: -1.9, team: 3, ifWins: 0 },
  { rank: 8, name: "Old Guard", creator: "0x2c4…b18", holdings: hold(["IBM", 40], ["ORCL", 30], ["INTC", 30]), returnPct: -2.66, team: 2, ifWins: 0 },
];

// A fixed demo round so server and client agree: entries lock Monday 13:30 UTC.
const LOCKS_AT = Date.UTC(2026, 9, 12, 13, 30);
const ENDS_AT = Date.UTC(2026, 9, 19, 13, 30);

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-16 md:px-6 md:py-24">
      <div className="t-label text-muted">{label}</div>
      <h2 className="t-heading mt-3 text-[34px] md:text-[44px]">{title}</h2>
      <div className="mt-10">{children}</div>
    </div>
  );
}

export default function UiKit() {
  const deck = ["TSLA", "META", "NVDA", "MSFT", "GOOGL"].map(st);
  return (
    <main>
      <AnnouncementBar>
        <span className="mr-2 inline-block size-1.5 rounded-full bg-up align-middle" /> <b className="text-white">UI kit.</b> Every League of Stocks component on one page.
      </AnnouncementBar>
      <SiteHeader />
      <TickerStrip stocks={BSTOCKS.slice(0, 18)} changes={changes} source="Binance reference · demo movements" />

      {/* Hero panel (Gloam) with the deck (Kickoff) */}
      <div className="px-3 pt-3 md:px-6 md:pt-6">
        <div className="mint-gradient relative overflow-hidden rounded-[32px] md:rounded-[48px]">
          <div className="mx-auto grid max-w-[1280px] items-end gap-10 px-6 pb-12 pt-20 md:grid-cols-[1fr_1.1fr] md:px-14 md:pb-16 md:pt-28">
            <div>
              <RoundPill round={12} locksAt={LOCKS_AT} endsAt={ENDS_AT} />
              <h1 className="t-display mt-6 text-[46px] md:text-[72px]">
                Build an ETF.
                <br />
                Beat the league.
              </h1>
              <p className="mt-6 max-w-[46ch] text-[17px] text-ink/75">
                Pick real tokenized stocks on BNB Chain, lock your basket, and win the bottom half&rsquo;s stakes every round.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Button size="lg">Build your ETF</Button>
                <Button variant="text" size="lg">
                  See this week&rsquo;s league →
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <StockDeck stocks={deck} changes={changes} spread={118} cardWidth={200} />
            </div>
            <div className="md:hidden">
              <StockDeck stocks={deck.slice(1, 4)} changes={changes} spread={150} cardWidth={150} />
            </div>
          </div>
        </div>
      </div>

      <Band tone="white" overlap={false}>
        <Section label="01 · Tokens" title="Colour, type and shape">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-5">
              <div className="t-display text-[56px]">Display · Geist Light</div>
              <div className="t-heading text-[36px]">Heading · Instrument Sans</div>
              <p className="max-w-[52ch] text-[15px] text-muted">Body · Instrument Sans 15px. Short, exact sentences. Real numbers and real times.</p>
              <div className="t-num text-[28px]">$235.28 · +3.41% · 04:13:22</div>
              <div className="t-label text-muted">Label · uppercase 11px</div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[12px]">
              {[
                ["ink #0B0B0C", "bg-brand-ink"],
                ["paper #FFFFFF", "bg-brand-paper border border-line"],
                ["mint #3DDC97", "bg-brand-mint"],
                ["coral #FF5A36", "bg-brand-coral"],
                ["surface (mix)", "bg-surface"],
                ["muted (mix)", "bg-muted"],
              ].map(([n, c]) => (
                <div key={n}>
                  <div className={`h-16 rounded-[14px] ${c}`} />
                  <div className="mt-1.5 text-muted">{n}</div>
                </div>
              ))}
              <div className="col-span-3">
                <div className="mint-gradient h-16 rounded-[14px]" />
                <div className="mt-1.5 text-muted">mint gradient</div>
              </div>
            </div>
          </div>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Button>Primary</Button>
            <Button variant="mint">Open app ↗</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="text">Text link →</Button>
            <Pill tone="up" dot>
              Market open
            </Pill>
            <Pill tone="down" dot>
              Locks in 42 min
            </Pill>
            <Pill dot>Running</Pill>
            <Change pct={3.41} className="text-[17px]" />
            <Change pct={-1.18} className="text-[17px]" />
          </div>
        </Section>
      </Band>

      <Band tone="surface" z={2}>
        <Section label="02 · Stock card" title="Every stock is a card">
          <div className="flex flex-wrap items-end gap-6">
            <StockCard stock={st("NVDA")} changePct={changes.NVDA} />
            <StockCard stock={st("TSLA")} changePct={changes.TSLA} width={180} />
            <StockCard stock={st("SPY")} changePct={changes.SPY} width={150} />
            <StockCard stock={st("HOOD")} width={110} compact />
            <StockCard stock={st("META")} width={64} compact weightPct={34} />
          </div>
        </Section>
      </Band>

      <Band tone="black" z={3}>
        <Section label="03 · The deck" title="Fanned like a hand of cards">
          <StockDeck stocks={["AMD", "AVGO", "NVDA", "TSM", "MU"].map(st)} changes={changes} />
          <p className="mt-16 text-center text-[15px] text-white/60">Hover a card to lift it. The deck fans out when it scrolls into view.</p>
        </Section>
      </Band>

      <Band tone="mint" z={4}>
        <Section label="04 · ETF hand + weight bar" title="An ETF is a hand of stock cards">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[32px] bg-bg p-8 shadow-card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="t-heading text-[26px]">Silicon Crown</div>
                  <div className="text-[13px] text-muted">by 0x7a3…91c · 14 on team</div>
                </div>
                <Change pct={3.41} className="text-[22px] font-medium" />
              </div>
              <div className="mt-6 flex justify-center">
                <EtfHand holdings={AI_CHIPS} cardWidth={92} />
              </div>
              <div className="mt-8">
                <WeightBar holdings={AI_CHIPS} />
              </div>
            </div>
            <div className="flex flex-col gap-4">
              {LEAGUE.slice(1, 4).map((e) => (
                <div key={e.name} className="flex items-center gap-5 rounded-[24px] bg-bg p-5 shadow-card">
                  <EtfHand holdings={e.holdings} cardWidth={48} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{e.name}</div>
                    <div className="mt-2">
                      <WeightBar holdings={e.holdings} legend={false} height={6} />
                    </div>
                  </div>
                  <Change pct={e.returnPct} className="text-[17px]" />
                </div>
              ))}
            </div>
          </div>
        </Section>
      </Band>

      <Band tone="white" z={5}>
        <Section label="05 · League table" title="This week&rsquo;s league">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <RoundPill round={12} locksAt={LOCKS_AT} endsAt={ENDS_AT} />
            <span className="text-[14px] text-muted">
              <span className="t-num text-ink">8</span> ETFs · <span className="t-num text-ink">70</span> tickets · pot <span className="t-num text-ink">$350</span>
            </span>
          </div>
          <div className="rounded-[32px] border border-line p-2 md:p-3">
            <LeagueTable entries={LEAGUE} />
          </div>
        </Section>
      </Band>

      <Band tone="surface" z={6}>
        <Section label="06 · Overlapping bands" title="Sections stack like rounded sheets">
          <p className="max-w-[60ch] text-muted">
            Every section on this page is a band whose rounded top slides over the one above, the way Kickoff&rsquo;s landing page does. Colours alternate white, grey, mint
            and black.
          </p>
        </Section>
      </Band>

      <div className="relative z-[7] -mt-14 bg-bg pt-6">
        <SiteFooter />
      </div>
    </main>
  );
}
