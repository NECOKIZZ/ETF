// GET /api/config: chain, contract addresses and rules for the browser and agents.
import { NextResponse } from "next/server";
import { publicConfig } from "@/league/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await publicConfig());
}
