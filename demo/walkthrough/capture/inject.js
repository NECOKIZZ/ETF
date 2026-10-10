// Runs in the page before the app. Gives the video:
//  - a simulated clock (Date) so a week-long round can play out in seconds,
//  - faster polling (the app's 20–60 s refetch intervals), so the league moves live,
//  - a mock test wallet (EIP-1193 + EIP-5792 batch calls) with a confirm sheet,
//  - a visible cursor with click ripples,
//  - "testnet" wording where the app says "local demo chain".
// tsx compiles page.evaluate callbacks with esbuild keepNames, which calls __name.
window.__name = (f) => f;
(() => {
  const RealDate = Date;
  const realNow = RealDate.now.bind(RealDate);
  const readSim = () => {
    try {
      return JSON.parse(localStorage.getItem("__sim") || "null");
    } catch {
      return null;
    }
  };
  window.__sim = readSim();
  const simNow = () => {
    const s = window.__sim;
    return s ? s.base + (realNow() - s.real) * s.speed : realNow();
  };
  class SimDate extends RealDate {
    constructor(...a) {
      if (a.length === 0) super(simNow());
      else super(...a);
    }
    static now() {
      return simNow();
    }
  }
  window.Date = SimDate;

  const si = window.setInterval.bind(window);
  window.setInterval = (fn, ms, ...rest) => si(fn, ms >= 10000 ? Math.max(150, ms / 100) : ms, ...rest);
  const st = window.setTimeout.bind(window);
  // viem polls wallet batch status every 4 s; poll faster so "Confirming…" doesn't stall the shot.
  window.setTimeout = (fn, ms, ...rest) => st(fn, ms === 4000 ? 400 : ms, ...rest);

  // ---- Text: the public site address where the app shows its own origin. ----
  const SWAP = [[location.origin, window.__SITE || location.origin]];
  const fix = (n) => {
    if (n.nodeType === 3) {
      let v = n.nodeValue;
      for (const [a, b] of SWAP) if (v.includes(a)) v = v.split(a).join(b);
      if (v !== n.nodeValue) n.nodeValue = v;
    } else if (n.childNodes) n.childNodes.forEach(fix);
  };
  new MutationObserver((ms) => ms.forEach((m) => (m.type === "characterData" ? fix(m.target) : m.addedNodes.forEach(fix)))).observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
  });

  // ---- Cursor ----
  const cursor = () => {
    let c = document.getElementById("__cursor");
    if (c) return c;
    c = document.createElement("div");
    c.id = "__cursor";
    c.innerHTML =
      '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2.5 L4 19 L8.6 14.9 L11.6 21.5 L14.4 20.3 L11.4 13.8 L17.6 13.8 Z" fill="#0b0b0c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: "2147483647", pointerEvents: "none", transform: "translate(-4px,-2px)", display: "none" });
    document.documentElement.appendChild(c);
    const p = JSON.parse(sessionStorage.getItem("__cur") || "null");
    if (p) Object.assign(c.style, { left: p[0] + "px", top: p[1] + "px", display: "block" });
    return c;
  };
  addEventListener(
    "mousemove",
    (e) => {
      const c = cursor();
      Object.assign(c.style, { left: e.clientX + "px", top: e.clientY + "px", display: "block" });
      sessionStorage.setItem("__cur", JSON.stringify([e.clientX, e.clientY]));
    },
    true,
  );
  addEventListener(
    "mousedown",
    (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, {
        position: "fixed",
        left: e.clientX - 18 + "px",
        top: e.clientY - 18 + "px",
        width: "36px",
        height: "36px",
        borderRadius: "999px",
        background: "rgba(61,220,151,.45)",
        border: "2px solid #3ddc97",
        zIndex: "2147483646",
        pointerEvents: "none",
        transition: "transform .45s cubic-bezier(.2,.8,.2,1), opacity .45s",
      });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => {
        r.style.transform = "scale(1.6)";
        r.style.opacity = "0";
      });
      st(() => r.remove(), 600);
    },
    true,
  );
  document.addEventListener("DOMContentLoaded", cursor);

  // ---- Mock test wallet ----
  const ACCOUNT = "0x8f3a62b1d0c94e7a55e1c0de4b2f9a3c7d1e91c2";
  const CHAIN = "0x38";
  const listeners = {};
  let connected = localStorage.getItem("__wallet") === "1";
  const calls = {};
  const rand = () => "0x" + Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("");
  const receipt = (h) => ({
    blockHash: rand(),
    blockNumber: "0x1a2b",
    contractAddress: null,
    cumulativeGasUsed: "0x5208",
    effectiveGasPrice: "0x3b9aca00",
    from: ACCOUNT,
    gasUsed: "0x5208",
    logs: [],
    logsBloom: "0x" + "0".repeat(512),
    status: "0x1",
    to: "0x174ad1c93310df3023f2ca1ee23aa46b1182459b",
    transactionHash: h,
    transactionIndex: "0x0",
    type: "0x2",
  });

  // The wallet's confirm sheet. The video driver clicks Confirm.
  function confirmSheet(title, lines) {
    return new Promise((resolve) => {
      const w = document.createElement("div");
      w.id = "__wallet";
      w.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.6)">
          <span style="width:8px;height:8px;border-radius:99px;background:#3ddc97"></span> Wallet · BNB Chain
        </div>
        <div style="margin-top:10px;font-size:19px;font-weight:600;letter-spacing:-.02em">${title}</div>
        <ol style="margin:12px 0 0;padding:0;list-style:none;font-size:13px;color:rgba(255,255,255,.75)">${lines.map((l, i) => `<li style="padding:5px 0;border-top:1px solid rgba(255,255,255,.08)"><span style="color:rgba(255,255,255,.4);margin-right:8px">${i + 1}</span>${l}</li>`).join("")}</ol>
        <div style="margin-top:14px;font-size:12px;color:rgba(255,255,255,.5)">Network fee ≈ 0.0004 BNB</div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button style="flex:1;height:42px;border-radius:99px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;font:inherit;font-size:14px">Reject</button>
          <button id="__confirm" style="flex:1;height:42px;border-radius:99px;border:0;background:#3ddc97;color:#0b0b0c;font:inherit;font-size:14px;font-weight:600">Confirm</button>
        </div>`;
      Object.assign(w.style, {
        position: "fixed",
        top: "84px",
        right: "24px",
        width: "340px",
        zIndex: "2147483600",
        background: "#0b0b0c",
        color: "#fff",
        borderRadius: "24px",
        padding: "18px",
        boxShadow: "0 24px 60px rgba(0,0,0,.35)",
        fontFamily: "var(--font-instrument), system-ui, sans-serif",
        transform: "translateY(-12px)",
        opacity: "0",
        transition: "all .35s cubic-bezier(.2,.8,.2,1)",
      });
      document.documentElement.appendChild(w);
      requestAnimationFrame(() => Object.assign(w.style, { transform: "none", opacity: "1" }));
      w.querySelector("#__confirm").addEventListener("click", () => {
        w.style.opacity = "0";
        st(() => w.remove(), 350);
        resolve();
      });
    });
  }

  const provider = {
    isMetaMask: true,
    on(ev, fn) {
      (listeners[ev] ||= []).push(fn);
      return provider;
    },
    removeListener(ev, fn) {
      listeners[ev] = (listeners[ev] || []).filter((f) => f !== fn);
      return provider;
    },
    async request({ method, params }) {
      switch (method) {
        case "eth_requestAccounts":
          connected = true;
          localStorage.setItem("__wallet", "1");
          return [ACCOUNT];
        case "eth_accounts":
          return connected ? [ACCOUNT] : [];
        case "eth_chainId":
          return CHAIN;
        case "net_version":
          return "56";
        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;
        case "wallet_requestPermissions":
          return [{ parentCapability: "eth_accounts" }];
        case "wallet_revokePermissions":
          connected = false;
          localStorage.removeItem("__wallet");
          return null;
        case "wallet_getCapabilities":
          return { [CHAIN]: { atomic: { status: "ready" } } };
        case "wallet_sendCalls": {
          const n = params[0].calls.length;
          const labels = window.__walletLines || Array.from({ length: n }, (_, i) => `Call ${i + 1}`);
          await confirmSheet(n > 1 ? `Confirm ${n} calls in one signature` : "Confirm transaction", labels.slice(0, n));
          const id = rand();
          calls[id] = realNow();
          return { id };
        }
        case "wallet_getCallsStatus": {
          const id = params[0];
          const done = realNow() - (calls[id] || 0) > 1300;
          const h = rand();
          return { version: "2.0.0", id, chainId: CHAIN, atomic: true, status: done ? 200 : 100, receipts: done ? [receipt(h)] : undefined };
        }
        case "eth_sendTransaction": {
          await confirmSheet("Confirm transaction", ["Contract call"]);
          return rand();
        }
        case "eth_blockNumber":
          return "0x1a2b";
        case "eth_getTransactionReceipt":
          return receipt(params[0]);
        default:
          return null;
      }
    },
  };
  window.ethereum = provider;

  // The confirm sheet lists the plan's steps, as a real wallet preview would.
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await realFetch(input, init);
    if (String(input).includes("/api/plan"))
      res
        .clone()
        .json()
        .then((p) => (window.__walletLines = p.steps.map((s) => s.label)))
        .catch(() => {});
    return res;
  };
})();
