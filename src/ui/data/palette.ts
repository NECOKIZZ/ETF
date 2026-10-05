// Colours. Two groups, and nothing else in the UI code (test/palette.test.ts):
//
// 1. The four BRAND colours for the site itself. Every other site shade is a
//    mix of these (app/globals.css, --brand-*).
// 2. The STOCK CARD design (docs/design/stock-card): black cards with each
//    stock's own colour glowing through, so every stock gets a unique colour.

export const BRAND = {
  ink: "#0B0B0C", // text, dark panels
  paper: "#FFFFFF", // page
  mint: "#3DDC97", // gains, winners, highlights
  coral: "#FF5A36", // losses, the cut-off line
} as const;

/** Fixed colours from the stock card design handoff. */
export const CARD = {
  black: "#000000",
  text: "#111111",
  white: "#FFFFFF",
  hover: "#333333",
  up: "#0F8A3C", // on the white price bar
  down: "#C8102E",
  upOnDark: "#4ADE80", // in dark table rows
  downOnDark: "#FF6B7D",
  rowMuted: "#8FA59B",
  rowWeight: "#C9D6D0",
} as const;

export const BRAND_HEX: readonly string[] = Object.values(BRAND);

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

// ---- Stock card colours ----------------------------------------------------
// Each stock gets the closest UNUSED colour to its brand from a set of
// well-separated, saturated colours that glow well on black. The five stocks
// in the design handoff keep the exact colours from the design.

type Lab = [number, number, number];

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToOklab(hex: string): Lab {
  const n = parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => srgbToLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinearRgb([L, a, b]: Lab): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** OKLCH → hex, reducing chroma until the colour fits in sRGB. */
export function oklchToHex(L: number, C: number, hDeg: number): string {
  const h = (hDeg * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.005) {
    const rgb = oklabToLinearRgb([L, c * Math.cos(h), c * Math.sin(h)]);
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) {
      return (
        "#" +
        rgb
          .map((v) => Math.round(Math.min(1, Math.max(0, linearToSrgb(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase()
      );
    }
  }
  return "#808080";
}

export const deltaE = (x: Lab, y: Lab) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);

/** Minimum OKLab distance between any two card colours. */

/** Minimum OKLab distance between any two stock colours. */
export const MIN_SEPARATION = 0.05;

/** Saturated mid tones only: they have to glow on a black card under white type. */
export function cardPalette(): string[] {
  const candidates: string[] = [];
  for (const t of [
    { L: 0.6, C: 0.2 }, // vivid, like the design samples
    { L: 0.5, C: 0.19 }, // deep
    { L: 0.7, C: 0.17 }, // bright
    { L: 0.55, C: 0.12 }, // muted
  ]) {
    for (let i = 0; i < 36; i++) candidates.push(oklchToHex(t.L, t.C, i * 10));
  }
  const kept: { hex: string; lab: Lab }[] = [];
  for (const hex of candidates) {
    const lab = hexToOklab(hex);
    if (kept.every((k) => deltaE(k.lab, lab) >= MIN_SEPARATION)) kept.push({ hex, lab });
  }
  return kept.map((k) => k.hex);
}

/** Exact colours from the design handoff (C / L). */
export const DESIGN_COLORS: Record<string, { c: string; l: string }> = {
  TSLA: { c: "#D40A0A", l: "#FDE6E8" },
  META: { c: "#0A6BD4", l: "#E4EFFD" },
  NVDA: { c: "#4FAE12", l: "#EBF7E2" },
  MSFT: { c: "#6A3BF0", l: "#ECE6FD" },
  GOOGL: { c: "#E86A00", l: "#FDEEE2" },
};

/** The pale tint for the bottom of a card: the colour mixed ~10% into white. */
export function lightOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return (
    "#" +
    [(n >> 16) & 255, (n >> 8) & 255, n & 255]
      .map((v) => Math.round(255 - (255 - v) * 0.12).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/**
 * Give each stock the closest unused palette colour to its brand colour, in
 * list order (most recognisable first). Design stocks are fixed first, and
 * palette colours too close to them are taken out.
 */
export function assignCardColors(items: { key: string; brand: string }[]): Record<string, { c: string; l: string }> {
  const fixed = Object.values(DESIGN_COLORS).map((d) => hexToOklab(d.c));
  const pal = cardPalette()
    .map((hex) => ({ hex, lab: hexToOklab(hex), used: false }))
    .filter((p) => fixed.every((f) => deltaE(f, p.lab) >= MIN_SEPARATION));
  const out: Record<string, { c: string; l: string }> = {};
  for (const it of items) {
    if (DESIGN_COLORS[it.key]) {
      out[it.key] = DESIGN_COLORS[it.key];
      continue;
    }
    const want = hexToOklab(it.brand);
    let best = -1;
    let bestD = Infinity;
    pal.forEach((p, i) => {
      if (p.used) return;
      const d = deltaE(want, p.lab);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0) throw new Error("assignCardColors: palette too small");
    pal[best].used = true;
    out[it.key] = { c: pal[best].hex, l: lightOf(pal[best].hex) };
  }
  return out;
}
