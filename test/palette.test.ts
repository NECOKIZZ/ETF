import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BRAND_HEX } from "../src/ui/data/palette";
import { BSTOCKS } from "../src/ui/data/stocks";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|css)$/.test(p) ? [p] : [];
  });

describe("four brand colours only", () => {
  it("every stock card uses a brand colour", () => {
    for (const s of BSTOCKS) expect(BRAND_HEX, s.ticker).toContain(s.color);
  });

  it("no other hex colour appears in the UI code", () => {
    const allowed = new Set(BRAND_HEX.map((h) => h.toLowerCase()));
    for (const f of [...files("app"), ...files("src/ui")]) {
      const hexes = readFileSync(f, "utf8").match(/#[0-9a-fA-F]{6}\b/g) ?? [];
      for (const h of hexes) expect(allowed.has(h.toLowerCase()), `${f}: ${h}`).toBe(true);
    }
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
