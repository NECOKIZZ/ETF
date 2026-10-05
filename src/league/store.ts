// Small JSON file store for keeper data: price samples and published
// settlement inputs, under data/rounds/<id>/. BigInts are saved as strings.

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { PriceSample } from "./snapshot";

export type Phase = "start" | "end";

const replacer = (_: string, v: unknown) => (typeof v === "bigint" ? v.toString() : v);

export class FileStore {
  constructor(private root = process.env.LEAGUE_DATA_DIR ?? "data") {}

  private dir(roundId: bigint, ...parts: string[]) {
    const d = join(this.root, "rounds", roundId.toString(), ...parts);
    mkdirSync(d, { recursive: true });
    return d;
  }

  saveSample(roundId: bigint, phase: Phase, sample: Map<string, PriceSample>, at: number) {
    const file = join(this.dir(roundId, phase), `${at}.json`);
    writeFileSync(file, JSON.stringify([...sample.values()], replacer));
    return file;
  }

  loadSamples(roundId: bigint, phase: Phase): { at: number; sample: Map<string, PriceSample> }[] {
    const d = this.dir(roundId, phase);
    return readdirSync(d)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => {
        const rows = JSON.parse(readFileSync(join(d, f), "utf8")) as (Omit<PriceSample, "value"> & { value: string })[];
        return { at: Number(f.replace(".json", "")), sample: new Map(rows.map((r) => [r.token, { ...r, value: BigInt(r.value) }])) };
      });
  }

  saveInputs(roundId: bigint, inputs: unknown) {
    const file = join(this.dir(roundId), "inputs.json");
    writeFileSync(file, JSON.stringify(inputs, replacer, 2));
    return file;
  }

  loadInputs(roundId: bigint): unknown | null {
    const file = join(this.dir(roundId), "inputs.json");
    return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
  }
}
