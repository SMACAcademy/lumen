"use client";

import type { ChoiceControl, RangeControl, Variable } from "@ise/concept-schema";
import { UNITS } from "@ise/units";
import { useState } from "react";
import { roleVar } from "@/lib/colors";
import { useLab } from "@/lib/lab-context";
import { displayDigits, displayUnitFor, formatControlValue, fromDisplay, toDisplay } from "@/lib/format";
import { useLabSelector } from "@/lib/useLabSession";
import { Panel } from "./Panel";

/** Builds controls generically from the concept's variable definitions. */
export function VariablePanel() {
  const { concept } = useLab();
  const primary = concept.variables.filter((v) => v.group === "primary");
  const motion = concept.variables.filter((v) => v.group === "motion");
  return (
    <Panel title="Variables" subtitle="Change them and watch everything respond">
      <div className="space-y-5">
        {primary.map((v) => (
          <VariableControl key={v.id} variable={v} prominent />
        ))}
        {motion.length > 0 && (
          <div className="space-y-4 border-t border-line pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Motion</p>
            {motion.map((v) => (
              <VariableControl key={v.id} variable={v} />
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export function useVariableValue(variable: Variable): number | string | boolean | undefined {
  const { session } = useLab();
  return useLabSelector(session, (snap) =>
    variable.binding.kind === "state"
      ? session.model.getVariable(snap.state, variable.binding.key)
      : snap.params[variable.binding.key],
  );
}

export function useSetVariable(variable: Variable) {
  const { session, emit } = useLab();
  return (value: number | string) => {
    if (variable.binding.kind === "state") {
      if (typeof value !== "number") return;
      session.setVariable(variable.binding.key, value, "sweep");
    } else {
      session.setParam(variable.binding.key, value);
    }
    emit(`variable:${variable.id}`);
  };
}

export function VariableControl({ variable, prominent = false }: { variable: Variable; prominent?: boolean }) {
  return variable.control.type === "range" ? (
    <RangeVariable variable={variable} control={variable.control} prominent={prominent} />
  ) : (
    <ChoiceVariable variable={variable} control={variable.control} />
  );
}

function VariableHeading({ variable, value }: { variable: Variable; value?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={`var-${variable.id}`} className="flex items-baseline gap-2">
        <span className="math text-lg text-ink">{variable.symbol}</span>
        <span className="text-sm font-medium text-muted">{variable.name}</span>
      </label>
      {value !== undefined && <output className="font-mono text-sm tabular-nums text-ink">{value}</output>}
    </div>
  );
}

function RangeVariable({
  variable,
  control,
  prominent,
}: {
  variable: Variable;
  control: RangeControl;
  prominent: boolean;
}) {
  const { ui, session } = useLab();
  const raw = useVariableValue(variable);
  const value = typeof raw === "number" ? raw : control.min;
  const set = useSetVariable(variable);
  const unit = ui.angleUnit;
  const displayUnit = displayUnitFor(control.unit, unit);
  const digits = displayDigits(control, unit);

  // A state-bound angle wraps, so the slider covers [min, max) to avoid 360° ≡ 0°.
  const isWrapping = variable.binding.kind === "state" && UNITS[control.unit].dimension === "angle";
  const maxInternal = isWrapping ? control.max - control.step : control.max;
  const dMin = toDisplay(control.min, control, unit);
  const dMax = toDisplay(maxInternal, control, unit);
  const dStep = toDisplay(control.step, control, unit);
  const dValue = toDisplay(value, control, unit);
  const fill = ((dValue - dMin) / (dMax - dMin)) * 100;
  const accent = variable.color ? roleVar(variable.color) : "var(--lab-accent)";

  return (
    <div className="space-y-1.5">
      <VariableHeading variable={variable} value={formatControlValue(value, control, unit)} />
      <input
        id={`var-${variable.id}`}
        type="range"
        className="lab-range"
        min={dMin}
        max={dMax}
        step={dStep}
        value={Math.min(dMax, dValue)}
        aria-valuetext={formatControlValue(value, control, unit)}
        aria-describedby={`var-${variable.id}-meaning`}
        style={{ "--fill": `${Math.max(0, Math.min(100, fill))}%`, "--thumb": accent } as React.CSSProperties}
        onPointerDown={() => session.pause()}
        onChange={(e) => set(fromDisplay(Number(e.target.value), control, unit))}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <NumericInput
          // A dimensionless control has no unit to read out: "in dimensionlesss" helps nobody.
          label={displayUnit === "1" ? variable.name : `${variable.name} in ${UNITS[displayUnit].name}s`}
          value={dValue}
          digits={digits}
          min={dMin}
          max={toDisplay(control.max, control, unit)}
          suffix={UNITS[displayUnit].symbol}
          onCommit={(v) => set(fromDisplay(v, control, unit))}
        />
        {prominent &&
          control.presets?.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                session.pause();
                set(preset);
              }}
              className={`h-7 rounded-lg border px-2 font-mono text-xs tabular-nums transition ${
                Math.abs(preset - value) < 1e-6
                  ? "border-angle/70 bg-angle/15 text-ink"
                  : "border-line text-muted hover:border-angle/50 hover:text-ink"
              }`}
            >
              {formatControlValue(preset, control, unit)}
            </button>
          ))}
      </div>
      <p id={`var-${variable.id}-meaning`} className="text-xs leading-relaxed text-muted">
        {variable.meaning}
        {control.dial && " You can also drag the point on the circle, or scrub along a graph."}
      </p>
    </div>
  );
}

function NumericInput({
  label,
  value,
  digits,
  min,
  max,
  suffix,
  onCommit,
}: {
  label: string;
  value: number;
  digits: number;
  min: number;
  max: number;
  suffix: string;
  onCommit: (value: number) => void;
}) {
  // Shows the live value unless the learner is typing; the draft is seeded on focus.
  const formatted = value.toFixed(digits);
  const [draft, setDraft] = useState(formatted);
  const [editing, setEditing] = useState(false);

  const commit = () => {
    setEditing(false);
    const parsed = Number(draft);
    if (Number.isFinite(parsed)) onCommit(Math.min(max, Math.max(min, parsed)));
    else setDraft(formatted);
  };

  return (
    <span className="inline-flex h-7 items-center rounded-lg border border-line bg-surface-2 pr-2 focus-within:border-accent">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={editing ? draft : formatted}
        onFocus={() => {
          setEditing(true);
          setDraft(formatted);
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(formatted);
            setEditing(false);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className="w-16 bg-transparent px-2 text-right font-mono text-xs tabular-nums text-ink outline-none"
      />
      <span className="text-xs text-muted">{suffix}</span>
    </span>
  );
}

function ChoiceVariable({ variable, control }: { variable: Variable; control: ChoiceControl }) {
  const value = useVariableValue(variable);
  const set = useSetVariable(variable);
  const isNumeric = typeof control.options[0]?.value === "number";
  return (
    <div className="space-y-1.5">
      <VariableHeading variable={variable} />
      <div role="radiogroup" aria-label={variable.name} className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface-2 p-0.5">
        {control.options.map((option) => {
          const active = isNumeric
            ? typeof value === "number" && Math.abs(value - Number(option.value)) < 1e-9
            : value === option.value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => set(option.value)}
              className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition ${
                active ? "bg-surface text-ink shadow" : "text-muted hover:text-ink"
              }`}
            >
              {option.glyph && (
                <span aria-hidden className="text-base leading-none">
                  {option.glyph}
                </span>
              )}
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted">{variable.meaning}</p>
    </div>
  );
}
