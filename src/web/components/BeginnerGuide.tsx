"use client";

// First visit inside the app: a short beginner's guide, five steps. Shown once
// per browser; `?guide` in the URL (the footer's "Beginner's guide") opens it again.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const KEY = "los-guide-seen";

const STEPS: { title: string; body: string; cta?: [string, string] }[] = [
  {
    title: "Welcome to League of Stocks",
    body: "A weekly game on BNB Chain. People build ETFs from real tokenized stocks, and every round the ETFs are ranked by how much they grew.",
  },
  {
    title: "Build an ETF",
    body: "Pick at least 3 stocks (up to 10, with an optional slice of BNB, BTC or ETH), set the weights, and lock at least $10 of them with a $5 ticket. The stocks stay yours: they come back when the round ends.",
    cta: ["Create an ETF", "/create"],
  },
  {
    title: "Or back a creator",
    body: "Like someone's ETF? Back the team with a $5 ticket and win with it, or buy the same stocks in one go (the creator earns a small fee). Do one, both, or neither.",
    cta: ["See the league", "/league"],
  },
  {
    title: "The top half wins",
    body: "When the round ends, the top half of ETFs split the bottom half's tickets. The closer to the best return, the bigger the share. Claim yours on My entries.",
  },
  {
    title: "What you need",
    body: "A wallet on BNB Chain (Binance Wallet, MetaMask, Trust…) with some USDT (BEP-20) and a little BNB for gas. That's it.",
    cta: ["Read the full rules", "/rules"],
  },
];

export function BeginnerGuide() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {}
    if (!seen || new URLSearchParams(window.location.search).has("guide")) setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, i]);

  function close() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
    setI(0);
  }

  if (!open) return null;
  const s = STEPS[i];
  const last = i === STEPS.length - 1;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-brand-ink/40 p-4 backdrop-blur-sm" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="w-full max-w-[460px] rounded-[28px] bg-bg p-7 shadow-lift md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="t-label text-muted">
            Beginner&rsquo;s guide · {i + 1}/{STEPS.length}
          </span>
          <button type="button" onClick={close} className="text-[13px] text-muted hover:text-ink">
            Skip
          </button>
        </div>
        <div className="mt-4 flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, k) => (
            <span key={k} className={`h-1 flex-1 rounded-full ${k <= i ? "bg-ink" : "bg-surface-2"}`} />
          ))}
        </div>
        <h2 id="guide-title" className="t-heading mt-7 text-[28px]">
          {s.title}
        </h2>
        <p className="mt-3 min-h-[96px] text-[15px] text-muted">{s.body}</p>
        {s.cta && (
          <Link href={s.cta[1]} onClick={close} className="mt-2 inline-block text-[14px] font-medium underline-offset-4 hover:underline">
            {s.cta[0]} →
          </Link>
        )}
        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={() => setI((k) => k - 1)} disabled={i === 0} className="h-11 rounded-full px-4 text-[15px] text-muted disabled:invisible">
            ← Back
          </button>
          <button ref={primary} type="button" onClick={() => (last ? close() : setI((k) => k + 1))} className="h-11 rounded-full bg-ink px-6 text-[15px] font-medium text-bg hover:opacity-90">
            {last ? "Start playing" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
