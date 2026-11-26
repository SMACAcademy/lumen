"use client";

import { type Card, cardScore, type MatchStep, seededShuffle } from "@ise/game-engine";
import { useMemo, useState } from "react";
import { useCues } from "@/lib/cues";
import { useLab } from "@/lib/lab-context";
import { CardFace } from "../CardFace";
import { continueLabel, type Feedback, Shell, type StepProps } from "../StepShell";
import { cardClass, PAIR_COLORS, useShake } from "./shared";

type Side = "left" | "right";

/**
 * Match: tap a card on one side, then its partner on the other. A right pair
 * locks together in a shared colour; a wrong one shakes, and that pair no
 * longer counts as first-time.
 */
export function MatchBody({ step, outcome, act, isLast }: StepProps<MatchStep>) {
  const { emit } = useLab();
  const cues = useCues();
  const right = useMemo(() => seededShuffle(step.pairs.map((p) => p.right), step.id), [step]);
  const pairOf = useMemo(() => new Map(step.pairs.flatMap((p, i) => [[p.left.id, i] as const, [p.right.id, i] as const])), [step]);
  const [matched, setMatched] = useState<number[]>([]);
  const [missed, setMissed] = useState<ReadonlySet<number>>(new Set());
  const [selected, setSelected] = useState<{ side: Side; id: string } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const shake = useShake();

  const choose = (side: Side, card: Card) => {
    const pair = pairOf.get(card.id)!;
    if (outcome.done || matched.includes(pair)) return;
    if (!selected || selected.side === side) {
      cues.play("tap");
      setSelected(selected?.id === card.id ? null : { side, id: card.id });
      return;
    }
    const other = pairOf.get(selected.id)!;
    setSelected(null);
    if (other !== pair) {
      cues.play("wrong");
      emit("check:wrong");
      const leftPair = side === "left" ? pair : other;
      setMissed((m) => new Set(m).add(leftPair));
      shake.start(card.id);
      return;
    }
    cues.play("correct");
    const next = [...matched, pair];
    setMatched(next);
    if (next.length === step.pairs.length) {
      const firstTime = step.pairs.length - missed.size;
      act({ type: "complete", score: cardScore(firstTime, step.pairs.length, outcome.hints) });
      emit("check:correct");
      setFeedback({
        tone: "success",
        title: missed.size === 0 ? "Every pair, first time!" : "All matched!",
        body: step.explanation ?? `${firstTime} of ${step.pairs.length} pairs right first time.`,
      });
    }
  };

  const face = (side: Side, card: Card) => {
    const pair = pairOf.get(card.id)!;
    const done = matched.indexOf(pair);
    const color = done >= 0 ? PAIR_COLORS[done % PAIR_COLORS.length] : undefined;
    return (
      <button
        key={`${card.id}-${shake.keyFor(card.id)}`}
        onAnimationEnd={shake.props(card.id).onAnimationEnd}
        type="button"
        aria-pressed={selected?.id === card.id}
        aria-label={done >= 0 ? `${card.label} (matched)` : card.label}
        disabled={done >= 0 || outcome.done}
        onClick={() => choose(side, card)}
        className={`w-full ${cardClass(selected?.id === card.id)} ${shake.props(card.id).className} disabled:cursor-default`}
        style={color ? { borderColor: color, background: `color-mix(in srgb, ${color} 14%, var(--lab-surface))` } : undefined}
      >
        <CardFace card={card} step={step} />
      </button>
    );
  };

  return (
    <Shell
      step={step}
      outcome={outcome}
      act={act}
      feedback={feedback}
      primary={outcome.done ? { label: continueLabel(isLast), onClick: () => act({ type: "next" }) } : null}
    >
      <div className="grid grid-cols-2 gap-3">
        <div role="group" aria-label="Left" className="space-y-2">
          {step.pairs.map((p) => face("left", p.left))}
        </div>
        <div role="group" aria-label="Right" className="space-y-2">
          {right.map((card) => face("right", card))}
        </div>
      </div>
    </Shell>
  );
}
