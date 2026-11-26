"use client";

import { cardScore, type SortStep, seededShuffle, sortAnswer } from "@ise/game-engine";
import { useMemo, useState } from "react";
import { useCues } from "@/lib/cues";
import { useLab } from "@/lib/lab-context";
import { CheckIcon } from "../../icons";
import { CardFace } from "../CardFace";
import { continueLabel, type Feedback, Shell, type StepProps } from "../StepShell";
import { cardClass, useShake } from "./shared";

/**
 * Sort: tap a card, then the bin it belongs in (or drag it there with a
 * mouse). A wrong bin shakes the card back to the tray; only first-time
 * placements count towards the score.
 */
export function SortBody({ step, outcome, act, isLast }: StepProps<SortStep>) {
  const { concept, model, emit } = useLab();
  const cues = useCues();
  const answer = useMemo(() => sortAnswer(concept, model, step), [concept, model, step]);
  const order = useMemo(() => seededShuffle(step.cards, step.id), [step]);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [missed, setMissed] = useState<ReadonlySet<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shake = useShake();

  const place = (cardId: string, binId: string) => {
    if (outcome.done || placed[cardId]) return;
    setSelected(null);
    if (answer[cardId] !== binId) {
      cues.play("wrong");
      emit("check:wrong");
      setMissed((m) => new Set(m).add(cardId));
      shake.start(cardId);
      return;
    }
    cues.play("correct");
    const next = { ...placed, [cardId]: binId };
    setPlaced(next);
    if (Object.keys(next).length === step.cards.length) {
      const right = step.cards.length - missed.size;
      act({ type: "complete", score: cardScore(right, step.cards.length, outcome.hints) });
      emit("check:correct");
      setFeedback({
        tone: "success",
        title: missed.size === 0 ? "Sorted — all first time!" : "Sorted!",
        body: step.explanation ?? `${right} of ${step.cards.length} right first time.`,
      });
    }
  };

  const tray = order.filter((c) => !placed[c.id]);
  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : null}
    >
      <div role="group" aria-label="Cards to sort" className="flex min-h-12 flex-wrap justify-center gap-2">
        {tray.map((card) => (
          <button
            key={`${card.id}-${shake.keyFor(card.id)}`}
            onAnimationEnd={shake.props(card.id).onAnimationEnd}
            type="button"
            draggable
            aria-pressed={selected === card.id}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", card.id)}
            onClick={() => {
              cues.play("tap");
              setSelected(selected === card.id ? null : card.id);
            }}
            className={`${cardClass(selected === card.id)} ${shake.props(card.id).className}`}
          >
            <CardFace card={card} step={step} />
          </button>
        ))}
        {tray.length === 0 && <p className="py-3 text-sm text-muted">Every card is sorted.</p>}
      </div>

      <div className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${step.bins.length}, minmax(0, 1fr))` }}>
        {step.bins.map((bin) => (
          <button
            key={bin.id}
            type="button"
            aria-label={`Put in ${bin.label}`}
            onClick={() => selected && place(selected, bin.id)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              place(e.dataTransfer.getData("text/plain"), bin.id);
            }}
            className={`flex min-h-28 flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-2 transition ${
              selected ? "border-accent/70 bg-accent/5" : "border-line"
            }`}
          >
            <span className="font-display text-sm font-bold text-ink">{bin.label}</span>
            <span className="flex flex-wrap justify-center gap-1">
              {step.cards
                .filter((c) => placed[c.id] === bin.id)
                .map((c) => (
                  <span key={c.id} className="animate-pop inline-flex items-center gap-1 rounded-lg bg-success/15 px-2 py-1 text-xs font-semibold text-ink">
                    <CheckIcon width={12} height={12} className="text-success" />
                    {c.label}
                  </span>
                ))}
            </span>
          </button>
        ))}
      </div>
    </Shell>
  );
}
