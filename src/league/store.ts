// Keeper data: price samples and published settlement inputs. BigInts are
// saved as strings.
//   FileStore     JSON files under data/rounds/<id>/ (local runs, a VM)
//   SupabaseStore two tables in Supabase (serverless hosting such as Vercel,
//                 where there is no lasting disk); schema in supabase/schema.sql
// getStore() picks Supabase when SUPABASE_URL and a secret key are set.

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PriceSample } from "./snapshot";

/** start / end: the settlement windows. live: the keeper's samples while a round runs (charts only). */
export type Phase = "start" | "end" | "live";
export type SavedSample = { at: number; sample: Map<string, PriceSample> };
type SampleRow = Omit<PriceSample, "value"> & { value: string };

export interface LeagueStore {
  saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number): Promise<string>;
  /** Oldest first. */
  loadSamples(roundId: bigint, phase: Phase): Promise<SavedSample[]>;
  saveInputs(roundId: bigint, inputs: unknown): Promise<string>;
  loadInputs(roundId: bigint): Promise<unknown | null>;
}

const replacer = (_: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);
const toRows = (sample: Map<string, PriceSample>) => JSON.parse(JSON.stringify([...sample.values()], replacer)) as SampleRow[];
const fromRows = (rows: SampleRow[]) => new Map(rows.map((r) => [r.token, { ...r, value: BigInt(r.value) }]));

export class FileStore implements LeagueStore {
  constructor(private root = process.env.LEAGUE_DATA_DIR ?? "data") {}

  private dir(roundId: bigint, ...parts: string[]) {
    return join(this.root, "rounds", roundId.toString(), ...parts);
  }

  private made(roundId: bigint, ...parts: string[]) {
    const d = this.dir(roundId, ...parts);
    mkdirSync(d, { recursive: true });
    return d;
  }

  async saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number) {
    const file = join(this.made(roundId, phase), `${at}.json`);
    writeFileSync(file, JSON.stringify(toRows(sample)));
    return file;
  }

  async loadSamples(roundId: bigint, phase: Phase) {
    const d = this.dir(roundId, phase);
    if (!existsSync(d)) return [];
    return readdirSync(d)
      .filter((f) => f.endsWith(".json"))
      .map((f) => Number(f.replace(".json", "")))
      .sort((a, b) => a - b)
      .map((at) => ({ at, sample: fromRows(JSON.parse(readFileSync(join(d, `${at}.json`), "utf8"))) }));
  }

  async saveInputs(roundId: bigint, inputs: unknown) {
    const file = join(this.made(roundId), "inputs.json");
    writeFileSync(file, JSON.stringify(inputs, replacer, 2));
    return file;
  }

  async loadInputs(roundId: bigint) {
    const file = join(this.dir(roundId), "inputs.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  }
}

/**
 * Supabase (PostgREST) store. Rows are scoped by escrow address, so a
 * redeployed contract starts with a clean slate. Inputs are kept as text, not
 * jsonb, so the published file is byte-for-byte what the keeper hashed.
 */
export class SupabaseStore implements LeagueStore {
  private base: string;
  constructor(
    url: string,
    private key: string,
    private escrow: string,
    private fetchFn: typeof fetch = fetch,
  ) {
    this.base = `${url.replace(/\/$/, "")}/rest/v1`;
  }

  private async call(path: string, init: RequestInit = {}) {
    const headers: Record<string, string> = { apikey: this.key, "content-type": "application/json", ...(init.headers as Record<string, string>) };
    // Legacy service_role keys are JWTs and go in Authorization too; the newer sb_secret_ keys only in apikey.
    if (this.key.startsWith("eyJ")) headers.authorization = `Bearer ${this.key}`;
    const r = await this.fetchFn(`${this.base}/${path}`, { ...init, headers, cache: "no-store" });
    if (!r.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]}: ${r.status} ${await r.text()}`);
    return r;
  }

  private scope(roundId: bigint) {
    return `escrow=eq.${this.escrow}&round_id=eq.${roundId}`;
  }

  async saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number) {
    await this.call("league_samples?on_conflict=escrow,round_id,phase,at", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ escrow: this.escrow, round_id: roundId.toString(), phase, at, sample: toRows(sample) }),
    });
    return `supabase:league_samples/${roundId}/${phase}/${at}`;
  }

  async loadSamples(roundId: bigint, phase: Phase) {
    const r = await this.call(`league_samples?select=at,sample&${this.scope(roundId)}&phase=eq.${phase}&order=at.asc`);
    const rows = (await r.json()) as { at: number | string; sample: SampleRow[] }[];
    return rows.map((row) => ({ at: Number(row.at), sample: fromRows(row.sample) }));
  }

  async saveInputs(roundId: bigint, inputs: unknown) {
    await this.call("league_inputs?on_conflict=escrow,round_id", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ escrow: this.escrow, round_id: roundId.toString(), inputs: JSON.stringify(inputs, replacer, 2) }),
    });
    return `supabase:league_inputs/${roundId}`;
  }

  async loadInputs(roundId: bigint) {
    const r = await this.call(`league_inputs?select=inputs&${this.scope(roundId)}&limit=1`);
    const rows = (await r.json()) as { inputs: string }[];
    return rows.length ? JSON.parse(rows[0].inputs) : null;
  }
}

/** The store for this environment: Supabase when configured, else files under LEAGUE_DATA_DIR. */
export function getStore(): LeagueStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseStore(url, key, (process.env.ESCROW_ADDRESS ?? "").toLowerCase());
  if (process.env.VERCEL) throw new Error("set SUPABASE_URL and SUPABASE_SECRET_KEY: Vercel has no lasting disk for keeper data");
  return new FileStore();
}
