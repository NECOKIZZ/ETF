"use client";

import { useConfig } from "../hooks";

export function ContractInfo() {
  const { data: cfg } = useConfig();
  const link = (a: string | null | undefined) =>
    !a ? "not deployed yet" : cfg?.explorer ? <a className="underline" href={`${cfg.explorer}/address/${a}`} target="_blank" rel="noreferrer">{a}</a> : a;
  return (
    <div className="rounded-[28px] bg-surface p-6 text-[13px]">
      <div className="t-label text-muted">Contracts</div>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-muted">Chain</dt>
          <dd>{cfg ? (cfg.chain === "local" ? `Local demo chain (${cfg.chainId})` : `BNB Smart Chain (${cfg.chainId})`) : "…"}</dd>
        </div>
        <div>
          <dt className="text-muted">League contract</dt>
          <dd className="t-num break-all">{link(cfg?.escrow)}</dd>
        </div>
        <div>
          <dt className="text-muted">Ticket token (USDT)</dt>
          <dd className="t-num break-all">{link(cfg?.usdt)}</dd>
        </div>
      </dl>
      <a className="mt-5 inline-block font-medium underline-offset-4 hover:underline" href="https://github.com/NECOKIZZ/ETF/blob/main/contracts/src/LeagueEscrow.sol" target="_blank" rel="noreferrer">
        Read the source ↗
      </a>
    </div>
  );
}
