"use client";

// The create flow, as four numbered panels on one page:
//   1 pick stocks · 2 set weights · 3 buy them (Binance, or the local faucet) · 4 name it and lock it.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { erc20Abi, formatUnits } from "viem";
import { useConnection, useReadContracts } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { BSTOCKS, isCrypto, type StockInfo } from "../../ui/data/stocks";
import { StockCard } from "../../ui/components/StockCard";
import { WeightBar } from "../../ui/components/WeightBar";
import { useConfig, usePlanRunner, useRound, useStocks } from "../hooks";
import { post } from "../api";
import { equalWeights } from "../weights";
import { ConnectButton } from "./ConnectButton";
import { TxSteps } from "./TxSteps";

type Filter = "all" | "stock" | "etf" | "crypto";

export function CreateFlow() {
  const { data: cfg } = useConfig();
  const { data: stocksData } = useStocks();
  const { data: round } = useRound();
  const { address, isConnected } = useConnection();
  const qc = useQueryClient();
  const buyRunner = usePlanRunner();
  const lockRunner = usePlanRunner();

  const [picked, setPicked] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [amount, setAmount] = useState("12");
  const [name, setName] = useState("");
  const [fee, setFee] = useState(1);
  const [faucet, setFaucet] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null });
  const [entered, setEntered] = useState<string | null>(null);

  const rules = cfg?.rules ?? { minTokens: 3, minStocks: 3, maxCryptoPct: 20, maxTokens: 10, maxWeightPct: 50, minBasketUsd: 10, ticketUsd: 5, maxBuyFeePct: 2, driftPct: 5 };
  const live = useMemo(() => new Map(stocksData?.stocks.map((s) => [s.ticker, s]) ?? []), [stocksData]);
  const available = BSTOCKS.filter((s) => !stocksData || live.has(s.ticker));
  const shown = available.filter(
    (s) => (filter === "all" || s.kind === filter) && (!q || `${s.ticker} ${s.name}`.toLowerCase().includes(q.toLowerCase())),
  );
  const stock = (t: string) => BSTOCKS.find((s) => s.ticker === t)!;

  // ?add=NVDA from the landing page's cards.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("add");
    if (t && BSTOCKS.some((s) => s.ticker === t)) setPicked([t]);
  }, []);
  // Equal weights whenever the selection changes, with crypto kept under its cap.
  useEffect(() => {
    setWeights(equalWeights(picked.map((t) => ({ ticker: t, crypto: isCrypto(stock(t)) })), rules.maxCryptoPct));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked]);

  const toggle = (t: string) => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : p.length >= rules.maxTokens ? p : [...p, t]));
  const total = picked.reduce((s, t) => s + (weights[t] ?? 0), 0);
  const stockCount = picked.filter((t) => !isCrypto(stock(t))).length;
  const cryptoCount = picked.length - stockCount;
  const cryptoPct = picked.reduce((s, t) => s + (isCrypto(stock(t)) ? (weights[t] ?? 0) : 0), 0);
  const enoughStocks = stockCount >= rules.minStocks;
  const weightsOk =
    enoughStocks && total === 100 && cryptoPct <= rules.maxCryptoPct && picked.every((t) => (weights[t] ?? 0) > 0 && weights[t] <= rules.maxWeightPct);
  const holdings = picked.map((t) => ({ stock: stock(t), weightPct: weights[t] ?? 0 }));

  // Wallet balances of the picked stocks (this chain's addresses).
  const tokenAddrs = picked.map((t) => live.get(t)?.address).filter(Boolean) as `0x${string}`[];
  const { data: bals, refetch: refetchBals } = useReadContracts({
    contracts: tokenAddrs.map((a) => ({ address: a, abi: erc20Abi, functionName: "balanceOf", args: [address!] }) as const),
    query: { enabled: !!address && tokenAddrs.length > 0, refetchInterval: 15_000 },
  });
  const held = picked.map((t, i) => {
    const raw = (bals?.[i]?.result as bigint | undefined) ?? 0n;
    const price = live.get(t)?.price ?? stock(t).price;
    return { t, raw, usd: Number(formatUnits(raw, 18)) * price };
  });
  const heldUsd = held.reduce((s, h) => s + h.usd, 0);
  const holdsAll = picked.length > 0 && held.every((h) => h.raw > 0n);
  const basketOk = holdsAll && heldUsd >= rules.minBasketUsd;
  const open = round?.phase === "entries-open";
  const nameOk = name.trim().length > 0 && new TextEncoder().encode(name.trim()).length <= 32;

  async function getTestStocks() {
    if (!address) return;
    setFaucet({ busy: true, msg: null });
    try {
      const usd = Number(amount);
      const stocks = Object.fromEntries(picked.map((t) => [t, (usd * (weights[t] ?? 0)) / 100]));
      await post("/api/faucet", { wallet: address, usdt: 10, stocks });
      await refetchBals();
      await qc.invalidateQueries();
      setFaucet({ busy: false, msg: `Sent test ${picked.join(", ")} worth $${usd.toFixed(2)}, 10 test USDT and gas.` });
    } catch (e) {
      setFaucet({ busy: false, msg: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* 1. Pick */}
        <Panel
          n="1"
          title="Pick your stocks"
          done={enoughStocks}
          hint={<PickCount stocks={stockCount} crypto={cryptoCount} cryptoOptions={BSTOCKS.filter(isCrypto).length} minStocks={rules.minStocks} max={rules.maxTokens} />}
        >
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search NVIDIA, TSLA…"
              aria-label="Search stocks"
              className="h-10 w-full rounded-full border border-line bg-bg px-4 text-[14px] outline-none focus:border-ink/40 sm:w-64"
            />
            <div className="flex gap-1 rounded-full bg-surface p-1 text-[13px]">
              {(["all", "stock", "etf", "crypto"] as Filter[]).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} className={`h-8 rounded-full px-3 ${filter === f ? "bg-bg font-medium shadow-card" : "text-muted"}`}>
                  {f === "all" ? "All" : f === "stock" ? "Stocks" : f === "etf" ? "Funds" : "Crypto"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex max-h-[560px] flex-wrap justify-center gap-3 overflow-y-auto p-1 sm:justify-start">
            {shown.map((s) => {
              const on = picked.includes(s.ticker);
              return (
                <button
                  key={s.ticker}
                  type="button"
                  onClick={() => toggle(s.ticker)}
                  aria-pressed={on}
                  className={`relative rounded-[18px] transition duration-200 ease-soft ${on ? "ring-[3px] ring-brand-mint ring-offset-2 ring-offset-bg" : "opacity-90 hover:-translate-y-1 hover:opacity-100"}`}
                >
                  <StockCard stock={s} size="medium" price={live.get(s.ticker)?.price} changePct={live.get(s.ticker)?.changePct ?? undefined} />
                  {on && <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-brand-mint text-[13px] font-bold text-brand-ink">✓</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-[12px] text-muted">
            At least {rules.minStocks} stocks or funds. Add BNB, BTC or ETH as a crypto slice of up to {rules.maxCryptoPct}% in total. Leveraged funds aren&rsquo;t allowed, so they aren&rsquo;t listed.
          </p>
        </Panel>

        {/* 2. Weights */}
        <Panel
          n="2"
          title="Set the weights"
          done={weightsOk}
          hint={`total ${total}% · max ${rules.maxWeightPct}% each${cryptoCount ? ` · crypto ${cryptoPct}% of ${rules.maxCryptoPct}%` : ""}`}
          disabled={!enoughStocks}
        >
          <div className="space-y-3">
            {picked.map((t) => (
              <div key={t} className="grid grid-cols-[34px_64px_1fr_72px] items-center gap-3">
                <StockCard stock={stock(t)} size="tiny34" />
                <span className="text-[14px] font-semibold">{t}</span>
                <input
                  type="range"
                  min={1}
                  max={isCrypto(stock(t)) ? rules.maxCryptoPct : rules.maxWeightPct}
                  value={weights[t] ?? 0}
                  onChange={(e) => setWeights((w) => ({ ...w, [t]: Number(e.target.value) }))}
                  className="accent-[var(--ink)]"
                  aria-label={`${t} weight`}
                />
                <span className="flex items-center gap-1">
                  <input
                    inputMode="numeric"
                    value={weights[t] ?? 0}
                    onChange={(e) => setWeights((w) => ({ ...w, [t]: Math.min(rules.maxWeightPct, Number(e.target.value.replace(/\D/g, "")) || 0) }))}
                    className="t-num h-9 w-12 rounded-[10px] border border-line bg-bg text-center text-[14px]"
                    aria-label={`${t} weight percent`}
                  />
                  <span className="text-muted">%</span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <WeightBar holdings={holdings} legend={false} />
          </div>
          <div className="mt-4 flex items-center justify-between text-[13px]">
            <span className={total === 100 && cryptoPct <= rules.maxCryptoPct ? "text-up" : "text-down"}>
              {total !== 100 ? `Adds up to ${total}%: needs 100%` : cryptoPct > rules.maxCryptoPct ? `Crypto is ${cryptoPct}%: the cap is ${rules.maxCryptoPct}%` : "Adds up to 100%"}
            </span>
            <button type="button" className="font-medium underline-offset-4 hover:underline" onClick={() => setPicked((p) => [...p])}>
              Equal weights
            </button>
          </div>
        </Panel>

        {/* 3. Buy */}
        <Panel n="3" title="Buy the stocks" done={basketOk || !!entered} hint={holdsAll ? `you hold $${heldUsd.toFixed(2)} of them` : `at least $${rules.minBasketUsd}`} disabled={!weightsOk}>
          <label className="block rounded-[20px] bg-surface p-5">
            <span className="text-[13px] text-muted">Spend</span>
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
            <span className="mt-1 block text-[13px] text-muted">
              Split by weight: {picked.map((t) => `${t} $${((Number(amount) * (weights[t] ?? 0)) / 100).toFixed(2)}`).join(" · ")}
            </span>
          </label>
          <p className="mt-3 text-[12px] text-muted">
            Tip: spend a little over ${rules.minBasketUsd} (e.g. $12). Swap fees and price moves can push an exact ${rules.minBasketUsd} basket under the minimum.
          </p>
          <div className="mt-4">
            {!isConnected ? (
              <ConnectButton size="md" />
            ) : cfg?.faucet ? (
              <button type="button" disabled={faucet.busy || !weightsOk || !(Number(amount) >= rules.minBasketUsd)} onClick={getTestStocks} className="h-12 w-full rounded-full bg-ink text-[16px] font-medium text-bg disabled:opacity-40">
                {faucet.busy ? "Sending…" : "Get test stocks (local demo chain)"}
              </button>
            ) : cfg?.buyEnabled ? (
              <button
                type="button"
                disabled={buyRunner.busy || !weightsOk || !(Number(amount) >= rules.minBasketUsd)}
                onClick={() => buyRunner.run({ action: "buy-basket", tickers: picked, weightsPct: picked.map((t) => weights[t]), usdt: Number(amount) }, { onDone: () => refetchBals() })}
                className="h-12 w-full rounded-full bg-ink text-[16px] font-medium text-bg disabled:opacity-40"
              >
                {buyRunner.busy ? "Working…" : `Buy for ${Number(amount).toFixed(2)} USDT via Binance`}
              </button>
            ) : (
              <p className="text-[13px] text-muted">Buying isn&rsquo;t available on this deployment yet. If you already hold the stocks, go to step 4.</p>
            )}
            {faucet.msg && <p className="mt-3 text-[13px] text-muted">{faucet.msg}</p>}
            <TxSteps plan={buyRunner.plan} states={buyRunner.states} hashes={buyRunner.hashes} error={buyRunner.error} />
          </div>
          {isConnected && picked.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {held.map((h) => (
                <div key={h.t} className="flex items-center justify-between rounded-[14px] bg-surface px-3 py-2 text-[13px]">
                  <span className="font-semibold">{h.t}</span>
                  <span className={`t-num ${h.raw > 0n ? "" : "text-muted"}`}>${h.usd.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* 4. Lock */}
        <Panel n="4" title="Name it and lock it" done={!!entered} hint={open ? "entries open" : "entries closed"} disabled={!basketOk && !entered && !lockRunner.busy}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] text-muted">ETF name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                placeholder="e.g. AI Chips Max"
                className="mt-1 h-11 w-full rounded-[14px] border border-line bg-bg px-4 text-[15px] outline-none focus:border-ink/40"
              />
            </label>
            <label className="block">
              <span className="text-[13px] text-muted">Buy fee for people who buy your ETF: {fee.toFixed(1)}%</span>
              <input type="range" min={0} max={rules.maxBuyFeePct} step={0.1} value={fee} onChange={(e) => setFee(Number(e.target.value))} className="mt-4 w-full accent-[var(--ink)]" />
            </label>
          </div>
          <ul className="mt-5 space-y-1.5 text-[13px] text-muted">
            <li>· Your whole balance of these {picked.length} assets (${heldUsd.toFixed(2)}) is locked until the round ends, then returned.</li>
            <li>· Plus a ${rules.ticketUsd} USDT ticket. Top half wins the bottom half&rsquo;s tickets.</li>
            <li>· Same stocks and weights as an existing ETF? You join that team instead.</li>
            <li>· If prices move your weights more than {rules.driftPct} points away before the round starts (or crypto above {rules.maxCryptoPct + rules.driftPct}%), the entry is refunded.</li>
            {picked.includes("BNB") && <li>· BNB is held as WBNB (wrapped BNB), the token form the league can lock.</li>}
          </ul>
          <div className="mt-5">
            {entered ? (
              <div className="rounded-[20px] bg-up-bg p-5 text-[15px] text-up">
                You&rsquo;re in. <Link className="font-medium underline" href={`/etf/${entered}`}>See your ETF →</Link>
              </div>
            ) : !isConnected ? (
              <ConnectButton size="md" />
            ) : (
              <button
                type="button"
                disabled={!open || !nameOk || !basketOk || lockRunner.busy}
                onClick={() =>
                  lockRunner.run(
                    { action: "lock", tickers: picked, weightsPct: picked.map((t) => weights[t]), name: name.trim(), buyFeePct: fee },
                    { onDone: (p) => setEntered(p.teamKey ?? null) },
                  )
                }
                className="h-12 w-full rounded-full bg-ink text-[16px] font-medium text-bg disabled:opacity-40"
              >
                {lockRunner.busy ? "Working…" : !open ? "Entries are closed" : `Lock and enter · $${heldUsd.toFixed(2)} + $${rules.ticketUsd} ticket`}
              </button>
            )}
            <TxSteps plan={lockRunner.plan} states={lockRunner.states} hashes={lockRunner.hashes} error={lockRunner.error} />
          </div>
        </Panel>
      </div>

      {/* Preview */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[32px] bg-brand-ink p-6 text-brand-paper">
          <div className="t-label text-white/50">Your ETF</div>
          <div className="t-heading mt-3 min-h-[34px] text-[28px]">{name.trim() || "Untitled"}</div>
          <div className="mt-6 flex min-h-[110px] flex-wrap items-end justify-center gap-2">
            {picked.length ? picked.map((t) => <StockCard key={t} stock={stock(t)} size="tiny64" weightPct={weights[t]} />) : <p className="self-center text-[14px] text-white/50">Pick stocks to see them here.</p>}
          </div>
          <dl className="mt-6 space-y-2 text-[14px]">
            <div className="flex justify-between"><dt className="text-white/55">Assets</dt><dd className="t-num">{stockCount}{cryptoCount ? ` + ${cryptoCount} crypto` : ""}</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Basket</dt><dd className="t-num">${(holdsAll ? heldUsd : Number(amount) || 0).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Ticket</dt><dd className="t-num">${rules.ticketUsd}</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Buy fee</dt><dd className="t-num">{fee.toFixed(1)}%</dd></div>
            <div className="flex justify-between"><dt className="text-white/55">Round</dt><dd className="t-num">{round ? `#${round.id} · ${round.teams.length} ETFs` : "…"}</dd></div>
          </dl>
        </div>
      </aside>
    </div>
  );
}

/** "2/3 stocks · 0/3 crypto": red until there are enough stocks, green after; flagged when the basket is full. */
function PickCount({ stocks, crypto, cryptoOptions, minStocks, max }: { stocks: number; crypto: number; cryptoOptions: number; minStocks: number; max: number }) {
  const enough = stocks >= minStocks;
  const full = stocks + crypto >= max;
  const pill = "t-num inline-flex h-7 items-center gap-1 rounded-full px-3 text-[13px] font-semibold";
  return (
    <span className="flex flex-wrap items-center justify-end gap-2" aria-live="polite">
      <span className={`${pill} ${enough ? "bg-up-bg text-up" : "bg-down-bg text-down"}`}>
        {enough ? <span aria-hidden="true">✓</span> : null}
        {stocks > minStocks ? `${stocks} stocks` : `${stocks}/${minStocks} stocks`}
      </span>
      <span className={`${pill} ${crypto ? "bg-up-bg text-up" : "bg-surface text-muted"}`}>
        {crypto}/{cryptoOptions} crypto
      </span>
      {full ? (
        <span className={`${pill} bg-down text-bg`}>{max}/{max} · basket full</span>
      ) : (
        <span className="text-[12px] text-muted">
          {minStocks} stocks min · {max} max
        </span>
      )}
    </span>
  );
}

function Panel({ n, title, hint, done, disabled, children }: { n: string; title: string; hint?: React.ReactNode; done?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-[32px] border border-line p-5 transition md:p-7 ${disabled ? "pointer-events-none opacity-45" : ""}`} aria-disabled={disabled}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className={`t-num grid size-8 place-items-center rounded-full text-[13px] ${done ? "bg-brand-mint text-brand-ink" : "bg-surface"}`}>{done ? "✓" : n}</span>
          <h2 className="t-heading text-[22px]">{title}</h2>
        </div>
        {hint && (typeof hint === "string" ? <span className="text-[13px] text-muted">{hint}</span> : hint)}
      </div>
      {children}
    </section>
  );
}

export type { StockInfo };
