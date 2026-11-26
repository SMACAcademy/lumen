import { describe, expect, it } from "vitest";
import {
  LP_PROBLEM_ORDER,
  LP_PROBLEMS,
  linprogModel as model,
  lpClip,
  lpCompare,
  lpConstraintText,
  lpFraction,
  lpFractionText,
  lpIntegerCount,
  lpIntersect,
  lpIntervalOf,
  lpLinearText,
  lpOneSideText,
  lpProblemRegion,
  lpRegion,
  lpSolveOne,
  lpValue,
  lpVisibleRegion,
  type LinprogParams,
  type LinprogState,
} from "./linprog";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<LinprogParams> = {}, state: Partial<LinprogState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const corners = (id: (typeof LP_PROBLEM_ORDER)[number]) => lpProblemRegion(id).corners.map((k) => [lpValue(k.x), lpValue(k.y), lpValue(k.z)]);

describe("exact fractions", () => {
  it("keep lowest terms with a positive denominator", () => {
    expect(lpFraction(6, -4)).toEqual({ n: -3, d: 2 });
    expect(lpFraction(0, -5)).toEqual({ n: 0, d: 1 });
    expect(lpCompare(lpFraction(1, 3), lpFraction(2, 6))).toBe(0);
    expect(lpCompare(lpFraction(-1, 2), lpFraction(-1, 3))).toBe(-1);
    expect(lpFractionText(lpFraction(-7, 2))).toBe("−7/2");
  });

  it("write expressions the way a textbook does", () => {
    expect(lpOneSideText(3, -4)).toBe("3x − 4");
    expect(lpOneSideText(-1, 2)).toBe("−x + 2");
    expect(lpOneSideText(0, -3)).toBe("−3");
    expect(lpLinearText(250, 75)).toBe("250x + 75y");
    expect(lpLinearText(1, -1)).toBe("x − y");
    expect(lpLinearText(-50, 20)).toBe("−50x + 20y");
    expect(lpConstraintText({ a: 2, b: -1, rel: "ge", c: -5 })).toBe("2x − y ≥ −5");
  });
});

describe("one variable", () => {
  it("solves 3x − 4 < 8 as x < 4, with an open dot", () => {
    expect(lpSolveOne(3, -4, "lt", 8)).toEqual({ kind: "below", bound: { n: 4, d: 1 }, closed: false, flipped: false });
    expect(derive({ rel1: "lt" }, { a: 3, b: -4, c: 8 })).toMatchObject({ bound1: 4, dir1: -1, closed1: 0, flipped1: 0 });
  });

  it("turns the sign round when dividing by a negative number", () => {
    // −3x > 9 → x < −3; 5 − 2x ≤ 1 → −2x ≤ −4 → x ≥ 2; −x + 4 < 1 → x > 3.
    expect(lpSolveOne(-3, 0, "gt", 9)).toMatchObject({ kind: "below", bound: { n: -3, d: 1 }, flipped: true });
    expect(lpSolveOne(-2, 5, "le", 1)).toMatchObject({ kind: "above", bound: { n: 2, d: 1 }, closed: true, flipped: true });
    expect(lpSolveOne(-1, 4, "lt", 1)).toMatchObject({ kind: "above", bound: { n: 3, d: 1 }, closed: false });
    // The same numbers with a positive coefficient go the other way.
    expect(lpSolveOne(3, 0, "gt", 9).kind).toBe("above");
  });

  it("checks every claimed answer by putting numbers back in", () => {
    for (const a of [-5, -3, -1, 1, 2, 5])
      for (const b of [-7, 0, 4])
        for (const c of [-6, 1, 9])
          for (const rel of ["lt", "le", "gt", "ge"] as const) {
            const s = lpSolveOne(a, b, rel, c);
            const bound = lpValue(s.bound);
            for (const x of [bound - 1, bound - 0.01, bound, bound + 0.01, bound + 1]) {
              const inSet = x === bound ? s.closed : s.kind === "above" ? x > bound : x < bound;
              const holds = rel === "lt" ? a * x + b < c : rel === "le" ? a * x + b <= c : rel === "gt" ? a * x + b > c : a * x + b >= c;
              if (x !== bound) expect(holds, `${a}x + ${b} ${rel} ${c} at ${x}`).toBe(inSet);
            }
          }
  });

  it("handles a = 0: always true or never", () => {
    expect(derive({ rel1: "lt" }, { a: 0, b: 2, c: 5 })).toMatchObject({ dir1: 2, bound1: 0 });
    expect(derive({ rel1: "gt" }, { a: 0, b: 2, c: 5 })).toMatchObject({ dir1: 0 });
  });

  it("solves −8 ≤ 5x − 3 < 7 as −1 ≤ x < 2, with three whole numbers", () => {
    const r = derive({ rel1: "ge", rel2: "lt" }, { a: 5, b: -3, c: -8, a2: 5, b2: -3, c2: 7 });
    expect(r).toMatchObject({ setKind: 1, lo: -1, loClosed: 1, hi: 2, hiClosed: 0, integers: 3 });
  });

  it("finds 3x − 7 > 2(x − 6) and 6 − x > 11 − 2x together give x > 5", () => {
    // Rearranged: x > −5 and x > 5 (NCERT exercise 5.1).
    expect(derive({ rel1: "gt", rel2: "gt" }, { a: 1, b: 0, c: -5, a2: 1, b2: 0, c2: 5 })).toMatchObject({ setKind: 2, lo: 5, loClosed: 0, integers: 0 });
  });

  it("finds an empty answer, a single number, and everything", () => {
    expect(derive({ rel1: "lt", rel2: "gt" }, { a: 1, b: 0, c: 1, a2: 1, b2: 0, c2: 3 }).setKind).toBe(0);
    expect(derive({ rel1: "le", rel2: "ge" }, { a: 1, b: 0, c: 2, a2: 1, b2: 0, c2: 2 })).toMatchObject({ setKind: 1, lo: 2, hi: 2, integers: 1 });
    expect(derive({ rel1: "lt", rel2: "ge" }, { a: 1, b: 0, c: 2, a2: 1, b2: 0, c2: 2 }).setKind).toBe(0);
    expect(derive({ rel1: "lt", rel2: "lt" }, { a: 0, b: 0, c: 1, a2: 0, b2: 0, c2: 1 }).setKind).toBe(4);
    expect(lpIntegerCount(lpIntersect(lpIntervalOf(lpSolveOne(2, 0, "gt", 1)), lpIntervalOf(lpSolveOne(2, 0, "le", 9))))).toBe(4);
  });

  it("tests a number against both inequalities", () => {
    // 2x − 3 ≥ 1 and x + 1 < 6: 2 ≤ x < 5.
    const at = (t: number) => derive({ rel1: "ge", rel2: "lt" }, { a: 2, b: -3, c: 1, a2: 1, b2: 1, c2: 6, t });
    expect(at(3)).toMatchObject({ holds1: 1, holds2: 1, holdsBoth: 1 });
    expect(at(5)).toMatchObject({ holds1: 1, holds2: 0, holdsBoth: 0 });
    expect(at(2)).toMatchObject({ holds1: 1, holdsBoth: 1 });
    expect(at(1.5).holds1).toBe(0);
  });
});

describe("two variables", () => {
  it("tests a point and the origin against a half-plane", () => {
    // 3x + 2y > 6: the boundary is dashed, (0, 0) is not a solution, (2, 1) is, (2, 0) is on the line and is not.
    expect(derive({ rel: "gt" }, { p: 3, q: 2, r: 6, u: 2, v: 1 })).toMatchObject({ lhs: 8, holds: 1, originHolds: 0, strict: 1, onBoundary: 0 });
    expect(derive({ rel: "gt" }, { p: 3, q: 2, r: 6, u: 2, v: 0 })).toMatchObject({ holds: 0, onBoundary: 1 });
    expect(derive({ rel: "ge" }, { p: 3, q: 2, r: 6, u: 2, v: 0 })).toMatchObject({ holds: 1, strict: 0 });
    expect(derive({ rel: "le" }, { p: -2, q: 5, r: 0 }).originHolds).toBe(1);
    expect(derive({ rel: "le" }, { p: 0, q: 0, r: 3 }).degenerate).toBe(1);
  });
});

describe("linear programming (NCERT class 12, chapter 12)", () => {
  it("lists every problem's corners, each on the region", () => {
    for (const id of LP_PROBLEM_ORDER) {
      const problem = LP_PROBLEMS[id];
      for (const [x, y] of corners(id)) {
        for (const k of problem.constraints) {
          const lhs = k.a * x! + k.b * y!;
          expect(k.rel === "le" ? lhs <= k.c + 1e-9 : lhs >= k.c - 1e-9, `${id} (${x}, ${y})`).toBe(true);
        }
        expect(x! <= problem.view[0] && y! <= problem.view[1], `${id} corner in view`).toBe(true);
      }
    }
  });

  it("furniture dealer: 10 tables and 50 chairs make the most, Rs 6250", () => {
    expect(corners("furniture")).toEqual([[0, 0, 0], [20, 0, 5000], [10, 50, 6250], [0, 60, 4500]]);
    expect(derive({ problem: "furniture" })).toMatchObject({ goalMax: 1, regionKind: 1, cornerCount: 4, hasBest: 1, best: 6250, bestX: 10, bestY: 50, bestCount: 1, beyondMeets: 0, zLow: 0, zHigh: 6250 });
  });

  it("first worked example: Z = 4x + y is largest, 120, at (30, 0)", () => {
    expect(corners("simple")).toEqual([[0, 0, 0], [30, 0, 120], [20, 30, 110], [0, 50, 50]]);
    expect(derive({ problem: "simple" })).toMatchObject({ best: 120, bestX: 30, bestY: 0 });
  });

  it("second worked example: Z = 200x + 500y is least, 2300, at (4, 3)", () => {
    expect(corners("cost")).toEqual([[0, 5, 2500], [4, 3, 2300], [0, 6, 3000]]);
    expect(derive({ problem: "cost" })).toMatchObject({ goalMax: 0, regionKind: 1, best: 2300, bestX: 4, bestY: 3 });
  });

  it("third worked example: Z = 3x + 9y is largest, 180, all along an edge; least 60 at (5, 5)", () => {
    expect(corners("tie")).toEqual([[0, 10, 90], [5, 5, 60], [15, 15, 180], [0, 20, 180]]);
    expect(derive({ problem: "tie" })).toMatchObject({ best: 180, bestCount: 2, bestX: 15, bestY: 15, zLow: 60 });
  });

  it("the diet problem: unbounded, but the minimum Rs 380 at (2, 4) stands, as 50x + 70y < 380 misses the region", () => {
    expect(corners("diet")).toEqual([[0, 8, 560], [2, 4, 380], [10, 0, 500]]);
    const r = derive({ problem: "diet" });
    expect(r).toMatchObject({ regionKind: 2, bounded: 0, hasBest: 1, best: 380, bestX: 2, bestY: 4, beyondMeets: 0, goalMax: 0 });
  });

  it("fourth worked example: Z = −50x + 20y has no minimum — Z < −300 still meets the region", () => {
    expect(corners("nomin")).toEqual([[0, 3, 60], [1, 0, -50], [6, 0, -300], [0, 5, 100]]);
    expect(derive({ problem: "nomin" })).toMatchObject({ regionKind: 2, hasBest: 0, best: 0, beyondMeets: 1, zLow: -300, zHigh: 100 });
  });

  it("fifth worked example: x + y ≥ 8 and 3x + 5y ≤ 15 leave nothing", () => {
    expect(derive({ problem: "empty" })).toMatchObject({ feasible: 0, regionKind: 0, cornerCount: 0, hasBest: 0, corner: 0, isoMeets: 0 });
    expect(lpVisibleRegion(LP_PROBLEMS.empty.constraints, 10, 10)).toEqual([]);
  });

  it("handles a single-point region, a ray, and an unbounded region whose Z stays bounded", () => {
    const pt = lpRegion([{ a: 1, b: 1, rel: "le", c: 0 }], 1, 1);
    expect(pt).toMatchObject({ feasible: true, bounded: true, supInfinite: false, infInfinite: false });
    expect(pt.corners.map((k) => [lpValue(k.x), lpValue(k.y)])).toEqual([[0, 0]]);
    // x = y, x ≥ 2: a ray from (2, 2) along (1, 1).
    const ray = lpRegion([{ a: 1, b: -1, rel: "le", c: 0 }, { a: 1, b: -1, rel: "ge", c: 0 }, { a: 1, b: 0, rel: "ge", c: 2 }], 1, -1);
    expect(ray).toMatchObject({ feasible: true, bounded: false, supInfinite: false, infInfinite: false });
    expect(ray.corners.map((k) => [lpValue(k.x), lpValue(k.y)])).toEqual([[2, 2]]);
    // On the unbounded diet region Z = −x − y still has a maximum, −6 at (2, 4).
    const diet = lpRegion(LP_PROBLEMS.diet.constraints, -1, -1);
    expect(diet).toMatchObject({ bounded: false, supInfinite: false, infInfinite: true });
    // The diet region has no maximum cost: Z > 560 still meets it.
    expect(lpProblemRegion("diet").supInfinite).toBe(true);
  });

  it("steps through the corners and spots the best one", () => {
    const at = (corner: number) => derive({ problem: "furniture" }, { corner });
    expect(at(1)).toMatchObject({ corner: 1, cornerX: 0, cornerY: 0, cornerZ: 0, cornerIsBest: 0 });
    expect(at(3)).toMatchObject({ cornerX: 10, cornerY: 50, cornerZ: 6250, cornerIsBest: 1 });
    expect(at(6).corner).toBe(4);
    expect(derive({ problem: "tie" }, { corner: 4 }).cornerIsBest).toBe(1);
    expect(model.step({ ...base, corner: 4 }, { ...model.defaultParams, problem: "furniture" }, 1).corner).toBe(4);
    expect(model.step({ ...base, corner: 2 }, { ...model.defaultParams, problem: "furniture" }, 1).corner).toBe(3);
  });

  it("slides the iso-profit line: it leaves the furniture region at k = 6250", () => {
    const at = (s: number) => derive({ problem: "furniture" }, { s });
    expect(at(0.5)).toMatchObject({ k: 5000, isoMeets: 1, isoAtBest: 0 });
    expect(at(0.625)).toMatchObject({ k: 6250, isoMeets: 1, isoAtBest: 1 });
    expect(at(0.63)).toMatchObject({ isoMeets: 0, isoAtBest: 0 });
    expect(derive({ problem: "simple" }, { s: 0.6 })).toMatchObject({ k: 120, isoAtBest: 1 });
    expect(derive({ problem: "diet" }, { s: 0.38 })).toMatchObject({ k: 380, isoAtBest: 1 });
    // Unbounded above: any cost from 380 up meets the diet region.
    expect(derive({ problem: "diet" }, { s: 1 }).isoMeets).toBe(1);
    expect(derive({ problem: "diet" }, { s: 0.3 }).isoMeets).toBe(0);
    expect(derive({ problem: "nomin" }, { s: 0 })).toMatchObject({ k: -600, isoMeets: 1, isoAtBest: 0 });
  });

  it("tests a trial plan against the constraints and prices it", () => {
    expect(derive({ problem: "furniture" }, { rx: 10, ry: 40 })).toMatchObject({ inRegion: 1, broken: 0, pointZ: 5500 });
    expect(derive({ problem: "furniture" }, { rx: 30, ry: 40 })).toMatchObject({ inRegion: 0, broken: 2 });
    expect(derive({ problem: "diet" }, { rx: 1, ry: 1 })).toMatchObject({ inRegion: 0, broken: 2 });
    expect(derive({ problem: "diet" }, { rx: 50, ry: 50 })).toMatchObject({ rx: 12, ry: 10 });
  });

  it("clips a polygon to a half-plane", () => {
    const square: [number, number][] = [[0, 0], [2, 0], [2, 2], [0, 2]];
    expect(lpClip(square, { a: 1, b: 0, rel: "le", c: 1 })).toEqual([[0, 0], [1, 0], [1, 2], [0, 2]]);
    const furniture = lpVisibleRegion(LP_PROBLEMS.furniture.constraints, 64, 110);
    expect(furniture).toHaveLength(4);
  });
});

describe("the model contract", () => {
  it("clamps every variable to its control's range", () => {
    expect(model.setVariable(base, "a", 9, model.defaultParams).a).toBe(5);
    expect(model.setVariable(base, "a", 2.4, model.defaultParams).a).toBe(2);
    expect(model.setVariable(base, "r", -40, model.defaultParams).r).toBe(-12);
    expect(model.setVariable(base, "t", 3.3, model.defaultParams).t).toBe(3.5);
    expect(model.setVariable(base, "s", 2, model.defaultParams).s).toBe(1);
    expect(model.setVariable(base, "corner", 0, model.defaultParams).corner).toBe(1);
    expect(model.setVariable(base, "nope", 1, model.defaultParams)).toBe(base);
  });

  it("gives a finite number for every output of every problem", () => {
    for (const problem of LP_PROBLEM_ORDER)
      for (const rel of ["lt", "le", "gt", "ge"] as const) {
        const r = derive({ problem, rel1: rel, rel2: rel, rel }, { a: 0, p: 0, q: 0 });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), `${problem} ${key}`).toBe(true);
          expect(Object.is(r[key], -0), `${problem} ${key} is −0`).toBe(false);
        }
      }
  });

  it("slides the iso-line on Play and wraps round", () => {
    expect(model.advance({ ...base, s: 0.5 }, 1, model.defaultParams).s).toBeCloseTo(0.58, 9);
    expect(model.advance({ ...base, s: 0.99 }, 1, model.defaultParams).s).toBe(0);
  });
});
