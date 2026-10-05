import { describe, it, expect } from "vitest";
import { cardPalette, hexToOklab, deltaE, oklchToHex, MIN_SEPARATION } from "../src/ui/data/palette";
import { BSTOCKS } from "../src/ui/data/stocks";

describe("card colours", () => {
  it("palette colours are valid and well separated", () => {
    const pal = cardPalette();
    expect(new Set(pal).size).toBe(pal.length);
    for (const h of pal) expect(h).toMatch(/^#[0-9A-F]{6}$/);
    let min = Infinity;
    for (let i = 0; i < pal.length; i++)
      for (let j = i + 1; j < pal.length; j++) min = Math.min(min, deltaE(hexToOklab(pal[i]), hexToOklab(pal[j])));
    expect(min).toBeGreaterThanOrEqual(MIN_SEPARATION);
    expect(pal.length).toBeGreaterThanOrEqual(BSTOCKS.length + 4);
  });

  it("every stock gets its own colour", () => {
    const colors = BSTOCKS.map((s) => s.color);
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("round-trips OKLCH for in-gamut colours", () => {
    const lab = hexToOklab(oklchToHex(0.6, 0.1, 150));
    expect(lab[0]).toBeCloseTo(0.6, 2);
  });
});

describe("logos", () => {
  it("every league stock has a saved logo", async () => {
    const { existsSync } = await import("node:fs");
    for (const s of BSTOCKS) {
      expect(s.logo, s.ticker).toBe(`/logos/${s.ticker}.png`);
      expect(existsSync(`public${s.logo}`), s.ticker).toBe(true);
    }
  });
});
