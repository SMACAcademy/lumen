"use client";

import type { LevelRunAction, Step, StepOutcome } from "@ise/game-engine";
import { useEffect } from "react";
import { useCues } from "@/lib/cues";
import { useLab } from "@/lib/lab-context";
import { RichText } from "../activities/RichText";
import { BulbIcon } from "../icons";
import { Button } from "../ui/Button";

/**
 * The frame every step is played in: the task, any board or controls, hints
 * on request, feedback, and the one main button.
 */
export type Act = (action: LevelRunAction) => void;

export interface Feedback {
  tone: "success" | "surprise" | "retry";
  title: string;
  body?: string;
  /** Changing it replays the entrance animation (e.g. a second wrong answer shakes again). */
  key?: number;
}

export interface StepProps<S extends Step> {
  step: S;
  outcome: StepOutcome;
  act: Act;
  onReveal: () => void;
  isLast: boolean;
}

export const KICKER: Record<Step["kind"], string> = {
  intro: "Look",
  explore: "Explore",
  target: "Challenge",
  predict: "Predict",
  estimate: "Estimate",
  discover: "Discovery",
  sort: "Sort",
  match: "Match",
  order: "Order",
  tap: "Catch",
  build: "Build",
};

// ── Shared shell ─────────────────────────────────────────────────────────────

interface Primary {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Shell({
  step,
  outcome,
  act,
  feedback,
  primary,
  children,
}: {
  step: Step;
  outcome: StepOutcome;
  act: Act;
  feedback: Feedback | null;
  primary: Primary | null;
  children?: React.ReactNode;
}) {
  const { session, ui } = useLab();
  const cues = useCues();
  const results = session.getSnapshot().results;
  const hints = step.hints ?? [];
  const shown = hints.slice(0, outcome.hints);
  const canHint = !outcome.done && outcome.hints < hints.length;

  // Enter presses the main button, like a form.
  useEffect(() => {
    if (!primary || primary.disabled) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "INPUT" && tag !== "A") primary.onClick();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [primary]);

  return (
    <section aria-label="Your task" className="animate-rise rounded-3xl border border-line bg-surface p-4 shadow-xl shadow-black/10 sm:p-5 lg:sticky lg:top-4">
      <p className="font-display text-xs font-bold uppercase tracking-[0.16em] text-accent">{KICKER[step.kind]}</p>
      <p className="mt-2 text-lg leading-snug text-ink">
        <RichText text={step.prompt} results={results} angleUnit={ui.angleUnit} />
      </p>

      {children && <div className="mt-4">{children}</div>}

      {shown.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Hints">
          {shown.map((h, i) => (
            <li key={i} className="animate-rise flex gap-2 rounded-xl bg-angle/10 px-3 py-2 text-sm text-ink">
              <BulbIcon className="mt-0.5 shrink-0 text-angle" width={16} height={16} />
              {h}
            </li>
          ))}
        </ul>
      )}

      {feedback && (
        <div
          key={feedback.key}
          role="status"
          className={`mt-4 rounded-2xl border px-4 py-3 ${
            feedback.tone === "success"
              ? "animate-pop border-success/40 bg-success/10"
              : feedback.tone === "surprise"
                ? "animate-pop border-warning/40 bg-warning/10"
                : "animate-shake border-cosine/40 bg-cosine/10"
          }`}
        >
          <p
            className={`font-display font-bold ${feedback.tone === "success" ? "text-success" : feedback.tone === "surprise" ? "text-warning" : "text-cosine"}`}
          >
            {feedback.title}
          </p>
          {feedback.body && <p className="mt-1 text-sm leading-relaxed text-ink">{feedback.body}</p>}
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        {canHint ? (
          <button
            type="button"
            onClick={() => {
              cues.play("tap");
              act({ type: "hint" });
            }}
            className="font-display inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold text-angle transition hover:bg-angle/10"
          >
            <BulbIcon width={16} height={16} />
            {outcome.hints === 0 ? "Hint" : "Another hint"}
          </button>
        ) : (
          <span />
        )}
        {primary && (
          <Button
            tone={outcome.done ? "success" : "primary"}
            size="lg"
            className="min-w-36"
            onClick={primary.onClick}
            disabled={primary.disabled}
          >
            {primary.label}
          </Button>
        )}
      </div>
    </section>
  );
}

export const continueLabel = (isLast: boolean) => (isLast ? "Finish" : "Continue");
