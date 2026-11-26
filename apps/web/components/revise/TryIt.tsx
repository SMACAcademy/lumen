"use client";

import { useMemo, useState } from "react";
import { formatControlValue, formatQuantity } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { tryItResults, tryItSetup } from "@/lib/tryit";

/**
 * "Try it": the formula's inputs as sliders, and the formula with numbers in
 * it — every number computed by the lab's own model, so it can never
 * disagree with the simulation.
 */
export function TryIt({ conceptId, equationId }: { conceptId: string; equationId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="font-display h-8 rounded-lg border border-line px-3 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-accent/60"
      >
        {open ? "Close" : "Try it"}
      </button>
      {open && <TryItPanel conceptId={conceptId} equationId={equationId} />}
    </div>
  );
}

function TryItPanel({ conceptId, equationId }: { conceptId: string; equationId: string }) {
  const { snapshot } = useProgress();
  const angleUnit = snapshot.preferences.angleUnit;
  const setup = useMemo(() => tryItSetup(conceptId, equationId), [conceptId, equationId]);
  const [values, setValues] = useState<Record<string, number>>(() => setup?.initial ?? {});
  const results = useMemo(() => (setup ? tryItResults(setup, values) : {}), [setup, values]);
  if (!setup) return null;

  const { concept, equation } = setup;
  const valueOf = (id: string): string => {
    const quantity = concept.quantities.find((q) => q.id === id);
    if (quantity) return formatQuantity(quantity, results, angleUnit);
    const variable = concept.variables.find((v) => v.id === id);
    if (variable?.control.type === "range" && values[id] !== undefined) return formatControlValue(values[id]!, variable.control, angleUnit);
    return "?";
  };

  return (
    <div className="mt-3 space-y-3 rounded-xl bg-surface-2/60 p-3">
      {setup.inputs.map((v) => {
        if (v.control.type !== "range") return null;
        const value = values[v.id] ?? v.control.min;
        return (
          <label key={v.id} className="block text-sm">
            <span className="flex justify-between gap-2 text-muted">
              <span>
                <span className="math text-ink">{v.symbol}</span> · {v.name.toLowerCase()}
              </span>
              <span className="tabular-nums text-ink">{formatControlValue(value, v.control, angleUnit)}</span>
            </span>
            <input
              type="range"
              aria-label={v.name}
              min={v.control.min}
              max={v.control.max}
              step={v.control.step}
              value={value}
              onChange={(e) => setValues((prev) => ({ ...prev, [v.id]: Number(e.target.value) }))}
              className="mt-1 w-full accent-[var(--lab-accent)]"
            />
          </label>
        );
      })}
      <p aria-live="polite" aria-label="With these values" className="flex flex-wrap items-baseline gap-x-1.5 font-mono text-sm tabular-nums text-ink">
        {equation.tokens.map((token, i) => (
          <span key={i}>{token.kind === "ref" ? valueOf(token.id) : token.value}</span>
        ))}
      </p>
    </div>
  );
}
