"use client";

// "● Round 12 · locks in 2d 04:13:22": mint while entries are open, orange in
// the last hour, grey while the round runs.

import { useEffect, useState } from "react";
import { Pill } from "./Pills";

function fmt(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${d > 0 ? `${d}d ` : ""}${hh}:${mm}:${ss}`;
}

export function RoundPill({ round, locksAt, endsAt }: { round: number; locksAt: number; endsAt: number }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <Pill tone="up" dot>Round {round}</Pill>;
  if (now < locksAt) {
    const left = locksAt - now;
    return (
      <Pill tone={left < 3600_000 ? "down" : "up"} dot>
        Round {round} · locks in <span className="t-num">{fmt(left)}</span>
      </Pill>
    );
  }
  if (now < endsAt)
    return (
      <Pill tone="neutral" dot>
        Round {round} running · settles in <span className="t-num">{fmt(endsAt - now)}</span>
      </Pill>
    );
  return <Pill tone="neutral">Round {round} settled</Pill>;
}
