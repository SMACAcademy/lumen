"use client";

import type { Variable } from "@ise/concept-schema";
import type { BuildStep } from "@ise/game-engine";
import { evaluateCondition } from "@ise/science-engine";
import { useState } from "react";
import { useCues } from "@/lib/cues";
import { formatControlValue } from "@/lib/format";
import { useLab } from "@/lib/lab-context";
import { LiveGoal } from "../../activities/ChallengePanel";
import { useSetVariable, useVariableValue } from "../../lab/VariablePanel";
import { Pictogram } from "../Pictogram";
import { continueLabel, type Feedback, Shell, type StepProps } from "../StepShell";

/**
 * Build: add and take away parts — each a step of one of the simulation's
 * variables — until the goal is met, then check. Graded like a challenge.
 */
export function BuildBody({ step, outcome, act, isLast }: StepProps<BuildStep>) {
  const { concept, session, ui, emit } = useLab();
  const cues = useCues();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const check = () => {
    const snap = session.getSnapshot();
    const correct = evaluateCondition(step.goal, { results: snap.results, mode: ui.mode });
    act({ type: "check", correct });
    emit(correct ? "check:correct" : "check:wrong");
    cues.play(correct ? "correct" : "wrong");
    if (correct) setFeedback({ tone: "success", title: outcome.attempts === 0 && outcome.hints === 0 ? "Perfect build!" : "It works!", body: step.success });
    else setFeedback({ tone: "retry", title: "Not yet", body: step.retry ?? "Change the parts and check again.", key: outcome.attempts });
  };

  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : { label: "Check", onClick: check }}
    >
      <ul aria-label="Parts" className="space-y-2">
        {step.parts.map((part) => {
          const variable = concept.variables.find((v) => v.id === part.variable);
          return variable ? <PartRow key={part.variable} variable={variable} label={part.label} icon={part.icon} disabled={outcome.done} /> : null;
        })}
      </ul>
      <div className="mt-3">
        <LiveGoal goal={step.goal} />
      </div>
    </Shell>
  );
}

function PartRow({ variable, label, icon, disabled }: { variable: Variable; label: string; icon?: BuildStep["parts"][number]["icon"]; disabled: boolean }) {
  const { ui } = useLab();
  const cues = useCues();
  const raw = useVariableValue(variable);
  const set = useSetVariable(variable);
  if (variable.control.type !== "range") return null;
  const control = variable.control;
  const value = typeof raw === "number" ? raw : control.min;
  const nudge = (sign: 1 | -1) => {
    cues.play("tap");
    const next = Math.min(control.max, Math.max(control.min, Math.round((value + sign * control.step) / control.step) * control.step));
    set(next);
  };
  const button = "font-display grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-line text-xl font-bold text-ink transition hover:border-accent/60 disabled:opacity-40";
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-surface-2/60 px-3 py-2">
      <button type="button" aria-label={`Remove ${label}`} className={button} disabled={disabled || value <= control.min} onClick={() => nudge(-1)}>
        −
      </button>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {icon && <Pictogram name={icon} className="shrink-0 text-accent" />}
        <span className="min-w-0">
          <span className="font-display block text-sm font-bold text-ink">{label}</span>
          <output className="font-mono text-xs tabular-nums text-muted">{formatControlValue(value, control, ui.angleUnit)}</output>
        </span>
      </span>
      <button type="button" aria-label={`Add ${label}`} className={button} disabled={disabled || value >= control.max} onClick={() => nudge(1)}>
        +
      </button>
    </li>
  );
}
