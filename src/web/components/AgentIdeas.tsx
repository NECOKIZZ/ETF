"use client";

// Ready-made requests: tap one and the whole message (setup + the request)
// is copied, ready to paste into any AI agent.

import { useEffect, useState } from "react";
import { agentPrompt } from "../../agent/guide";

const IDEAS: { title: string; ask: string; tag: string }[] = [
  { tag: "Look", title: "What's happening this round?", ask: "Tell me what's happening in the current round: the top 3 ETFs, what's in them, and how long is left." },
  { tag: "Back", title: "Back the leader with $5", ask: "Back the ETF that's leading this round with a $5 ticket. Show me the odds first." },
  { tag: "Build", title: "Build me an AI chips ETF", ask: "Build me an ETF of AI chip stocks for $12, name it \"Chip Rush\", and enter it in this round." },
  { tag: "Buy", title: "Buy the top ETF's basket", ask: "Buy $10 of the leading ETF's basket into my wallet, split the way the creator split it." },
  { tag: "Claim", title: "Did I win? Claim it", ask: "Check my wallet's entries. If I won anything or have stocks to take back, claim them for me." },
  { tag: "Watch", title: "Keep an eye on my ETF", ask: "Check how my ETF is ranked now and tell me if it's in the winning half." },
];

export function AgentIdeas() {
  const [origin, setOrigin] = useState("https://<this site>");
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => setOrigin(window.location.origin), []);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {IDEAS.map((idea, i) => (
        <button
          key={idea.title}
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(`${agentPrompt(origin)}\n\nThen: ${idea.ask}`);
            setCopied(i);
            setTimeout(() => setCopied((c) => (c === i ? null : c)), 2000);
          }}
          className="group flex flex-col items-start rounded-[22px] border border-line bg-surface p-5 text-left transition hover:-translate-y-0.5 hover:border-brand-mint"
        >
          <span className="t-label text-muted">{idea.tag}</span>
          <span className="t-heading mt-2 text-[18px] leading-snug">{idea.title}</span>
          <span className="mt-2 text-[13px] text-muted">&ldquo;{idea.ask}&rdquo;</span>
          <span className={`mt-4 inline-flex h-8 items-center rounded-full px-3 text-[13px] font-medium ${copied === i ? "bg-brand-mint text-brand-ink" : "bg-surface-2 group-hover:bg-brand-mint group-hover:text-brand-ink"}`}>
            {copied === i ? "Copied ✓ paste it to your agent" : "Tap to copy"}
          </span>
        </button>
      ))}
    </div>
  );
}
