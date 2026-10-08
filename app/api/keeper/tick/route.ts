// GET|POST /api/keeper/tick: the keeper, run by a cron every few minutes
// (cron-job.org, Vercel Cron…). Takes the price samples that are due, settles
// ended rounds, and opens the next round when KEEPER_OPEN_ENTRY_MIN and
// KEEPER_OPEN_RUN_MIN are set. Needs `Authorization: Bearer <CRON_SECRET>`.
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { tick, tickOptionsFromEnv } from "@/league/keeper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

async function run(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const log = await tick(tickOptionsFromEnv());
    return NextResponse.json({ ok: true, at: new Date().toISOString(), log });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
