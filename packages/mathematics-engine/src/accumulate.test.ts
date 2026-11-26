import { describe, expect, it } from "vitest";
import {
  ACCUMULATE_INTEGRANDS,
  ACCUMULATE_ORDER,
  accumulateModel as model,
  accumulateSum,
  type AccumulateParams,
  type AccumulateState,
} from "./accumulate";

const at = (fn: AccumulateParams["function"], a: number, x: number) => model.derive({ x, a }, { function: fn });

describe("the stored derivatives and antiderivatives", () => {
  it("have F′ = f and f′ matching numerical differences on every integrand", () => {
    const h = 1e-5;
    for (const id of ACCUMULATE_ORDER) {
      const curve = ACCUMULATE_INTEGRANDS[id];
      const [lo, hi] = curve.view.x;
      for (let i = 1; i < 20; i++) {
        const x = lo + ((hi - lo) * i) / 20 + 0.013; // off the velocity profile's corners
        expect((curve.F(x + h) - curve.F(x - h)) / (2 * h), `${id} F′(${x})`).toBeCloseTo(curve.f(x), 6);
        expect((curve.f(x + h) - curve.f(x - h)) / (2 * h), `${id} f′(${x})`).toBeCloseTo(curve.df(x), 5);
      }
    }
  });

  it("give the area of the textbook cases exactly", () => {
    expect(at("linear", 0, 2).area).toBe(4);
    expect(at("square", 1, 2).area).toBe(7);
    expect(at("cosine", 0, Math.PI / 2).area).toBeCloseTo(1, 14);
    expect(at("cosine", 0, Math.PI).area).toBeCloseTo(0, 14);
    expect(at("exp", 0, 1).area).toBeCloseTo(Math.E - 1, 14);
    expect(at("reciprocal", 1, Math.E).area).toBeCloseTo(1, 14);
  });
});

describe("the area so far", () => {
  it("agrees with a numerical sum of thin strips, everywhere and on every integrand", () => {
    for (const id of ACCUMULATE_ORDER) {
      const [lo, hi] = ACCUMULATE_INTEGRANDS[id].view.x;
      for (const fa of [0, 0.3, 0.7]) {
        for (const fx of [0.1, 0.5, 0.9, 1]) {
          const r = at(id, lo + (hi - lo) * fa, lo + (hi - lo) * fx);
          expect(r.sum, `${id} a=${r.a} x=${r.x}`).toBeCloseTo(r.area, 3);
        }
      }
    }
  });

  it("gets closer to the exact area as the strips get thinner", () => {
    const f = ACCUMULATE_INTEGRANDS.exp.f;
    const exact = Math.exp(2) - Math.exp(-2);
    const errors = [10, 40, 160].map((n) => Math.abs(accumulateSum(f, -2, 2, n) - exact));
    expect(errors[1]!).toBeLessThan(errors[0]! / 10);
    expect(errors[2]!).toBeLessThan(errors[1]! / 10);
  });

  it("counts area below the axis as negative, and sweeping leftward of a as negative too", () => {
    expect(at("linear", -2, 0).area).toBe(-4);
    expect(at("linear", -1, 1).area).toBe(0);
    expect(at("cosine", Math.PI / 2, (3 * Math.PI) / 2).area).toBeCloseTo(-2, 12);
    expect(at("square", 1, 0).area).toBe(-1);
  });

  it("has slope f(x): A rises where f is positive, levels where it is zero and falls where it is negative", () => {
    for (const id of ACCUMULATE_ORDER) {
      const [lo, hi] = ACCUMULATE_INTEGRANDS[id].view.x;
      for (const t of [0.15, 0.4, 0.65, 0.95]) {
        const r = at(id, lo, lo + (hi - lo) * t);
        expect(r.areaSlope, `${id} at ${r.x}`).toBeCloseTo(r.fx, 5);
      }
    }
    expect(at("cosine", 0, 1).rising).toBe(1);
    expect(at("cosine", 0, Math.PI / 2).rising).toBe(0);
    expect(at("cosine", 0, 3).rising).toBe(-1);
  });
});

describe("the family of antiderivatives", () => {
  it("shifts A by a constant when the starting point moves, without changing its slope", () => {
    for (const a of [-2, -1, 0, 1.5]) {
      const r = at("linear", a, 1.5);
      expect(r.constant).toBe(-(a * a) || 0);
      expect(r.area).toBeCloseTo(r.antiderivative + r.constant, 12);
      expect(r.areaSlope).toBeCloseTo(3, 6);
    }
    expect(at("linear", 0, 1).constant).toBe(0);
    expect(Object.is(at("linear", 0, 0).area, -0)).toBe(false);
    expect(at("reciprocal", 1, 3).area).toBeCloseTo(Math.log(3), 14);
  });

  it("evaluates a definite integral as F(b) − F(a)", () => {
    const r = at("square", 1, 2);
    expect(r.area).toBe(ACCUMULATE_INTEGRANDS.square.F(2) - ACCUMULATE_INTEGRANDS.square.F(1));
  });
});

describe("distance from a velocity–time graph", () => {
  it("collects 4 m in the first 2 s, 16 m by 5 s and 20 m by 7 s, then reverses 1 m", () => {
    expect(at("velocity", 0, 2)).toMatchObject({ area: 4, fx: 4, accel: 0 });
    expect(at("velocity", 0, 1).accel).toBe(2);
    expect(at("velocity", 0, 5).area).toBe(16);
    expect(at("velocity", 0, 6)).toMatchObject({ fx: 2, accel: -2 });
    expect(at("velocity", 0, 7)).toMatchObject({ area: 20, fx: 0, rising: 0 });
    expect(at("velocity", 0, 8)).toMatchObject({ area: 19, totalArea: 21, fx: -2 });
  });

  it("counts distance without sign, so it never falls", () => {
    let last = 0;
    for (let t = 0; t <= 8; t += 0.25) {
      const r = at("velocity", 0, t);
      expect(r.totalArea).toBeGreaterThanOrEqual(last - 1e-12);
      expect(r.totalArea).toBeGreaterThanOrEqual(Math.abs(r.area) - 1e-12);
      last = r.totalArea;
    }
    expect(at("cosine", 0, 2 * Math.PI).totalArea).toBeCloseTo(4, 12);
  });
});

describe("play, steps and controls", () => {
  const P: AccumulateParams = { function: "velocity" };

  it("starts at the left edge and sweeps to the right edge in 8 s, then stays", () => {
    let s = model.initialize(P);
    expect(model.derive(s, P)).toMatchObject({ x: 0, a: 0, area: 0, progress: 0 });
    for (let i = 0; i < 20; i++) s = model.advance(s, 0.1, P);
    expect(model.derive(s, P).x).toBeCloseTo(2, 10);
    for (let i = 0; i < 100; i++) s = model.advance(s, 0.1, P);
    expect(model.derive(s, P)).toMatchObject({ x: 8, progress: 1 });
  });

  it("clamps x and a to the window, and the step moves x by a 24th of it", () => {
    let s: AccumulateState = model.initialize({ function: "cosine" });
    s = model.setVariable(s, "x", 99, { function: "cosine" });
    expect(s.x).toBeCloseTo(2 * Math.PI, 12);
    s = model.setVariable(s, "a", -5, { function: "reciprocal" });
    expect(s.a).toBe(0.25);
    expect(model.step({ x: 0, a: 0 }, P, 1).x).toBeCloseTo(1 / 3, 12);
    expect(model.getVariable(s, "a")).toBe(0.25);
    expect(model.setVariable(s, "nope", 1, P)).toBe(s);
  });

  it("returns finite numbers everywhere", () => {
    for (const id of ACCUMULATE_ORDER) {
      for (const x of [-10, -2, 0, 0.25, 3, 10]) {
        for (const value of Object.values(at(id, -2, x))) expect(Number.isFinite(value)).toBe(true);
      }
    }
  });
});
