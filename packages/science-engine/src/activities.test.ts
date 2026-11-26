import { describe, expect, it } from "vitest";
import {
  type Condition,
  ConditionTracker,
  compare,
  conditionQuantities,
  evaluateCondition,
} from "./conditions";
import type { SimulationModel } from "./model";
import { classifyChange, measurePrediction } from "./prediction";

describe("compare", () => {
  it("handles tolerance and NaN", () => {
    expect(compare(0.5, "eq", 0.5004, 0.001)).toBe(true);
    expect(compare(0.5, "eq", 0.51, 0.001)).toBe(false);
    expect(compare(0.5, "neq", 0.51, 0.001)).toBe(true);
    expect(compare(1, "gte", 1)).toBe(true);
    expect(compare(Number.NaN, "lt", 1)).toBe(false);
  });
});

describe("evaluateCondition", () => {
  const ctx = { results: { sin: -0.5, cos: 0.866, thetaDeg: 210, quadrant: 3 }, mode: "sine" };

  it("evaluates comparisons, composites and mode", () => {
    const hit: Condition = { type: "compare", quantity: "sin", op: "eq", value: -0.5, tolerance: 0.01 };
    expect(evaluateCondition(hit, ctx)).toBe(true);
    expect(evaluateCondition({ type: "not", condition: hit }, ctx)).toBe(false);
    expect(
      evaluateCondition({ type: "all", conditions: [hit, { type: "mode", is: "sine" }] }, ctx),
    ).toBe(true);
    expect(evaluateCondition({ type: "any", conditions: [{ type: "mode", is: "cosine" }] }, ctx)).toBe(false);
    expect(
      evaluateCondition({ type: "compareQuantities", left: "cos", op: "gt", right: "sin" }, ctx),
    ).toBe(true);
  });

  it("treats unknown or non-numeric quantities as false", () => {
    expect(evaluateCondition({ type: "compare", quantity: "missing", op: "lt", value: 1 }, ctx)).toBe(false);
  });

  it("lists referenced quantities", () => {
    const c: Condition = {
      type: "all",
      conditions: [
        { type: "compareQuantities", left: "sin", op: "eq", right: "cos" },
        { type: "not", condition: { type: "compare", quantity: "thetaDeg", op: "eq", value: 45 } },
      ],
    };
    expect(conditionQuantities(c)).toEqual(["sin", "cos", "thetaDeg"]);
  });
});

describe("ConditionTracker", () => {
  it("latches visitedAll once every value was seen", () => {
    const tracker = new ConditionTracker(
      new Map<string, Condition>([
        ["quadrants", { type: "visitedAll", quantity: "quadrant", values: [1, 2, 3, 4] }],
        ["past90", { type: "compare", quantity: "thetaDeg", op: "gt", value: 90 }],
      ]),
    );
    expect(tracker.update({ results: { quadrant: 1, thetaDeg: 45 } })).toEqual([]);
    expect(tracker.update({ results: { quadrant: 2, thetaDeg: 120 } })).toEqual(["past90"]);
    tracker.update({ results: { quadrant: 3, thetaDeg: 200 } });
    expect(tracker.update({ results: { quadrant: 4, thetaDeg: 10 } })).toEqual(["quadrants"]);
    // Latched: stays satisfied even though θ is back below 90°.
    expect(tracker.isSatisfied("past90")).toBe(true);
    tracker.reset();
    expect(tracker.satisfied().size).toBe(0);
  });

  it("records events and trace coverage", () => {
    const tracker = new ConditionTracker(
      new Map<string, Condition>([
        ["played", { type: "event", name: "play" }],
        ["full", { type: "traceCoverage", min: 0.95 }],
      ]),
    );
    tracker.recordEvent("play");
    expect(tracker.update({ results: {}, traceCoverage: 0.5 })).toEqual(["played"]);
    expect(tracker.update({ results: {}, traceCoverage: 0.99 })).toEqual(["full"]);
  });
});

describe("predictions", () => {
  // y = x² on [-10, 10] — non-monotonic, so direction depends on the interval.
  const square: SimulationModel<{ x: number }, { k: number }, { y: number }> = {
    id: "square",
    defaultParams: { k: 1 },
    outputs: ["y"],
    stateVariables: ["x"],
    initialize: () => ({ x: 0 }),
    advance: (s) => s,
    step: (s) => s,
    derive: (s, p) => ({ y: p.k * s.x * s.x }),
    getVariable: (s) => s.x,
    setVariable: (_s, _id, v) => ({ x: v }),
  };

  it("classifies changes with tolerance", () => {
    expect(classifyChange(0.5, 0.8)).toBe("increase");
    expect(classifyChange(0.8, 0.5)).toBe("decrease");
    expect(classifyChange(0.5, 0.5 + 1e-12)).toBe("same");
  });

  it("measures outcomes by running the model", () => {
    const params = square.defaultParams;
    expect(measurePrediction(square, params, { variable: "x", from: 1, to: 2, quantity: "y" })).toEqual({
      before: 1,
      after: 4,
      outcome: "increase",
    });
    expect(measurePrediction(square, params, { variable: "x", from: -2, to: -1, quantity: "y" }).outcome).toBe(
      "decrease",
    );
    expect(measurePrediction(square, params, { variable: "x", from: -3, to: 3, quantity: "y" }).outcome).toBe(
      "same",
    );
  });
});
