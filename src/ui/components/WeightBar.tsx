// Sleeve's split bar, one segment per stock. Segments step through the brand
// ink and mint by position (src/ui/data/palette.ts); the legend names them.

import type { Holding } from "./EtfHand";
import { segmentColor } from "../data/palette";

export function WeightBar({ holdings, legend = true, height = 8 }: { holdings: Holding[]; legend?: boolean; height?: number }) {
  return (
    <div className="w-full">
      <div className="flex w-full gap-[3px]" style={{ height }} role="img" aria-label={holdings.map((h) => `${h.stock.ticker} ${h.weightPct}%`).join(", ")}>
        {holdings.map((h, i) => (
          <div key={h.stock.ticker} className="rounded-full" style={{ flex: `${h.weightPct} 0 0`, background: segmentColor(i) }} />
        ))}
      </div>
      {legend && (
        <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
          {holdings.map((h, i) => (
            <span key={h.stock.ticker} className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: segmentColor(i) }} />
              <span className="font-medium">{h.stock.ticker}</span>
              <span className="t-num text-muted">{h.weightPct}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
