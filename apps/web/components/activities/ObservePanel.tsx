"use client";

import { useState } from "react";
import { useLab } from "@/lib/lab-context";
import { CheckIcon } from "../icons";

export function ObservePanel({ observed, onNext }: { observed: ReadonlySet<string>; onNext: () => void }) {
  const { concept } = useLab();
  const steps = concept.activities.observe;
  const current = steps.find((s) => !observed.has(s.id));
  const [hintFor, setHintFor] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">Explore first. Each step completes itself when you do it in the lab.</p>
      <ol className="space-y-2">
        {steps.map((step, i) => {
          const done = observed.has(step.id);
          const active = step === current;
          return (
            <li
              key={step.id}
              className={`flex gap-3 rounded-xl border px-3 py-2.5 transition ${
                active ? "border-accent/60 bg-accent/10" : done ? "border-line bg-surface-2/40" : "border-line opacity-70"
              }`}
            >
              <span
                aria-hidden
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done ? "bg-success text-white" : active ? "bg-accent text-white" : "bg-surface-2 text-muted"
                }`}
              >
                {done ? <CheckIcon width={14} height={14} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${done ? "text-muted line-through decoration-muted/40" : "text-ink"}`}>
                  {step.prompt}
                  <span className="sr-only">{done ? " (done)" : active ? " (current step)" : ""}</span>
                </p>
                {active && step.hint && (
                  <button
                    type="button"
                    className="mt-1 text-xs font-medium text-accent hover:underline"
                    onClick={() => setHintFor(hintFor === step.id ? null : step.id)}
                    aria-expanded={hintFor === step.id}
                  >
                    {hintFor === step.id ? "Hide hint" : "Need a hint?"}
                  </button>
                )}
                {active && hintFor === step.id && <p className="mt-1 text-xs text-muted">{step.hint}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {!current && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm text-ink">
          <p className="font-semibold">Great observing!</p>
          <p className="text-muted">Now test your intuition: can you predict what the circle will do?</p>
          <button type="button" onClick={onNext} className="mt-2 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white">
            Go to Predict →
          </button>
        </div>
      )}
    </div>
  );
}
