"use client";

// Connect: injected wallets (Binance Wallet, MetaMask…). Shows the address
// when connected, and a switch button when the wallet is on another chain.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { useConfig } from "../hooks";

export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function ConnectButton({ size = "sm" }: { size?: "sm" | "md" }) {
  const { address, chainId, isConnected } = useConnection();
  const connectors = useConnectors();
  const { connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: cfg } = useConfig();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const h = size === "sm" ? "h-9 px-4 text-[13px]" : "h-11 px-5 text-[15px]";
  const base = `inline-flex items-center gap-2 rounded-full font-medium transition ${h}`;

  if (!mounted) return <span className={`${base} bg-ink text-bg`}>Connect</span>;

  if (!isConnected || !address) {
    const hasInjected = typeof window !== "undefined" && "ethereum" in window;
    if (!hasInjected)
      return (
        <a className={`${base} bg-ink text-bg`} href="https://www.binance.com/en/web3wallet" target="_blank" rel="noreferrer">
          Get a wallet ↗
        </a>
      );
    return (
      <span className="relative inline-flex flex-col items-end">
        <button type="button" className={`${base} bg-ink text-bg hover:opacity-90 disabled:opacity-50`} disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
          {isPending ? "Connecting…" : "Connect"}
        </button>
        {error && <span className="absolute top-full mt-1 whitespace-nowrap text-[12px] text-down">{error.message.split("\n")[0]}</span>}
      </span>
    );
  }

  if (cfg && chainId !== cfg.chainId)
    return (
      <button type="button" className={`${base} bg-down-bg text-down`} onClick={() => switchChain({ chainId: cfg.chainId as never })}>
        Switch to {cfg.chain === "local" ? "local chain" : "BNB Chain"}
      </button>
    );

  return (
    <div ref={ref} className="relative">
      <button type="button" className={`${base} border border-line bg-bg text-ink hover:bg-surface`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="size-2 rounded-full bg-brand-mint" />
        <span className="t-num">{short(address)}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-[18px] border border-line bg-bg p-1.5 shadow-lift">
          <Link href="/me" className="block rounded-[12px] px-3 py-2 text-[14px] hover:bg-surface" onClick={() => setOpen(false)}>
            My entries
          </Link>
          <button type="button" className="block w-full rounded-[12px] px-3 py-2 text-left text-[14px] hover:bg-surface" onClick={() => navigator.clipboard?.writeText(address)}>
            Copy address
          </button>
          <button
            type="button"
            className="block w-full rounded-[12px] px-3 py-2 text-left text-[14px] text-down hover:bg-surface"
            onClick={() => {
              disconnect();
              setOpen(false);
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function ChainChip() {
  const { data: cfg } = useConfig();
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] text-muted lg:inline-flex">
      <span className={`size-2 rounded-full ${cfg?.chain === "local" ? "bg-brand-coral" : "bg-brand-mint"}`} /> {cfg?.chain === "local" ? "Local demo chain" : "BNB Chain"}
    </span>
  );
}
