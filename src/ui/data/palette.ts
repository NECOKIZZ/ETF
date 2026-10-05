// The four brand colours. Nothing else: every other shade on the site is one
// of these mixed with another (see app/globals.css). Change a colour here AND
// in globals.css (--brand-*) and the whole site follows.

export const BRAND = {
  ink: "#0B0B0C", // text, dark panels, dark cards
  paper: "#FFFFFF", // page, light cards
  mint: "#3DDC97", // gains, winners, highlights
  coral: "#FF5A36", // losses, the cut-off line
} as const;

export const BRAND_HEX: readonly string[] = Object.values(BRAND);

/** Stock cards rotate through three looks; the logo tells stocks apart. Coral is kept for losses. */
const CARD_LOOKS = [BRAND.ink, BRAND.mint, BRAND.paper] as const;

export function cardColor(index: number): string {
  return CARD_LOOKS[index % CARD_LOOKS.length];
}

/** Text on a card: paper on ink, ink on everything else. */
export function inkFor(bg: string): "light" | "dark" {
  return bg === BRAND.ink ? "light" : "dark";
}

/** Weight-bar segments: steps of the theme's ink and mint, by position in the basket. */
const SEGMENTS = [
  "var(--ink)",
  "var(--brand-mint)",
  "color-mix(in oklab, var(--ink) 45%, transparent)",
  "color-mix(in oklab, var(--brand-mint) 45%, transparent)",
  "color-mix(in oklab, var(--ink) 20%, transparent)",
  "color-mix(in oklab, var(--brand-mint) 20%, transparent)",
];

export function segmentColor(index: number): string {
  return SEGMENTS[index % SEGMENTS.length];
}
