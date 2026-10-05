"use client";

// The one message people paste into their AI agent, with a copy button.

import { useEffect, useState } from "react";
import { agentPrompt } from "../../agent/guide";

export function AgentPrompt() {
  const [origin, setOrigin] = useState("https://<this site>");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);
  const text = agentPrompt(origin);
  return (
    <div className="rounded-[24px] bg-brand-ink p-5 text-brand-paper md:p-6">
      <p className="t-num text-[15px] leading-relaxed text-brand-paper/90">{text}</p>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-mint px-5 text-[15px] font-medium text-brand-ink transition hover:opacity-90"
      >
        {copied ? "Copied ✓" : "Copy message"}
      </button>
    </div>
  );
}
