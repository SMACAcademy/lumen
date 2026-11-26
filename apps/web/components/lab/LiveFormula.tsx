"use client";

import type { Equation, EquationToken } from "@ise/concept-schema";
import type { Results } from "@ise/science-engine";
import { formatNumber, type AngleUnit } from "@ise/units";
import { useLab } from "@/lib/lab-context";
import { formatQuantity, splitSymbolForPower, superscript } from "@/lib/format";
import { useLabSnapshot } from "@/lib/useLabSession";
import { LockIcon } from "../icons";
import { ROLE_TEXT, useHighlight } from "./LiveValues";
import { Panel } from "./Panel";

/**
 * Renders the mode's equations twice: symbolically, and with live values
 * substituted — so the learner watches the formula compute as θ changes.
 */
export function LiveFormula() {
  const { concept, mode, ui } = useLab();
  const equations = mode.equations.flatMap((id) => concept.equations.filter((e) => e.id === id));
  return (
    <Panel title="Live formula" subtitle="Hover a symbol to see it in the drawing">
      <div className="space-y-3">
        {equations.map((eq) =>
          eq.discoverable && !ui.revealed.includes(eq.id) ? (
            <LockedEquation key={eq.id} equation={eq} />
          ) : (
            <EquationCard key={eq.id} equation={eq} />
          ),
        )}
      </div>
    </Panel>
  );
}

function LockedEquation({ equation }: { equation: Equation }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2/40 px-3 py-3 text-sm text-muted">
      <LockIcon className="shrink-0 text-accent" />
      <div>
        <p className="font-medium text-ink">A hidden relationship: {equation.title}</p>
        <p className="text-xs">Discover it yourself in the Experiment activity.</p>
      </div>
    </div>
  );
}

function EquationCard({ equation }: { equation: Equation }) {
  const { session, ui } = useLab();
  const snap = useLabSnapshot(session);
  return (
    <figure className="rounded-xl bg-surface-2/60 px-3 py-2.5">
      <figcaption className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{equation.title}</figcaption>
      <div className="flex flex-wrap items-baseline gap-x-2 text-xl text-ink" aria-label={`${equation.title} (symbolic)`}>
        {equation.tokens.map((t, i) => (
          <Token key={i} token={t} mode="symbolic" results={snap.results} angleUnit={ui.angleUnit} />
        ))}
      </div>
      <div
        className="mt-1 flex flex-wrap items-baseline gap-x-2 font-mono text-sm tabular-nums text-muted"
        aria-label={`${equation.title} with current values`}
      >
        {equation.tokens.map((t, i) => (
          <Token key={i} token={t} mode="values" results={snap.results} angleUnit={ui.angleUnit} />
        ))}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{equation.reading}</p>
      {equation.assumptions.length > 0 && (
        <p className="mt-1 text-[11px] text-muted/80">Assumes: {equation.assumptions.join("; ")}.</p>
      )}
    </figure>
  );
}

/** An equation's symbolic form only, e.g. for celebrating a discovery. */
export function SymbolicEquation({ equation, className = "" }: { equation: Equation; className?: string }) {
  const { ui } = useLab();
  return (
    <div className={`flex flex-wrap items-baseline justify-center gap-x-2 ${className}`} aria-label={equation.title}>
      {equation.tokens.map((t, i) => (
        <Token key={i} token={t} mode="symbolic" results={{}} angleUnit={ui.angleUnit} />
      ))}
    </div>
  );
}

function Token({
  token,
  mode,
  results,
  angleUnit,
}: {
  token: EquationToken;
  mode: "symbolic" | "values";
  results: Results;
  angleUnit: AngleUnit;
}) {
  const { quantities, concept } = useLab();
  const quantity = token.kind === "ref" ? quantities.get(token.id) : undefined;
  const handlers = useHighlight(quantity);

  if (token.kind === "op") return <span className={mode === "symbolic" ? "math not-italic" : ""}>{token.value}</span>;
  if (token.kind === "text") return <span>{token.value}</span>;

  const variable = concept.variables.find((v) => v.id === token.id);
  const color = quantity ? ROLE_TEXT[quantity.color] : "text-angle";

  if (mode === "symbolic") {
    const symbol = token.symbolic ?? quantity?.symbol ?? variable?.symbol ?? token.id;
    let content: React.ReactNode = symbol;
    if (token.power !== undefined && token.symbolic === undefined) {
      const { head, tail } = splitSymbolForPower(symbol);
      content = (
        <>
          {head}
          <sup className="not-italic">{token.power}</sup>
          {tail && <>{" "}{tail}</>}
        </>
      );
    }
    return (
      <span
        tabIndex={quantity?.highlight ? 0 : undefined}
        {...handlers}
        className={`math cursor-default rounded px-0.5 outline-none transition hover:bg-surface focus-visible:ring-2 focus-visible:ring-accent ${
          token.symbolic ? "text-ink" : color
        }`}
      >
        {content}
      </span>
    );
  }

  const value = quantity ? formatQuantity(quantity, results, angleUnit) : "?";
  const rawValue = quantity ? results[quantity.result] : undefined;
  const shown =
    token.power !== undefined && typeof rawValue === "number"
      ? `(${formatNumber(rawValue, 4)})${superscript(token.power)}`
      : value;
  return (
    <span {...handlers} className={token.symbolic ? "font-semibold text-ink" : color}>
      {shown}
    </span>
  );
}
