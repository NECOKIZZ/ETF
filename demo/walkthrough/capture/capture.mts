// Drives the real Median Markets app in Chromium with mock data and a mock
// test wallet, and records each scene of the walkthrough as an MP4 clip.
//
//   APP=http://localhost:3100 npx tsx capture/capture.mts [scene …]   (no args: every scene)
//   npx tsx capture/capture.mts stills                                 (one screenshot per page)
//
// Start the app first (Champion PR branch), with Champion live:
//   NEXT_PUBLIC_CHAMPION_URL=https://www.bnbchain.org/en/bnb-agent-studio \
//   NEXT_PUBLIC_CHAMPION_WALLET=0xc4a3910000000000000000000000000000c4a391 pnpm build && pnpm next start -p 3100

import { chromium, type Page, type Locator } from "playwright";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decodeFunctionData, encodeFunctionResult, multicall3Abi } from "viem";
import * as M from "./mock.mts";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "video", "clips");
const FRAMES = join(HERE, "..", ".frames");
const APP = process.env.APP ?? "http://localhost:3100";
const VW = 1440;
const VH = 810;
const SCALE = 1920 / VW;

// ---- Simulated time, shared by the page (inject.js) and the mock API ----
let sim = { base: Date.UTC(2026, 9, 6, 22, 0), real: Date.now(), speed: 1 };
const simNow = () => sim.base + (Date.now() - sim.real) * sim.speed;
const state: M.State = { current: 7, backed: false, created: false, bought: false, claimed: false };

const json = (body: unknown) => ({ status: 200, contentType: "application/json", body: JSON.stringify(body) });

function api(path: string, method: string, body: string | null) {
  const now = simNow();
  if (path === "/api/config") return json({ ...M.config, currentRound: String(state.current) });
  if (path === "/api/stocks") return json(M.stocks(now, state));
  if (path === "/api/leaderboard") return json(M.leaderboard);
  if (path === "/api/me") return json(M.me(state));
  let m = path.match(/^\/api\/rounds\/(current|\d+)(\/history|\/verify)?$/);
  if (m) {
    const id = (m[1] === "current" ? state.current : Number(m[1])) as 6 | 7 | 8;
    if (m[2] === "/history") return json(M.history(id, now, state));
    if (m[2] === "/verify") return json(M.verify);
    return json(M.roundView(id, now, state));
  }
  if (path === "/api/plan" && method === "POST") {
    const b = JSON.parse(body ?? "{}");
    if (b.action === "back") state.backed = true;
    if (b.action === "buy-basket") state.bought = true;
    if (b.action === "lock") state.created = true;
    if (b.action === "claim") state.claimed = true;
    return json(M.plan(b));
  }
  if (path === "/api/rpc" || path === "/") {
    const one = (r: { id: number; method: string; params: { data?: string }[] }) => {
      let result: unknown = null;
      if (r.method === "eth_chainId") result = "0x38";
      else if (r.method === "eth_blockNumber") result = "0x1a2b";
      else if (r.method === "eth_call") result = ethCall(r.params[0]?.data ?? "0x");
      return { jsonrpc: "2.0", id: r.id, result };
    };
    const req = JSON.parse(body ?? "{}");
    return json(Array.isArray(req) ? req.map(one) : one(req));
  }
  return null;
}

// Token balances: none until the basket is bought, then plenty (the lock caps at the basket).
const balance = () => "0x" + (state.bought ? (10n ** 22n).toString(16) : "0").padStart(64, "0");
function ethCall(data: string): string {
  if (data.startsWith("0x70a08231")) return balance();
  // BSC reads go through Multicall3 (aggregate3): answer each inner call.
  try {
    const { functionName, args } = decodeFunctionData({ abi: multicall3Abi, data: data as `0x${string}` });
    if (functionName === "aggregate3") {
      const calls = args[0] as readonly { callData: `0x${string}` }[];
      return encodeFunctionResult({
        abi: multicall3Abi,
        functionName: "aggregate3",
        result: calls.map((c) => ({ success: true, returnData: (c.callData.startsWith("0x70a08231") ? balance() : "0x" + "0".repeat(64)) as `0x${string}` })),
      });
    }
  } catch {}
  return "0x" + "0".repeat(64);
}

// ---- Browser ----
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: SCALE, colorScheme: "light", reducedMotion: "no-preference" });
// The public site address shown in the agent message (the app itself runs locally).
const SITE = process.env.SITE ?? "https://median-markets.vercel.app";
await ctx.addInitScript({ content: `window.__SITE = ${JSON.stringify(SITE)};\n` + readFileSync(join(HERE, "inject.js"), "utf8") });
await ctx.route("**/api/**", async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname;
  const r = api(path, req.method(), req.postData());
  // The mock wallet's confirm sheet lists the plan's steps, as a real wallet preview would.
  if (r && path === "/api/plan") await page.evaluate((b) => (window.__walletLines = JSON.parse(b).steps.map((x: { label: string }) => x.label)), r.body);
  return r ? route.fulfill(r) : route.continue();
});
// The app reads BSC through its public RPC: answer those reads from the mock too.
await ctx.route(/bsc-dataseed/, async (route) => {
  const req = route.request();
  if (req.method() !== "POST") return route.continue();
  return route.fulfill(api("/api/rpc", "POST", req.postData())!);
});
const page = await ctx.newPage();
page.on("pageerror", (e) => console.warn("pageerror:", e.message));

async function setSim(base: number, speed: number) {
  sim = { base, real: Date.now(), speed };
  if (!page.url().startsWith("http")) await page.goto(APP + "/rules");
  await page.evaluate((s) => {
    window.__sim = s;
    localStorage.setItem("__sim", JSON.stringify(s));
  }, sim);
}
async function prime() {
  // Fresh visit: sim clock stored, beginner's guide not seen yet, wallet not connected.
  await page.goto(APP + "/rules");
  await page.evaluate((s) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("__sim", JSON.stringify(s));
  }, sim);
}

// ---- Motion helpers ----
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let cur = { x: VW * 0.62, y: VH * 0.55 };
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function moveTo(x: number, y: number, ms = 700) {
  const from = { ...cur };
  const n = Math.max(2, Math.round(ms / 16));
  for (let i = 1; i <= n; i++) {
    const k = ease(i / n);
    await page.mouse.move(from.x + (x - from.x) * k, from.y + (y - from.y) * k);
    await wait(8);
  }
  cur = { x, y };
}
async function showCursor() {
  await page.mouse.move(cur.x, cur.y);
}
async function center(l: Locator) {
  await l.waitFor({ state: "visible", timeout: 15000 });
  let b = (await l.boundingBox())!;
  // Off screen: scroll it into the middle first, smoothly, as a person would.
  if (b.y < 70 || b.y + b.height > VH - 10) {
    const inFixed = await l.evaluate((el) => !!el.closest("[role=dialog], header"));
    if (!inFixed) {
      await scrollTo(l, 900, VH / 2 - b.height / 2);
      const before = b.y;
      b = (await l.boundingBox())!;
      if (process.env.DEBUG) console.log("scrolled", before, "→", b.y, await page.evaluate(() => window.scrollY));
    }
  }
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}
async function hover(l: Locator, ms = 700) {
  const c = await center(l);
  await moveTo(c.x, c.y, ms);
}
async function click(l: Locator, ms = 700) {
  await hover(l, ms);
  await wait(150);
  await page.mouse.down();
  await wait(70);
  await page.mouse.up();
}
/** Click something that may move (live re-ranking rows): aim, then re-aim just before clicking. */
async function clickLive(l: Locator, ms = 700) {
  await hover(l, ms);
  const c = await center(l);
  await moveTo(c.x, c.y, 100);
  await page.mouse.down();
  await page.mouse.up();
}
async function scrollTo(target: number | Locator, ms = 1400, offset = 96) {
  const y =
    typeof target === "number"
      ? target
      : await target.evaluate((el, o) => el.getBoundingClientRect().top + window.scrollY - o, offset);
  await page.evaluate(
    ({ y, ms }) =>
      new Promise<void>((done) => {
        const y0 = window.scrollY;
        const t0 = performance.now();
        const e = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        const f = (now: number) => {
          const k = Math.min(1, (now - t0) / ms);
          window.scrollTo({ top: y0 + (y - y0) * e(k), behavior: "instant" });
          k < 1 ? requestAnimationFrame(f) : done();
        };
        requestAnimationFrame(f);
      }),
    { y, ms },
  );
}
async function type(l: Locator, text: string, delay = 85) {
  await click(l);
  await l.pressSequentially(text, { delay });
}
async function goto(path: string) {
  await page.goto(APP + path, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await wait(1500);
}

// ---- Recorder: CDP screencast → timestamped JPEGs → constant 30 fps MP4 ----
async function record(name: string, fn: () => Promise<void>) {
  const dir = join(FRAMES, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const frames: { t: number; f: string }[] = [];
  const writes: Promise<void>[] = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const f = join(dir, `${String(frames.length).padStart(5, "0")}.jpg`);
    frames.push({ t: metadata.timestamp ?? Date.now() / 1000, f });
    writes.push(writeFile(f, Buffer.from(data, "base64")));
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  const t0 = Date.now() / 1000;
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  // Nudge a repaint so the first frame arrives straight away.
  await page.evaluate(() => document.body.style.setProperty("outline", "0px solid transparent"));
  await fn();
  const t1 = Date.now() / 1000;
  await cdp.send("Page.stopScreencast");
  await cdp.detach();
  await Promise.all(writes);
  const list = ["ffconcat version 1.0"];
  frames.forEach((fr, i) => {
    const start = i === 0 ? t0 : fr.t;
    const end = i + 1 < frames.length ? frames[i + 1].t : t1;
    list.push(`file '${fr.f}'`, `duration ${Math.max(0.001, end - start).toFixed(4)}`);
  });
  list.push(`file '${frames[frames.length - 1].f}'`);
  writeFileSync(join(dir, "list.txt"), list.join("\n"));
  const out = join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"), "-vf", "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "16", out]);
  console.log(`${name}: ${(t1 - t0).toFixed(1)} s, ${frames.length} frames (${(frames.length / (t1 - t0)).toFixed(1)} fps) → ${out}`);
}

const byText = (t: string | RegExp, root: Page | Locator = page) => root.getByText(t).first();
const btn = (t: string | RegExp) => page.getByRole("button", { name: t }).first();
const link = (t: string | RegExp) => page.getByRole("link", { name: t }).first();

// ---- Scenes (lengths sized to the voiceover, see SCRIPT.md) ----
const R7_TUE = Date.UTC(2026, 9, 6, 22, 0);
const SAT = Date.UTC(2026, 9, 10, 11, 0);

const scenes: Record<string, () => Promise<void>> = {
  async s02_landing() {
    state.current = 7;
    await prime();
    await setSim(R7_TUE, 1);
    await goto("/");
    await record("s02_landing", async () => {
      await showCursor();
      await wait(900);
      await hover(page.locator("main img").nth(2), 1200);
      await wait(1200);
      await scrollTo(page.locator("#how"), 1500, 40);
      await hover(byText("Pick 3 to 10 stocks"), 900);
      await wait(900);
      await hover(byText("Lock it with a $5 ticket"), 700);
      await wait(900);
      await hover(byText("The top half wins", page.locator("#how").locator("..")), 700);
      await wait(900);
      await scrollTo(page.locator("#round"), 1500, 110);
      await hover(page.locator('[aria-label="A simulated Median Markets round"]'), 900);
      await wait(5200);
      await click(link(/Open app/), 1000);
      await page.waitForURL(/\/league/, { waitUntil: "commit" });
      await wait(600);
    });
  },

  async s03_guide() {
    await record("s03_guide", async () => {
      const next = page.getByRole("dialog").getByRole("button").last();
      await wait(500);
      await click(next, 600);
      await wait(800);
      await click(next, 400);
      await wait(700);
      await click(page.getByRole("dialog").getByRole("button").first(), 700);
      await wait(500);
    });
  },

  async s04_league() {
    if (!page.url().includes("/league")) {
      state.current = 7;
      await setSim(R7_TUE, 1);
      await page.evaluate(() => localStorage.setItem("los-guide-seen", "1"));
      await goto("/league");
    }
    await scrollTo(0, 10);
    await setSim(R7_TUE, 6000);
    await record("s04_league", async () => {
      await showCursor();
      await wait(600);
      await scrollTo(page.locator(".viz-root").first(), 1300, 120);
      await wait(1500);
      const chart = page.locator("section.viz-root svg").first();
      const b = (await chart.boundingBox())!;
      await moveTo(b.x + b.width * 0.12, b.y + b.height * 0.5, 900);
      await moveTo(b.x + b.width * 0.55, b.y + b.height * 0.45, 3200);
      await wait(800);
      await moveTo(b.x + b.width * 0.3, b.y + b.height * 0.6, 1600);
      await moveTo(b.x + b.width + 40, b.y - 30, 700);
      await wait(2600);
      const cut = page.locator("main span.t-label", { hasText: "top half wins" }).first();
      await scrollTo(cut, 1600, 470);
      await hover(cut, 900);
      await wait(1800);
      await hover(page.locator("main a[href^='/etf/'] .bg-up-bg").first(), 900);
      await wait(2600);
      await hover(page.locator("main a[href^='/etf/']").filter({ hasText: "Champion" }).first(), 900);
      await wait(2600);
    });
  },

  async s05_etf() {
    await setSim(simNow(), 3000);
    await record("s05_etf", async () => {
      const row = page.locator("main a[href^='/etf/']").filter({ hasText: "AI Chips Max" }).last();
      await scrollTo(row, 700, 360);
      await clickLive(row, 800);
      await page.waitForURL(/\/etf\//, { waitUntil: "commit" });
      await page.locator("section svg").first().waitFor();
      await wait(1500);
      const chart = page.locator("section svg").first();
      const b = (await chart.boundingBox())!;
      await moveTo(b.x + b.width * 0.2, b.y + b.height * 0.5, 800);
      await moveTo(b.x + b.width * 0.6, b.y + b.height * 0.4, 2000);
      await click(btn("Per stock"), 700);
      await wait(1600);
      await moveTo(b.x + b.width * 0.4, b.y + b.height * 0.5, 1200);
      await click(btn("Round"), 600);
      await wait(600);
      await scrollTo(260, 1200);
      await hover(byText("If the round ended now"), 900);
      await wait(1600);
    });
  },

  async s06_back() {
    state.current = 8;
    await setSim(SAT, 1);
    await page.evaluate(() => localStorage.setItem("los-guide-seen", "1"));
    await goto(`/etf/${M.KEY["AI Chips Max"]}`);
    await scrollTo(0, 10);
    await record("s06_back", async () => {
      await showCursor();
      await wait(500);
      await click(btn(/^Connect$/), 900);
      await wait(900);
      await click(btn(/Back this team/), 900);
      await wait(900);
      await click(page.getByRole("dialog").getByRole("button", { name: /^Back AI Chips Max/ }), 900);
      await page.locator("#__confirm").waitFor({ timeout: 15000 });
      await wait(700);
      await click(page.locator("#__confirm"), 800);
      await byText("Done").waitFor({ timeout: 15000 });
      await wait(1500);
      await click(page.getByRole("dialog").getByRole("button", { name: "Buy the ETF" }), 900);
      await wait(500);
      const amt = page.getByRole("dialog").getByLabel("Amount in USDT");
      await click(amt, 600);
      await amt.press("Control+A");
      await amt.pressSequentially("50", { delay: 120 });
      await wait(400);
      await hover(page.getByRole("dialog").getByRole("button", { name: /^Buy AI Chips Max/ }), 800);
      await wait(1800);
      await click(page.getByRole("button", { name: "Close" }), 800);
      await wait(600);
    });
  },

  async s07_create() {
    state.current = 8;
    await setSim(SAT, 1);
    await goto("/create");
    await scrollTo(0, 10);
    await record("s07_create", async () => {
      await showCursor();
      await wait(600);
      const card = (t: string) => page.locator("main button").filter({ has: page.locator(`img[src*="/logos/${t}.png"]`) }).first();
      await click(card("NVDA"), 900);
      await wait(250);
      await click(card("AMD"), 600);
      await wait(500);
      await hover(byText(/2\/3 stocks/), 700);
      await wait(700);
      await click(card("AVGO"), 700);
      await wait(400);
      await click(card("TSM"), 600);
      await wait(600);
      await click(btn("Crypto"), 700);
      await wait(400);
      await click(card("BTC"), 600);
      await wait(700);
      await click(btn("All"), 600);
      await scrollTo(byText("Set the weights"), 1300, 120);
      await wait(1600);
      await scrollTo(byText("Buy the stocks"), 1200, 120);
      await click(btn(/via Binance/), 900);
      await page.locator("#__confirm").waitFor({ timeout: 15000 });
      await wait(500);
      await click(page.locator("#__confirm"), 700);
      await byText(/ready to lock/).waitFor({ timeout: 20000 });
      await wait(900);
      await scrollTo(byText("Name it and lock it"), 1200, 120);
      await type(page.getByPlaceholder("e.g. AI Chips Max"), "Champion", 90);
      await wait(1300);
      await page.getByPlaceholder("e.g. AI Chips Max").fill("");
      await page.getByPlaceholder("e.g. AI Chips Max").pressSequentially("Silicon Summer", { delay: 70 });
      await wait(500);
      await click(btn(/Lock and enter/), 900);
      await page.locator("#__confirm").waitFor({ timeout: 15000 });
      await wait(600);
      await click(page.locator("#__confirm"), 800);
      await byText(/You.re in/).waitFor({ timeout: 20000 });
      await wait(1800);
    });
  },

  async s08_champion() {
    state.current = 8;
    await setSim(SAT, 1);
    await goto("/agents");
    await record("s08_champion", async () => {
      await showCursor();
      await wait(800);
      await hover(byText("✓ Official"), 1000);
      await wait(1500);
      await hover(byText(/Talk to Champion/), 900);
      await wait(1400);
      await scrollTo(byText("Powered by BNB agentic infrastructure"), 1300, 160);
      await hover(byText("BNB Agent Studio"), 900);
      await wait(1800);
    });
  },

  async s08b_champion_etf() {
    state.current = 8;
    await setSim(SAT, 1);
    await goto(`/etf/${M.KEY["Champion"]}`);
    await record("s08b_champion_etf", async () => {
      await showCursor();
      await wait(700);
      await hover(byText("✓ Official"), 900);
      await wait(1200);
      await hover(btn(/Back this team/), 900);
      await wait(1800);
    });
  },

  async s09_agents() {
    await goto("/agents");
    await scrollTo(byText("1 · Copy this message").or(page.getByText(/Copy message/)).first(), 10, 220);
    await record("s09_agents", async () => {
      await showCursor();
      await wait(600);
      await click(btn(/Copy message/), 900);
      await wait(1500);
      await scrollTo(byText("Your agent proposes. You approve."), 1500, 140);
      for (const t of ["You ask", "Agent plans"]) {
        await hover(byText(t), 700);
        await wait(700);
      }
      await hover(page.locator("ol li").filter({ hasText: /approve|preview|sign/i }).last(), 800);
      await wait(2200);
    });
  },

  async s10_me() {
    state.current = 8;
    await setSim(SAT, 1);
    await goto("/league");
    await record("s10_me", async () => {
      await showCursor();
      await wait(400);
      await click(page.locator("header button[aria-expanded]"), 900);
      await wait(500);
      await click(link("My entries"), 700);
      await page.waitForURL(/\/me/, { waitUntil: "commit" });
      await wait(1200);
      await scrollTo(byText(/Claim \$13\.20/), 1200, 380);
      await click(btn(/Claim \$13\.20/), 900);
      await page.locator("#__confirm").waitFor({ timeout: 15000 });
      await wait(500);
      await click(page.locator("#__confirm"), 700);
      await wait(2200);
    });
  },

  async s10b_results() {
    await goto("/round/6");
    await record("s10b_results", async () => {
      await showCursor();
      await wait(600);
      await hover(byText("✓ Verified"), 1000);
      await wait(1200);
      await hover(byText(/Download the inputs/), 800);
      await wait(1600);
    });
  },

  async s10c_leaderboard() {
    await goto("/leaderboard");
    await record("s10c_leaderboard", async () => {
      await showCursor();
      await wait(800);
      await hover(page.locator("main").getByText("Champion").first(), 900);
      await wait(1200);
      await click(btn("Backers"), 800);
      await wait(1800);
    });
  },
};

// ---- Run ----
const args = process.argv.slice(2);
if (args[0] === "stills") {
  mkdirSync(join(FRAMES, "stills"), { recursive: true });
  await prime();
  const shots: [string, 7 | 8][] = [["/", 7], ["/league", 7], [`/etf/${M.KEY["AI Chips Max"]}`, 7], ["/create", 8], ["/agents", 8], ["/me", 8], ["/round/6", 8], ["/leaderboard", 8]];
  for (const [p, r] of shots) {
    state.current = r;
    await setSim(r === 7 ? Date.UTC(2026, 9, 8, 12) : SAT, 1);
    await goto(p);
    await page.evaluate(() => localStorage.setItem("los-guide-seen", "1"));
    await goto(p);
    await page.screenshot({ path: join(FRAMES, "stills", `${p.replace(/\W+/g, "_") || "home"}.png`), fullPage: true });
    console.log("still", p);
  }
} else {
  const list = args.length ? args : Object.keys(scenes);
  for (const s of list)
    try {
      await scenes[s]();
    } catch (e) {
      await page.screenshot({ path: join(FRAMES, `fail-${s}.png`) });
      throw e;
    }
}
await browser.close();
