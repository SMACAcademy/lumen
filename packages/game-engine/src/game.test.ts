import { motionInAStraightLine } from "@ise/content";
import { kinematicsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { type Level, LevelSchema } from "./level";
import { checkLevelIntegrity } from "./integrity";
import { levelRunReducer, startRun, summarizeRun } from "./run";
import { estimateScore, estimateVerdict, levelScore, predictionScore, starsFor, targetScore, xpFor } from "./scoring";

const level: Level = {
  schemaVersion: 1,
  id: "demo",
  concept: "unit-circle-sine-cosine",
  title: "Demo",
  summary: "A demo level.",
  xp: 20,
  steps: [
    { id: "look", kind: "intro", prompt: "Look." },
    {
      id: "hit",
      kind: "target",
      prompt: "Make sin θ = 1.",
      goal: { type: "compare", quantity: "sin", op: "gte", value: 0.99 },
      success: "Yes.",
      hints: ["Top."],
    },
    { id: "guess", kind: "estimate", prompt: "Guess.", quantity: "sin", range: { min: -1, max: 1, step: 0.05 }, tolerance: 0.05, explanation: "0.5", given: { theta: 0.5 } },
  ],
};

describe("scoring", () => {
  it("targets: full marks first time, less for retries and hints, floor 0.4", () => {
    expect(targetScore(1, 0)).toBe(1);
    expect(targetScore(2, 0)).toBe(0.75);
    expect(targetScore(1, 1)).toBeCloseTo(0.8, 12);
    expect(targetScore(9, 3)).toBe(0.4);
  });

  it("a wrong prediction still earns half", () => {
    expect(predictionScore(true)).toBe(1);
    expect(predictionScore(false)).toBe(0.5);
  });

  it("estimates: spot on inside tolerance, zero a quarter-span beyond", () => {
    expect(estimateScore(0.52, 0.5, 0.05, 2)).toBe(1);
    expect(estimateScore(0.8, 0.5, 0.05, 2)).toBeCloseTo(1 - 0.25 / 0.5, 12);
    expect(estimateScore(-0.5, 0.5, 0.05, 2)).toBe(0);
    expect(estimateVerdict(1)).toBe("spot-on");
    expect(estimateVerdict(0.6)).toBe("close");
    expect(estimateVerdict(0.1)).toBe("off");
  });

  it("stars and XP", () => {
    expect([starsFor(0.9), starsFor(0.7), starsFor(0.2)]).toEqual([3, 2, 1]);
    expect(levelScore([null, 1, 0.5])).toBe(0.75);
    expect(levelScore([null])).toBe(1);
    expect(xpFor(20, 3)).toBe(35);
  });
});

describe("level run", () => {
  const act = (run: ReturnType<typeof startRun>, ...actions: Parameters<typeof levelRunReducer>[2][]) =>
    actions.reduce((r, a) => levelRunReducer(level, r, a), run);

  it("cannot advance past an unfinished step", () => {
    const run = act(startRun(level), { type: "next" }, { type: "complete" }, { type: "next" }, { type: "next" });
    expect(run.stepIndex).toBe(1);
  });

  it("wrong checks count as attempts; a right one scores and completes", () => {
    const run = act(startRun(level), { type: "complete" }, { type: "next" }, { type: "check", correct: false }, { type: "hint" }, { type: "check", correct: true });
    expect(run.outcomes[1]).toEqual({ attempts: 2, hints: 1, done: true, score: 0.55 });
    // Nothing changes a completed step.
    expect(act(run, { type: "hint" }, { type: "check", correct: false })).toBe(run);
  });

  it("ungraded steps score null; the last next finishes the run", () => {
    const run = act(
      startRun(level),
      { type: "complete", score: 0.3 },
      { type: "next" },
      { type: "check", correct: true },
      { type: "next" },
      { type: "complete", score: 0.5 },
      { type: "next" },
    );
    expect(run.outcomes[0]!.score).toBeNull();
    expect(run.finished).toBe(true);
    expect(summarizeRun(level, run)).toEqual({ score: 0.75, stars: 2, xp: 30, perfectSteps: 1, gradedSteps: 2 });
    expect(act(run, { type: "restart" })).toEqual(startRun(level));
  });
});

describe("level schema", () => {
  it("accepts a valid level and rejects unknown step kinds", () => {
    expect(LevelSchema.safeParse(level).success).toBe(true);
    const broken = structuredClone(level) as unknown as { steps: { kind: string }[] };
    broken.steps[0]!.kind = "quiz";
    expect(LevelSchema.safeParse(broken).success).toBe(false);
  });
});

describe("goals must be checkable", () => {
  it("rejects a goal on an output that is not a number", () => {
    // `phase` is a label like "speeding up": comparing it can never come true.
    const broken: Level = {
      ...level,
      concept: "motion-in-a-straight-line",
      steps: [
        {
          id: "impossible",
          kind: "target",
          prompt: "Speed up.",
          goal: { type: "compare", quantity: "phase", op: "eq", value: 1 },
          success: "…",
          hints: ["…"],
        },
      ],
    };
    const messages = checkLevelIntegrity(broken, motionInAStraightLine, kinematicsModel).map((i) => i.message);
    expect(messages).toContain('goal compares "phase", which is not a number');
  });
});
