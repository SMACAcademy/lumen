"use client";

import { cardScore, type OrderStep, seededShuffle } from "@ise/game-engine";
import { useMemo, useState } from "react";
import { useCues } from "@/lib/cues";
import { useLab } from "@/lib/lab-context";
import { CardFace } from "../CardFace";
import { continueLabel, type Feedback, Shell, type StepProps } from "../StepShell";
import { cardClass, useShake } from "./shared";

/**
 * Order: tap the cards from one end of the order to the other. The right next
 * card joins the row; a wrong one shakes, and that place no longer counts as
 * first-time.
 */
export function OrderBody({ step, outcome, act, isLast }: StepProps<OrderStep>) {
  const { emit } = useLab();
  const cues = useCues();
  const pool = useMemo(() => seededShuffle(step.cards, step.id), [step]);
  const [count, setCount] = useState(0);
  const [missed, setMissed] = useState<ReadonlySet<number>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shake = useShake();
  const [first, last] = step.ends;
  const row = step.cards.slice(0, count);

  const pick = (id: string) => {
    if (outcome.done) return;
    if (step.cards[count]?.id !== id) {
      cues.play("wrong");
      emit("check:wrong");
      setMissed((m) => new Set(m).add(count));
      shake.start(id);
      return;
    }
    cues.play("correct");
    const next = count + 1;
    setCount(next);
    if (next === step.cards.length) {
      const firstTime = step.cards.length - missed.size;
      act({ type: "complete", score: cardScore(firstTime, step.cards.length, outcome.hints) });
      emit("check:correct");
      setFeedback({
        tone: "success",
        title: missed.size === 0 ? "In order, first time!" : "In order!",
        body: step.explanation ?? `${firstTime} of ${step.cards.length} places right first time.`,
      });
    }
  };

  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : null}
    >
      <p className="mb-2 text-sm text-muted">
        Tap them from <strong className="text-ink">{first}</strong> to <strong className="text-ink">{last}</strong>.
      </p>
      <ol aria-label="Your order" className="flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-line p-2">
        <li className="text-[11px] font-bold uppercase tracking-wider text-muted">{first}</li>
        {row.map((card, i) => (
          <li key={card.id} className="animate-pop rounded-xl bg-success/15 px-2.5 py-1.5 text-sm font-semibold text-ink">
            <span className="mr-1 tabular-nums text-muted">{i + 1}.</span>
            {card.label}
          </li>
        ))}
        <li className="ml-auto text-[11px] font-bold uppercase tracking-wider text-muted">{last}</li>
      </ol>
      <div role="group" aria-label="Cards to order" className="mt-3 flex flex-wrap justify-center gap-2">
        {pool
          .filter((card) => !row.includes(card))
          .map((card) => (
            <button
              key={`${card.id}-${shake.keyFor(card.id)}`}
              onAnimationEnd={shake.props(card.id).onAnimationEnd}
              type="button"
              onClick={() => pick(card.id)}
              className={`${cardClass(false)} ${shake.props(card.id).className}`}
            >
              <CardFace card={card} step={step} />
            </button>
          ))}
      </div>
    </Shell>
  );
}
