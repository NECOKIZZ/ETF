import { afterEach, describe, expect, it } from "vitest";
import { canUseName, isReservedName, normaliseName } from "../src/league/champion";

const OFFICIAL = "0x00000000000000000000000000000000000c4a30";

describe("Champion's reserved name", () => {
  afterEach(() => delete process.env.NEXT_PUBLIC_CHAMPION_WALLET);

  it("catches look-alikes", () => {
    for (const n of ["Champion", "CHAMPION", "Ch4mp!0n", "c.h-a_m p i o n", "The Champions", "Chámpion", "League of Stocks", "Median Markets", "Official picks"]) expect(isReservedName(n), n).toBe(true);
    for (const n of ["AI Chips Max", "Chip Rush", "Champ", "Big Tech"]) expect(isReservedName(n), n).toBe(false);
    expect(normaliseName("C.h-4_m P!0n")).toBe("champion");
  });

  it("only the official wallet may use it", () => {
    expect(canUseName("Champion", OFFICIAL)).toBe(false); // no official wallet set yet
    process.env.NEXT_PUBLIC_CHAMPION_WALLET = OFFICIAL;
    expect(canUseName("Champion", OFFICIAL.toUpperCase().replace("0X", "0x"))).toBe(true);
    expect(canUseName("Champion", "0x1111111111111111111111111111111111111111")).toBe(false);
    expect(canUseName("Chip Rush", "0x1111111111111111111111111111111111111111")).toBe(true);
  });
});
