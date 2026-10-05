// Sleeve's split bar, one segment per stock in its card colour.

import type { Holding } from "./EtfHand";

export function WeightBar({ holdings, legend = true, height = 8 }: { holdings: Holding[]; legend?: boolean; height?: number }) {
  return (
    <div className="w-full">
      <div className="flex w-full gap-[3px]" style={{ height }} role="img" aria-label={holdings.map((h) => `${h.stock.ticker} ${h.weightPct}%`).join(", ")}>
        {holdings.map((h) => (
          <div key={h.stock.ticker} className="rounded-full" style={{ flex: `${h.weightPct} 0 0`, background: h.stock.color, outline: h.stock.ink === "dark" ? "1px solid rgb(0 0 0 / .08)" : undefined }} />
        ))}
      </div>
      {legend && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {holdings.map((h) => (
            <span key={h.stock.ticker} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: h.stock.color }} />
              <span className="font-medium">{h.stock.ticker}</span>
              <span className="t-num text-muted">{h.weightPct}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
