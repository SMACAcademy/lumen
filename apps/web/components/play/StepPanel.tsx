"use client";

import { type PredictionOption, resolveGiven } from "@ise/concept-schema";
import {
  type DiscoverStep,
  type EstimateStep,
  type ExploreStep,
  type PredictStep,
  type Step,
  type TargetStep,
  estimateScore,
  estimateVerdict,
  predictionScore,
} from "@ise/game-engine";
import { type Condition, ConditionTracker, evaluateCondition, traceCoverage } from "@ise/science-engine";
import { formatNumber, formatSignificant } from "@ise/units";
import { useEffect, useRef, useState } from "react";
import { useCues } from "@/lib/cues";
import { applyWrites, runExperiment } from "@/lib/experiment";
import { formatControlValue } from "@/lib/format";
import { useLab } from "@/lib/lab-context";
import { LiveGoal } from "../activities/ChallengePanel";
import { CheckIcon, SparkIcon } from "../icons";
import { SymbolicEquation } from "../lab/LiveFormula";
import { BuildBody } from "./boards/BuildBody";
import { MatchBody } from "./boards/MatchBody";
import { OrderBody } from "./boards/OrderBody";
import { SortBody } from "./boards/SortBody";
import { TapBody } from "./boards/TapBody";
import { continueLabel, type Feedback, Shell, type StepProps } from "./StepShell";

export function StepPanel(props: StepProps<Step>) {
  const { step } = props;
  switch (step.kind) {
    case "intro":
      return <IntroBody {...props} step={step} />;
    case "explore":
      return <ExploreBody {...props} step={step} />;
    case "target":
      return <TargetBody {...props} step={step} />;
    case "predict":
      return <PredictBody {...props} step={step} />;
    case "estimate":
      return <EstimateBody {...props} step={step} />;
    case "discover":
      return <DiscoverBody {...props} step={step} />;
    case "sort":
      return <SortBody {...props} step={step} />;
    case "match":
      return <MatchBody {...props} step={step} />;
    case "order":
      return <OrderBody {...props} step={step} />;
    case "tap":
      return <TapBody {...props} step={step} />;
    case "build":
      return <BuildBody {...props} step={step} />;
  }
}

// ── Step kinds ───────────────────────────────────────────────────────────────

function IntroBody({ step, outcome, act, isLast }: StepProps<Step>) {
  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={null}
      primary={{
        label: continueLabel(isLast),
        onClick: () => {
          act({ type: "complete" });
          act({ type: "next" });
        },
      }}
    />
  );
}

/** Watches the simulation and latches the goal, as observe checkpoints do in the lab. */
function useGoalLatch(goal: Condition, onMet: () => void, active = true) {
  const { session, onEvent, ui } = useLab();
  const mode = useRef(ui.mode);
  mode.current = ui.mode;
  const met = useRef(onMet);
  met.current = onMet;
  useEffect(() => {
    if (!active) return;
    const tracker = new ConditionTracker(new Map([["goal", goal]]));
    // The level applies this step's setup in its own effect, right after this one, a write at a
    // time. Wait until it has, so a half-applied setup cannot meet the goal.
    let armed = false;
    queueMicrotask(() => {
      armed = true;
    });
    const update = () => {
      if (!armed) return;
      const snap = session.getSnapshot();
      const newly = tracker.update({ results: snap.results, mode: mode.current, traceCoverage: snap.trace ? traceCoverage(snap.trace) : 0 });
      if (newly.length > 0) met.current();
    };
    const offSession = session.subscribe(update);
    const offEvents = onEvent((name) => {
      tracker.recordEvent(name);
      update();
    });
    return () => {
      offSession();
      offEvents();
    };
  }, [goal, session, onEvent, active]);
}

function ExploreBody({ step, outcome, act, isLast }: StepProps<ExploreStep>) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const cues = useCues();
  useGoalLatch(
    step.goal,
    () => {
      act({ type: "complete" });
      cues.play("correct");
      setFeedback({ tone: "success", title: "You got it!", body: step.success });
    },
    !outcome.done,
  );
  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={
        outcome.done
          ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) }
          : { label: "Keep going…", onClick: () => {}, disabled: true }
      }
    />
  );
}

function TargetBody({ step, outcome, act, isLast }: StepProps<TargetStep>) {
  const { session, ui, emit } = useLab();
  const cues = useCues();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const check = () => {
    const snap = session.getSnapshot();
    session.pause();
    const correct = evaluateCondition(step.goal, { results: snap.results, mode: ui.mode });
    act({ type: "check", correct });
    emit(correct ? "check:correct" : "check:wrong");
    cues.play(correct ? "correct" : "wrong");
    if (correct) setFeedback({ tone: "success", title: outcome.attempts === 0 && outcome.hints === 0 ? "Perfect!" : "Nailed it!", body: step.success });
    else setFeedback({ tone: "retry", title: "Not quite", body: step.retry ?? "Adjust it and check again.", key: outcome.attempts });
  };

  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : { label: "Check", onClick: check }}
    >
      <LiveGoal goal={step.goal} />
    </Shell>
  );
}

const OPTION_LABEL: Record<PredictionOption, string> = {
  increase: "Increases ↑",
  decrease: "Decreases ↓",
  same: "Stays the same =",
};

const OUTCOME_WORD: Record<PredictionOption, string> = {
  increase: "increased",
  decrease: "decreased",
  same: "stayed the same",
};

function PredictBody({ step, outcome, act, isLast }: StepProps<PredictStep>) {
  const { concept, session, emit, quantities, ui } = useLab();
  const cues = useCues();
  const [choice, setChoice] = useState<PredictionOption | null>(null);
  const [truth, setTruth] = useState<PredictionOption | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const cancel = useRef<(() => void) | null>(null);
  useEffect(() => () => cancel.current?.(), []);

  const variable = concept.variables.find((v) => v.id === step.variable);
  const quantity = [...quantities.values()].find((q) => q.result === step.quantity);
  const label = (value: number) =>
    variable?.control.type === "range" ? formatControlValue(value, variable.control, ui.angleUnit) : formatNumber(value, 2);

  const pick = (option: PredictionOption) => {
    if (choice || !variable) return;
    setChoice(option);
    emit("predict");
    applyWrites(session, resolveGiven(concept, step.given));
    cancel.current = runExperiment(
      session,
      { variable: variable.binding.key, target: variable.binding.kind, from: step.from, to: step.to, quantity: step.quantity, tolerance: step.tolerance },
      (m) => {
        cancel.current = null;
        const correct = option === m.outcome;
        setTruth(m.outcome);
        act({ type: "complete", score: predictionScore(correct, outcome.hints) });
        emit(correct ? "check:correct" : "check:wrong");
        cues.play(correct ? "correct" : "wrong");
        setFeedback({
          tone: correct ? "success" : "surprise",
          title: correct ? "You predicted it!" : "Surprise!",
          body: `${quantity?.symbol ?? step.quantity} ${OUTCOME_WORD[m.outcome]}: ${formatNumber(m.before, 3)} → ${formatNumber(m.after, 3)}. ${step.explanation}`,
        });
      },
    );
  };

  const running = choice !== null && truth === null;
  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : null}
    >
      <p className="mb-3 text-sm text-muted">
        {variable?.symbol ?? step.variable}: {label(step.from)} → {label(step.to)}
        {running && <span className="ml-2 animate-pulse text-accent">watch…</span>}
      </p>
      <div className="grid gap-2" role="group" aria-label="Your prediction">
        {step.options.map((option) => {
          const picked = choice === option;
          const style =
            truth === option
              ? "border-success bg-success/15 text-ink"
              : truth && picked
                ? "border-warning bg-warning/10 text-ink"
                : picked
                  ? "border-accent bg-accent/15 text-ink"
                  : "border-line text-ink hover:border-accent/60 hover:bg-accent/5";
          return (
            <button
              key={option}
              type="button"
              disabled={choice !== null}
              aria-pressed={picked}
              onClick={() => {
                cues.play("tap");
                pick(option);
              }}
              className={`font-display flex h-12 items-center justify-between rounded-2xl border-2 px-4 text-left text-base font-semibold shadow-[0_3px_0_0] shadow-line transition active:translate-y-0.5 disabled:cursor-default ${style}`}
            >
              {OPTION_LABEL[option]}
              {truth === option && <CheckIcon className="text-success" />}
            </button>
          );
        })}
      </div>
    </Shell>
  );
}

const VERDICT_TITLE = { "spot-on": "Spot on!", close: "Close!", off: "Not quite" } as const;

function EstimateBody({ step, outcome, act, isLast, onReveal }: StepProps<EstimateStep>) {
  const { session, quantities, emit } = useLab();
  const cues = useCues();
  const { min, max, step: increment } = step.range;
  const [guess, setGuess] = useState(() => Math.round((min + max) / 2 / increment) * increment);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const quantity = quantities.get(step.quantity);
  const digits = Math.max(0, -Math.floor(Math.log10(increment)));
  // Estimates of very large (or very small) quantities read in powers of ten.
  const huge = Math.max(Math.abs(min), Math.abs(max)) >= 1e5;
  const show = (v: number) => (huge ? formatSignificant(v, 3) : v.toFixed(digits));

  const check = () => {
    const raw = quantity ? session.getSnapshot().results[quantity.result] : undefined;
    const truth = typeof raw === "number" ? raw : Number.NaN;
    const score = estimateScore(guess, truth, step.tolerance, max - min, outcome.hints);
    const verdict = estimateVerdict(score);
    act({ type: "complete", score });
    emit(verdict === "off" ? "check:wrong" : "check:correct");
    cues.play(verdict === "off" ? "wrong" : "correct");
    onReveal();
    setFeedback({
      tone: verdict === "off" ? "surprise" : "success",
      title: VERDICT_TITLE[verdict],
      body: `You said ${show(guess)}; it is ${huge ? formatSignificant(truth, 3) : formatNumber(truth, 3)}. ${step.explanation}`,
    });
  };

  const fill = ((guess - min) / (max - min)) * 100;
  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : { label: "Check", onClick: check }}
    >
      <div className="rounded-2xl bg-surface-2/60 px-4 py-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor="estimate" className="text-sm font-medium text-muted">
            Your estimate of <span className="math text-ink">{quantity?.symbol ?? step.quantity}</span>
          </label>
          <output className="font-display text-2xl font-extrabold tabular-nums text-ink">{show(guess)}</output>
        </div>
        <input
          id="estimate"
          type="range"
          className="lab-range mt-2"
          min={min}
          max={max}
          step={increment}
          value={guess}
          disabled={outcome.done}
          style={{ "--fill": `${fill}%` } as React.CSSProperties}
          onChange={(e) => setGuess(Number(e.target.value))}
        />
        <div className="flex justify-between font-mono text-xs text-muted">
          <span>{huge ? formatSignificant(min, 2) : min}</span>
          <span>{huge ? formatSignificant(max, 2) : max}</span>
        </div>
      </div>
    </Shell>
  );
}

function DiscoverBody({ step, outcome, act, isLast }: StepProps<DiscoverStep>) {
  const { concept, emit } = useLab();
  const cues = useCues();
  const equation = concept.equations.find((e) => e.id === step.equation);
  useEffect(() => {
    if (!outcome.done) {
      act({ type: "complete" });
      emit("discover");
      cues.play("star");
    }
  }, [outcome.done, act, emit, cues]);
  return (
    <Shell step={step} outcome={outcome} act={act} feedback={null} primary={{ label: isLast ? "Collect & finish" : "Collect", onClick: () => act({ type: "next" }) }}>
      <figure className="animate-pop relative overflow-hidden rounded-3xl border border-angle/40 bg-gradient-to-br from-angle/15 via-surface-2 to-accent/15 p-5 text-center shadow-lg shadow-angle/10">
        <SparkIcon className="absolute right-4 top-4 text-angle" />
        <figcaption className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-angle">Law card · {equation?.title}</figcaption>
        {equation && <SymbolicEquation equation={equation} className="mt-3 text-3xl text-ink" />}
        <p className="mt-3 text-sm leading-relaxed text-ink">{step.law}</p>
      </figure>
    </Shell>
  );
}
