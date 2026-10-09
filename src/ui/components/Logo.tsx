// Median Markets mark. The image lives at public/brand/mark.svg (placeholder
// for now): replace that one file and the header, footer and browser tab all
// pick up the new logo.
export const BRAND = "Median Markets";
export const MARK_SRC = "/brand/mark.svg";

export function LogoMark({ size = 28 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={MARK_SRC} width={size} height={size} alt="" aria-hidden="true" className="shrink-0" />;
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-ink ${className}`}>
      <LogoMark />
      <span className="t-heading text-[19px]">{BRAND}</span>
    </span>
  );
}
