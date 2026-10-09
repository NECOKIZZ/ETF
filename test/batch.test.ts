import { describe, expect, it } from "vitest";
import { createWalletClient, custom } from "viem";
import { bsc } from "viem/chains";
import { canBatch } from "../src/web/hooks";

const account = "0x1111111111111111111111111111111111111111" as const;
const wallet = (caps: unknown) =>
  createWalletClient({
    account,
    chain: bsc,
    transport: custom({
      request: async ({ method }: { method: string }) => {
        if (method !== "wallet_getCapabilities") throw new Error("unexpected");
        if (caps instanceof Error) throw caps;
        return caps;
      },
    }),
  });

describe("canBatch", () => {
  it("batches when the wallet can run atomic calls on BSC", async () => {
    expect(await canBatch(wallet({ "0x38": { atomic: { status: "ready" } } }), 56)).toBe(true);
    expect(await canBatch(wallet({ "0x38": { atomic: { status: "supported" } } }), 56)).toBe(true);
  });
  it("falls back to one by one otherwise", async () => {
    expect(await canBatch(wallet({ "0x38": { atomic: { status: "unsupported" } } }), 56)).toBe(false);
    expect(await canBatch(wallet({ "0x1": { atomic: { status: "ready" } } }), 56)).toBe(false);
    expect(await canBatch(wallet(new Error("Method not found")), 56)).toBe(false);
    expect(await canBatch(undefined, 56)).toBe(false);
  });
});
