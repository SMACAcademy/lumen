import { describe, expect, it } from "vitest";
import {
  PATTERNS_STICKS_ORDER,
  patternsHcf,
  patternsLcm,
  patternsModel as model,
  patternsPolynomial,
  patternsPowerForm,
  patternsPrimeFactors,
  patternsSpiral,
  type PatternsParams,
  type PatternsState,
} from "./patterns";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<PatternsState> = {}, params: Partial<PatternsParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("prime factorisation", () => {
  it("breaks numbers into primes, smallest first", () => {
    expect(patternsPrimeFactors(60)).toEqual([2, 2, 3, 5]);
    expect(patternsPrimeFactors(96)).toEqual([2, 2, 2, 2, 2, 3]);
    expect(patternsPrimeFactors(97)).toEqual([97]);
    expect(patternsPrimeFactors(91)).toEqual([7, 13]);
    expect(patternsPrimeFactors(1)).toEqual([]);
  });

  it("writes the prime powers", () => {
    expect(patternsPowerForm(60)).toBe("2² × 3 × 5");
    expect(patternsPowerForm(96)).toBe("2⁵ × 3");
    expect(patternsPowerForm(64)).toBe("2⁶");
    expect(patternsPowerForm(97)).toBe("97");
  });

  it("multiplies back to the number for every number in range", () => {
    for (let v = 2; v <= 120; v++) expect(patternsPrimeFactors(v).reduce((p, q) => p * q, 1), String(v)).toBe(v);
  });

  it("finds HCF and LCM, and HCF × LCM is the product (NCERT: 6 and 20, 26 and 91)", () => {
    expect(patternsHcf(12, 18)).toBe(6);
    expect(patternsLcm(12, 18)).toBe(36);
    expect(derive({ num1: 6, num2: 20 })).toMatchObject({ hcf: 2, lcm: 60, product: 120, hcfLcm: 120, coprime: 0 });
    expect(derive({ num1: 26, num2: 91 })).toMatchObject({ hcf: 13, lcm: 182, product: 2366, hcfLcm: 2366 });
    for (let a = 2; a <= 120; a += 7) for (let b = 2; b <= 120; b += 5) expect(patternsHcf(a, b) * patternsLcm(a, b)).toBe(a * b);
  });

  it("counts primes and spots primes and co-primes", () => {
    expect(derive({ num1: 60 })).toMatchObject({ factorCount1: 4, isPrime1: 0, largestPrime1: 5 });
    expect(derive({ num1: 97, num2: 12 })).toMatchObject({ factorCount1: 1, isPrime1: 1, isPrime2: 0, coprime: 1 });
    expect(derive({ num1: 15, num2: 28 })).toMatchObject({ hcf: 1, lcm: 420, coprime: 1 });
  });
});

describe("square roots on the line", () => {
  it("builds the spiral so that the kth corner is √k from the centre", () => {
    const points = patternsSpiral(16);
    expect(points).toHaveLength(16);
    points.forEach(([x, y], i) => expect(Math.hypot(x, y)).toBeCloseTo(Math.sqrt(i + 1), 12));
    expect(points[1]![0]).toBeCloseTo(1, 12);
    expect(points[1]![1]).toBeCloseTo(1, 12);
    expect(points[2]![0]).toBeCloseTo(1 - 1 / Math.SQRT2, 12);
    // Each new side is one unit long and at right angles to the last hypotenuse.
    for (let j = 1; j < points.length; j++) {
      const [px, py] = points[j - 1]!;
      const [qx, qy] = points[j]!;
      expect(Math.hypot(qx - px, qy - py)).toBeCloseTo(1, 12);
      expect(px * (qx - px) + py * (qy - py)).toBeCloseTo(0, 12);
    }
  });

  it("says √k is rational only for perfect squares, and finds the whole numbers either side", () => {
    expect(derive({ k: 2 })).toMatchObject({ isRational: 0, below: 1, above: 2 });
    expect(derive({ k: 2 }).root).toBeCloseTo(1.41421356, 8);
    expect(derive({ k: 5 }).root).toBeCloseTo(2.23606798, 8);
    expect(derive({ k: 9 })).toMatchObject({ root: 3, isRational: 1, below: 3, above: 3 });
    expect(derive({ k: 10 })).toMatchObject({ isRational: 0, below: 3, above: 4 });
    expect([1, 4, 9, 16].map((k) => derive({ k }).isRational)).toEqual([1, 1, 1, 1]);
    expect([2, 3, 5, 8, 12, 15].map((k) => derive({ k }).isRational)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("growing patterns", () => {
  it("counts the matchsticks: 2n + 1, 3n + 1 and 5n + 1", () => {
    expect(derive({ n: 4 }, { sticks: "triangles" })).toMatchObject({ term: 9, nextTerm: 11, growth: 2, start: 1 });
    expect(derive({ n: 10 }, { sticks: "squares" })).toMatchObject({ term: 31, growth: 3 });
    expect(derive({ n: 1 }, { sticks: "squares" }).term).toBe(4);
    expect(derive({ n: 3 }, { sticks: "houses" })).toMatchObject({ term: 16, growth: 5 });
    for (const sticks of PATTERNS_STICKS_ORDER) {
      expect(derive({ n: 6 }, { sticks }).term - derive({ n: 5 }, { sticks }).term).toBe(derive({}, { sticks }).growth);
    }
  });

  it("counts square and triangular dots, and how many the next one needs", () => {
    expect(derive({ n: 4 })).toMatchObject({ squareDots: 16, triangleDots: 10, squareGrowth: 9, triangleGrowth: 5 });
    expect(derive({ n: 5 })).toMatchObject({ squareDots: 25, triangleDots: 15 });
    expect(derive({ n: 20 })).toMatchObject({ squareDots: 400, triangleDots: 210 });
  });

  it("grows one term at a time on play, and stops at the end", () => {
    let s = { ...base, n: 1, k: 1 };
    s = model.advance(s, 0.8, model.defaultParams);
    expect(model.derive(s, model.defaultParams)).toMatchObject({ n: 2, k: 2 });
    s = model.advance(s, 0.5, model.defaultParams);
    expect(model.derive(s, model.defaultParams).n).toBe(2);
    for (let i = 0; i < 100; i++) s = model.advance(s, 0.5, model.defaultParams);
    expect(model.derive(s, model.defaultParams)).toMatchObject({ n: 20, k: 16 });
    expect(model.step(s, model.defaultParams, -1)).toMatchObject({ n: 19, k: 15 });
  });
});

describe("like terms as tiles", () => {
  const p = { x2a: 1, xa: 2, ua: 3, x2b: 1, xb: -1, ub: -2 };
  it("adds only tiles of the same kind, and cancels zero pairs", () => {
    // (x² + 2x + 3) + (x² − x − 2) = 2x² + x + 1
    expect(derive(p, { op: "add" })).toMatchObject({ rx2: 2, rx: 1, ru: 1, resultTerms: 3, zeroPairs: 3, pAt2: 11, qAt2: 0, resultAt2: 11 });
  });

  it("subtracts by flipping every tile of the second expression", () => {
    // (x² + 2x + 3) − (x² − x − 2) = 3x + 5
    expect(derive(p, { op: "subtract" })).toMatchObject({ x2bSigned: -1, xbSigned: 1, ubSigned: 2, rx2: 0, rx: 3, ru: 5, resultTerms: 2, zeroPairs: 1, resultAt2: 11 });
    const r = derive({ x2a: 2, xa: 0, ua: -1, x2b: 3, xb: 4, ub: -1 }, { op: "subtract" });
    expect(r.resultAt2).toBe(r.pAt2 - r.qAt2);
    expect(Object.is(r.ru, -0)).toBe(false);
  });
});

describe("the parabola", () => {
  it("meets the x-axis twice for x² − 3x − 4, at −1 and 4", () => {
    expect(derive({ qa: 1, qb: -3, qc: -4 })).toMatchObject({ disc: 25, zeroCount: 2, zero1: -1, zero2: 4, sumOfZeroes: 3, productOfZeroes: -4, vertexX: 1.5, vertexY: -6.25, opensUp: 1 });
  });

  it("touches once, or misses, as b² − 4ac is zero or negative", () => {
    expect(derive({ qa: 1, qb: -2, qc: 1 })).toMatchObject({ disc: 0, zeroCount: 1, zero1: 1, zero2: 1 });
    expect(derive({ qa: -1, qb: 2, qc: -1 })).toMatchObject({ zeroCount: 1, zero1: 1, opensUp: 0 });
    expect(derive({ qa: 1, qb: 0, qc: 1 })).toMatchObject({ disc: -4, zeroCount: 0, zero1: 0, zero2: 0 });
    expect(derive({ qa: 1, qb: 0, qc: -4 })).toMatchObject({ zeroCount: 2, zero1: -2, zero2: 2, sumOfZeroes: 0 });
  });

  it("has zeroes adding to −b/a and multiplying to c/a", () => {
    expect(derive({ qa: 2, qb: -8, qc: 6 })).toMatchObject({ zero1: 1, zero2: 3, sumOfZeroes: 4, productOfZeroes: 3 });
    for (const [qa, qb, qc] of [[1, -5, 6], [0.5, 1, -4], [-2, 3, 5], [3, 7, -6]] as const) {
      const r = derive({ qa, qb, qc });
      expect(r.zeroCount).toBe(2);
      expect(r.zero1 + r.zero2).toBeCloseTo(r.sumOfZeroes, 10);
      expect(r.zero1 * r.zero2).toBeCloseTo(r.productOfZeroes, 10);
      for (const x of [r.zero1, r.zero2]) expect(qa * x * x + qb * x + qc).toBeCloseTo(0, 9);
    }
  });

  it("treats a = 0 as a straight line with one zero", () => {
    expect(derive({ qa: 0, qb: 2, qc: -4 })).toMatchObject({ isQuadratic: 0, zeroCount: 1, zero1: 2, sumOfZeroes: 0, productOfZeroes: 0 });
    expect(derive({ qa: 0, qb: 0, qc: 3 })).toMatchObject({ isQuadratic: 0, zeroCount: 0 });
  });

  it("writes polynomials the way a book does", () => {
    expect(patternsPolynomial(1, -3, -4)).toBe("x² − 3x − 4");
    expect(patternsPolynomial(-1, 2, -1)).toBe("−x² + 2x − 1");
    expect(patternsPolynomial(2, 0, 1)).toBe("2x² + 1");
    expect(patternsPolynomial(0.5, 1, 0)).toBe("0.5x² + x");
    expect(patternsPolynomial(0, 0, 0)).toBe("0");
  });
});

describe("arithmetic progressions", () => {
  it("finds the nth term a + (n − 1)d (NCERT: the 10th term of 2, 7, 12, … is 47)", () => {
    expect(derive({ apA: 2, apD: 5, n: 10 })).toMatchObject({ nLess: 9, nthTerm: 47 });
    expect(derive({ apA: 3, apD: 4, n: 10 })).toMatchObject({ nthTerm: 39, apSum: 210 });
  });

  it("adds n terms as n/2 × (first + last)", () => {
    expect(derive({ apA: 1, apD: 1, n: 20 })).toMatchObject({ nthTerm: 20, apSum: 210, firstPlusLast: 21 });
    expect(derive({ apA: 1, apD: 2, n: 10 })).toMatchObject({ nthTerm: 19, apSum: 100 });
    // 10 + 7 + 4 + 1 − 2
    expect(derive({ apA: 10, apD: -3, n: 5 })).toMatchObject({ nthTerm: -2, apSum: 20 });
    for (const [apA, apD, n] of [[5, 3, 7], [-4, 2, 12], [20, -5, 9]] as const) {
      let total = 0;
      for (let j = 0; j < n; j++) total += apA + j * apD;
      expect(derive({ apA, apD, n }).apSum).toBe(total);
    }
  });
});

describe("the model", () => {
  it("clamps every control to its range and snaps to whole steps", () => {
    const s = (id: string, v: number) => model.setVariable(base, id, v, model.defaultParams);
    expect(s("num1", 500).num1).toBe(120);
    expect(s("num2", 0).num2).toBe(2);
    expect(s("k", 3.6).k).toBe(4);
    expect(s("n", 99).n).toBe(20);
    expect(s("xb", -9).xb).toBe(-4);
    expect(s("qa", 0.7).qa).toBe(0.5);
    expect(s("qb", 12).qb).toBe(8);
    expect(s("apA", -50).apA).toBe(-10);
    expect(s("apD", 7).apD).toBe(5);
    expect(s("nothing", 1)).toBe(base);
  });

  it("gives a finite number for every output, everywhere", () => {
    const extremes: Partial<PatternsState>[] = [
      {},
      { num1: -5, num2: 1e9, k: -3, n: 1e6, qa: 0, qb: 0, qc: 0 },
      { qa: Number.NaN, qb: Number.POSITIVE_INFINITY, apA: Number.NaN },
      { qa: -3, qb: 8, qc: 8, apA: 20, apD: -5 },
    ];
    for (const state of extremes) {
      for (const sticks of PATTERNS_STICKS_ORDER) {
        for (const op of ["add", "subtract"] as const) {
          const r = derive(state, { sticks, op });
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${key}`).toBe(true);
        }
      }
    }
  });
});
