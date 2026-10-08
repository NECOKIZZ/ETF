"use client";

// Returns over a round, one line per series (ETFs, stocks, the median), on a
// single % axis. Days on the x axis for a week-long round (Mon … Fri), times
// for a short one. The part of the round still to come is shaded. Hover: a
// crosshair and one readout listing every series. Every line ends in a direct
// label, so identity never rests on colour alone.

import { useEffect, useMemo, useRef, useState } from "react";

/** Categorical slots (validated: adjacent CVD ΔE ≥ 8.4, normal ≥ 19.3, both modes). Fixed order, never cycled. */
export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];
const VARS = `
.viz-root{--series-1:#2a78d6;--series-2:#eb6834;--series-3:#1baf7a;--series-4:#eda100;--series-5:#e87ba4}
@media (prefers-color-scheme: dark){:root:where(:not([data-theme="light"])) .viz-root{--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--series-4:#c98500;--series-5:#d55181}}
:root[data-theme="dark"] .viz-root{--series-1:#3987e5;--series-2:#d95926;--series-3:#199e70;--series-4:#c98500;--series-5:#d55181}`;

export interface Series {
  key: string;
  label: string;
  color: string;
  points: { at: number; v: number }[];
  dashed?: boolean;
  /** Drawn thicker, on top. */
  strong?: boolean;
}

const PAD = { l: 8, r: 112, t: 14, b: 26 };
const PAD_R_NARROW = 64;
const DAY = 86_400_000;
const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(2)}%`;

function niceStep(span: number) {
  const raw = span / 4;
  return [0.05, 0.1, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 50].find((s) => s >= raw) ?? 100;
}

function xTicks(from: number, to: number): { at: number; label: string }[] {
  if (to - from >= 2 * DAY) {
    const out = [];
    for (let at = from; at < to - DAY / 4; at += DAY) out.push({ at, label: new Date(at).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }) });
    return out;
  }
  const n = 5;
  return Array.from({ length: n + 1 }, (_, i) => {
    const at = from + ((to - from) * i) / n;
    return { at, label: new Date(at).toISOString().slice(11, 16) };
  });
}

export function ReturnChart({ series, from, to, now, height = 300, empty }: { series: Series[]; from: number; to: number; now: number; height?: number; empty?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const times = useMemo(() => [...new Set(series.flatMap((s) => s.points.map((p) => p.at)))].sort((a, b) => a - b), [series]);
  const has = times.length > 0;
  const vals = series.flatMap((s) => s.points.map((p) => p.v));
  const lo0 = Math.min(0, ...vals);
  const hi0 = Math.max(0, ...vals);
  const step = niceStep(Math.max(hi0 - lo0, 0.2));
  const lo = Math.floor(lo0 / step) * step - (lo0 % step === 0 ? step / 2 : 0);
  const hi = Math.ceil(hi0 / step) * step + (hi0 % step === 0 ? step / 2 : 0);
  const padR = w >= 520 ? PAD.r : PAD_R_NARROW;
  const iw = Math.max(0, w - PAD.l - padR);
  const ih = height - PAD.t - PAD.b;
  const x = (at: number) => PAD.l + ((Math.min(Math.max(at, from), to) - from) / Math.max(1, to - from)) * iw;
  const y = (v: number) => PAD.t + ((hi - v) / (hi - lo)) * ih;
  const grid: number[] = [];
  for (let g = Math.ceil(lo / step) * step; g <= hi + 1e-9; g += step) grid.push(Math.round(g * 1000) / 1000);
  const nowX = x(now);

  // Direct end labels, nudged apart so they don't collide.
  const ends = series
    .filter((s) => s.points.length)
    .map((s) => ({ s, v: s.points[s.points.length - 1].v, y: y(s.points[s.points.length - 1].v), at: s.points[s.points.length - 1].at }))
    .sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 16) ends[i].y = ends[i - 1].y + 16;

  const hoverAt = hover !== null ? times[hover] : null;
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!has) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let best = 0;
    for (let i = 1; i < times.length; i++) if (Math.abs(x(times[i]) - px) < Math.abs(x(times[best]) - px)) best = i;
    setHover(best);
  };
  const valueAt = (s: Series, at: number) => s.points.find((p) => p.at === at)?.v;

  return (
    <div ref={box} className="viz-root relative w-full" style={{ height }}>
      <style>{VARS}</style>
      {w > 0 && (
        <svg width={w} height={height} className="block touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Returns: ${ends.map((e) => `${e.s.label} ${pct(e.v)}`).join(", ")}`}>
          {/* Still to come */}
          {now < to && <rect x={nowX} y={PAD.t} width={Math.max(0, x(to) - nowX)} height={ih} className="fill-surface" />}
          {grid.map((g) => (
            <g key={g}>
              <line x1={PAD.l} x2={PAD.l + iw} y1={y(g)} y2={y(g)} className={g === 0 ? "stroke-ink/25" : "stroke-line"} strokeWidth={1} />
              {(w >= 520 || g === 0) && (
                <text x={PAD.l + iw + 6} y={y(g) + 4} className="t-num fill-muted text-[11px]">
                  {g === 0 ? "0%" : pct(g).replace(".00", "")}
                </text>
              )}
            </g>
          ))}
          {xTicks(from, to).map((t) => (
            <text key={t.at} x={x(t.at)} y={height - 6} className="fill-muted text-[11px]" textAnchor={t.at === from ? "start" : "middle"}>
              {t.label}
            </text>
          ))}
          {now > from && now < to && <line x1={nowX} x2={nowX} y1={PAD.t} y2={PAD.t + ih} className="stroke-ink/30" strokeDasharray="3 4" />}
          {[...series]
            .sort((a, b) => Number(!!a.strong) - Number(!!b.strong))
            .map((s) => (
              <polyline
                key={s.key}
                fill="none"
                stroke={s.color}
                strokeWidth={s.strong ? 2.6 : 2}
                strokeDasharray={s.dashed ? "5 5" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.points.map((p) => `${x(p.at)},${y(p.v)}`).join(" ")}
              />
            ))}
          {ends.map((e) => (
            <g key={e.s.key}>
              <circle cx={x(e.at)} cy={y(e.v)} r={e.s.strong ? 4.5 : 3.5} fill={e.s.color} className="stroke-bg" strokeWidth={2} />
            </g>
          ))}
          {hoverAt !== null && (
            <g>
              <line x1={x(hoverAt)} x2={x(hoverAt)} y1={PAD.t} y2={PAD.t + ih} className="stroke-ink/40" />
              {series.map((s) => {
                const v = valueAt(s, hoverAt);
                return v === undefined ? null : <circle key={s.key} cx={x(hoverAt)} cy={y(v)} r={4} fill={s.color} className="stroke-bg" strokeWidth={2} />;
              })}
            </g>
          )}
        </svg>
      )}
      {/* End labels in HTML so text stays crisp and in text colours, keyed by a coloured stroke. */}
      {w > 0 &&
        ends.map((e) => (
          <div key={e.s.key} className="pointer-events-none absolute flex items-center gap-1.5 whitespace-nowrap text-[11px]" style={{ left: Math.min(x(e.at) + 8, w - 104), top: e.y - 8 }}>
            <span className="h-0.5 w-2.5 rounded-full" style={{ background: e.s.color }} />
            <span className="t-num text-ink">{pct(e.v)}</span>
            {w >= 520 && <span className="max-w-[56px] truncate text-muted">{e.s.label}</span>}
          </div>
        ))}
      {hoverAt !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[170px] rounded-[14px] border border-line bg-bg p-3 text-[12px] shadow-lift"
          style={{ left: Math.min(Math.max(x(hoverAt) + 12, 0), Math.max(0, w - 200)) }}
        >
          <div className="mb-1.5 text-muted">{new Date(hoverAt).toUTCString().slice(0, 22)} UTC</div>
          {series
            .map((s) => ({ s, v: valueAt(s, hoverAt) }))
            .filter((r) => r.v !== undefined)
            .sort((a, b) => b.v! - a.v!)
            .map(({ s, v }) => (
              <div key={s.key} className="flex items-center justify-between gap-3 py-0.5">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="truncate text-muted">{s.label}</span>
                </span>
                <span className="t-num font-medium text-ink">{pct(v!)}</span>
              </div>
            ))}
        </div>
      )}
      {!has && <div className="absolute inset-0 grid place-items-center text-[14px] text-muted">{empty ?? "The chart starts when entries close."}</div>}
    </div>
  );
}
