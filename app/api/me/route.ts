// GET /api/me?wallet=0x…: a wallet's entries in recent rounds and what it can claim.
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { loadMe } from "@/league/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const wallet = new URL(req.url).searchParams.get("wallet") ?? "";
  if (!isAddress(wallet)) return NextResponse.json({ error: "wallet must be an address" }, { status: 400 });
  try {
    return NextResponse.json({ wallet, entries: await loadMe(wallet) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
