// Median Markets agent CLI: asks the League API for a plan and signs the
// steps with a local key. The same plans drive the Binance Agentic Wallet
// skill (skills/league-of-stocks/SKILL.md) through `baw contract-call`.
//
//   AGENT_PRIVATE_KEY=0x… LEAGUE_API=http://localhost:3000 \
//     npx tsx scripts/agent.mts <command> [json]
//
//   round                          current round: ETFs, returns, odds
//   stocks                         eligible stocks and prices
//   me                             this wallet's entries
//   faucet '{"usdt":20,"stocks":{"NVDA":5,"TSLA":4,"SPY":3}}'   (local chain only)
//   plan   '{"action":"back","teamKey":"0x…"}'                   print the steps
//   run    '{"action":"back","teamKey":"0x…"}'                   plan + sign + send
//          actions: back · lock · buy-basket · buy-etf · claim · claim-basket

import { createPublicClient, createWalletClient, defineChain, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const API = (process.env.LEAGUE_API ?? "http://localhost:3000").replace(/\/$/, "");
const [cmd, arg] = process.argv.slice(2);
const pk = process.env.AGENT_PRIVATE_KEY as Hex | undefined;
const account = pk ? privateKeyToAccount(pk) : null;

async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = (await r.json()) as T & { error?: string };
  if (!r.ok || j.error) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j;
}
const need = () => {
  if (!account) throw new Error("AGENT_PRIVATE_KEY is not set");
  return account;
};
const show = (x: unknown) => console.log(JSON.stringify(x, null, 2));

interface Step { kind: string; label: string; to: Hex; data: Hex; value: string }

async function run(req: Record<string, unknown>) {
  const acct = need();
  const cfg = await api<{ chainId: number; rpcUrl: string; chain: string }>("/api/config");
  const chain = defineChain({ id: cfg.chainId, name: cfg.chain, nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 }, rpcUrls: { default: { http: [cfg.rpcUrl] } } });
  const rpc = process.env.AGENT_RPC_URL ?? cfg.rpcUrl;
  const pub = createPublicClient({ chain, transport: http(rpc) });
  const wallet = createWalletClient({ chain, transport: http(rpc), account: acct });
  const plan = await api<{ steps: Step[]; notes: string[]; teamKey?: string }>("/api/plan", { ...req, wallet: acct.address });
  for (const n of plan.notes) console.log(`note: ${n}`);
  for (const [i, s] of plan.steps.entries()) {
    const hash = await wallet.sendTransaction({ to: s.to, data: s.data, value: BigInt(s.value), account: acct, chain });
    const rc = await pub.waitForTransactionReceipt({ hash });
    console.log(`${i + 1}/${plan.steps.length} ${rc.status === "success" ? "✓" : "✗"} ${s.label} (${hash})`);
    if (rc.status !== "success") throw new Error(`step ${i + 1} reverted`);
  }
  if (plan.teamKey) console.log(`team key ${plan.teamKey}`);
}

try {
  const body = arg ? JSON.parse(arg) : {};
  if (cmd === "round") show(await api("/api/rounds/current"));
  else if (cmd === "stocks") show(await api("/api/stocks"));
  else if (cmd === "me") show(await api(`/api/me?wallet=${need().address}`));
  else if (cmd === "faucet") show(await api("/api/faucet", { ...body, wallet: need().address }));
  else if (cmd === "plan") show(await api("/api/plan", { ...body, wallet: body.wallet ?? need().address }));
  else if (cmd === "run") await run(body);
  else console.log("usage: agent.mts round|stocks|me|faucet|plan|run [json] (see the header of this file)");
} catch (e) {
  console.error(`error: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
