// Distinct card colours. Hand-picked brand colours collide (half of big tech
// is "blue"), so each stock gets the closest UNUSED colour from a fixed set of
// well-separated colours, in priority order. The logo carries the brand; the
// colour just has to be close to it and unique.
//
// Colour maths in OKLab / OKLCH (perceptually even), output as sRGB hex.

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
export const MIN_SEPARATION = 0.055;

/**
 * Card colours: candidates over 24 hues in five tones plus
 * neutrals, kept only if they are at least MIN_SEPARATION from every colour
 * already kept (gamut clipping makes some deep shades duller than planned).
 */
export function cardPalette(): string[] {
  const candidates: string[] = ["#0B0B0C", "#F2F2F0", "#3A3D44", "#B9BEC7"];
  for (const t of [
    { L: 0.63, C: 0.2 }, // vivid first: the most card-like
    { L: 0.42, C: 0.15 }, // deep
    { L: 0.86, C: 0.11 }, // light
    { L: 0.76, C: 0.15 }, // bright
    { L: 0.52, C: 0.18 }, // rich
  ]) {
    for (let i = 0; i < 24; i++) candidates.push(oklchToHex(t.L, t.C, 12 + i * 15));
  }
  const kept: { hex: string; lab: Lab }[] = [];
  for (const hex of candidates) {
    const lab = hexToOklab(hex);
    if (kept.every((k) => deltaE(k.lab, lab) >= MIN_SEPARATION)) kept.push({ hex, lab });
  }
  return kept.map((k) => k.hex);
}

/**
 * Give each item the closest unused palette colour to its brand colour.
 * Items earlier in the list choose first, so put the most recognisable first.
 */
export function assignColors(items: { key: string; brand: string }[], palette = cardPalette()): Record<string, string> {
  const pal = palette.map((hex) => ({ hex, lab: hexToOklab(hex), used: false }));
  const out: Record<string, string> = {};
  for (const it of items) {
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
    if (best < 0) throw new Error("assignColors: palette too small");
    pal[best].used = true;
    out[it.key] = pal[best].hex;
  }
  return out;
}

/** Dark or light text on a background, by OKLab lightness. */
export const inkFor = (bg: string): "light" | "dark" => (hexToOklab(bg)[0] > 0.72 ? "dark" : "light");
