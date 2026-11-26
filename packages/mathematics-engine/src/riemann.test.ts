import { describe, expect, it } from "vitest";
import {
  RIEMANN_FUNCTION_ORDER,
  RIEMANN_FUNCTIONS,
  RIEMANN_N_MAX,
  RIEMANN_PAIR_ORDER,
  RIEMANN_PAIRS,
  RIEMANN_RULE_ORDER,
  riemannModel as model,
  riemannStrips,
  riemannSum,
  type RiemannParams,
  type RiemannState,
} from "./riemann";

const base: RiemannState = { n: 4, a: 0, b: 2, c: 1, clock: 0 };
const derive = (params: Partial<RiemannParams> = {}, state: Partial<RiemannState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const H = 1e-5;
/** A Riemann sum fine enough to stand in for the integral itself. */
const fine = (f: (x: number) => number, a: number, b: number) => {
  const n = 20000;
  const dx = (b - a) / n;
  let total = 0;
  for (let i = 0; i < n; i++) total += f(a + (i + 0.5) * dx) * dx;
  return total;
};

describe("the functions", () => {
  it("carry antiderivatives whose slope is the function", () => {
    for (const id of RIEMANN_FUNCTION_ORDER) {
      const fn = RIEMANN_FUNCTIONS[id];
      for (const t of [0.15, 0.5, 0.85]) {
        const x = fn.x[0] + (fn.x[1] - fn.x[0]) * t;
        expect((fn.F(x + H) - fn.F(x - H)) / (2 * H), `${id} at ${x}`).toBeCloseTo(fn.f(x), 5);
      }
    }
  });

  it("give exact areas that a fine Riemann sum agrees with", () => {
    for (const id of RIEMANN_FUNCTION_ORDER) {
      const fn = RIEMANN_FUNCTIONS[id];
      const [lo, hi] = fn.x;
      for (const [s, t] of [[0, 1], [0.1, 0.7], [0.3, 0.95]] as const) {
        const a = lo + (hi - lo) * s;
        const b = lo + (hi - lo) * t;
        expect(fn.F(b) - fn.F(a), `${id} on [${a}, ${b}]`).toBeCloseTo(fine(fn.f, a, b), 6);
      }
    }
  });

  it("list every zero inside the window, and only zeros", () => {
    for (const id of RIEMANN_FUNCTION_ORDER) {
      const fn = RIEMANN_FUNCTIONS[id];
      for (const z of fn.roots) expect(Math.abs(fn.f(z)), `${id} at ${z}`).toBeLessThan(1e-12);
      // No sign change between listed zeros.
      const cuts = [fn.x[0], ...fn.roots, fn.x[1]];
      for (let i = 0; i < cuts.length - 1; i++) {
        const signs = new Set<number>();
        for (let k = 1; k < 50; k++) signs.add(Math.sign(fn.f(cuts[i]! + ((cuts[i + 1]! - cuts[i]!) * k) / 50)));
        expect(signs.size, `${id} between ${cuts[i]} and ${cuts[i + 1]}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("are odd or even as labelled", () => {
    for (const id of RIEMANN_FUNCTION_ORDER) {
      const fn = RIEMANN_FUNCTIONS[id];
      const x = Math.min(Math.abs(fn.x[0]), fn.x[1]) * 0.6;
      if (fn.symmetry === 1) expect(fn.f(-x), id).toBeCloseTo(-fn.f(x), 12);
      if (fn.symmetry === 2) expect(fn.f(-x), id).toBeCloseTo(fn.f(x), 12);
    }
  });
});

describe("area by strips", () => {
  it("sums x² on [0, 2] by the formula for Σ i²", () => {
    // Left sum = (8/n³)·(n − 1)n(2n − 1)/6; the exact area is 8/3.
    for (const n of [1, 4, 10, 200]) {
      const r = derive({ fn: "square", rule: "left" }, { n });
      expect(r.sum).toBeCloseTo((4 * (n - 1) * (2 * n - 1)) / (3 * n * n), 12);
      expect(r.exact).toBeCloseTo(8 / 3, 12);
    }
    expect(derive({ fn: "square", rule: "left" }, { n: 4 })).toMatchObject({ sum: 1.75, estimate: -1 });
    expect(derive({ fn: "square", rule: "right" }, { n: 4 })).toMatchObject({ sum: 3.75, estimate: 1 });
    expect(derive({ fn: "square", rule: "trap" }, { n: 4 }).sum).toBeCloseTo(2.75, 12);
    expect(derive({ fn: "square", rule: "mid" }, { n: 4 }).sum).toBeCloseTo(2.625, 12);
  });

  it("closes every rule on the exact area as n grows", () => {
    for (const id of RIEMANN_FUNCTION_ORDER) {
      const fn = RIEMANN_FUNCTIONS[id];
      const a = fn.x[0] + 0.1 * (fn.x[1] - fn.x[0]);
      const b = fn.x[1] - 0.2 * (fn.x[1] - fn.x[0]);
      for (const rule of RIEMANN_RULE_ORDER) {
        const coarse = derive({ fn: id, rule }, { a, b, n: 4 }).absError;
        const thin = derive({ fn: id, rule }, { a, b, n: 200 }).absError;
        expect(thin, `${id} ${rule}`).toBeLessThan(coarse + 1e-12);
        expect(thin, `${id} ${rule}`).toBeLessThan(0.05 * Math.max(1, Math.abs(fn.F(b) - fn.F(a))));
      }
    }
  });

  it("halves the left and right errors when n doubles, and quarters the midpoint and trapezium errors", () => {
    for (const [fn, a, b] of [["square", 0, 2], ["exp", 0, 1], ["recip", 1, Math.E], ["root", 1, 4]] as const) {
      for (const rule of ["left", "right"] as const) expect(derive({ fn, rule }, { a, b, n: 100 }).errorRatio, `${fn} ${rule}`).toBeCloseTo(2, 1);
      for (const rule of ["mid", "trap"] as const) expect(derive({ fn, rule }, { a, b, n: 100 }).errorRatio, `${fn} ${rule}`).toBeCloseTo(4, 1);
    }
    // For x² the midpoint error is exactly (b − a)³/(12n²) · f″/2 = 2/(3n²).
    expect(derive({ fn: "square", rule: "mid" }, { n: 20 }).errorRatio).toBeCloseTo(4, 10);
    expect(derive({ fn: "square", rule: "mid" }, { n: 26 }).absError).toBeLessThan(0.001);
    expect(derive({ fn: "square", rule: "mid" }, { n: 25 }).absError).toBeGreaterThan(0.001);
    expect(derive({ fn: "square", rule: "left" }, { n: 200 }).absError).toBeGreaterThan(0.019);
  });

  it("under- or over-estimates by which way the curve slopes and bends", () => {
    const est = (fn: RiemannParams["fn"], rule: RiemannParams["rule"], a: number, b: number) => derive({ fn, rule }, { a, b, n: 4 }).estimate;
    expect([est("square", "left", 0, 2), est("square", "right", 0, 2), est("exp", "left", 0, 2), est("exp", "right", 0, 2)]).toEqual([-1, 1, -1, 1]);
    expect([est("recip", "left", 1, Math.E), est("recip", "right", 1, Math.E)]).toEqual([1, -1]);
    // Bending up, the midpoint is under and the trapezium over; bending down, the reverse.
    expect([est("square", "mid", 0, 2), est("square", "trap", 0, 2), est("root", "mid", 0, 4), est("root", "trap", 0, 4)]).toEqual([-1, 1, 1, -1]);
  });

  it("gives ∫₁ᵉ dx/x = 1 and ∫₀¹ eˣ dx = e − 1", () => {
    expect(derive({ fn: "recip" }, { a: 1, b: Math.E }).exact).toBeCloseTo(1, 12);
    expect(derive({ fn: "exp" }, { a: 0, b: 1 }).exact).toBeCloseTo(Math.E - 1, 12);
    expect(derive({ fn: "root" }, { a: 0, b: 4 }).exact).toBeCloseTo(16 / 3, 12);
  });

  it("draws strips that tile the interval, and sums them", () => {
    const strips = riemannStrips(Math.sin, 0, 3, 6, "mid");
    expect(strips).toHaveLength(6);
    expect(strips[0]!.x0).toBe(0);
    expect(strips[5]!.x1).toBeCloseTo(3, 12);
    expect(strips[2]!.height).toBeCloseTo(Math.sin(1.25), 12);
    expect(riemannSum(Math.sin, 0, 3, 6, "mid")).toBeCloseTo(strips.reduce((s, x) => s + x.height * 0.5, 0), 12);
  });
});

describe("signed area and the properties", () => {
  it("makes ∫₀^{2π} sin x dx zero, though the area shaded is 4", () => {
    const r = derive({ fn: "sine", rule: "mid" }, { a: 0, b: 2 * Math.PI, n: 16 });
    expect(r).toMatchObject({ exact: 0, aboveExact: 2, belowExact: -2, geometric: 4 });
    expect(r.aboveSum).toBeGreaterThan(0);
    expect(r.belowSum).toBeLessThan(0);
    expect(r.aboveSum + r.belowSum).toBeCloseTo(r.sum, 12);
    expect(r.stripArea).toBeCloseTo(4, 1);
    expect(derive({ fn: "sine" }, { a: 0, b: Math.PI }).exact).toBeCloseTo(2, 12);
    expect(derive({ fn: "sine" }, { a: Math.PI, b: 2 * Math.PI }).exact).toBeCloseTo(-2, 12);
  });

  it("flips the sign when the limits are swapped", () => {
    const forward = derive({ fn: "square", rule: "left" }, { a: 0, b: 2, n: 4 });
    const back = derive({ fn: "square", rule: "left" }, { a: 2, b: 0, n: 4 });
    expect(back.dx).toBe(-0.5);
    expect(back.exact).toBeCloseTo(-forward.exact, 12);
    expect(back.reversed).toBeCloseTo(forward.exact, 12);
    // Run backwards, the "left" edge of each strip is its right-hand one.
    expect(back.sum).toBeCloseTo(-forward.rightSum, 12);
    // The shaded area does not care which way the limits run.
    expect(back.geometric).toBeCloseTo(forward.geometric, 12);
  });

  it("adds up over a split, wherever the split is", () => {
    for (const c of [0.5, 1.59, -1.5, 2]) {
      const r = derive({ fn: "square" }, { a: 0, b: 2, c });
      expect(r.partLeft + r.partRight).toBeCloseTo(r.exact, 12);
    }
    const halves = derive({ fn: "square" }, { a: 0, b: 2, c: Math.cbrt(4) });
    expect(halves.partLeft).toBeCloseTo(4 / 3, 12);
    expect(halves.partRight).toBeCloseTo(4 / 3, 12);
  });

  it("gives zero for an odd function over [−a, a], and not for an even one", () => {
    expect(derive({ fn: "cube" }, { a: -1, b: 1 })).toMatchObject({ exact: 0, symmetric: 1, symmetry: 1 });
    expect(derive({ fn: "sine" }, { a: -Math.PI, b: Math.PI })).toMatchObject({ exact: 0, symmetric: 1 });
    expect(derive({ fn: "square" }, { a: -1, b: 1 }).exact).toBeCloseTo(2 / 3, 12);
    expect(derive({ fn: "cube", rule: "mid" }, { a: -1, b: 1, n: 7 }).sum).toBeCloseTo(0, 12);
  });
});

describe("between two curves", () => {
  it("has exact areas a fine Riemann sum of |f − g| agrees with", () => {
    for (const id of RIEMANN_PAIR_ORDER) {
      const p = RIEMANN_PAIRS[id];
      expect(Math.abs(p.f(p.a) - p.g(p.a)), `${id} meets at a`).toBeLessThan(1e-12);
      expect(Math.abs(p.f(p.b) - p.g(p.b)), `${id} meets at b`).toBeLessThan(1e-12);
      for (const x of p.crossings) expect(Math.abs(p.f(x) - p.g(x)), `${id} crosses at ${x}`).toBeLessThan(1e-12);
      const r = derive({ pair: id });
      expect(r.pairArea, id).toBeCloseTo(fine((x) => Math.abs(p.f(x) - p.g(x)), p.a, p.b), 6);
      expect(r.pairSigned, id).toBeCloseTo(fine((x) => p.f(x) - p.g(x), p.a, p.b), 6);
    }
  });

  it("gives 1/6 between y = x and y = x², and 9/2 between y = x + 2 and y = x²", () => {
    expect(derive({ pair: "line-square" }).pairArea).toBeCloseTo(1 / 6, 12);
    expect(derive({ pair: "parabola-line" }).pairArea).toBeCloseTo(4.5, 12);
  });

  it("swaps the top curve at a crossing, so y = x and y = x³ enclose 1/2 but net to zero", () => {
    const r = derive({ pair: "line-cube", rule: "mid" }, { n: 200 });
    expect(r).toMatchObject({ pairArea: 0.5, pairSigned: 0, crossings: 1 });
    expect(r.pairSum).toBeCloseTo(0.5, 4);
  });

  it("closes the strip sum on the area as n grows", () => {
    for (const id of RIEMANN_PAIR_ORDER) {
      for (const rule of RIEMANN_RULE_ORDER) {
        const coarse = Math.abs(derive({ pair: id, rule }, { n: 4 }).pairError);
        const thin = Math.abs(derive({ pair: id, rule }, { n: 200 }).pairError);
        expect(thin, `${id} ${rule}`).toBeLessThan(coarse);
        expect(thin, `${id} ${rule}`).toBeLessThan(0.03);
      }
    }
  });
});

describe("the model", () => {
  it("doubles n while playing, up to 200", () => {
    let s: RiemannState = { ...base, n: 1 };
    const seen = [1];
    for (let i = 0; i < 100; i++) {
      s = model.advance(s, 0.1, model.defaultParams);
      if (s.n !== seen[seen.length - 1]) seen.push(s.n);
    }
    expect(seen).toEqual([1, 2, 4, 8, 16, 32, 64, 128, 200]);
    expect(model.advance(s, 50, model.defaultParams).n).toBe(RIEMANN_N_MAX);
    expect(model.step({ ...base, n: 3 }, model.defaultParams, 1).n).toBe(6);
    expect(model.step({ ...base, n: 1 }, model.defaultParams, -1).n).toBe(1);
  });

  it("clamps what it is given to the controls and the function's window", () => {
    const p = model.defaultParams;
    expect(model.setVariable(base, "n", 500, p).n).toBe(200);
    expect(model.setVariable(base, "n", 0, p).n).toBe(1);
    expect(model.setVariable(base, "n", 7.4, p).n).toBe(7);
    expect(model.setVariable(base, "b", 9, p).b).toBe(2);
    expect(model.setVariable(base, "b", 9, { ...p, fn: "sine" }).b).toBeCloseTo(2 * Math.PI, 12);
    expect(model.setVariable(base, "a", 0, { ...p, fn: "recip" }).a).toBe(0.25);
    expect(derive({ fn: "recip" }, { a: 0, b: 1 }).a).toBe(0.25);
  });

  it("numbers every output, with no −0", () => {
    for (const fn of RIEMANN_FUNCTION_ORDER) {
      for (const rule of RIEMANN_RULE_ORDER) {
        for (const pair of RIEMANN_PAIR_ORDER) {
          for (const state of [{ n: 1, a: -99, b: 99, c: 0, clock: 0 }, { n: 200, a: 1, b: 1, c: 1, clock: 0 }, { n: Number.NaN, a: 3, b: -3, c: 9, clock: 0 }]) {
            const r = model.derive(state, { fn, rule, pair });
            for (const key of model.outputs) {
              expect(Number.isFinite(r[key]), `${fn} ${rule} ${pair} ${key}`).toBe(true);
              expect(Object.is(r[key], -0), `${fn} ${rule} ${pair} ${key} is −0`).toBe(false);
            }
          }
        }
      }
    }
  });
});
