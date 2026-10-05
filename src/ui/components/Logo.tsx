// League of Stocks mark: three stacked rounded cards, fanned like a hand.
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="4" y="7" width="15" height="21" rx="4.5" transform="rotate(-14 11.5 17.5)" fill="currentColor" opacity="0.28" />
      <rect x="8.5" y="5" width="15" height="21" rx="4.5" transform="rotate(-4 16 15.5)" fill="currentColor" opacity="0.55" />
      <rect x="13" y="4" width="15" height="21" rx="4.5" transform="rotate(8 20.5 14.5)" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <LogoMark />
      <span className="t-heading text-[19px]">League of Stocks</span>
    </span>
  );
}
