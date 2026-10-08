// Keeper stores: FileStore on disk, SupabaseStore against an in-memory fake of
// Supabase's REST API (PostgREST). Both must round-trip samples (BigInt values)
// and keep published inputs exactly as hashed.
import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore, SupabaseStore, type LeagueStore } from "../src/league/store";
import type { PriceSample } from "../src/league/snapshot";

const sample = (at: number, v: bigint) =>
  new Map<string, PriceSample>([["0xaa", { token: "0xaa", value: v, decimals: 18, trading: true, at }]]);
const inputs = { roundId: 7n, stake: 5n * 10n ** 18n, prices: { start: [{ token: "0xaa", value: "123" }] }, z: 1, a: 2 };

/** Just enough PostgREST: upsert on POST, eq. filters + order on GET. */
function fakeSupabase() {
  const tables: Record<string, Record<string, unknown>[]> = { league_samples: [], league_inputs: [] };
  const seen: { method: string; url: string; headers: Record<string, string> }[] = [];
  const fetchFn = (async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const table = u.pathname.split("/").pop()!;
    const headers = init.headers as Record<string, string>;
    seen.push({ method: init.method ?? "GET", url, headers });
    if (init.method === "POST") {
      const row = JSON.parse(init.body as string);
      const keys = u.searchParams.get("on_conflict")!.split(",");
      const rows = tables[table].filter((r) => !keys.every((k) => String(r[k]) === String(row[k])));
      tables[table] = [...rows, row];
      return new Response(null, { status: 201 });
    }
    let rows = tables[table];
    for (const [k, v] of u.searchParams) if (v.startsWith("eq.")) rows = rows.filter((r) => String(r[k]) === v.slice(3));
    if (u.searchParams.get("order") === "at.asc") rows = [...rows].sort((a, b) => Number(a.at) - Number(b.at));
    const cols = u.searchParams.get("select")!.split(",");
    return Response.json(rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]]))));
  }) as typeof fetch;
  return { fetchFn, seen, tables };
}

async function roundTrip(store: LeagueStore) {
  await store.saveSample(7n, "start", sample(2000, 3n * 10n ** 20n), 2000);
  await store.saveSample(7n, "start", sample(1000, 10n ** 30n + 1n), 1000);
  await store.saveSample(7n, "end", sample(3000, 1n), 3000);
  const start = await store.loadSamples(7n, "start");
  expect(start.map((s) => s.at)).toEqual([1000, 2000]);
  expect(start[0].sample.get("0xaa")!.value).toBe(10n ** 30n + 1n);
  expect(await store.loadSamples(8n, "start")).toEqual([]);
  expect(await store.loadInputs(7n)).toBeNull();
  await store.saveInputs(7n, inputs);
  expect(await store.loadInputs(7n)).toEqual(JSON.parse(JSON.stringify(inputs, (_, v) => (typeof v === "bigint" ? v.toString() : v))));
}

describe("keeper stores", () => {
  it("FileStore round-trips", async () => {
    await roundTrip(new FileStore(mkdtempSync(join(tmpdir(), "league-store-"))));
  });

  it("SupabaseStore round-trips, scoped by escrow, inputs kept as text", async () => {
    const f = fakeSupabase();
    const store = new SupabaseStore("https://x.supabase.co/", "sb_secret_abc", "0xescrow", f.fetchFn);
    await roundTrip(store);
    // Another escrow (a redeploy) sees nothing.
    expect(await new SupabaseStore("https://x.supabase.co", "sb_secret_abc", "0xother", f.fetchFn).loadInputs(7n)).toBeNull();
    // Inputs stored as the exact JSON text (key order kept).
    expect(typeof f.tables.league_inputs[0].inputs).toBe("string");
    expect((f.tables.league_inputs[0].inputs as string).indexOf('"z"')).toBeLessThan((f.tables.league_inputs[0].inputs as string).indexOf('"a"'));
    // New-style secret keys go in apikey only; upserts merge duplicates.
    expect(f.seen[0].headers.apikey).toBe("sb_secret_abc");
    expect(f.seen[0].headers.authorization).toBeUndefined();
    expect(f.seen[0].headers.prefer).toContain("resolution=merge-duplicates");
    expect(f.seen[0].url.startsWith("https://x.supabase.co/rest/v1/league_samples")).toBe(true);
  });

  it("SupabaseStore sends legacy JWT keys as a bearer token too, and surfaces errors", async () => {
    const seen: Record<string, string>[] = [];
    const fail = (async (_u: string, init: RequestInit = {}) => {
      seen.push(init.headers as Record<string, string>);
      return new Response("permission denied", { status: 401 });
    }) as typeof fetch;
    const store = new SupabaseStore("https://x.supabase.co", "eyJhbGc.x.y", "0xescrow", fail);
    await expect(store.loadInputs(1n)).rejects.toThrow(/401 permission denied/);
    expect(seen[0].authorization).toBe("Bearer eyJhbGc.x.y");
  });
});
