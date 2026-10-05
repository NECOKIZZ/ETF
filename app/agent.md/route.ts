// GET /agent.md: the guide an AI agent follows to help someone play, with
// this site's address filled in. People paste one line into their agent
// (see /agents) and the agent reads this.
import { agentGuide } from "@/agent/guide";

export const dynamic = "force-dynamic";

export function GET(req: Request) {
  const u = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? u.host;
  const proto = req.headers.get("x-forwarded-proto") ?? u.protocol.replace(":", "");
  return new Response(agentGuide(`${proto}://${host}`), { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" } });
}
