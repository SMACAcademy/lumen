/**
 * Scores are in [0, 1]. Every graded step produces one; a level's stars come
 * from their mean. Completing a level always earns at least one star —
 * learning by getting things wrong is the point, not a failure.
 */

/** Target steps: full marks first time without hints, never below 0.4 once solved. */
export function targetScore(attempts: number, hints: number): number {
  const wrong = Math.max(0, attempts - 1);
  return Math.max(0.4, 1 - 0.25 * wrong - 0.2 * hints);
}

/** A wrong prediction still earns half: the surprise is where the learning happens. */
export function predictionScore(correct: boolean, hints = 0): number {
  return Math.max(0.3, (correct ? 1 : 0.5) - 0.2 * hints);
}

/**
 * Estimates: spot on within `tolerance`, then falling linearly to zero at a
 * quarter of the slider's span beyond it.
 */
export function estimateScore(guess: number, truth: number, tolerance: number, span: number, hints = 0): number {
  const error = Math.abs(guess - truth);
  const closeness = error <= tolerance ? 1 : Math.max(0, 1 - (error - tolerance) / (0.25 * span));
  return Math.max(0, closeness - 0.2 * hints);
}

/** Sort, match and order: the share placed right first time, less hints; never below 0.3 once finished. */
export function cardScore(firstTryRight: number, total: number, hints = 0): number {
  if (total <= 0) return 1;
  return Math.max(0.3, firstTryRight / total - 0.2 * hints);
}

/** Tap: right catches less wrong ones, over how many there were to catch; never below 0.2. */
export function tapScore(hits: number, wrongTaps: number, correctCount: number, hints = 0): number {
  if (correctCount <= 0) return 1;
  return Math.max(0.2, Math.max(0, (hits - wrongTaps) / correctCount) - 0.2 * hints);
}

export type EstimateVerdict = "spot-on" | "close" | "off";

export function estimateVerdict(score: number): EstimateVerdict {
  return score >= 0.999 ? "spot-on" : score >= 0.5 ? "close" : "off";
}

export type Stars = 1 | 2 | 3;

export function starsFor(score: number): Stars {
  return score >= 0.85 ? 3 : score >= 0.6 ? 2 : 1;
}

/** Mean of graded scores; a level with nothing graded is a perfect score. */
export function levelScore(scores: readonly (number | null)[]): number {
  const graded = scores.filter((s): s is number => s !== null);
  return graded.length === 0 ? 1 : graded.reduce((a, b) => a + b, 0) / graded.length;
}

/** XP: the level's base plus a bonus per star. */
export function xpFor(baseXp: number, stars: Stars): number {
  return baseXp + 5 * stars;
}
