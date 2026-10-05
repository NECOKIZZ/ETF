import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND_HEX, CARD, DESIGN_COLORS, cardPalette, deltaE, hexToOklab, MIN_SEPARATION } from "../src/ui/data/palette";
import { BSTOCKS } from "../src/ui/data/stocks";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(p) ? [p] : [];
  });

describe("colours", () => {
  it("the site uses only the four brand colours (and the card design's fixed colours)", () => {
    const allowed = new Set([...BRAND_HEX, ...Object.values(CARD)].map((h) => h.toLowerCase()));
    // Colour definitions live in palette.ts; stocks.ts holds brand hints for picking card colours.
    const skip = new Set(["src/ui/data/palette.ts", "src/ui/data/stocks.ts"]);
    for (const f of [...files("app"), ...files("src/ui")].filter((f) => !skip.has(f))) {
      const hexes = readFileSync(f, "utf8").match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      for (const h of hexes) expect(allowed.has(h.toLowerCase()), `${f}: ${h}`).toBe(true);
    }
  });

  it("every stock has its own, well-separated card colour", () => {
    const cs = BSTOCKS.map((s) => s.color);
    expect(new Set(cs).size).toBe(cs.length);
    for (let i = 0; i < cs.length; i++)
      for (let j = i + 1; j < cs.length; j++)
        expect(deltaE(hexToOklab(cs[i]), hexToOklab(cs[j])), `${BSTOCKS[i].ticker}/${BSTOCKS[j].ticker}`).toBeGreaterThanOrEqual(MIN_SEPARATION);
  });

  it("the design's five stocks keep their exact colours", () => {
    for (const [t, d] of Object.entries(DESIGN_COLORS)) {
      const s = BSTOCKS.find((x) => x.ticker === t)!;
      expect(s.color).toBe(d.c);
      expect(s.colorLight).toBe(d.l);
    }
  });

  it("the palette is big enough", () => {
    expect(cardPalette().length).toBeGreaterThan(BSTOCKS.length);
  });
});

describe("logos", () => {
  it("every league stock has a saved logo", () => {
    for (const s of BSTOCKS) {
      expect(s.logo, s.ticker).toBe(`/logos/${s.ticker}.png`);
      expect(existsSync(`public${s.logo}`), s.ticker).toBe(true);
    }
  });
});
