"use client";

import { useQuery } from "@tanstack/react-query";
import { useRound } from "../hooks";
import { LeagueBoard, RoundStats } from "./league";

interface Verify { inputsHash: string; recomputedHash: string; onchainHash: string | null; payoutsMatch: boolean; ok: boolean; error?: string }

export function RoundResults({ id }: { id: string }) {
  const { data: r } = useRound(id);
  const { data: v, isLoading } = useQuery({
    queryKey: ["verify", id],
    queryFn: async () => (await fetch(`/api/rounds/${id}/verify`)).json() as Promise<Verify>,
    enabled: r?.status === "Settled",
  });
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div>
        {r && (
          <div className="mb-5">
            <RoundStats r={r} />
          </div>
        )}
        <div className="rounded-[28px] border border-line p-2 md:p-3">
          <LeagueBoard roundId={id} />
        </div>
      </div>
      <aside id="verify" className="space-y-4">
        <div className="rounded-[28px] bg-brand-ink p-6 text-brand-paper">
          <div className="t-label text-white/50">Verify this settlement</div>
          {r?.status !== "Settled" ? (
            <p className="mt-4 text-[14px] text-white/70">{r?.status === "Voided" ? "This round was voided: every ticket is refunded." : "Not settled yet."}</p>
          ) : isLoading || !v ? (
            <p className="mt-4 text-[14px] text-white/70">Re-running the settlement…</p>
          ) : v.error ? (
            <p className="mt-4 text-[14px] text-white/70">{v.error}</p>
          ) : (
            <>
              <div className={`t-heading mt-4 text-[24px] ${v.ok ? "text-brand-mint" : "text-brand-coral"}`}>{v.ok ? "✓ Verified" : "✗ Does not verify"}</div>
              <dl className="mt-4 space-y-3 text-[12px]">
                <H k="Published inputs" v={v.inputsHash} />
                <H k="Recomputed" v={v.recomputedHash} />
                <H k="On-chain (rounds.inputsHash)" v={v.onchainHash ?? "—"} />
              </dl>
              <p className="mt-4 text-[13px] text-white/70">Payouts {v.payoutsMatch ? "match" : "do not match"} the published ones.</p>
            </>
          )}
          <div className="mt-5 space-y-2 text-[13px] text-white/70">
            <a className="block underline" href={`/api/rounds/${id}/inputs`}>Download the inputs (JSON)</a>
            <pre className="t-num overflow-x-auto rounded-[14px] bg-white/[.06] p-3 text-[11px] text-white/80">{`npx tsx scripts/verify.mts \\\n  <app>/api/rounds/${id}/inputs ${id}`}</pre>
          </div>
        </div>
        <div className="rounded-[24px] bg-surface p-6 text-[13px] text-muted">
          The keeper averages several Binance reference prices at the start and at the end, runs the open-source settlement, publishes every input, and writes their hash
          on-chain with the payouts. The contract checks the money adds up; anyone can check the maths.
        </div>
      </aside>
    </div>
  );
}

function H({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-white/50">{k}</dt>
      <dd className="t-num break-all text-white/90">{v}</dd>
    </div>
  );
}
