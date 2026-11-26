"use client";

import { type PredictionItem, type PredictionOption, givenWrites, predictionSetup } from "@ise/concept-schema";
import type { PredictionMeasurement } from "@ise/science-engine";
import { formatNumber } from "@ise/units";
import { useEffect, useRef, useState } from "react";
import { applyWrites, runExperiment } from "@/lib/experiment";
import { formatControlValue } from "@/lib/format";
import { useLab } from "@/lib/lab-context";

const OPTION_LABEL: Record<PredictionOption, string> = {
  increase: "Increase ↑",
  decrease: "Decrease ↓",
  same: "Stay the same =",
};

const OUTCOME_WORD: Record<PredictionOption, string> = {
  increase: "increased",
  decrease: "decreased",
  same: "stayed the same",
};

type Phase = "choose" | "running" | "result";

interface Attempt {
  choice: PredictionOption;
  measurement: PredictionMeasurement;
}

export function PredictPanel({ setBusy }: { setBusy: (busy: boolean) => void }) {
  const { concept } = useLab();
  const items = concept.activities.predict;
  const [index, setIndex] = useState(0);
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({});
  const item = items[index];
  const made = Object.keys(attempts).length;
  const surprises = Object.values(attempts).filter((a) => a.choice !== a.measurement.outcome).length;

  if (!item) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Prediction {index + 1} of {items.length}
        </span>
        <span>
          {made} made · {surprises} {surprises === 1 ? "surprise" : "surprises"}
        </span>
      </div>
      <PredictionCard
        key={item.id}
        item={item}
        attempt={attempts[item.id]}
        setBusy={setBusy}
        onResult={(attempt) => setAttempts((prev) => ({ ...prev, [item.id]: attempt }))}
      />
      <div className="flex justify-between">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:text-ink disabled:opacity-30"
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={index === items.length - 1}
          onClick={() => setIndex(index + 1)}
          className="rounded-lg px-2 py-1 text-xs font-medium text-muted hover:text-ink disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

function PredictionCard({
  item,
  attempt,
  setBusy,
  onResult,
}: {
  item: PredictionItem;
  attempt: Attempt | undefined;
  setBusy: (busy: boolean) => void;
  onResult: (attempt: Attempt) => void;
}) {
  const { concept, session, quantities, ui, dispatch, emit } = useLab();
  const [phase, setPhase] = useState<Phase>(attempt ? "result" : "choose");
  const [choice, setChoice] = useState<PredictionOption | null>(attempt?.choice ?? null);
  const cancel = useRef<(() => void) | null>(null);
  const quantity = [...quantities.values()].find((q) => q.result === item.quantity);

  useEffect(
    () => () => {
      cancel.current?.();
      setBusy(false);
    },
    [setBusy],
  );

  /** Run the experiment in the real lab: jump to `from`, then sweep to `to`. */
  const run = (picked: PredictionOption) => {
    setChoice(picked);
    setPhase("running");
    setBusy(true);
    emit("predict");
    if (item.mode) dispatch({ type: "setMode", mode: item.mode });
    session.pause();
    applyWrites(session, givenWrites(concept, item));
    cancel.current = runExperiment(session, predictionSetup(concept, item), (measurement) => {
      cancel.current = null;
      setBusy(false);
      onResult({ choice: picked, measurement });
      setPhase("result");
    });
  };

  const variable = concept.variables.find((v) => v.id === item.variable);
  const label = (value: number) =>
    variable?.control.type === "range" ? formatControlValue(value, variable.control, ui.angleUnit) : formatNumber(value, 2);

  return (
    <div className="rounded-xl border border-line bg-surface-2/40 p-3">
      <p className="text-sm font-medium text-ink">{item.question}</p>
      <p className="mt-1 text-xs text-muted">
        Predict first, then the lab runs the experiment: {variable?.symbol ?? item.variable} moves from {label(item.from)}{" "}
        to {label(item.to)}.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Your prediction">
        {item.options.map((option) => {
          const picked = choice === option;
          const truth = attempt?.measurement.outcome;
          const state =
            phase === "result" && truth === option
              ? "border-success bg-success/15 text-ink"
              : phase === "result" && picked
                ? "border-warning bg-warning/10 text-ink"
                : picked
                  ? "border-accent bg-accent/15 text-ink"
                  : "border-line text-muted hover:border-accent/50 hover:text-ink";
          return (
            <button
              key={option}
              type="button"
              disabled={phase === "running"}
              aria-pressed={picked}
              onClick={() => run(option)}
              className={`rounded-lg border px-2 py-2 text-sm font-semibold transition disabled:cursor-wait ${state}`}
            >
              {OPTION_LABEL[option]}
            </button>
          );
        })}
      </div>

      {phase === "running" && (
        <p className="mt-3 animate-pulse text-sm text-accent" role="status">
          Running the experiment… watch the {quantity?.name.toLowerCase() ?? "value"} change.
        </p>
      )}

      {phase === "result" && attempt && (
        <div
          role="status"
          className={`mt-3 rounded-lg border p-3 text-sm ${
            attempt.choice === attempt.measurement.outcome ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"
          }`}
        >
          <p className="font-semibold text-ink">
            {attempt.choice === attempt.measurement.outcome ? "Your prediction matched the experiment." : "Surprise! The experiment disagreed."}
          </p>
          <p className="mt-1 font-mono text-xs tabular-nums text-muted">
            {quantity?.symbol ?? item.quantity}: {formatNumber(attempt.measurement.before, 4)} → {formatNumber(attempt.measurement.after, 4)} (
            {OUTCOME_WORD[attempt.measurement.outcome]})
          </p>
          <p className="mt-2 text-muted">{item.explanation}</p>
          <button type="button" onClick={() => run(attempt.choice)} className="mt-2 text-xs font-medium text-accent hover:underline">
            Replay the experiment
          </button>
        </div>
      )}
    </div>
  );
}
