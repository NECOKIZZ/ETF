"use client";

// A plan's transactions as a checklist: waiting → sign in wallet →
// confirming → done, with links to the explorer.

import type { PlanResponse } from "../api";
import type { StepState } from "../hooks";
import { useConfig } from "../hooks";

const icon: Record<StepState, string> = { waiting: "○", signing: "◔", confirming: "◑", done: "●", failed: "×" };
const text: Record<StepState, string> = { waiting: "", signing: "Sign in your wallet", confirming: "Confirming…", done: "Done", failed: "Failed" };

export function TxSteps({ plan, states, hashes, error, batched }: { plan: PlanResponse | null; states: StepState[]; hashes: (string | null)[]; error: string | null; batched?: boolean }) {
  const { data: cfg } = useConfig();
  if (!plan && !error) return null;
  return (
    <div className="mt-5 rounded-[20px] bg-surface p-4 text-[14px]">
      {plan?.notes.map((n) => (
        <p key={n} className="mb-2 text-[13px] text-muted">
          {n}
        </p>
      ))}
      {batched && plan && plan.steps.length > 1 && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-mint/20 px-3 py-1 text-[12px] font-medium">
          One signature: all {plan.steps.length} steps run together, or none do
        </p>
      )}
      <ol className="space-y-2">
        {plan?.steps.map((s, i) => {
          const st = states[i] ?? "waiting";
          return (
            <li key={i} className="flex items-start gap-3">
              <span className={`t-num mt-px w-4 text-center ${st === "done" ? "text-up" : st === "failed" ? "text-down" : "text-muted"}`} aria-hidden="true">
                {icon[st]}
              </span>
              <span className="min-w-0 flex-1">
                <span className={st === "waiting" ? "text-muted" : ""}>{s.label}</span>
                {text[st] && <span className="ml-2 text-[12px] text-muted">{text[st]}</span>}
                {hashes[i] && cfg?.explorer && (!batched || i === (plan?.steps.length ?? 0) - 1) && (
                  <a className="ml-2 text-[12px] underline" href={`${cfg.explorer}/tx/${hashes[i]}`} target="_blank" rel="noreferrer">
                    view ↗
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {error && <p className="mt-3 text-[13px] text-down">{error}</p>}
    </div>
  );
}
