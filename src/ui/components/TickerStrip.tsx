// Sleeve's live ticker strip: logo dot, ticker, price, change, sliding slowly.

import type { StockInfo } from "../data/stocks";
import { Change } from "./Pills";

export function TickerStrip({ stocks, changes, source }: { stocks: StockInfo[]; changes: Record<string, number>; source: string }) {
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center gap-7 pr-7" aria-hidden={key === "b"}>
      {stocks.map((s) => (
        <span key={s.ticker} className="inline-flex items-center gap-2 text-[13px]">
          {s.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.logo} alt="" className="size-[20px] rounded-full" />
          ) : (
            <span className="grid size-[18px] place-items-center rounded-[6px] text-[10px] font-semibold" style={{ background: s.color, color: "var(--brand-paper)" }}>
              {s.ticker[0]}
            </span>
          )}
          <span className="font-semibold">{s.ticker}</span>
          <span className="t-num">{s.price.toFixed(2)}</span>
          <Change pct={changes[s.ticker] ?? 0} className="text-[12px]" />
        </span>
      ))}
    </div>
  );
  return (
    <div className="flex items-center border-b border-line bg-bg">
      <div className="relative min-w-0 flex-1 overflow-hidden py-2.5 [mask-image:linear-gradient(90deg,transparent,#000_4%,#000_96%,transparent)]">
        <div className="flex w-max" style={{ animation: "ticker-scroll 60s linear infinite" }}>
          {row("a")}
          {row("b")}
        </div>
      </div>
      <span className="hidden shrink-0 px-6 text-[12px] text-muted md:block">{source}</span>
    </div>
  );
}
