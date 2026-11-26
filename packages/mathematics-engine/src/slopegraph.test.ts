import { describe, expect, it } from "vitest";
import { SLOPE_CURVE_ORDER, SLOPE_CURVES, slopeGraphModel as model, type SlopeGraphParams, type SlopeGraphState } from "./slopegraph";

const at = (fn: SlopeGraphParams["function"], x: number, n = 2) => model.derive({ x, n, trailLo: x, trailHi: x, owner: fn }, { function: fn });

describe("the stored derivatives", () => {
  it("agree with numerical differences, first and second, on every curve", () => {
    const h = 1e-4;
    for (const id of SLOPE_CURVE_ORDER) {
      const curve = SLOPE_CURVES[id];
      for (const n of id === "power" ? [1, 2, 3, 4, 5] : [2]) {
        const [lo, hi] = curve.view.x;
        for (let i = 1; i < 10; i++) {
          const x = lo + ((hi - lo) * i) / 10;
          const first = (curve.f(x + h, n) - curve.f(x - h, n)) / (2 * h);
          const second = (curve.df(x + h, n) - curve.df(x - h, n)) / (2 * h);
          expect(curve.df(x, n), `${id} n=${n} f′(${x})`).toBeCloseTo(first, 5);
          expect(curve.d2f(x, n), `${id} n=${n} f″(${x})`).toBeCloseTo(second, 5);
        }
      }
    }
  });

  it("make sin's slope graph cos, and eˣ's slope graph eˣ itself", () => {
    for (const x of [-2, 0, 1, 2.5]) {
      expect(at("sine", x).slope).toBeCloseTo(Math.cos(x), 12);
      expect(at("exp", Math.min(x, 2)).slope).toBeCloseTo(at("exp", Math.min(x, 2)).y, 12);
    }
    expect(at("log", 2).slope).toBe(0.5);
  });
});

describe("the power rule", () => {
  it("gives xⁿ a slope of n at x = 1, and n·2ⁿ⁻¹ at x = 2", () => {
    for (let n = 1; n <= 5; n++) {
      expect(at("power", 1, n)).toMatchObject({ slope: n, slopeAtOne: n, n });
      expect(at("power", 2, n).slope).toBe(n * 2 ** (n - 1));
    }
  });

  it("keeps a straight line's slope the same everywhere", () => {
    for (const x of [-2, 0, 1.5]) expect(at("power", x, 1)).toMatchObject({ slope: 1, second: 0, concavity: 0 });
  });
});

describe("rising, falling and bending", () => {
  it("finds the cubic's maximum at −1, minimum at +1 and inflection at 0", () => {
    expect(at("cubic", -1)).toMatchObject({ stationary: 1, turning: 1, concavity: -1 });
    expect(at("cubic", 1)).toMatchObject({ stationary: 1, turning: 2, concavity: 1 });
    expect(at("cubic", 0)).toMatchObject({ stationary: 0, turning: 0, concavity: 0, direction: -1 });
    expect(at("cubic", 2)).toMatchObject({ direction: 1, second: 4 });
  });

  it("bends a parabola up everywhere and tells sine's peaks from its troughs", () => {
    for (const x of [-2, 0, 2]) expect(at("square", x).concavity).toBe(1);
    expect(at("square", 0)).toMatchObject({ stationary: 1, turning: 2 });
    expect(at("sine", Math.PI / 2)).toMatchObject({ stationary: 1, turning: 1 });
    expect(at("sine", -Math.PI / 2)).toMatchObject({ stationary: 1, turning: 2 });
    expect(at("cosine", 0)).toMatchObject({ stationary: 1, turning: 1 });
  });
});

describe("the trail", () => {
  const P: SlopeGraphParams = { function: "square" };

  it("starts empty at the left edge and follows the point on play, never ahead of it", () => {
    let s = model.initialize(P);
    expect(model.derive(s, P)).toMatchObject({ x: -3, trailLo: -3, trailHi: -3, coverage: 0 });
    for (let i = 0; i < 30; i++) {
      s = model.advance(s, 0.1, P);
      const r = model.derive(s, P);
      expect(r.trailHi).toBe(r.x);
    }
    expect(model.derive(s, P).coverage).toBeCloseTo(3 / 8, 10);
    for (let i = 0; i < 100; i++) s = model.advance(s, 0.1, P);
    expect(model.derive(s, P)).toMatchObject({ x: 3, coverage: 1 });
  });

  it("grows when the point is dragged, in either direction", () => {
    let s: SlopeGraphState = { x: 0, n: 2, trailLo: 0, trailHi: 0, owner: "square" };
    for (const x of [0.2, 0.4, 0.2, 0, -0.3]) s = model.setVariable(s, "x", x, P);
    expect(model.derive(s, P)).toMatchObject({ x: -0.3, trailLo: -0.3, trailHi: 0.4 });
  });

  it("starts again after a jump, on a new curve, or with a new power", () => {
    let s: SlopeGraphState = { x: 0, n: 2, trailLo: -1, trailHi: 1, owner: "square" };
    expect(model.derive(model.setVariable(s, "x", 2.5, P), P)).toMatchObject({ trailLo: 2.5, trailHi: 2.5 });
    expect(model.derive(s, { function: "sine" })).toMatchObject({ trailLo: 0, trailHi: 0 });
    s = model.setVariable(s, "n", 3, { function: "power" });
    expect(s).toMatchObject({ n: 3, trailLo: 0, trailHi: 0 });
  });
});

describe("the model", () => {
  it("keeps the point in the curve's window and numbers every output", () => {
    for (const fn of SLOPE_CURVE_ORDER) {
      const params: SlopeGraphParams = { function: fn };
      let s = model.initialize(params);
      for (const x of [-100, 100]) {
        s = model.setVariable(s, "x", x, params);
        const r = model.derive(s, params);
        expect(r.x, fn).toBeGreaterThanOrEqual(SLOPE_CURVES[fn].view.x[0]);
        expect(r.x, fn).toBeLessThanOrEqual(SLOPE_CURVES[fn].view.x[1]);
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${fn} ${key}`).toBe(true);
      }
    }
    expect(model.setVariable(model.initialize({ function: "power" }), "n", 9, { function: "power" }).n).toBe(5);
  });
});
