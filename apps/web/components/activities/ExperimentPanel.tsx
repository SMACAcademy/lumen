"use client";

import { useState } from "react";
import { useLab } from "@/lib/lab-context";
import { formatQuantity } from "@/lib/format";
import { SparkIcon } from "../icons";
import { SymbolicEquation } from "../lab/LiveFormula";

interface Row {
  id: number;
  cells: string[];
}

/**
 * Discovery experiment: record observations with the formula hidden, spot the
 * pattern, and only then reveal the equation.
 */
export function ExperimentPanel() {
  const { concept, session, ui, dispatch, emit, quantities } = useLab();
  const experiment = concept.activities.experiment;
  const [rows, setRows] = useState<Row[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const revealed = ui.revealed.includes(experiment.discovery.reveals);
  const columns = experiment.columns.map((id) => quantities.get(id)).filter((q) => q !== undefined);
  const ready = rows.length >= experiment.minRows;
  const chosen = experiment.discovery.choices.find((c) => c.id === answer);
  const equation = concept.equations.find((e) => e.id === experiment.discovery.reveals);
  const liveMode = concept.modes.find((m) => m.equations.includes(experiment.discovery.reveals));

  const record = () => {
    const results = session.getSnapshot().results;
    session.pause();
    setRows((prev) => [...prev, { id: Date.now() + prev.length, cells: columns.map((q) => formatQuantity(q, results, ui.angleUnit)) }]);
    emit("record");
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-ink">{experiment.title}</p>
        <p className="text-sm text-muted">{experiment.instructions}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={record}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white shadow shadow-accent/20 hover:brightness-110"
        >
          ● Record observation
        </button>
        {rows.length > 0 && (
          <button type="button" onClick={() => setRows([])} className="text-xs text-muted hover:text-ink">
            Clear table
          </button>
        )}
        <span className="ml-auto text-xs text-muted">
          {rows.length}/{experiment.minRows} recorded
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-right text-sm">
          <caption className="sr-only">Recorded observations</caption>
          <thead className="bg-surface-2/70 text-xs text-muted">
            <tr>
              {columns.map((q, i) => (
                <th
                  key={q.id}
                  scope="col"
                  className={`math px-2 py-1.5 font-normal ${i === columns.length - 1 ? "text-accent" : ""}`}
                >
                  {q.symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-xs tabular-nums">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-2 py-4 text-center font-sans text-muted">
                  No observations yet. Set an angle and press Record.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-line">
                  {row.cells.map((cell, i) => (
                    <td key={i} className={`px-2 py-1.5 ${i === row.cells.length - 1 ? "font-semibold text-ink" : "text-muted"}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {ready && !revealed && (
        <fieldset className="rounded-xl border border-accent/40 bg-accent/5 p-3">
          <legend className="px-1 text-sm font-semibold text-ink">{experiment.discovery.question}</legend>
          <div className="mt-1 grid gap-1.5">
            {experiment.discovery.choices.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                <input
                  type="radio"
                  name="discovery"
                  value={c.id}
                  checked={answer === c.id}
                  onChange={() => {
                    setAnswer(c.id);
                    if (c.correct) {
                      dispatch({ type: "reveal", equation: experiment.discovery.reveals });
                      emit("discover");
                    }
                  }}
                  className="accent-[var(--lab-accent)]"
                />
                {c.label}
              </label>
            ))}
          </div>
          {chosen && !chosen.correct && (
            <p className="mt-2 text-xs text-warning" role="status">
              Look at the highlighted column again, and try an angle in a different quadrant.
            </p>
          )}
        </fieldset>
      )}

      {revealed && equation && (
        <div className="rounded-xl border border-success/40 bg-success/10 p-3 text-sm" role="status">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <SparkIcon className="text-success" /> You discovered a law!
          </p>
          <SymbolicEquation equation={equation} className="mt-2 text-2xl" />
          <p className="mt-2 text-muted">{experiment.discovery.insight}</p>
          {liveMode && liveMode.id !== ui.mode && (
            <button
              type="button"
              onClick={() => dispatch({ type: "setMode", mode: liveMode.id })}
              className="mt-2 text-xs font-medium text-accent hover:underline"
            >
              See it live in {liveMode.label} mode →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
