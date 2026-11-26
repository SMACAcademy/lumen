import { describe, expect, it } from "vitest";
import {
  CHAIN_COMPOSITION_ORDER,
  CHAIN_COMPOSITIONS,
  IMPLICIT_SHAPES,
  PRODUCT_PAIR_ORDER,
  PRODUCT_PAIRS,
  rulesModel as model,
  type RulesParams,
  type RulesState,
} from "./rules";

const base: RulesState = { x: 1.5, cx: 0.5, dx: 0.5, angle: 53.13 };
const derive = (params: Partial<RulesParams> = {}, state: Partial<RulesState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const H = 1e-5;

describe("the product rule", () => {
  it("splits the rectangle's growth into two strips and a corner, exactly", () => {
    for (const pair of PRODUCT_PAIR_ORDER) {
      for (const dx of [0.5, 0.1, 0.001]) {
        const r = derive({ pair }, { dx });
        expect(r.strips + r.corner, `${pair} ${dx}`).toBeCloseTo(r.grown, 10);
      }
    }
  });

  it("stores u′ and v′ that agree with numerical differences", () => {
    for (const id of PRODUCT_PAIR_ORDER) {
      const pair = PRODUCT_PAIRS[id];
      for (const x of [0.6, 1.5, 2.4]) {
        expect(pair.du(x), `${id} u′`).toBeCloseTo((pair.u(x + H) - pair.u(x - H)) / (2 * H), 6);
        expect(pair.dv(x), `${id} v′`).toBeCloseTo((pair.v(x + H) - pair.v(x - H)) / (2 * H), 6);
      }
    }
  });

  it("closes Δ(uv)/Δx on u′v + uv′ as the nudge shrinks, the corner vanishing", () => {
    for (const pair of PRODUCT_PAIR_ORDER) {
      const big = derive({ pair }, { dx: 0.5 });
      const small = derive({ pair }, { dx: 0.001 });
      expect(Math.abs(small.average - small.productRule), pair).toBeLessThan(Math.abs(big.average - big.productRule));
      expect(small.average, pair).toBeCloseTo(small.productRule, 1);
      expect(small.cornerShare, pair).toBeLessThan(0.002);
      expect(big.cornerShare, pair).toBeGreaterThan(small.cornerShare);
    }
  });

  it("gives the textbook answers: (x·x²)′ = 3x² and ((x + 1)(2x + 1))′ = 4x + 3", () => {
    expect(derive({ pair: "x-square" }, { x: 2 }).productRule).toBe(12);
    expect(derive({ pair: "line-line" }, { x: 1 }).productRule).toBe(7);
    expect(derive({ pair: "root-x" }, { x: 1 }).productRule).toBeCloseTo(1.5, 12);
  });
});

describe("the chain rule", () => {
  it("multiplies the two stretches, and matches a numerical difference of f(g(x))", () => {
    for (const id of CHAIN_COMPOSITION_ORDER) {
      const c = CHAIN_COMPOSITIONS[id];
      for (const cx of [-0.8, 0.3, 1.2]) {
        const r = derive({ composition: id }, { cx });
        const numerical = (c.f(c.g(r.cx + H)) - c.f(c.g(r.cx - H))) / (2 * H);
        expect(r.chainRate, `${id} at ${cx}`).toBeCloseTo(r.innerRate * r.outerRate, 12);
        expect(r.chainRate, `${id} at ${cx}`).toBeCloseTo(numerical, 4);
      }
    }
  });

  it("gives (3x + 1)² a slope of 24 at x = 1, and sin 2x a slope of 2 at 0", () => {
    expect(derive({ composition: "square-linear" }, { cx: 1 })).toMatchObject({ inner: 4, outer: 16, innerRate: 3, outerRate: 8, chainRate: 24 });
    expect(derive({ composition: "sine-double" }, { cx: 0 }).chainRate).toBe(2);
  });

  it("closes Δy/Δx on the chain rate as the nudge shrinks", () => {
    for (const composition of CHAIN_COMPOSITION_ORDER) {
      const r = derive({ composition }, { cx: 0.5, dx: 0.001 });
      expect(r.actualRatio, composition).toBeCloseTo(r.chainRate, 1);
    }
  });
});

describe("implicit and parametric", () => {
  it("gives the circle's tangent at (3, 4) a slope of −3/4", () => {
    const r = derive({ shape: "circle" }, { angle: (Math.atan2(4, 3) * 180) / Math.PI });
    expect(r.pointX).toBeCloseTo(3, 10);
    expect(r.pointY).toBeCloseTo(4, 10);
    expect(r.tangentSlope).toBeCloseTo(-0.75, 10);
  });

  it("keeps the circle's tangent perpendicular to its radius", () => {
    for (const angle of [20, 70, 130, 200, 310]) {
      const r = derive({ shape: "circle" }, { angle });
      expect(r.tangentSlope * (r.pointY / r.pointX), `${angle}°`).toBeCloseTo(-1, 10);
    }
  });

  it("stands the tangent upright at the sides and lays it flat at the top and bottom", () => {
    for (const shape of ["circle", "ellipse"] as const) {
      expect(derive({ shape }, { angle: 0 })).toMatchObject({ vertical: 1, horizontal: 0, tangentSlope: 0 });
      expect(derive({ shape }, { angle: 180 }).vertical).toBe(1);
      expect(derive({ shape }, { angle: 90 })).toMatchObject({ vertical: 0, horizontal: 1, tangentSlope: 0 });
      expect(derive({ shape }, { angle: 270 }).horizontal).toBe(1);
    }
  });

  it("agrees with −b²x/a²y on the ellipse, and keeps the point on the curve", () => {
    const { a, b } = IMPLICIT_SHAPES.ellipse;
    for (const angle of [30, 60, 140, 250]) {
      const r = derive({ shape: "ellipse" }, { angle });
      expect(r.tangentSlope, `${angle}°`).toBeCloseTo((-b * b * r.pointX) / (a * a * r.pointY), 10);
      expect((r.pointX / a) ** 2 + (r.pointY / b) ** 2).toBeCloseTo(1, 12);
    }
  });
});

describe("the model", () => {
  it("shrinks the nudge and turns the point on play", () => {
    let s = model.initialize(model.defaultParams);
    s = model.advance(s, 1, model.defaultParams);
    expect(s.dx).toBeCloseTo(0.5 * Math.exp(-0.9), 10);
    expect(s.angle).toBeCloseTo(83.13, 10);
    for (let i = 0; i < 300; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.dx).toBe(0.001);
  });

  it("keeps the controls in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["x", 99], ["cx", -99], ["dx", 0], ["angle", 999]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toEqual({ x: 2.5, cx: -3, dx: 0.001, angle: 360 });
    for (const pair of PRODUCT_PAIR_ORDER) {
      for (const composition of CHAIN_COMPOSITION_ORDER) {
        for (const shape of ["circle", "ellipse"] as const) {
          const r = model.derive(s, { pair, composition, shape });
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${pair} ${composition} ${shape} ${key}`).toBe(true);
        }
      }
    }
  });
});
