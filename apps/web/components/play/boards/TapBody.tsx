"use client";

import { type Card, type TapStep, seededShuffle, tapAnswer, tapScore } from "@ise/game-engine";
import { useMemo, useState } from "react";
import { useCues } from "@/lib/cues";
import { useLab } from "@/lib/lab-context";
import { useProgress } from "@/lib/progress";
import { CheckIcon, CloseIcon } from "../../icons";
import { CardFace } from "../CardFace";
import { continueLabel, type Feedback, Shell, type StepProps } from "../StepShell";
import { cardClass } from "./shared";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Tap: cards ride past on a slow conveyor; catch every one that fits the rule,
 * then check. Hovering or focusing the belt pauses it, and with reduced motion
 * it is a still grid. One check, scored by right catches less wrong ones.
 */
export function TapBody({ step, outcome, act, isLast }: StepProps<TapStep>) {
  const { concept, model, emit } = useLab();
  const { snapshot } = useProgress();
  const cues = useCues();
  const answer = useMemo(() => tapAnswer(concept, model, step), [concept, model, step]);
  const cards = useMemo(() => seededShuffle(step.cards, step.id), [step]);
  const [caught, setCaught] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const still = outcome.done || snapshot.preferences.reducedMotion || prefersReducedMotion();

  const toggle = (id: string) => {
    if (outcome.done) return;
    cues.play("tap");
    setCaught((c) => {
      const next = new Set(c);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const check = () => {
    const correct = step.cards.filter((c) => answer[c.id]).map((c) => c.id);
    const hits = correct.filter((id) => caught.has(id)).length;
    const wrong = [...caught].filter((id) => !answer[id]).length;
    const perfect = hits === correct.length && wrong === 0;
    act({ type: "complete", score: tapScore(hits, wrong, correct.length, outcome.hints) });
    emit(perfect ? "check:correct" : "check:wrong");
    cues.play(perfect ? "correct" : "wrong");
    const missedNames = step.cards.filter((c) => answer[c.id] && !caught.has(c.id)).map((c) => c.label);
    setFeedback({
      tone: perfect ? "success" : "surprise",
      title: perfect ? "Caught them all!" : `Caught ${hits} of ${correct.length}${wrong > 0 ? `, and ${wrong} that do not fit` : ""}`,
      body: [missedNames.length > 0 ? `Missed: ${missedNames.join(", ")}.` : "", step.explanation ?? ""].filter(Boolean).join(" "),
    });
  };

  const button = (card: Card, copy: boolean) => {
    const on = caught.has(card.id);
    const verdict = outcome.done ? (answer[card.id] ? (on ? "hit" : "missed") : on ? "wrong" : null) : null;
    return (
      <button
        key={`${card.id}${copy ? "-copy" : ""}`}
        type="button"
        aria-pressed={on}
        aria-hidden={copy || undefined}
        tabIndex={copy ? -1 : undefined}
        onClick={() => toggle(card.id)}
        className={`relative shrink-0 ${cardClass(on)} ${
          verdict === "hit" ? "border-success bg-success/10" : verdict === "wrong" ? "border-cosine bg-cosine/10" : verdict === "missed" ? "border-dashed border-warning" : ""
        }`}
      >
        <CardFace card={card} step={step} />
        {verdict === "hit" && <CheckIcon width={14} height={14} className="absolute right-1 top-1 text-success" />}
        {verdict === "wrong" && <CloseIcon width={14} height={14} className="absolute right-1 top-1 text-cosine" />}
      </button>
    );
  };

  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={
        outcome.done
          ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) }
          : { label: "Check", onClick: check, disabled: caught.size === 0 }
      }
    >
      <p className="mb-3 rounded-xl bg-accent/10 px-3 py-2 text-center font-display text-sm font-bold text-ink">Catch: {step.rule}</p>
      {still ? (
        <div role="group" aria-label="Cards" className="flex flex-wrap justify-center gap-2">
          {cards.map((card) => button(card, false))}
        </div>
      ) : (
        <div role="group" aria-label="Cards" className="overflow-hidden rounded-2xl py-1">
          <div
            className="animate-marquee flex w-max hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
            style={{ animationDuration: `${cards.length * 3.5}s` }}
          >
            <div className="flex gap-2 pr-2">{cards.map((card) => button(card, false))}</div>
            <div className="flex gap-2 pr-2">{cards.map((card) => button(card, true))}</div>
          </div>
        </div>
      )}
      <p className="mt-2 text-center text-xs text-muted">{caught.size} caught · tap a card again to let it go</p>
    </Shell>
  );
}
