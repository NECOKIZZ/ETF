import { Shell, PageHead, Container } from "@/web/components/Shell";
import { AgentPrompt } from "@/web/components/AgentPrompt";

export const metadata = { title: "Agents · League of Stocks" };

const ASKS = ["What's happening in this round?", "Back the top ETF with $5", "Build me an AI chips ETF for $12", "Did I win? Claim it for me"];

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
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <section>
            <div className="t-label text-muted">1 · Copy this</div>
            <div className="mt-3">
              <AgentPrompt />
            </div>
            <div className="mt-8 space-y-6">
              <div>
                <div className="t-label text-muted">2 · Paste it to your agent</div>
                <p className="mt-2 text-[16px] text-ink/80">It reads our guide and sets things up with you, one step at a time: the Binance Agentic Wallet, signing in with the Binance App, and a little USDT and BNB.</p>
              </div>
              <div>
                <div className="t-label text-muted">3 · Just ask</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ASKS.map((a) => (
                    <span key={a} className="rounded-full bg-surface px-4 py-2 text-[14px]">
                      &ldquo;{a}&rdquo;
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <aside className="rounded-[28px] bg-surface p-6 md:p-7">
            <div className="t-heading text-[20px]">Good to know</div>
            <ul className="mt-4 space-y-3 text-[15px] text-ink/80">
              <li>· Your agent shows you every transaction and waits for your yes. Nothing moves without it.</li>
              <li>· Your keys stay in the Binance Agentic Wallet. The agent and this site never see them.</li>
              <li>· You set a daily spending limit in the Binance App.</li>
              <li>· You&rsquo;ll need the Binance App, and USDT plus a little BNB on BNB Smart Chain.</li>
              <li>· We don&rsquo;t run agents or give tips: your agent reads the same public data you see here.</li>
            </ul>
          </aside>
        </div>

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
