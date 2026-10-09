"use client";

// Data hooks for pages: config, stocks, the live round (polled), my entries,
// and running a plan's transactions from the connected wallet.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useConnection, usePublicClient, useSendTransaction, useSwitchChain, useWalletClient } from "wagmi";
import { getCapabilities, sendCalls, waitForCallsStatus } from "viem/actions";
import type { WalletClient } from "viem";
import { fetchConfig, fetchHistory, fetchMe, fetchPlan, fetchRound, fetchStocks, type PlanResponse, type TxStep } from "./api";
import type { StockInfo } from "../ui/data/stocks";
import { BSTOCKS } from "../ui/data/stocks";

export const useConfig = () => useQuery({ queryKey: ["config"], queryFn: fetchConfig, staleTime: 60_000 });
export const useStocks = () => useQuery({ queryKey: ["stocks"], queryFn: fetchStocks, refetchInterval: 30_000 });
export const useRound = (id?: string) => useQuery({ queryKey: ["round", id ?? "current"], queryFn: () => fetchRound(id), refetchInterval: 20_000 });
export const useHistory = (id?: string) => useQuery({ queryKey: ["history", id ?? "current"], queryFn: () => fetchHistory(id), refetchInterval: 60_000 });
export function useMe() {
  const { address } = useConnection();
  return useQuery({ queryKey: ["me", address], queryFn: () => fetchMe(address!), enabled: !!address, refetchInterval: 30_000 });
}

/** Card data (colours, logo) for a ticker, with this chain's live price. */
export function useStockCards() {
  const { data } = useStocks();
  const byTicker = new Map<string, StockInfo & { live: number }>();
  for (const s of BSTOCKS) {
    const p = data?.stocks.find((x) => x.ticker === s.ticker);
    byTicker.set(s.ticker, { ...s, live: p?.price ?? s.price, address: (p?.address ?? s.address) as `0x${string}` });
  }
  return byTicker;
}

export type StepState = "waiting" | "signing" | "confirming" | "done" | "failed";

/**
 * Can this wallet run several calls as one atomic batch (EIP-5792, with
 * EIP-7702 smart accounts such as MetaMask's)? "supported" means the wallet
 * will offer to upgrade the account first; both run all-or-nothing.
 */
export async function canBatch(wallet: WalletClient | undefined, chainId: number): Promise<boolean> {
  if (!wallet?.account) return false;
  try {
    const caps = (await getCapabilities(wallet, { account: wallet.account, chainId })) as { atomic?: { status?: string } };
    return caps?.atomic?.status === "ready" || caps?.atomic?.status === "supported";
  } catch {
    return false;
  }
}

/**
 * Fetch a plan, then send it from the connected wallet: as one batch with a
 * single signature when the wallet supports atomic batching, else step by step.
 */
export function usePlanRunner() {
  const { address, chainId } = useConnection();
  const { data: cfg } = useConfig();
  const pub = usePublicClient({ chainId: cfg?.chainId as never });
  const { sendTransactionAsync } = useSendTransaction();
  const { data: walletClient } = useWalletClient({ chainId: cfg?.chainId as never });
  const { switchChainAsync } = useSwitchChain();
  const qc = useQueryClient();
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [states, setStates] = useState<StepState[]>([]);
  const [hashes, setHashes] = useState<(string | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batched, setBatched] = useState(false);

  const reset = useCallback(() => {
    setPlan(null);
    setStates([]);
    setHashes([]);
    setError(null);
  }, []);

  const run = useCallback(
    async (body: Record<string, unknown>, opts?: { onDone?: (p: PlanResponse) => void }) => {
      if (!address || !cfg) return setError("Connect a wallet first.");
      setBusy(true);
      setError(null);
      try {
        const p = await fetchPlan({ ...body, wallet: address });
        setPlan(p);
        setStates(p.steps.map(() => "waiting"));
        setHashes(p.steps.map(() => null));
        if (chainId !== cfg.chainId) await switchChainAsync({ chainId: cfg.chainId as never });
        const batch = p.steps.length > 1 && (await canBatch(walletClient, cfg.chainId));
        setBatched(batch);
        if (batch) {
          // One signature for every step; the wallet runs them all or none.
          setStates((x) => x.map(() => "signing"));
          const { id } = await sendCalls(walletClient!, {
            account: walletClient!.account!,
            chain: walletClient!.chain,
            forceAtomic: true,
            calls: p.steps.map((s) => ({ to: s.to, data: s.data, value: BigInt(s.value) })),
          });
          setStates((x) => x.map(() => "confirming"));
          const res = await waitForCallsStatus(walletClient!, { id, timeout: 180_000 });
          const hash = res.receipts?.at(-1)?.transactionHash ?? null;
          setHashes((x) => x.map(() => hash));
          if (res.status !== "success") throw new Error("The batch reverted, so nothing was spent.");
          setStates((x) => x.map(() => "done"));
          await qc.invalidateQueries();
          opts?.onDone?.(p);
          return;
        }
        for (const [i, s] of p.steps.entries()) {
          setStates((x) => x.map((v, k) => (k === i ? "signing" : v)));
          const hash = await sendTransactionAsync({ to: s.to, data: s.data, value: BigInt(s.value), chainId: cfg.chainId as never });
          setHashes((x) => x.map((v, k) => (k === i ? hash : v)));
          setStates((x) => x.map((v, k) => (k === i ? "confirming" : v)));
          const rc = await pub!.waitForTransactionReceipt({ hash });
          if (rc.status !== "success") throw new Error(`"${s.label}" reverted`);
          setStates((x) => x.map((v, k) => (k === i ? "done" : v)));
        }
        await qc.invalidateQueries();
        opts?.onDone?.(p);
      } catch (e) {
        const msg = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e);
        setError(msg);
        setStates((x) => x.map((v) => (v === "signing" || v === "confirming" ? "failed" : v)));
      } finally {
        setBusy(false);
      }
    },
    [address, cfg, chainId, pub, qc, sendTransactionAsync, switchChainAsync, walletClient],
  );

  return { run, reset, plan, states, hashes, error, busy, batched };
}

export type { TxStep };
