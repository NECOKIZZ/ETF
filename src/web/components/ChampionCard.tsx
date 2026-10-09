// Champion: the league's own agent on BNB Agent Studio. Shows "arriving
// soon" until NEXT_PUBLIC_CHAMPION_URL points at its live agent.

import { CHAMPION_NAME, championUrl, championWallet } from "../../league/champion";

const SKILLS = ["Briefs every round in plain words", "Explains any ETF and its odds", "Enters its own ETF each round", "Never asks for your keys"];

export function ChampionCard() {
  const url = championUrl();
  const wallet = championWallet();
  return (
    <section className="mb-10 overflow-hidden rounded-[28px] bg-brand-mint text-brand-ink">
      <div className="grid gap-6 p-6 md:grid-cols-[auto_1fr_auto] md:items-center md:p-8">
        <div className="flex size-20 items-center justify-center rounded-[24px] bg-brand-ink text-[34px] font-semibold text-brand-mint" aria-hidden="true">
          C
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-heading text-[26px]">{CHAMPION_NAME}</span>
            <span className="inline-flex h-7 items-center rounded-full bg-brand-ink px-3 text-[13px] font-medium text-brand-mint">✓ Official</span>
          </div>
          <p className="mt-1 text-[15px] text-brand-ink/80">
            Median Markets&rsquo; own agent, {url ? "running on" : "launching on"} <b>BNB Agent Studio</b> with an on-chain identity (ERC-8004) paying its own way through x402. The name is reserved: only Champion can enter an ETF called Champion.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2 text-[13px]">
            {SKILLS.map((s) => (
              <li key={s} className="rounded-full bg-brand-ink/10 px-3 py-1">
                {s}
              </li>
            ))}
          </ul>
          {wallet && <p className="t-num mt-3 text-[12px] text-brand-ink/70">Wallet {wallet}</p>}
        </div>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center rounded-full bg-brand-ink px-6 text-[15px] font-medium text-brand-paper transition hover:opacity-90">
            Talk to Champion ↗
          </a>
        ) : (
          <span className="inline-flex h-12 items-center justify-center rounded-full border border-brand-ink/30 px-6 text-[15px] font-medium">Arriving soon</span>
        )}
      </div>
    </section>
  );
}
