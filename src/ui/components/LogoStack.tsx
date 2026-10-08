// Overlapping round stock logos, the first `max` shown and "+N" for the rest.

export function LogoStack({ tickers, max = 3, size = 28 }: { tickers: string[]; max?: number; size?: number }) {
  const shown = tickers.slice(0, max);
  const more = tickers.length - shown.length;
  return (
    <span className="flex shrink-0 items-center" aria-label={tickers.join(", ")}>
      {shown.map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t}
          src={`/logos/${t}.png`}
          alt=""
          className="rounded-full bg-surface object-cover ring-2 ring-bg"
          style={{ width: size, height: size, marginLeft: i ? -size / 4 : 0 }}
        />
      ))}
      {more > 0 && <span className="t-num ml-1.5 rounded-full bg-surface px-1.5 text-[11px] text-muted">+{more}</span>}
    </span>
  );
}
