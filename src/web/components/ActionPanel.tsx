"use client";

// Gloam-style action panel for an ETF: "Back the team" ($5 ticket) and
// "Buy the ETF" (Binance swaps, creator fee). Runs the plan from the wallet.

import { useState } from "react";
import { useConnection } from "wagmi";
import type { RoundView, TeamView } from "../api";
import { useConfig, usePlanRunner } from "../hooks";
import { ConnectButton } from "./ConnectButton";
import { TxSteps } from "./TxSteps";
import { teamName, usd } from "./league";

export function ActionPanel({ r, t, initialTab = "back" }: { r: RoundView; t: TeamView; initialTab?: "back" | "buy" }) {
  const [tab, setTab] = useState<"back" | "buy">(initialTab);
  const [amount, setAmount] = useState("25");
  const { isConnected } = useConnection();
  const { data: cfg } = useConfig();
  const runner = usePlanRunner();
  const open = r.phase === "entries-open";
  const fee = t.buyFeeBps / 100;
  const pay = BigInt(t.payoutPerTicketNow);
  const stake = BigInt(r.stake);

  const tabBtn = (k: "back" | "buy", label: string) => (
    <button
      type="button"
      onClick={() => {
        setTab(k);
        runner.reset();
      }}
      className={`h-9 flex-1 rounded-full text-[14px] font-medium transition ${tab === k ? "bg-bg shadow-card" : "text-muted hover:text-ink"}`}
    >
      {label}
    </button>
  );

  return (
    <div className="rounded-[32px] bg-surface p-5 md:p-6">
      <div className="flex gap-1 rounded-full bg-surface-2 p-1">
        {tabBtn("back", "Back the team")}
        {tabBtn("buy", "Buy the ETF")}
      </div>

      {tab === "back" ? (
        <div className="mt-5">
          <div className="rounded-[20px] bg-bg p-5">
            <div className="text-[13px] text-muted">You pay</div>
            <div className="t-num mt-1 text-[32px]">{usd(r.stake, 0)} USDT</div>
            <div className="mt-1 text-[13px] text-muted">one ticket on {teamName(t)}</div>
          </div>
          <dl className="mt-4 space-y-2 text-[14px]">
            <Row k="If the round ended now" v={t.winningNow && pay > stake ? `${usd(pay)} USDT back` : "ticket lost (below the cut)"} />
            <Row k="Creator's cut of your winnings" v="10%" />
            <Row k="Entries close" v={new Date(r.entryClose * 1000).toUTCString().slice(5, 22) + " UTC"} />
          </dl>
          <div className="mt-5">
            {!isConnected ? (
              <ConnectButton size="md" />
            ) : (
              <button
                type="button"
                disabled={!open || runner.busy}
                onClick={() => runner.run({ action: "back", teamKey: t.teamKey, roundId: r.id })}
                className="h-12 w-full rounded-full bg-ink text-[16px] font-medium text-bg transition hover:opacity-90 disabled:opacity-40"
              >
                {!open ? "Entries are closed" : runner.busy ? "Working…" : `Back ${teamName(t)} · $${usd(r.stake, 0)}`}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <label className="block rounded-[20px] bg-bg p-5">
            <span className="text-[13px] text-muted">You pay</span>
            <span className="mt-1 flex items-baseline gap-2">
              <input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                className="t-num w-full bg-transparent text-[32px] outline-none"
                aria-label="Amount in USDT"
              />
              <span className="t-num text-[18px] text-muted">USDT</span>
            </span>
            <span className="mt-1 block text-[13px] text-muted">→ the same basket, in your wallet</span>
          </label>
          <dl className="mt-4 space-y-2 text-[14px]">
            <Row k="Creator fee" v={`${fee}% to the creator`} />
            <Row k="Route" v="Binance Web3 aggregator" />
            <Row k="Slippage" v="auto" />
          </dl>
          <div className="mt-5">
            {!cfg?.buyEnabled ? (
              <p className="rounded-[16px] bg-bg p-4 text-[13px] text-muted">
                Buying runs through Binance&rsquo;s swap on BSC mainnet. It isn&rsquo;t available on {cfg?.chain === "local" ? "the local demo chain" : "this deployment yet"}.
              </p>
            ) : !isConnected ? (
              <ConnectButton size="md" />
            ) : (
              <button
                type="button"
                disabled={runner.busy || !(Number(amount) >= 1)}
                onClick={() => runner.run({ action: "buy-etf", teamKey: t.teamKey, usdt: Number(amount), roundId: r.id })}
                className="h-12 w-full rounded-full bg-ink text-[16px] font-medium text-bg transition hover:opacity-90 disabled:opacity-40"
              >
                {runner.busy ? "Working…" : `Buy ${teamName(t)}`}
              </button>
            )}
          </div>
        </div>
      )}
      <TxSteps plan={runner.plan} states={runner.states} hashes={runner.hashes} error={runner.error} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
