import { describe, expect, it } from "vitest";
import {
  SLOPE_FIELD_EQUATION_ORDER,
  SLOPE_FIELD_EQUATIONS,
  SLOPE_FIELD_EXAMPLE_ORDER,
  SLOPE_FIELD_EXAMPLES,
  SLOPE_FIELD_PROCESS_ORDER,
  slopeFieldEuler,
  slopeFieldExact,
  slopeFieldModel as model,
  slopeFieldRate,
  type SlopeFieldParams,
  type SlopeFieldState,
} from "./slopefield";

const base: SlopeFieldState = model.initialize(model.defaultParams);
const derive = (params: Partial<SlopeFieldParams> = {}, state: Partial<SlopeFieldState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const H = 1e-5;

describe("the exact solutions", () => {
  it("satisfy their equations wherever they exist", () => {
    for (const id of SLOPE_FIELD_EQUATION_ORDER) {
      const eq = SLOPE_FIELD_EQUATIONS[id];
      for (const [x0, y0] of [...eq.family, [0.5, 0.7], [-1, -0.4]] as const) {
        const y = eq.through(x0, y0);
        expect(y(x0), `${id} through (${x0}, ${y0})`).toBeCloseTo(y0, 10);
        let checked = 0;
        for (let i = 1; i < 40; i++) {
          const x = eq.x[0] + ((eq.x[1] - eq.x[0]) * i) / 40;
          const [a, b, c] = [y(x - H), y(x), y(x + H)];
          if (![a, b, c].every(Number.isFinite) || Math.abs(b) > 50 || Math.abs(eq.f(x, b)) > 50) continue;
          expect((c - a) / (2 * H), `${id} from (${x0}, ${y0}) at x = ${x}`).toBeCloseTo(eq.f(x, b), 4);
          checked++;
        }
        expect(checked, `${id} from (${x0}, ${y0})`).toBeGreaterThan(5);
      }
    }
  });

  it("find the constant from the starting point, and the same constant from any point on the curve", () => {
    for (const id of SLOPE_FIELD_EQUATION_ORDER) {
      const eq = SLOPE_FIELD_EQUATIONS[id];
      const y = eq.through(0.3, 0.6);
      const c = eq.constant(0.3, 0.6);
      expect(eq.constant(0.5, y(0.5)), id).toBeCloseTo(c, 9);
    }
    expect(derive({ equation: "growth" }, { x0: 0, y0: 3 }).constant).toBe(3);
    expect(derive({ equation: "parabolas" }, { x0: 2, y0: 2 }).constant).toBe(0);
    expect(derive({ equation: "circles" }, { x0: 0, y0: 2 }).constant).toBe(4);
    expect(derive({ equation: "linear" }, { x0: 0, y0: -1 }).constant).toBe(0);
  });

  it("solves dy/dx + y = x from y(0) = 0 as y = x − 1 + e⁻ˣ", () => {
    const r = derive({ equation: "linear" }, { x0: 0, y0: 0, xEnd: 2 });
    expect(r.constant).toBe(1);
    expect(r.yExact).toBeCloseTo(1 + Math.exp(-2), 12);
    expect(r.yExact).toBeCloseTo(1.135, 3);
  });

  it("keeps a circle's solution on its own half and stops it at the edge", () => {
    const top = SLOPE_FIELD_EQUATIONS.circles.through(0, 2);
    const bottom = SLOPE_FIELD_EQUATIONS.circles.through(1, -1);
    expect(top(1)).toBeCloseTo(Math.sqrt(3), 12);
    expect(bottom(0)).toBeCloseTo(-Math.sqrt(2), 12);
    expect(top(2.5)).toBeNaN();
    expect(derive({ equation: "circles" }, { x0: 0, y0: 2, xEnd: 3 })).toMatchObject({ reaches: 0, yExact: 0, eulerError: 0 });
  });

  it("has no slope on the x-axis for the circles, and says so", () => {
    expect(derive({ equation: "circles" }, { x0: 2, y0: 0 })).toMatchObject({ slopeDefined: 0, slope: 0, constantDefined: 0, reaches: 0, eulerOk: 0 });
    expect(derive({ equation: "circles" }, { x0: 0, y0: 2 })).toMatchObject({ slopeDefined: 1, slope: 0 });
    expect(Object.is(derive({ equation: "circles" }, { x0: 0, y0: 2 }).slope, -0)).toBe(false);
  });

  it("keeps the logistic curve between 0 and 1, and has y = 0 and y = 1 as level solutions", () => {
    const s = SLOPE_FIELD_EQUATIONS.logistic.through(0, 0.5);
    expect(s(0)).toBe(0.5);
    expect(s(4)).toBeGreaterThan(0.98);
    expect(s(-4)).toBeLessThan(0.02);
    expect(SLOPE_FIELD_EQUATIONS.logistic.through(0, 0)(3)).toBe(0);
    expect(SLOPE_FIELD_EQUATIONS.logistic.through(0, 1)(3)).toBe(1);
    expect(derive({ equation: "logistic" }, { x0: 0, y0: 0 })).toMatchObject({ constantDefined: 0, reaches: 1, yExact: 0 });
    // Below zero the solution runs off to −∞ at x = ln 6.
    const below = SLOPE_FIELD_EQUATIONS.logistic.through(0, -0.2);
    expect(below(1.7)).toBeLessThan(-10);
    expect(below(1.9)).toBeNaN();
  });

  it("knows which equations separate and which are linear", () => {
    const kind = (equation: SlopeFieldParams["equation"]) => [derive({ equation }).separable, derive({ equation }).linear];
    expect(kind("growth")).toEqual([1, 1]);
    expect(kind("parabolas")).toEqual([1, 1]);
    expect(kind("circles")).toEqual([1, 0]);
    expect(kind("logistic")).toEqual([1, 0]);
    expect(kind("sum")).toEqual([0, 1]);
    expect(kind("linear")).toEqual([0, 1]);
  });
});

describe("Euler's method", () => {
  it("estimates e from dy/dx = y, y(0) = 1, better and better as h shrinks", () => {
    const at = (h: number) => derive({ equation: "growth" }, { x0: 0, y0: 1, xEnd: 1, h });
    expect(at(1)).toMatchObject({ yEuler: 2, steps: 1 });
    expect(at(0.5).yEuler).toBeCloseTo(2.25, 12);
    expect(at(0.25).yEuler).toBeCloseTo(1.25 ** 4, 12);
    expect(at(0.1).yEuler).toBeCloseTo(1.1 ** 10, 12);
    expect(at(0.5).eulerError).toBeCloseTo(Math.E - 2.25, 12);
    expect(at(0.1).eulerError).toBeCloseTo(0.1245, 4);
    expect(at(0.05).eulerError).toBeCloseTo(0.065, 3);
  });

  it("converges as h → 0 for every equation, the error roughly halving with h", () => {
    for (const id of SLOPE_FIELD_EQUATION_ORDER) {
      const eq = SLOPE_FIELD_EQUATIONS[id];
      const [x0, y0] = id === "circles" ? [0, 2] : id === "logistic" ? [-2, 0.2] : [0, 0.5];
      const X = id === "circles" ? 1.2 : x0 + 1.5;
      const exact = eq.through(x0, y0)(X);
      const errors = [0.2, 0.1, 0.05, 0.025, 0.0125].map((h) => Math.abs(slopeFieldEuler(eq, x0, y0, X, h).y - exact));
      for (let i = 1; i < errors.length; i++) {
        expect(errors[i], `${id} h = ${0.2 / 2 ** i}`).toBeLessThan(errors[i - 1]! + 1e-12);
        if (errors[i - 1]! > 1e-6) expect(errors[i]! / errors[i - 1]!, id).toBeGreaterThan(0.35);
      }
      expect(errors.at(-1)! / Math.max(1, Math.abs(exact)), id).toBeLessThan(0.03);
    }
  });

  it("walks backwards when the end is to the left, and ends exactly on it", () => {
    const run = slopeFieldEuler(SLOPE_FIELD_EQUATIONS.decay, 1, 1, -1, 0.5);
    expect(run.steps).toBe(4);
    expect(run.points.at(-1)![0]).toBeCloseTo(-1, 12);
    expect(run.y).toBeCloseTo(1.5 ** 4, 12);
    const still = derive({ equation: "sum" }, { x0: 0.3, xEnd: 0.3 });
    expect(still.steps).toBe(0);
    expect(still.eulerError).toBeCloseTo(0, 12);
  });

  it("follows a straight-line solution exactly", () => {
    // y = x − 1 is the member with C = 0, and Euler's straight steps lie on it.
    expect(derive({ equation: "linear" }, { x0: 0, y0: -1, xEnd: 2, h: 0.5 }).eulerError).toBeCloseTo(0, 12);
  });
});

describe("growth, decay and cooling", () => {
  it("cools a 90 °C cup in a 25 °C room to 64.4 °C in 10 minutes with k = 0.05 per minute", () => {
    const r = derive({ process: "cooling" }, { start: 90, room: 25, k: 0.05, t: 10 });
    expect(r.amount).toBeCloseTo(25 + 65 * Math.exp(-0.5), 12);
    expect(r.amount).toBeCloseTo(64.4, 1);
    expect(r.rate).toBeCloseTo(-0.05 * (r.amount - 25), 12);
    expect(derive({ process: "cooling" }, { start: 90, room: 25, k: 0.05, t: 0 }).speed).toBeCloseTo(3.25, 12);
    expect(derive({ process: "cooling" }, { start: 90, room: 25, k: 0.05, t: 30 }).speed).toBeCloseTo(0.725, 3);
  });

  it("doubles or halves every ln 2 / k", () => {
    const g = derive({ process: "growth" }, { start: 10, k: 0.07 });
    expect(g.halfTime).toBeCloseTo(9.902, 3);
    expect(derive({ process: "growth" }, { start: 10, k: 0.07, t: g.halfTime }).amount).toBeCloseTo(20, 10);
    expect(derive({ process: "decay" }, { start: 80, k: 0.07, t: g.halfTime }).amount).toBeCloseTo(40, 10);
    expect(derive({ process: "growth" }, { k: 0.07, t: 20 }).factor).toBeCloseTo(Math.exp(1.4), 12);
  });

  it("halves the difference from the room temperature every ln 2 / k when cooling", () => {
    const r = derive({ process: "cooling" }, { start: 85, room: 25, k: 0.04 });
    const later = derive({ process: "cooling" }, { start: 85, room: 25, k: 0.04, t: r.halfTime });
    expect(later.amount - 25).toBeCloseTo(30, 10);
  });

  it("has exact solutions that satisfy their equations, and an Euler run that converges to them", () => {
    for (const process of SLOPE_FIELD_PROCESS_ORDER) {
      for (const t of [5, 20, 45]) {
        const numerical = (slopeFieldExact(process, 70, 20, 0.06, t + H) - slopeFieldExact(process, 70, 20, 0.06, t - H)) / (2 * H);
        expect(numerical, process).toBeCloseTo(slopeFieldRate(process, 0.06, 20, slopeFieldExact(process, 70, 20, 0.06, t)), 5);
      }
      const err = (tStep: number) => derive({ process }, { start: 70, room: 20, k: 0.06, t: 40, tStep }).timeError;
      expect(err(10), process).toBeGreaterThan(err(5));
      expect(err(5), process).toBeGreaterThan(err(1));
      expect(err(1) / err(10), process).toBeLessThan(0.2);
    }
  });

  it("runs the clock on play and stops at the hour", () => {
    let s = base;
    for (let i = 0; i < 100; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.t).toBe(60);
    expect(model.step({ ...base, t: 12 }, model.defaultParams, 1).t).toBe(15);
    expect(model.step({ ...base, t: 0 }, model.defaultParams, -1).t).toBe(0);
  });
});

describe("order and degree", () => {
  it("gives every example an order of at least one and a degree that is defined or not", () => {
    for (const id of SLOPE_FIELD_EXAMPLE_ORDER) {
      const e = SLOPE_FIELD_EXAMPLES[id];
      expect(e.order, id).toBeGreaterThanOrEqual(1);
      expect([0, 1, 2], id).toContain(e.degree);
    }
    expect(derive({ example: "s-of-t" })).toMatchObject({ order: 2, degree: 1 });
    expect(derive({ example: "powers" })).toMatchObject({ order: 3, degree: 2 });
    expect(derive({ example: "cos-of-slope" })).toMatchObject({ order: 2, degree: 0 });
    expect(derive({ example: "sine-of-y" })).toMatchObject({ order: 2, degree: 1 });
  });
});

describe("the model", () => {
  it("clamps every control to its range", () => {
    expect(model.setVariable(base, "h", 0, model.defaultParams).h).toBe(0.05);
    expect(model.setVariable(base, "x0", 9, model.defaultParams).x0).toBe(4);
    expect(model.setVariable(base, "k", 1, model.defaultParams).k).toBe(0.1);
    expect(model.setVariable(base, "nonsense", 1, model.defaultParams)).toBe(base);
  });

  it("numbers every output, whatever the equation, process, example or state", () => {
    const states: SlopeFieldState[] = [
      base,
      { x0: -4, y0: -4, xEnd: 4, h: 0.05, t: 60, k: 0.2, start: 100, room: 0, tStep: 1 },
      { x0: 0, y0: 0, xEnd: -4, h: 1, t: 0, k: 0.01, start: 1, room: 40, tStep: 20 },
      { x0: 3, y0: 0, xEnd: -3, h: 0.3, t: 33, k: 0.1, start: 50, room: 20, tStep: 7 },
    ];
    for (const equation of SLOPE_FIELD_EQUATION_ORDER) {
      for (const process of SLOPE_FIELD_PROCESS_ORDER) {
        for (const state of states) {
          const r = model.derive(state, { equation, process, example: "third" });
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${equation} ${process} ${key}`).toBe(true);
        }
      }
    }
  });
});
