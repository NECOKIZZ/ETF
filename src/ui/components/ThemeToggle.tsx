"use client";

import { useEffect, useState } from "react";

type Mode = "light" | "dark" | "auto";

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("auto");
  useEffect(() => {
    try {
      const t = localStorage.getItem("los-theme");
      if (t === "light" || t === "dark") setMode(t);
    } catch {}
  }, []);
  const apply = (m: Mode) => {
    setMode(m);
    const el = document.documentElement;
    if (m === "auto") delete el.dataset.theme;
    else el.dataset.theme = m;
    try {
      if (m === "auto") localStorage.removeItem("los-theme");
      else localStorage.setItem("los-theme", m);
    } catch {}
  };
  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-[13px]" role="radiogroup" aria-label="Theme">
      {(["light", "dark", "auto"] as Mode[]).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => apply(m)}
          className={`rounded-full px-3 py-1 capitalize transition ${mode === m ? "bg-white/15 text-white" : "text-white/55 hover:text-white"}`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}
