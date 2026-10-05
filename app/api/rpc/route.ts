// POST /api/rpc: LOCAL DEMO CHAIN ONLY. Relays JSON-RPC to anvil so a browser
// wallet can reach a chain running next to the app (e.g. in Cloud Shell, where
// 127.0.0.1:8545 isn't reachable from your own browser). Add it in MetaMask as
// a custom network: RPC <app URL>/api/rpc, chain id 31337.
import { NextResponse } from "next/server";
import { isLocal } from "@/league/server";
import { rpcFromEnv } from "@/league/chain";

export const dynamic = "force-dynamic";

// Chain-control methods stay private: visitors can't move time or mint ETH.
const BLOCKED = /^(anvil_|hardhat_|evm_|debug_|admin_|personal_|miner_)/;

export async function POST(req: Request) {
  if (!isLocal()) return NextResponse.json({ error: "not available" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const calls = Array.isArray(body) ? body : [body];
  if (!body || calls.some((c) => typeof c?.method !== "string" || BLOCKED.test(c.method))) {
    return NextResponse.json({ jsonrpc: "2.0", id: body?.id ?? null, error: { code: -32601, message: "method not allowed" } }, { status: 403 });
  }
  const r = await fetch(rpcFromEnv(), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
}
