import { Shell, PageHead, Container } from "@/web/components/Shell";
import { AgentPrompt } from "@/web/components/AgentPrompt";
import { AgentIdeas } from "@/web/components/AgentIdeas";
import { ChampionCard } from "@/web/components/ChampionCard";
import { championUrl } from "@/league/champion";

export const metadata = { title: "Agents · Median Markets" };

const POWERED = [
  { name: "Binance Agentic Wallet", note: "holds the keys, previews and risk-checks every transaction", href: "https://developers.binance.com/docs/agentic-wallet/welcome" },
  { name: "Binance Wallet Skills", note: "teach your agent the wallet commands (baw)", href: "https://github.com/binance/binance-skills-hub" },
  { name: "BNB Smart Chain", note: "where the league contract and your stocks live", href: "https://www.bnbchain.org" },
];

// Listed once Champion is live there.
const STUDIO = { name: "BNB Agent Studio", note: "runs Champion, our own agent, with its on-chain identity", href: "https://www.bnbchain.org/en/bnb-agent-studio" };

const FLOW: [string, string][] = [
  ["You ask", "in plain words, to any AI agent"],
  ["Agent plans", "our /api/plan returns the exact transactions"],
  ["Agentic Wallet checks", "simulates, risk-scans and shows you each one"],
  ["You approve", "in the Binance App, within your daily limit"],
  ["Done on BNB Chain", "settled on-chain, verifiable by anyone"],
];

const ENDPOINTS: [string, string, string][] = [
  ["GET", "/agent.md", "the guide agents follow (setup + play)"],
  ["GET", "/api/config", "chain, league contract, USDT, rules"],
  ["GET", "/api/stocks", "eligible assets with this chain's addresses and live prices"],
  ["GET", "/api/rounds/current", "ETFs ranked by return, odds per ticket, phase and times"],
  ["GET", "/api/me?wallet=0x…", "a wallet's entries and what it can claim"],
  ["POST", "/api/plan", "exact transactions for back · lock · buy-basket · buy-etf · claim"],
];

export default function Agents() {
  return (
    <Shell>
      <PageHead label="Agents" title="Let your AI agent play">
        Bring your own AI agent (Claude, ChatGPT, Copilot or any agent that can run commands). Paste one message and it walks you through the rest.
      </PageHead>
      <Container>
        <ChampionCard />

        <section aria-label="Powered by" className="mb-10 rounded-[28px] bg-brand-ink p-5 text-brand-paper md:p-6">
          <div className="t-label text-brand-paper/60">Powered by BNB agentic infrastructure</div>
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${championUrl() ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
            {[...POWERED, ...(championUrl() ? [STUDIO] : [])].map((p) => (
              <a key={p.name} href={p.href} target="_blank" rel="noreferrer" className="rounded-[18px] border border-brand-paper/10 p-4 transition hover:border-brand-mint">
                <div className="flex items-center gap-2 text-[16px] font-medium">
                  <span className="size-2 rounded-full bg-brand-mint" /> {p.name}
                </div>
                <div className="mt-1 text-[13px] text-brand-paper/65">{p.note}</div>
              </a>
            ))}
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <div className="t-label text-muted">1 · Copy this</div>
            <div className="mt-3">
              <AgentPrompt />
            </div>
            <div className="mt-8 space-y-6">
              <div>
                <div className="t-label text-muted">2 · Paste it to your agent</div>
                <p className="mt-2 text-[16px] text-ink/80">It reads our guide and sets things up with you, one step at a time: the Binance Agentic Wallet, signing in with the Binance App, and some USDT plus a little BNB for network fees.</p>
              </div>
              <div>
                <div className="t-label text-muted">3 · Just ask</div>
                <p className="mt-2 text-[16px] text-ink/80">Ask for anything below in your own words, or tap an idea to copy it with the setup message included.</p>
              </div>
            </div>
          </section>
          <aside className="rounded-[28px] bg-surface p-6 md:p-7">
            <div className="t-heading text-[20px]">Good to know</div>
            <ul className="mt-4 space-y-3 text-[15px] text-ink/80">
              <li>· Your agent shows you every transaction and waits for your yes. Nothing moves without it.</li>
              <li>· Your keys stay in the Binance Agentic Wallet. The agent and this site never see them.</li>
              <li>· You set a daily spending limit in the Binance App.</li>
              <li>· You&rsquo;ll need the Binance App, and USDT plus a little BNB for network fees, on BNB Smart Chain.</li>
              <li>· Champion aside, we don&rsquo;t run agents or give tips: your agent reads the same public data you see here.</li>
            </ul>
          </aside>
        </div>

        <section className="mt-14">
          <div className="t-label text-muted">Ideas · tap to copy</div>
          <h2 className="t-heading mt-2 text-[26px]">Things your agent can do for you</h2>
          <div className="mt-5">
            <AgentIdeas />
          </div>
        </section>

        <section className="mt-14">
          <div className="t-label text-muted">How it works</div>
          <h2 className="t-heading mt-2 text-[26px]">Your agent proposes. You approve. Nothing moves without you.</h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-5">
            {FLOW.map(([t, d], i) => (
              <li key={t} className="relative rounded-[22px] bg-surface p-5">
                <span className="t-num inline-flex size-7 items-center justify-center rounded-full bg-brand-mint text-[13px] font-medium text-brand-ink">{i + 1}</span>
                <div className="t-heading mt-3 text-[17px]">{t}</div>
                <div className="mt-1 text-[13px] text-muted">{d}</div>
              </li>
            ))}
          </ol>
        </section>

        <details className="group mt-16 rounded-[28px] border border-line p-6 md:p-8">
          <summary className="t-heading cursor-pointer list-none text-[20px]">
            For developers <span className="text-[14px] text-muted group-open:hidden">(API, skill, CLI) ↓</span>
          </summary>
          <div className="mt-6 space-y-6 text-[15px] text-ink/80">
            <p>
              Everything is public JSON, no keys. Plans return calldata; the user&rsquo;s wallet signs. The guide agents read is{" "}
              <a className="underline" href="/agent.md">/agent.md</a>; the installable skill is{" "}
              <a className="underline" href="https://github.com/NECOKIZZ/ETF/tree/main/skills/league-of-stocks" target="_blank" rel="noreferrer">
                skills/league-of-stocks
              </a>{" "}
              (<code className="t-num text-[13px]">npx skills add NECOKIZZ/ETF/skills/league-of-stocks</code>).
            </p>
            <div id="api" className="overflow-x-auto rounded-[20px] border border-line">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <tbody>
                  {ENDPOINTS.map(([m, p, d]) => (
                    <tr key={p} className="border-b border-line last:border-0">
                      <td className="t-num w-16 px-4 py-2.5 text-muted">{m}</td>
                      <td className="t-num px-4 py-2.5">{p}</td>
                      <td className="px-4 py-2.5 text-muted">{d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <pre className="t-num overflow-x-auto rounded-[20px] bg-brand-ink p-5 text-[13px] leading-relaxed text-brand-paper/85">{`# plan, then preview + execute each step with the Agentic Wallet
curl -s -X POST $SITE/api/plan -H 'content-type: application/json' \\
  -d '{"action":"back","wallet":"0x…","teamKey":"0x…"}'
baw contract-call preview --binanceChainId 56 --from 0x… --to 0x… --value 0 --inputData 0x… --json
baw contract-call execute --requestId … --json

# or with a local key (bots, testing)
AGENT_PRIVATE_KEY=0x… LEAGUE_API=$SITE npx tsx scripts/agent.mts run '{"action":"back","teamKey":"0x…"}'`}</pre>
          </div>
        </details>
      </Container>
    </Shell>
  );
}
