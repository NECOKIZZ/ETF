// Save token logos into public/logos/<TICKER>.png from "TICKER<TAB>URL" lines
// (the output of `pnpm rwa:tokens bstock --logos`) read on stdin.
//   pnpm rwa:tokens bstock --logos | npx tsx scripts/save-logos.mts
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const input = await new Promise<string>((res) => {
  let d = "";
  process.stdin.on("data", (c) => (d += c));
  process.stdin.on("end", () => res(d));
});
mkdirSync("public/logos", { recursive: true });
const saved: string[] = [];
for (const line of input.split("\n")) {
  const [ticker, url] = line.trim().split(/\s+/);
  if (!ticker || !url?.startsWith("https://")) continue;
  const buf = execFileSync("curl", ["-sSf", url], { maxBuffer: 5e6 });
  writeFileSync(`public/logos/${ticker}.png`, buf);
  saved.push(ticker);
}
console.log(`saved ${saved.length} logos: ${saved.join(", ")}`);
