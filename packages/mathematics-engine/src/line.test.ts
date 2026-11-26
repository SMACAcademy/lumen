import { describe, expect, it } from "vitest";
import { lineModel as model, pointQuadrant, type LineState } from "./line";

const base: LineState = { m: 2, c: 1, m2: -1, c2: 4, x: 0, y: 0 };
const derive = (over: Partial<LineState> = {}) => model.derive({ ...base, ...over }, model.defaultParams);

describe("a point and a line", () => {
  it("is on y = mx + c exactly when the equation holds", () => {
    expect(derive({ x: 2, y: 5 })).toMatchObject({ onLine: 1, lineY: 5 });
    expect(derive({ x: 2, y: 4 }).onLine).toBe(0);
    expect(derive({ x: -1, y: -1 }).onLine).toBe(1);
  });

  it("crosses the y-axis at c and the x-axis at −c/m", () => {
    expect(derive({ x: 0, y: 1 }).onLine).toBe(1);
    expect(derive()).toMatchObject({ xIntercept: -0.5, hasXIntercept: 1 });
    expect(derive({ m: 0, c: 3 })).toMatchObject({ hasXIntercept: 0, xIntercept: 0 });
  });

  it("knows the quadrants", () => {
    expect([pointQuadrant(1, 1), pointQuadrant(-1, 1), pointQuadrant(-1, -1), pointQuadrant(1, -1), pointQuadrant(0, 3)]).toEqual([1, 2, 3, 4, 0]);
  });
});

describe("a pair of lines", () => {
  it("meets once, where both equations hold", () => {
    const r = derive();
    expect(r).toMatchObject({ solutions: 1, parallel: 0, meetX: 1, meetY: 3 });
    expect(derive({ x: 1, y: 3 })).toMatchObject({ onLine: 1, onLine2: 1 });
  });

  it("never meets when parallel, and meets everywhere when the same line", () => {
    expect(derive({ m2: 2, c2: 5 })).toMatchObject({ parallel: 1, solutions: 0 });
    expect(derive({ m2: 2, c2: 1 })).toMatchObject({ parallel: 1, solutions: 2 });
  });
});

describe("the model", () => {
  it("walks the point along the first line on Play", () => {
    const s = model.advance({ ...base, x: 0, y: 1 }, 1, model.defaultParams);
    expect(s.x).toBeCloseTo(1.5, 12);
    expect(s.y).toBeCloseTo(4, 12);
    expect(model.derive(s, model.defaultParams).onLine).toBe(1);
    expect(model.advance({ ...base, x: 7.9 }, 1, model.defaultParams).x).toBe(-8);
  });

  it("keeps slopes and points on the plane, and numbers every output", () => {
    expect(model.setVariable(base, "m", 9, model.defaultParams).m).toBe(5);
    expect(model.setVariable(base, "x", -20, model.defaultParams).x).toBe(-8);
    const r = derive();
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
