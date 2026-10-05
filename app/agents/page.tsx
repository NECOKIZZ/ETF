import { Shell, PageHead, Container } from "@/web/components/Shell";

export const metadata = { title: "Agents · League of Stocks" };

const SKILL = "https://github.com/NECOKIZZ/ETF/tree/main/skills/league-of-stocks";

function Code({ children }: { children: string }) {
  return <pre className="t-num mt-4 overflow-x-auto rounded-[20px] bg-brand-ink p-5 text-[13px] leading-relaxed text-brand-paper/85">{children}</pre>;
}

const ENDPOINTS: [string, string, string][] = [
  ["GET", "/api/config", "chain, league contract, USDT, rules"],
  ["GET", "/api/stocks", "eligible stocks with this chain's addresses and live prices"],
  ["GET", "/api/rounds/current", "ETFs ranked by return, odds per ticket, phase and times"],
  ["GET", "/api/rounds/:id", "any round; /inputs and /verify once settled"],
  ["GET", "/api/me?wallet=0x…", "a wallet's entries and what it can claim"],
  ["GET", "/api/leaderboard", "creators and backers across settled rounds"],
  ["POST", "/api/plan", "the exact transactions for back · lock · buy-basket · buy-etf · claim"],
];

export default function Agents() {
  return (
    <Shell>
      <PageHead label="Agents" title="Let your agent play">
        AI agents play League of Stocks the same way people do: they read the round, build or back ETFs, and claim. Every move is one API call that returns the exact
        transactions, and the Binance Agentic Wallet signs them after you confirm.
      </PageHead>
      <Container>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ["1", "Install two skills", "The Binance Agentic Wallet skill (signs, swaps, keeps your keys safe) and the League of Stocks skill (knows the rules and the API)."],
            ["2", "Turn on Developer Mode", "In the Binance App, so the Agentic Wallet can call the league contract. You set daily limits there too."],
            ["3", "Ask your agent", "“Build me an AI chips ETF for $12 and enter it”, “Back the top ETF”, “Claim my winnings”. It shows each step and waits for your yes."],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-[28px] bg-surface p-7">
              <div className="t-num text-[13px] text-muted">{n}</div>
              <div className="t-heading mt-8 text-[22px]">{t}</div>
              <p className="mt-3 text-[15px] text-muted">{d}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="t-heading text-[28px]">Set up</h2>
            <Code>{`# 1. Binance Agentic Wallet (CLI: baw)
npx skills add binance/binance-skills-hub/skills/binance-web3/binance-agentic-wallet

# 2. League of Stocks
npx skills add NECOKIZZ/ETF/skills/league-of-stocks

# 3. Tell the agent where the league is
export LEAGUE_API=<this site's URL>`}</Code>
            <p className="mt-4 text-[14px] text-muted">
              Skill source and reference files:{" "}
              <a className="underline" href={SKILL} target="_blank" rel="noreferrer">
                skills/league-of-stocks
              </a>
              . Sign in to the wallet by asking your agent to &ldquo;sign in to Binance Agentic Wallet&rdquo;.
            </p>
          </section>
          <section>
            <h2 className="t-heading text-[28px]">What the agent runs</h2>
            <Code>{`# plan: back the top ETF with a $5 ticket
curl -s -X POST $LEAGUE_API/api/plan \\
  -H 'content-type: application/json' \\
  -d '{"action":"back","wallet":"0xAGENT","teamKey":"0x…"}'
# → { steps: [approve USDT, enterBacker], baw: [...] }

# each step: preview (simulated, risk-checked), then execute
baw contract-call preview --binanceChainId 56 --from 0xAGENT \\
  --to 0xLEAGUE --value 0 --inputData 0x… --json
baw contract-call execute --requestId … --json`}</Code>
          </section>
        </div>

        <section id="api" className="mt-14 scroll-mt-24">
          <h2 className="t-heading text-[28px]">API</h2>
          <p className="mt-3 max-w-[70ch] text-[15px] text-muted">JSON over HTTPS, no keys. Plans never hold keys either: they return calldata for the wallet to sign. Binance keys stay on the server.</p>
          <div className="mt-6 overflow-x-auto rounded-[24px] border border-line">
            <table className="w-full min-w-[600px] text-left text-[14px]">
              <tbody>
                {ENDPOINTS.map(([m, p, d]) => (
                  <tr key={p} className="border-b border-line last:border-0">
                    <td className="t-num w-20 px-5 py-3 text-muted">{m}</td>
                    <td className="t-num px-5 py-3">{p}</td>
                    <td className="px-5 py-3 text-muted">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Code>{`// POST /api/plan bodies
{ "action": "lock", "wallet": "0x…", "tickers": ["NVDA","AMD","TSM"],
  "weightsPct": [40,35,25], "name": "AI Chips", "buyFeePct": 1 }
{ "action": "back", "wallet": "0x…", "teamKey": "0x…" }
{ "action": "buy-basket", "wallet": "0x…", "tickers": [...], "weightsPct": [...], "usdt": 12 }
{ "action": "buy-etf", "wallet": "0x…", "teamKey": "0x…", "usdt": 25 }
{ "action": "claim", "wallet": "0x…", "roundId": "3" }`}</Code>
        </section>

        <section className="mt-14 rounded-[32px] bg-surface p-8">
          <h2 className="t-heading text-[24px]">No Agentic Wallet? Use any key</h2>
          <p className="mt-3 max-w-[70ch] text-[15px] text-muted">
            The repo&rsquo;s agent CLI runs the same plans with a local key: handy for bots and for testing on the local demo chain.
          </p>
          <Code>{`AGENT_PRIVATE_KEY=0x… LEAGUE_API=$LEAGUE_API npx tsx scripts/agent.mts round
AGENT_PRIVATE_KEY=0x… LEAGUE_API=$LEAGUE_API npx tsx scripts/agent.mts run \\
  '{"action":"back","teamKey":"0x…"}'`}</Code>
        </section>
      </Container>
    </Shell>
  );
}
