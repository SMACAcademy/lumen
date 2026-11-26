import { describe, expect, it } from "vitest";
import {
  SERIES_N_MAX,
  seriesAgpTerms,
  seriesApTerms,
  seriesGpTerms,
  seriesModel as model,
  seriesPartialSums,
  type SeriesParams,
  type SeriesState,
} from "./series";

const base: SeriesState = { a: 2, d: 3, r: 0.5, n: 6, p: 2, q: 8, tick: 0 };
const derive = (state: Partial<SeriesState> = {}, params: Partial<SeriesParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("arithmetic progressions", () => {
  it("lists the terms and finds the nth", () => {
    expect(seriesApTerms(2, 3, 5)).toEqual([2, 5, 8, 11, 14]);
    expect(derive({ a: 3, d: 3, n: 10 }).apTerm).toBe(30);
    expect(derive({ a: 7, d: -2, n: 15 }).apTerm).toBe(-21);
  });

  it("adds them as n/2 · (2a + (n − 1)d), and every Gauss pair makes a + l", () => {
    // 5 + 8 + … + 38 = 6 × 43 = 258.
    expect(derive({ a: 5, d: 3, n: 12 })).toMatchObject({ apSum: 258, apTerm: 38, apPair: 43 });
    expect(derive({ a: 1, d: 1, n: 20 }).apSum).toBe(210);
    for (const [a, d, n] of [[2, 3, 7], [-4, 1.5, 11], [20, -3, 20], [0.5, -0.5, 1]] as const) {
      const r = derive({ a, d, n });
      expect(r.apSum, `${a} ${d} ${n}`).toBeCloseTo((n / 2) * (2 * a + (n - 1) * d), 10);
      const terms = seriesApTerms(a, d, n);
      for (let k = 0; k < n; k++) expect(terms[k]! + terms[n - 1 - k]!).toBeCloseTo(r.apPair, 10);
    }
  });

  it("lets the sum fall once the terms turn negative", () => {
    // 20, 17, …, −7: S₁₀ = 5(40 − 27) = 65; then ten negative terms, S₂₀ = 10(40 − 57) = −170.
    expect(derive({ a: 20, d: -3, n: 10 }).apSum).toBe(65);
    expect(derive({ a: 20, d: -3, n: 20 }).apSum).toBe(-170);
  });
});

describe("geometric progressions", () => {
  it("lists the terms and adds them as a(rⁿ − 1)/(r − 1)", () => {
    expect(seriesGpTerms(3, 2, 5)).toEqual([3, 6, 12, 24, 48]);
    const runaway = derive({ a: 3, r: 2, n: 5 });
    expect(runaway).toMatchObject({ gpSum: 93, gpTerm: 48, converges: 0 });
    // No sum to infinity: NaN (shown as "undefined"), never a misleading 0.
    expect(runaway.gpLimit).toBeNaN();
    expect(runaway.gpGap).toBeNaN();
    for (const [a, r, n] of [[1, 0.5, 10], [2, -0.5, 7], [5, 1.5, 12], [-3, 0.9, 20], [1, -2, 9]] as const) {
      expect(derive({ a, r, n }).gpSum, `${a} ${r} ${n}`).toBeCloseTo((a * (r ** n - 1)) / (r - 1), 9);
    }
  });

  it("adds n copies of a when r = 1", () => {
    expect(derive({ a: 4, r: 1, n: 9 })).toMatchObject({ gpSum: 36, converges: 0 });
  });

  it("closes in on a/(1 − r) when |r| < 1: half a square, then a quarter, …", () => {
    const seven = derive({ a: 0.5, r: 0.5, n: 7 });
    expect(seven).toMatchObject({ converges: 1, gpLimit: 1 });
    expect(seven.gpSum).toBeCloseTo(127 / 128, 12);
    expect(seven.gpGap).toBeCloseTo(1 / 128, 12);
    expect(derive({ a: 0.5, r: 0.5, n: 6 }).gpGap).toBeGreaterThan(0.01);
    expect(derive({ a: 6, r: 0.25 }).gpLimit).toBe(8);
    expect(derive({ a: 3, r: -0.5 }).gpLimit).toBe(2);
  });

  it("steps back and forth across the limit when r is negative", () => {
    const sums = seriesPartialSums(seriesGpTerms(1, -0.5, 6));
    expect(sums[4]).toBeCloseTo(0.6875, 12);
    expect(sums[5]).toBeCloseTo(0.65625, 12);
    expect(derive({ a: 1, r: -0.5, n: 6 }).gpSum).toBeLessThan(derive({ a: 1, r: -0.5, n: 5 }).gpSum);
  });

  it("has no sum to infinity at r = ±1 or beyond", () => {
    for (const r of [1, -1, 1.5, -1.2, 2]) expect(derive({ r }).converges, `r = ${r}`).toBe(0);
    for (const r of [0.95, -0.9, 0]) expect(derive({ r }).converges, `r = ${r}`).toBe(1);
  });
});

describe("arithmetic, geometric and harmonic means", () => {
  it("gives AM 5, GM 4 and HM 3.2 for 2 and 8, with GM² = AM · HM", () => {
    const r = derive({ p: 2, q: 8 });
    expect(r).toMatchObject({ am: 5, gm: 4, hm: 3.2, meansGap: 1, meansEqual: 0 });
    expect(r.gm ** 2).toBeCloseTo(r.am * r.hm, 12);
    expect(derive({ p: 4, q: 9 }).gm).toBe(6);
  });

  it("keeps AM ≥ GM ≥ HM, equal only when the numbers are", () => {
    for (let p = 0.5; p <= 18; p += 1.5) {
      for (let q = 0.5; q <= 18; q += 2.5) {
        const r = derive({ p, q });
        expect(r.am).toBeGreaterThanOrEqual(r.gm - 1e-12);
        expect(r.gm).toBeGreaterThanOrEqual(r.hm - 1e-12);
      }
    }
    expect(derive({ p: 8, q: 8 })).toMatchObject({ am: 8, gm: 8, hm: 8, meansGap: 0, meansEqual: 1 });
  });
});

describe("special series", () => {
  it("matches the formulas against adding up", () => {
    for (let n = 1; n <= SERIES_N_MAX; n++) {
      const ks = Array.from({ length: n }, (_, i) => i + 1);
      const r = derive({ n });
      expect(r.sumK).toBe(ks.reduce((s, k) => s + k, 0));
      expect(r.sumK2).toBe(ks.reduce((s, k) => s + k * k, 0));
      expect(r.sumK3).toBe(ks.reduce((s, k) => s + k ** 3, 0));
    }
  });

  it("gives 55, 385 and 3025 at n = 10, and picks the chosen power", () => {
    expect(derive({ n: 10 }, { power: 1 })).toMatchObject({ sumK: 55, sumK2: 385, sumK3: 3025, special: 55, power: 1 });
    expect(derive({ n: 10 }, { power: 2 }).special).toBe(385);
    expect(derive({ n: 5 }, { power: 3 }).special).toBe(225);
  });
});

describe("arithmetico-geometric series", () => {
  it("lists k·rᵏ and agrees with the multiply-by-r-and-subtract formula", () => {
    expect(seriesAgpTerms(2, 3)).toEqual([2, 8, 24]);
    for (const [r, n] of [[0.5, 4], [0.5, 20], [-0.5, 9], [1.5, 6], [2, 10], [0.3, 15]] as const) {
      const formula = (r * (1 - r ** n)) / (1 - r) ** 2 - (n * r ** (n + 1)) / (1 - r);
      expect(derive({ r, n }).agpSum, `r = ${r}, n = ${n}`).toBeCloseTo(formula, 9);
    }
    // ½ + 2/4 + 3/8 + 4/16 = 1.625.
    expect(derive({ r: 0.5, n: 4 }).agpSum).toBe(1.625);
    expect(derive({ r: 1, n: 4 }).agpSum).toBe(10);
  });

  it("checks the subtraction itself: (1 − r)S = r + … + rⁿ − n rⁿ⁺¹", () => {
    const r = 0.5;
    const n = 8;
    const out = derive({ r, n });
    const gp = seriesGpTerms(r, r, n).reduce((s, t) => s + t, 0);
    expect((1 - r) * out.agpSum).toBeCloseTo(gp - out.agpTail, 12);
    expect(out.agpTail).toBeCloseTo(8 / 512, 12);
  });

  it("closes in on r/(1 − r)², 2 at r = ½", () => {
    expect(derive({ r: 0.5, n: 20 })).toMatchObject({ agpLimit: 2, converges: 1 });
    expect(derive({ r: 0.5, n: 20 }).agpSum).toBeCloseTo(2, 4);
    expect(derive({ r: 1.5 }).agpLimit).toBeNaN();
  });
});

describe("the model", () => {
  it("clamps every control to its range and keeps n a whole number", () => {
    let s = model.initialize(model.defaultParams);
    s = model.setVariable(s, "n", 99, model.defaultParams);
    expect(s.n).toBe(SERIES_N_MAX);
    s = model.setVariable(s, "n", 3.4, model.defaultParams);
    expect(s.n).toBe(3);
    s = model.setVariable(s, "r", -7, model.defaultParams);
    expect(s.r).toBe(-2);
    s = model.setVariable(s, "p", 0, model.defaultParams);
    expect(s.p).toBe(0.5);
    expect(model.setVariable(s, "tick", 5, model.defaultParams)).toBe(s);
    expect(derive({ n: 500, a: 1e9 })).toMatchObject({ n: SERIES_N_MAX, a: 20 });
  });

  it("adds a term every half second on play, and stops at the cap", () => {
    let s = model.setVariable(model.initialize(model.defaultParams), "n", 1, model.defaultParams);
    for (let i = 0; i < 10; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.n).toBe(3);
    for (let i = 0; i < 400; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.n).toBe(SERIES_N_MAX);
    expect(model.step(s, model.defaultParams, -1).n).toBe(SERIES_N_MAX - 1);
  });

  it("returns a finite number for every output, even at the extremes (no sum to infinity is NaN: \"undefined\")", () => {
    for (const r of [-2, -1, 0, 0.99, 1, 2]) {
      for (const n of [1, SERIES_N_MAX]) {
        for (const power of [1, 2, 3] as const) {
          const out = model.derive({ a: -10, d: -5, r, n, p: 0.5, q: 18, tick: 0 }, { power });
          for (const key of model.outputs) {
            if (out.converges === 0 && (key === "gpLimit" || key === "gpGap" || key === "agpLimit")) {
              expect(out[key], `${key} at r = ${r}`).toBeNaN();
              continue;
            }
            expect(Number.isFinite(out[key]), `${key} at r = ${r}, n = ${n}`).toBe(true);
            expect(Object.is(out[key], -0), `${key} is −0`).toBe(false);
          }
        }
      }
    }
  });
});
