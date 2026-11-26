/**
 * The state of one play-through of a level, as a pure reducer. The UI decides
 * *whether* an answer is right (by asking the model); the run records what
 * happened and turns it into a score.
 */

import { type Level, isGraded } from "./level";
import { type Stars, levelScore, starsFor, targetScore, xpFor } from "./scoring";

export interface StepOutcome {
  /** Checks made (target steps). */
  attempts: number;
  hints: number;
  done: boolean;
  /** Null for ungraded steps. */
  score: number | null;
}

export interface LevelRun {
  levelId: string;
  stepIndex: number;
  outcomes: readonly StepOutcome[];
  finished: boolean;
}

export type LevelRunAction =
  /** A target check: wrong answers count as attempts; a right one completes the step. */
  | { type: "check"; correct: boolean }
  | { type: "hint" }
  /** Complete the current step, with a score for graded non-target steps. */
  | { type: "complete"; score?: number }
  | { type: "next" }
  | { type: "restart" };

const fresh = (): StepOutcome => ({ attempts: 0, hints: 0, done: false, score: null });

export function startRun(level: Level): LevelRun {
  return { levelId: level.id, stepIndex: 0, outcomes: level.steps.map(fresh), finished: false };
}

export function levelRunReducer(level: Level, run: LevelRun, action: LevelRunAction): LevelRun {
  if (action.type === "restart") return startRun(level);
  if (run.finished) return run;
  const step = level.steps[run.stepIndex];
  const current = run.outcomes[run.stepIndex];
  if (!step || !current) return run;

  const update = (outcome: StepOutcome): LevelRun => ({
    ...run,
    outcomes: run.outcomes.map((o, i) => (i === run.stepIndex ? outcome : o)),
  });

  switch (action.type) {
    case "hint":
      return current.done ? run : update({ ...current, hints: current.hints + 1 });
    case "check": {
      if (current.done) return run;
      const attempts = current.attempts + 1;
      if (!action.correct) return update({ ...current, attempts });
      return update({ ...current, attempts, done: true, score: targetScore(attempts, current.hints) });
    }
    case "complete": {
      if (current.done) return run;
      const score = isGraded(step) ? (action.score ?? 1) : null;
      return update({ ...current, done: true, score });
    }
    case "next": {
      if (!current.done) return run;
      const last = run.stepIndex >= level.steps.length - 1;
      return last ? { ...run, finished: true } : { ...run, stepIndex: run.stepIndex + 1 };
    }
  }
}

export interface RunSummary {
  score: number;
  stars: Stars;
  xp: number;
  /** Graded steps answered right first time, without hints. */
  perfectSteps: number;
  gradedSteps: number;
}

export function summarizeRun(level: Level, run: LevelRun): RunSummary {
  const score = levelScore(run.outcomes.map((o) => o.score));
  const stars = starsFor(score);
  const graded = run.outcomes.filter((o, i) => level.steps[i] && isGraded(level.steps[i]!));
  return {
    score,
    stars,
    xp: xpFor(level.xp, stars),
    perfectSteps: graded.filter((o) => o.score !== null && o.score >= 0.999).length,
    gradedSteps: graded.length,
  };
}
