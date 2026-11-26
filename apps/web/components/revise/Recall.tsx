"use client";

import type { FormulaCard } from "@ise/content";
import { dayKey } from "@ise/progress-store";
import { useCallback, useEffect, useState } from "react";
import { useProgress } from "@/lib/progress";
import { recallDeck, type RecallPrompt } from "@/lib/recall";

const ASKED: Record<RecallPrompt["kind"], string> = {
  name: "Recall the formula",
  meaning: "What does it say?",
  gap: "Fill the gap",
};

/**
 * Flashcards over some formulas: think of the answer, show it, and say
 * honestly whether you knew it. Known cards come back later, the rest
 * tomorrow. Space shows the answer; 1 is "Knew it", 2 is "Not yet".
 */
export function Recall({ cards, onClose }: { cards: readonly FormulaCard[]; onClose: () => void }) {
  const { snapshot, store } = useProgress();
  const [deck, setDeck] = useState(() => recallDeck(cards, snapshot, dayKey()));
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [knew, setKnew] = useState(0);
  const current = deck[index];

  const answer = useCallback(
    (known: boolean) => {
      if (!current || !shown) return;
      void store.append({ type: "formula-reviewed", payload: { formulaId: current.card.id, knew: known } });
      if (known) setKnew((n) => n + 1);
      setIndex((i) => i + 1);
      setShown(false);
    },
    [current, shown, store],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.key === " " && !shown) {
        e.preventDefault();
        setShown(true);
      } else if (e.key === "1") answer(true);
      else if (e.key === "2") answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, shown]);

  if (deck.length === 0) {
    return (
      <section aria-label="Recall" className="rounded-3xl border border-line bg-surface p-6 text-center">
        <p className="font-display text-lg font-bold text-ink">Nothing due here</p>
        <p className="mt-1 text-sm text-muted">Every formula in this list has been reviewed and is not due yet. Try another class or chapter.</p>
        <button type="button" onClick={onClose} className="mt-5 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-ink">
          Back to the list
        </button>
      </section>
    );
  }

  if (!current) {
    const later = deck.length - knew;
    return (
      <section aria-label="Recall" className="rounded-3xl border border-line bg-surface p-6 text-center">
        <p className="font-display text-2xl font-extrabold text-ink">Done</p>
        <p className="mt-1 text-muted">
          {knew} knew · {later} to come back to tomorrow
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setDeck(recallDeck(cards, store.getSnapshot(), dayKey()));
              setIndex(0);
              setKnew(0);
            }}
            className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Again
          </button>
          <button type="button" onClick={onClose} className="rounded-xl border border-line px-5 py-2.5 text-sm font-semibold text-ink">
            Back to the list
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Recall" className="rounded-3xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted">
        <span>{ASKED[current.kind]}</span>
        <span>
          {index + 1} of {deck.length}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted">
        Class {current.card.grade} · {current.card.chapter.title}
      </p>
      <p className={`mt-5 text-center text-ink ${current.kind === "name" ? "font-display text-xl font-bold" : "math text-3xl"}`}>
        {current.question}
      </p>

      {shown ? (
        <>
          <p aria-label="Answer" className="mt-5 whitespace-pre-line rounded-2xl bg-surface-2/70 px-4 py-3 text-center text-lg text-ink">
            {current.answer}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => answer(true)} className="rounded-xl bg-success/90 px-4 py-3 text-sm font-bold text-white">
              Knew it
            </button>
            <button type="button" onClick={() => answer(false)} className="rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink">
              Not yet
            </button>
          </div>
        </>
      ) : (
        <button type="button" onClick={() => setShown(true)} className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white">
          Show answer
        </button>
      )}
      <button type="button" onClick={onClose} className="mt-4 w-full text-center text-sm text-muted hover:text-ink">
        Stop and go back to the list
      </button>
    </section>
  );
}
