import { describe, expect, it } from "vitest";
import {
  POLYSCHOOL_A_RANGE,
  polySchoolBinomial,
  polySchoolDivide,
  polySchoolModel as model,
  polySchoolSplits,
  polySchoolText,
  polySchoolValue,
  polySchoolZeroCount,
  type PolySchoolState,
} from "./polyschool";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<PolySchoolState> = {}) => model.derive({ ...base, ...state }, model.defaultParams);

describe("writing polynomials", () => {
  it("prints them as a book does", () => {
    expect(polySchoolText([1, -6, 11, -6])).toBe("x³ − 6x² + 11x − 6");
    expect(polySchoolText([0, 1, 0, -4])).toBe("x² − 4");
    expect(polySchoolText([-2, 0, 1, 0])).toBe("−2x³ + x");
    expect(polySchoolText([0, 0, 0, 0])).toBe("0");
    expect(polySchoolText([6, 19, 15])).toBe("6x² + 19x + 15");
    expect(polySchoolText([2, 1, -2, -1], "y")).toBe("2y³ + y² − 2y − 1");
    expect(polySchoolBinomial(3)).toBe("x + 3");
    expect(polySchoolBinomial(-2)).toBe("x − 2");
    expect(polySchoolBinomial(0)).toBe("x");
  });
});

describe("identities as areas", () => {
  it("(a + b)² = a² + 2ab + b²: 8² = 25 + 30 + 9", () => {
    expect(derive({ a: 5, b: 3 })).toMatchObject({ plusSide: 8, plusSquare: 64, aSquared: 25, twoAB: 30, bSquared: 9, ab: 15, plusExpanded: 64 });
  });

  it("(a − b)² = a² − 2ab + b²: 2² = 25 − 30 + 9", () => {
    expect(derive({ a: 5, b: 3 })).toMatchObject({ minusSide: 2, minusSquare: 4, minusExpanded: 4, minusDrawable: 1 });
    // Still true when b is bigger, though the picture needs a > b.
    expect(derive({ a: 2, b: 7 })).toMatchObject({ minusSide: -5, minusSquare: 25, minusExpanded: 25, minusDrawable: 0 });
    expect(derive({ a: 4, b: 4 })).toMatchObject({ minusSide: 0, minusSquare: 0, minusDrawable: 0 });
    expect(Object.is(derive({ a: 4, b: 4 }).minusSide, -0)).toBe(false);
  });

  it("a² − b² = (a + b)(a − b): 25 − 9 = 8 × 2", () => {
    expect(derive({ a: 5, b: 3 })).toMatchObject({ diffSquares: 16, sumTimesDiff: 16 });
    expect(derive({ a: 9, b: 1 })).toMatchObject({ diffSquares: 80, sumTimesDiff: 80 });
  });

  it("(x + a)(x + b) = x² + (a + b)x + ab: (4 + 3)(4 + 7) = 16 + 40 + 21 = 77", () => {
    expect(derive({ x: 4, a: 3, b: 7 })).toMatchObject({ xPlusA: 7, xPlusB: 11, pairProduct: 77, xSquared: 16, pairMiddle: 40, ab: 21, pairExpanded: 77 });
  });

  it("every identity holds for every setting of the sliders", () => {
    for (let a = 1; a <= 9; a++)
      for (let b = 1; b <= 9; b++)
        for (const x of [1, 5, 9]) {
          const r = derive({ a, b, x });
          expect(r.plusSquare).toBe(r.plusExpanded);
          expect(r.minusSquare).toBe(r.minusExpanded);
          expect(r.diffSquares).toBe(r.sumTimesDiff);
          expect(r.pairProduct).toBe(r.pairExpanded);
        }
  });
});

describe("multiplying expressions", () => {
  it("(2x + 3)(3x + 5) = 6x² + 10x + 9x + 15 = 6x² + 19x + 15", () => {
    expect(derive({ mp: 2, mq: 3, mr: 3, ms: 5 })).toMatchObject({
      mulX2: 6, mulCrossA: 10, mulCrossB: 9, mulX1: 19, mulX0: 15, mulCells: 4, mulTerms: 3, mulLike: 1,
      firstAt2: 7, secondAt2: 11, mulAt2: 77,
    });
    // At x = 2 the answer agrees: 24 + 38 + 15 = 77.
    expect(4 * 6 + 2 * 19 + 15).toBe(77);
  });

  it("a monomial times a binomial: 3x × (2x + 5) = 6x² + 15x", () => {
    expect(derive({ mp: 3, mq: 0, mr: 2, ms: 5 })).toMatchObject({ mulX2: 6, mulX1: 15, mulX0: 0, mulCells: 2, mulTerms: 2, mulLike: 0 });
  });

  it("(x − 4)(x + 4) = x² − 16: the x terms cancel", () => {
    expect(derive({ mp: 1, mq: -4, mr: 1, ms: 4 })).toMatchObject({ mulX2: 1, mulCrossA: 4, mulCrossB: -4, mulX1: 0, mulX0: -16, mulCells: 4, mulTerms: 2, mulLike: 1 });
  });

  it("agrees with the value at x = 2 for every setting", () => {
    for (let mp = 0; mp <= 4; mp++)
      for (let mq = -6; mq <= 6; mq++)
        for (const mr of [0, 1, 3])
          for (const ms of [-5, 0, 2]) {
            const r = derive({ mp, mq, mr, ms });
            expect(4 * r.mulX2 + 2 * r.mulX1 + r.mulX0).toBe(r.mulAt2);
          }
  });
});

describe("factorising x² + bx + c with tiles", () => {
  it("x² + 5x + 6 closes into (x + 2)(x + 3)", () => {
    expect(derive({ fb: 5, fc: 6, fm: 2 })).toMatchObject({ fn: 3, fmn: 6, fGap: 0, fits: 1, perfectSquare: 0, factorable: 1 });
    // A wrong split leaves the corner short: 1 × 4 = 4, two unit tiles over.
    expect(derive({ fb: 5, fc: 6, fm: 1 })).toMatchObject({ fn: 4, fmn: 4, fGap: 2, fits: 0 });
  });

  it("uses negative tiles: x² − 5x + 6 = (x − 2)(x − 3), x² + x − 12 = (x + 4)(x − 3)", () => {
    expect(derive({ fb: -5, fc: 6, fm: -2 })).toMatchObject({ fn: -3, fmn: 6, fits: 1 });
    expect(derive({ fb: 1, fc: -12, fm: 4 })).toMatchObject({ fn: -3, fmn: -12, fits: 1 });
  });

  it("finds the identities: x² + 6x + 9 = (x + 3)², x² − 9 = (x + 3)(x − 3)", () => {
    expect(derive({ fb: 6, fc: 9, fm: 3 })).toMatchObject({ fn: 3, fits: 1, perfectSquare: 1 });
    expect(derive({ fb: 0, fc: -9, fm: 3 })).toMatchObject({ fn: -3, fmn: -9, fits: 1, perfectSquare: 0 });
  });

  it("takes out the common factor x: x² + 5x = x(x + 5)", () => {
    expect(derive({ fb: 5, fc: 0, fm: 0 })).toMatchObject({ fn: 5, fmn: 0, fits: 1 });
  });

  it("knows which ones split with whole numbers", () => {
    expect(polySchoolSplits(5, 6)).toBe(true);
    expect(polySchoolSplits(0, -9)).toBe(true);
    expect(polySchoolSplits(1, 1)).toBe(false);
    expect(polySchoolSplits(3, 1)).toBe(false); // b² − 4c = 5 is not a square
    expect(derive({ fb: 1, fc: 1 }).factorable).toBe(0);
    // Brute force agrees for every b and c in range.
    for (let b = -10; b <= 10; b++)
      for (let c = -24; c <= 24; c++) {
        let found = false;
        for (let m = -40; m <= 40; m++) if (m * (b - m) === c) found = true;
        expect(polySchoolSplits(b, c), `${b} ${c}`).toBe(found);
      }
  });
});

describe("polynomials: degree, value and zeroes", () => {
  it("names the degree and kind", () => {
    expect(derive({ c3: 1, c2: -6, c1: 11, c0: -6 })).toMatchObject({ degree: 3, polyType: 3, termCount: 4, leadCoeff: 1, isZeroPoly: 0 });
    expect(derive({ c3: 0, c2: 1, c1: 0, c0: -4 })).toMatchObject({ degree: 2, polyType: 2, termCount: 2, leadCoeff: 1 });
    expect(derive({ c3: 0, c2: 0, c1: 2, c0: 1 })).toMatchObject({ degree: 1, polyType: 1, termCount: 2, leadCoeff: 2 });
    expect(derive({ c3: 0, c2: 0, c1: 0, c0: 5 })).toMatchObject({ degree: 0, polyType: 0, termCount: 1, zeroCount: 0 });
    // The zero polynomial: no degree, and every number is a zero (both reported as −1).
    expect(derive({ c3: 0, c2: 0, c1: 0, c0: 0 })).toMatchObject({ polyType: 4, isZeroPoly: 1, termCount: 0, leadCoeff: 0, degree: -1, zeroCount: -1 });
  });

  it("finds p(a) term by term: x³ − 6x² + 11x − 6 at 0, 1, 2, 3, 4", () => {
    const p = { c3: 1, c2: -6, c1: 11, c0: -6 };
    expect(derive({ ...p, pa: 0 })).toMatchObject({ pValue: -6, isZeroAt: 0 });
    expect(derive({ ...p, pa: 1 })).toMatchObject({ pValue: 0, isZeroAt: 1 });
    expect(derive({ ...p, pa: 2 })).toMatchObject({ pValue: 0, isZeroAt: 1 });
    expect(derive({ ...p, pa: 3 })).toMatchObject({ pValue: 0, isZeroAt: 1 });
    // 64 − 96 + 44 − 6 = 6.
    expect(derive({ ...p, pa: 4 })).toMatchObject({ pValue: 6, isZeroAt: 0 });
    // −8 − 24 − 22 − 6 = −60.
    expect(derive({ ...p, pa: -2 }).pValue).toBe(-60);
    // −1 − 6 − 11 − 6 = −24.
    expect(derive({ ...p, pa: -1 }).pValue).toBe(-24);
    expect(polySchoolValue([2, 1, -2, -1], 1)).toBe(0);
  });

  it("counts different real zeroes exactly", () => {
    expect(polySchoolZeroCount([1, -6, 11, -6])).toBe(3); // 1, 2, 3
    expect(polySchoolZeroCount([1, -3, -9, -5])).toBe(2); // −1 twice and 5
    expect(polySchoolZeroCount([1, 3, 3, 1])).toBe(1); // −1 three times
    expect(polySchoolZeroCount([1, 0, 1, 1])).toBe(1);
    expect(polySchoolZeroCount([2, 1, -2, -1])).toBe(3); // 1, −1, −½
    expect(polySchoolZeroCount([0, 1, 0, -4])).toBe(2);
    expect(polySchoolZeroCount([0, 1, -4, 4])).toBe(1);
    expect(polySchoolZeroCount([0, 1, 0, 1])).toBe(0);
    expect(polySchoolZeroCount([0, 0, 2, 1])).toBe(1);
    expect(polySchoolZeroCount([0, 0, 0, 5])).toBe(0);
  });
});

describe("the remainder and factor theorems", () => {
  it("divides x³ − 6x² + 11x − 6 by (x − 4): quotient x² − 2x + 3, remainder 6 = p(4)", () => {
    expect(polySchoolDivide([1, -6, 11, -6], 4)).toEqual({ quotient: [1, -2, 3], remainder: 6, carries: [0, 4, -8, 12] });
    expect(derive({ c3: 1, c2: -6, c1: 11, c0: -6, pa: 4 })).toMatchObject({ q2: 1, q1: -2, q0: 3, remainder: 6, pValue: 6, isFactor: 0 });
  });

  it("(x − 1) is a factor: x³ − 6x² + 11x − 6 = (x − 1)(x² − 5x + 6)", () => {
    expect(derive({ c3: 1, c2: -6, c1: 11, c0: -6, pa: 1 })).toMatchObject({ q2: 1, q1: -5, q0: 6, remainder: 0, isFactor: 1 });
  });

  it("x + 2 is a factor of x³ + 3x² + 5x + 6: p(−2) = −8 + 12 − 10 + 6 = 0", () => {
    expect(derive({ c3: 1, c2: 3, c1: 5, c0: 6, pa: -2 })).toMatchObject({ pValue: 0, remainder: 0, isFactor: 1, q2: 1, q1: 1, q0: 3 });
  });

  it("x³ + 3x² + 3x + 1 divided by x + 1 leaves 0", () => {
    expect(derive({ c3: 1, c2: 3, c1: 3, c0: 1, pa: -1 })).toMatchObject({ remainder: 0, q2: 1, q1: 2, q0: 1 });
  });

  it("dividing a quadratic gives a linear quotient: (x² − 4) ÷ (x − 3) = x + 3, remainder 5", () => {
    expect(derive({ c3: 0, c2: 1, c1: 0, c0: -4, pa: 3 })).toMatchObject({ q2: 0, q1: 1, q0: 3, remainder: 5, pValue: 5 });
  });

  it("the remainder is always p(a), and p(x) = (x − a)q(x) + r", () => {
    for (let c3 = -2; c3 <= 2; c3++)
      for (const c2 of [-9, -6, 0, 3, 9])
        for (const c1 of [-12, -1, 0, 5, 11])
          for (const c0 of [-12, -6, 0, 7])
            for (let pa = -5; pa <= 5; pa++) {
              const r = derive({ c3, c2, c1, c0, pa });
              expect(r.remainder).toBe(r.pValue);
              // Check the division at another x, say x = 7.
              const x = 7;
              expect((x - pa) * (r.q2 * x * x + r.q1 * x + r.q0) + r.remainder).toBe(c3 * x ** 3 + c2 * x * x + c1 * x + c0);
            }
  });
});

describe("the model", () => {
  it("clamps and rounds what it is given", () => {
    let s = model.setVariable(base, "c3", 7, model.defaultParams);
    expect(s.c3).toBe(2);
    s = model.setVariable(s, "a", 0.4, model.defaultParams);
    expect(s.a).toBe(1);
    s = model.setVariable(s, "fc", -99, model.defaultParams);
    expect(s.fc).toBe(-24);
    s = model.setVariable(s, "pa", 2.6, model.defaultParams);
    expect(s.pa).toBe(3);
    expect(model.setVariable(s, "nonsense", 3, model.defaultParams)).toBe(s);
    expect(model.getVariable(s, "pa")).toBe(3);
  });

  it("Play walks a along one whole number at a time, and stops at the end", () => {
    let s: PolySchoolState = { ...base, pa: POLYSCHOOL_A_RANGE[0] };
    s = model.advance(s, 0.8, model.defaultParams);
    expect(model.derive(s, model.defaultParams).pa).toBe(-4);
    for (let i = 0; i < 30; i++) s = model.advance(s, 0.8, model.defaultParams);
    expect(model.derive(s, model.defaultParams).pa).toBe(5);
    expect(model.derive(model.step({ ...base, pa: 2 }, model.defaultParams, 1), model.defaultParams).pa).toBe(3);
    expect(model.derive(model.step({ ...base, pa: -5 }, model.defaultParams, -1), model.defaultParams).pa).toBe(-5);
  });

  it("every output is a finite number and never −0", () => {
    const states: Partial<PolySchoolState>[] = [
      {},
      { a: 1, b: 9, x: 1, mp: 0, mq: 0, mr: 0, ms: 0, fb: 0, fc: 0, fm: 0, c3: 0, c2: 0, c1: 0, c0: 0, pa: 0 },
      { mp: 4, mq: -6, mr: 4, ms: 6, fb: -10, fc: 24, fm: 10, c3: -2, c2: 9, c1: -12, c0: 12, pa: -5 },
      { a: Number.NaN, fc: Number.POSITIVE_INFINITY, pa: -0 },
    ];
    for (const st of states) {
      const r = derive(st);
      expect(Object.keys(r).sort()).toEqual([...model.outputs].sort());
      for (const [k, v] of Object.entries(r)) {
        expect(Number.isFinite(v), k).toBe(true);
        expect(Object.is(v, -0), k).toBe(false);
      }
    }
  });
});
