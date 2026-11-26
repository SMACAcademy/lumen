"use client";

import { useCallback, useState } from "react";

/** The look of a card button, raised when selected. */
export function cardClass(selected: boolean): string {
  return `rounded-2xl border-2 bg-surface px-3 py-2 text-ink shadow-[0_3px_0_0] shadow-line transition active:translate-y-0.5 ${
    selected ? "border-accent bg-accent/10 -translate-y-0.5" : "border-line hover:border-accent/60"
  }`;
}

/**
 * Which card is shaking after a wrong move. Each shake bumps a key, so the
 * same card shaking twice replays the animation; it settles when it ends.
 */
export function useShake() {
  const [shaking, setShaking] = useState<{ id: string; n: number } | null>(null);
  const start = useCallback((id: string) => setShaking((s) => ({ id, n: (s?.n ?? 0) + 1 })), []);
  const stop = useCallback(() => setShaking(null), []);
  return {
    start,
    keyFor: (id: string) => (shaking?.id === id ? shaking.n : 0),
    /** Class and handler for a card: it shakes red once, then settles. */
    props: (id: string) =>
      shaking?.id === id ? { className: "animate-shake border-cosine", onAnimationEnd: stop } : { className: "", onAnimationEnd: undefined },
  };
}

/** Colours pairs are marked with once matched, in turn. */
export const PAIR_COLORS = ["var(--lab-sine)", "var(--lab-cosine)", "var(--lab-tangent)", "var(--lab-angle)", "var(--lab-curve)", "var(--lab-secant)"] as const;
