import { describe, it, expect } from "vitest";
import { usdToE18, cryptoSamples } from "../src/bsc/cryptoPrices";
import { equalWeights } from "../src/web/weights";
import { BSTOCKS, CRYPTO_ADDRESSES } from "../src/ui/data/stocks";

describe("crypto prices", () => {
  it("parses decimal prices exactly", () => {
    expect(usdToE18("85308.12")).toBe(85308_120000000000000000n);
    expect(usdToE18("787")).toBe(787n * 10n ** 18n);
    expect(() => usdToE18("-1")).toThrow();
  });

  it("maps the spot pairs to the chain's tokens, falling back to the second host", async () => {
    const calls: string[] = [];
    const fake = (async (url: string) => {
      calls.push(url);
      if (url.startsWith("https://data-api")) return new Response("blocked", { status: 451 });
      return new Response(JSON.stringify([{ symbol: "BTCUSDT", price: "85000.5" }, { symbol: "BNBUSDT", price: "787.52" }]));
    }) as typeof fetch;
    const m = await cryptoSamples(1000, (t) => ({ BTC: "0xBBB", BNB: "0xAAA", ETH: "0xCCC" })[t], fake);
    expect(calls).toHaveLength(2);
    expect(m.get("0xbbb")?.value).toBe(usdToE18("85000.5"));
    expect(m.get("0xaaa")?.at).toBe(1000);
    expect(m.has("0xccc")).toBe(false); // missing pair → left out → reported missing by the snapshot
  });
});

describe("crypto assets", () => {
  it("BNB, BTC and ETH are listed as crypto with BSC token addresses", () => {
    const c = BSTOCKS.filter((s) => s.kind === "crypto").map((s) => [s.ticker, s.symbol]);
    expect(c).toEqual([["BNB", "WBNB"], ["BTC", "BTCB"], ["ETH", "ETH"]]);
    expect(CRYPTO_ADDRESSES).toContain("0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c");
  });
});

describe("equal weights", () => {
  const p = (t: string, crypto = false) => ({ ticker: t, crypto });
  it("splits evenly without crypto", () => {
    expect(equalWeights([p("A"), p("B"), p("C")], 20)).toEqual({ A: 34, B: 33, C: 33 });
  });
  it("keeps crypto under the cap and gives stocks the rest", () => {
    const w = equalWeights([p("A"), p("B"), p("C"), p("BTC", true), p("ETH", true)], 20);
    expect(w.BTC + w.ETH).toBeLessThanOrEqual(20);
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBe(100);
    expect(w).toEqual({ BTC: 10, ETH: 10, A: 27, B: 27, C: 26 });
  });
});
