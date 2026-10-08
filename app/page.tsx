import { Band } from "@/ui/components/Band";
import { Button } from "@/ui/components/Button";
import { Shell, Container } from "@/web/components/Shell";
import { HeroDeck, StockField } from "@/web/components/landing";
import { SimRound } from "@/web/components/SimRound";

function Section({ id, label, title, children, aside }: { id?: string; label: string; title: React.ReactNode; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <Container className="py-16 md:py-24">
      <div id={id} className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="t-label opacity-60">{label}</div>
          <h2 className="t-heading mt-3 text-[34px] md:text-[44px]">{title}</h2>
        </div>
        {aside}
      </div>
      <div className="mt-10">{children}</div>
    </Container>
  );
}

const STEPS = [
  ["01", "Pick 3 to 10 stocks", "Real tokenized stocks on BNB Chain: NVIDIA, Tesla, Microsoft, the S&P 500 and more. Add a slice of BNB, BTC or ETH if you like (up to 20%)."],
  ["02", "Lock it with a $5 ticket", "Your basket (at least $10) stays in the league contract for the round. You still own it: it comes back when the round ends."],
  ["03", "The top half wins", "ETFs are ranked by return. The top half wins the bottom half's tickets, and the closer you were to the best return, the bigger your share."],
] as const;

export default function Home() {
  return (
    <Shell landing>
      {/* Hero */}
      <div className="px-3 pt-3 md:px-6 md:pt-6">
        <div className="mint-gradient relative overflow-hidden rounded-[32px] md:rounded-[48px]">
          <div className="mx-auto grid max-w-[1280px] items-center gap-6 px-6 pb-10 pt-14 md:grid-cols-[1fr_1.15fr] md:gap-10 md:px-12 md:pb-14 md:pt-20">
            <div>
              <h1 className="t-display text-[48px] md:text-[60px] xl:text-[70px]">
                Build an ETF.
                <br />
                Beat the league.
              </h1>
              <p className="mt-6 max-w-[44ch] text-[17px] text-ink/75">
                Pick real tokenized stocks on BNB Chain, lock your basket, and win the bottom half&rsquo;s stakes every round.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-6">
                <Button size="lg" href="/league">
                  Open app
                </Button>
                <Button variant="text" size="lg" href="#how">
                  How it works →
                </Button>
              </div>
            </div>
            <div className="pt-6 md:pt-10">
              <HeroDeck />
            </div>
          </div>
        </div>
      </div>

      <Band tone="white" overlap={false}>
        <Section id="how" label="How it works" title="Three steps, one round">
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map(([n, t, d], i) => (
              <div key={n} className="rounded-[28px] bg-surface p-7 shadow-card md:p-8" style={{ transform: `translateY(${i * 14}px)` }}>
                <div className="t-num text-[13px] text-muted">{n}</div>
                <div className="t-heading mt-10 text-[24px]">{t}</div>
                <p className="mt-3 text-[15px] text-muted">{d}</p>
              </div>
            ))}
          </div>
        </Section>
      </Band>

      <Band tone="white" z={2}>
        <Container className="py-16 md:py-24">
          <div id="round" className="grid gap-3 md:grid-cols-2">
            <div className="flex flex-col rounded-[32px] bg-surface p-7 md:p-10">
              <div className="t-label opacity-60">A round, start to finish</div>
              <h2 className="t-heading mt-3 text-[34px] md:text-[44px]">
                Six ETFs, one hour.
                <br />
                The top half gets paid.
              </h2>
              <p className="mt-5 max-w-[46ch] text-[16px] text-muted">
                Entries close and the starting prices are locked. For the next hour every ETF moves with its stocks. When the round ends, the top half splits the
                bottom half&rsquo;s tickets: the closer to the best return, the bigger the share.
              </p>
              <dl className="mt-8 text-[15px]">
                {[
                  ["Entries close", "Start prices locked"],
                  ["The round runs", "Ranked by live return"],
                  ["The round ends", "Top half paid, baskets returned"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-t border-line py-3.5">
                    <dt>{k}</dt>
                    <dd className="text-right text-muted">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-auto flex flex-wrap items-center gap-6 pt-8">
                <Button href="/league">Open app</Button>
                <Button variant="text" href="/rules">
                  Read the rules →
                </Button>
              </div>
            </div>
            <div className="mint-gradient flex items-center rounded-[32px] px-4 py-10 md:px-10">
              <SimRound />
            </div>
          </div>
        </Container>
      </Band>

      <Band tone="mint" z={3}>
        <Section id="back" label="Back a creator" title="Two ways to back a creator">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] bg-bg p-8 shadow-card">
              <div className="t-label text-muted">Own the stocks</div>
              <div className="t-heading mt-4 text-[28px]">Buy the ETF</div>
              <p className="mt-3 text-[15px] text-muted">
                Buy the same basket in one go, routed by Binance. The stocks go to your wallet. The creator earns a small fee they set (0&ndash;2%), taken by the swap.
              </p>
            </div>
            <div className="rounded-[28px] bg-bg p-8 shadow-card">
              <div className="t-label text-muted">Play the round</div>
              <div className="t-heading mt-4 text-[28px]">Back the team</div>
              <p className="mt-3 text-[15px] text-muted">
                Put a $5 ticket on a creator&rsquo;s ETF. If it finishes in the top half, your ticket wins a share of the losing tickets. The creator keeps 10% of what their backers win.
              </p>
            </div>
          </div>
          <p className="mt-6 text-[14px] text-ink/70">Do one, both, or build your own. Everyone can be a creator.</p>
        </Section>
      </Band>

      <Band tone="white" z={4}>
        <Section
          id="stocks"
          label="On the field"
          title="Every stock is a card"
          aside={
            <Button variant="ghost" href="/create">
              Pick yours →
            </Button>
          }
        >
          <StockField />
          <p className="mt-8 max-w-[70ch] text-[13px] text-muted">
            bStocks are tokenized stocks on BNB Chain, priced from Binance&rsquo;s reference price. Baskets can also hold a crypto slice of BNB, BTC and ETH (up to 20%, Binance spot
            price). Leveraged funds are not allowed in the league.
          </p>
        </Section>
      </Band>

      <Band tone="black" z={5}>
        <Section
          id="agents"
          label="Agents"
          title="Let your agent play"
          aside={
            <Button variant="mint" href="/agents">
              Agent guide →
            </Button>
          }
        >
          <div className="grid gap-8 md:grid-cols-[1fr_1.2fr]">
            <p className="max-w-[46ch] text-[16px] text-white/70">
              Bring your own AI agent. Paste one message and it guides you through setup, reads the round, builds or backs ETFs, and asks you before every transaction. Your
              keys stay in your Binance Agentic Wallet.
            </p>
            <div className="rounded-[24px] bg-white/[.06] p-6">
              <ol className="space-y-4 text-[15px] text-white/80">
                <li><span className="t-num mr-3 text-white/45">1</span>Copy one message from the Agents page.</li>
                <li><span className="t-num mr-3 text-white/45">2</span>Paste it to your AI agent. It sets up the Binance Agentic Wallet with you.</li>
                <li><span className="t-num mr-3 text-white/45">3</span>Ask: &ldquo;Back the top ETF with $5.&rdquo; It shows each step and waits for your yes.</li>
              </ol>
            </div>
          </div>
        </Section>
      </Band>
    </Shell>
  );
}
