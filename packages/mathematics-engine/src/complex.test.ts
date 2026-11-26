import { describe, expect, it } from "vitest";
import { COMPLEX_OP_ORDER, complexModel as model, principalArgument, type ComplexParams, type ComplexState } from "./complex";

const base: ComplexState = model.initialize(model.defaultParams);
const derive = (state: Partial<ComplexState> = {}, params: Partial<ComplexParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the Argand plane", () => {
  it("gives 3 + 4i a modulus of 5, its conjugate, its quarter turn and its reciprocal", () => {
    const r = derive({ a: 3, b: 4 });
    expect(r).toMatchObject({ re: 3, im: 4, modulus: 5, quadrant: 1, conjRe: 3, conjIm: -4, zzBar: 25, iRe: -4, iIm: 3 });
    expect(r.recipRe).toBeCloseTo(0.12, 12);
    expect(r.recipIm).toBeCloseTo(-0.16, 12);
    expect(r.argDeg).toBeCloseTo(53.13, 2);
    expect(r.conjArgDeg).toBeCloseTo(-53.13, 2);
    expect(r.iArgDeg).toBeCloseTo(143.13, 2);
  });

  it("takes the principal argument in (−180°, 180°], quadrant by quadrant", () => {
    const argDeg = (a: number, b: number) => derive({ a, b }).argDeg;
    expect(argDeg(1, 1)).toBeCloseTo(45, 10);
    expect(argDeg(-1, 1)).toBeCloseTo(135, 10);
    // The usual slip: tan⁻¹(−1/−1) = 45°, and 225° is not principal. It is −135°.
    expect(argDeg(-1, -1)).toBeCloseTo(-135, 10);
    expect(argDeg(1, -1)).toBeCloseTo(-45, 10);
    expect(argDeg(-2, 2 * Math.sqrt(3))).toBeCloseTo(120, 10);
    expect([derive({ a: 1, b: 1 }), derive({ a: -1, b: 1 }), derive({ a: -1, b: -1 }), derive({ a: 1, b: -1 })].map((r) => r.quadrant)).toEqual([1, 2, 3, 4]);
  });

  it("puts the axes at 0°, 90°, 180° and −90°, never −180°", () => {
    expect(derive({ a: 2, b: 0 })).toMatchObject({ argDeg: 0, quadrant: 0 });
    expect(derive({ a: 0, b: 2 })).toMatchObject({ argDeg: 90, quadrant: 0 });
    expect(derive({ a: -2, b: 0 }).argDeg).toBe(180);
    expect(derive({ a: -2, b: -0 }).argDeg).toBe(180);
    expect(principalArgument(-1, -1e-15)).toBe(Math.PI);
    expect(derive({ a: 0, b: -2 }).argDeg).toBe(-90);
  });

  it("flags 0, which has no argument, and gives it no reciprocal", () => {
    expect(derive({ a: 0, b: 0 })).toMatchObject({ isZero: 1, arg: 0, modulus: 0, recipRe: 0, recipIm: 0 });
    expect(Object.is(derive({ a: 0, b: 0 }).iRe, -0)).toBe(false);
  });
});

describe("the algebra of two numbers", () => {
  it("adds, subtracts, multiplies and divides (3 + 4i) and (1 + 2i) by hand", () => {
    const r = derive({ a: 3, b: 4, c: 1, d: 2 });
    expect(r).toMatchObject({ sumRe: 4, sumIm: 6, diffRe: 2, diffIm: 2, prodRe: -5, prodIm: 10 });
    // (3 + 4i)(1 − 2i)/5 = (11 − 2i)/5.
    expect(r.quotRe).toBeCloseTo(2.2, 12);
    expect(r.quotIm).toBeCloseTo(-0.4, 12);
    expect(r.distance).toBeCloseTo(Math.SQRT2 * 2, 12);
  });

  it("multiplies the lengths and adds the angles", () => {
    const r = derive({ a: 3, b: 4, c: 1, d: 2 });
    expect(r.prodModulus).toBeCloseTo(r.modulus * r.modulus2, 12);
    expect(r.prodModulus).toBeCloseTo(5 * Math.sqrt(5), 12);
    expect(r.prodArgDeg).toBeCloseTo(r.argDeg + r.arg2Deg, 10);
    expect(r.argTurns).toBe(0);
    expect(r.quotModulus).toBeCloseTo(Math.sqrt(5), 12);
  });

  it("takes off a whole turn when the angles add past 180°", () => {
    // (−1 + i)² = −2i: 135° + 135° = 270°, and 270° − 360° = −90°.
    const r = derive({ a: -1, b: 1, c: -1, d: 1 });
    expect(r).toMatchObject({ prodRe: 0, prodIm: -2, argTurns: -1 });
    expect(r.argSumDeg).toBeCloseTo(270, 10);
    expect(r.prodArgDeg).toBeCloseTo(-90, 10);
    // i × i = −1, at 180°.
    expect(derive({ a: 0, b: 1, c: 0, d: 1 })).toMatchObject({ prodRe: -1, prodIm: 0, prodArgDeg: 180 });
  });

  it("makes (1 + i)/(1 − i) = i, and refuses to divide by 0", () => {
    const r = derive({ a: 1, b: 1, c: 1, d: -1 }, { op: "divide" });
    expect(r).toMatchObject({ resultRe: 0, resultIm: 1, resultDefined: 1, resultArgDeg: 90 });
    const byZero = derive({ c: 0, d: 0 }, { op: "divide" });
    expect(byZero).toMatchObject({ resultDefined: 0, quotModulus: 0 });
    // z ÷ 0 is undefined: NaN (shown as "undefined"), never 0.
    expect(byZero.resultRe).toBeNaN();
    expect(byZero.resultIm).toBeNaN();
  });

  it("reports the chosen operation's result", () => {
    const want = { add: [4, 6], subtract: [2, 2], multiply: [-5, 10], divide: [2.2, -0.4] } as const;
    for (const op of COMPLEX_OP_ORDER) {
      const r = derive({ a: 3, b: 4, c: 1, d: 2 }, { op });
      expect(r.op).toBe(COMPLEX_OP_ORDER.indexOf(op));
      expect(r.resultRe, op).toBeCloseTo(want[op][0], 12);
      expect(r.resultIm, op).toBeCloseTo(want[op][1], 12);
    }
  });

  it("turns z a quarter turn per step, and keeps its length while playing", () => {
    let s = model.step({ ...base, a: 3, b: 2 }, model.defaultParams, 1);
    expect([s.a, s.b]).toEqual([-2, 3]);
    s = model.step(s, model.defaultParams, -1);
    expect([s.a, s.b]).toEqual([3, 2]);
    // Two seconds at π/4 rad/s is a quarter turn too.
    let p: ComplexState = { ...base, a: 3, b: 2 };
    for (let i = 0; i < 20; i++) p = model.advance(p, 0.1, model.defaultParams);
    expect(p.a).toBeCloseTo(-2, 10);
    expect(p.b).toBeCloseTo(3, 10);
    // A corner of the slider square turns onto the axis without being cut short.
    let corner: ComplexState = { ...base, a: 4, b: 4 };
    for (let i = 0; i < 10; i++) corner = model.advance(corner, 0.1, model.defaultParams);
    const r = derive(corner);
    expect(r.re).toBeCloseTo(0, 10);
    expect(r.modulus).toBeCloseTo(4 * Math.SQRT2, 10);
  });
});

describe("roots of unity", () => {
  it("makes the cube roots 1, ω, ω² with ω = −½ + i√3/2, summing to 0", () => {
    const r = derive({ n: 3, m: 1 });
    expect(r.omegaRe).toBeCloseTo(-0.5, 12);
    expect(r.omegaIm).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(r).toMatchObject({ rootSumRe: 0, rootSumIm: 0, rootProduct: 1, rootAngleDeg: 120 });
  });

  it("sums to 0 for every n, and multiplies to (−1)ⁿ⁻¹", () => {
    for (let n = 2; n <= 12; n++) {
      const r = derive({ n });
      expect(r, `n = ${n}`).toMatchObject({ rootSumRe: 0, rootSumIm: 0 });
      expect(r.rootProduct, `n = ${n}`).toBeCloseTo((-1) ** (n - 1), 12);
    }
    expect(derive({ n: 4 }).rootProduct).toBe(-1);
  });

  it("brings ωᵐ back to 1 when m reaches n", () => {
    expect(derive({ n: 3, m: 3 })).toMatchObject({ powerRe: 1, powerIm: 0, mModN: 0 });
    const four = derive({ n: 3, m: 4 });
    expect(four.mModN).toBe(1);
    expect(four.powerRe).toBeCloseTo(-0.5, 12);
    expect(derive({ n: 4, m: 1 })).toMatchObject({ powerRe: 0, powerIm: 1 });
  });
});

describe("quadratics", () => {
  it("solves x² − 2x − 3 = 0: D = 16, roots −1 and 3", () => {
    const r = derive({ qa: 1, qb: -2, qc: -3 });
    expect(r).toMatchObject({ disc: 16, rootKind: 0, realRoots: 2, alphaRe: -1, betaRe: 3, alphaIm: 0, rootSum: 2, rootProduct2: -3, vertexX: 1, vertexY: -4 });
  });

  it("gives x² + 3x + 5 = 0 the pair (−3 ± √11 i)/2", () => {
    const r = derive({ qa: 1, qb: 3, qc: 5 });
    expect(r).toMatchObject({ disc: -11, rootKind: 2, realRoots: 0, alphaRe: -1.5, betaRe: -1.5 });
    expect(r.alphaIm).toBeCloseTo(Math.sqrt(11) / 2, 12);
    expect(r.betaIm).toBeCloseTo(-Math.sqrt(11) / 2, 12);
    expect(r.rootSum).toBe(-3);
    expect(r.rootProduct2).toBeCloseTo(5, 12);
  });

  it("finds ω and ω² as the roots of x² + x + 1", () => {
    const r = derive({ qa: 1, qb: 1, qc: 1 });
    expect(r.alphaRe).toBeCloseTo(-0.5, 12);
    expect(r.alphaIm).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(r.rootProduct2).toBeCloseTo(1, 12);
  });

  it("has one repeated root when D = 0", () => {
    expect(derive({ qa: 1, qb: -4, qc: 4 })).toMatchObject({ disc: 0, rootKind: 1, realRoots: 1, alphaRe: 2, betaRe: 2, positiveSet: 4, negativeSet: 3 });
  });

  it("always has α + β = −b/a and αβ = c/a", () => {
    for (const qa of [-3, -1.5, -0.5, 0.5, 2, 3])
      for (const qb of [-6, -2.5, 0, 1, 4.5])
        for (const qc of [-6, -1, 0, 2.5, 6]) {
          const r = derive({ qa, qb, qc });
          expect(r.rootSum, `${qa} ${qb} ${qc}`).toBeCloseTo(-qb / qa, 9);
          expect(r.rootProduct2, `${qa} ${qb} ${qc}`).toBeCloseTo(qc / qa, 9);
        }
  });

  it("is not a quadratic when a = 0", () => {
    expect(derive({ qa: 0, qb: 2, qc: 1 })).toMatchObject({ isQuadratic: 0, rootKind: 3, kLocation: 5, positiveSet: 5, alphaRe: 0 });
  });
});

describe("where the roots lie", () => {
  it("places k against the roots of x² − 2x − 3", () => {
    const at = (k: number) => derive({ qa: 1, qb: -2, qc: -3, k });
    expect(at(0)).toMatchObject({ fk: -3, afk: -3, kLocation: 3 });
    expect(at(-2)).toMatchObject({ fk: 5, kLocation: 2 });
    expect(at(4)).toMatchObject({ fk: 5, kLocation: 4 });
    expect(at(3)).toMatchObject({ fk: 0, kLocation: 1 });
    expect(derive({ qa: 1, qb: 1, qc: 1, k: 0 }).kLocation).toBe(0);
  });

  it("agrees with the textbook conditions on D, a·f(k) and the vertex, everywhere on the sliders", () => {
    for (let qa = -3; qa <= 3; qa += 1)
      for (let qb = -6; qb <= 6; qb += 1.5)
        for (let qc = -6; qc <= 6; qc += 1.5)
          for (let k = -5; k <= 5; k += 1) {
            if (qa === 0) continue;
            const r = derive({ qa, qb, qc, k });
            const both = r.disc >= 0 && r.afk > 0 && -qb / (2 * qa) > k;
            const between = r.afk < 0;
            expect(r.kLocation === 2, `${qa} ${qb} ${qc} ${k}`).toBe(both);
            expect(r.kLocation === 3, `${qa} ${qb} ${qc} ${k}`).toBe(between);
          }
  });

  it("reads quadratic inequalities from the sign of a and D", () => {
    expect(derive({ qa: 1, qb: -2, qc: -3 })).toMatchObject({ positiveSet: 1, negativeSet: 2 });
    expect(derive({ qa: -1, qb: 2, qc: 3 })).toMatchObject({ positiveSet: 2, negativeSet: 1 });
    expect(derive({ qa: 1, qb: 1, qc: 1 })).toMatchObject({ positiveSet: 0, negativeSet: 3 });
    expect(derive({ qa: -1, qb: 1, qc: -1 })).toMatchObject({ positiveSet: 3, negativeSet: 0 });
  });
});

describe("the model", () => {
  it("clamps every variable to its slider", () => {
    const s = (id: string, v: number) => model.setVariable(base, id, v, model.defaultParams);
    expect(s("a", 9).a).toBe(4);
    expect(s("d", -9).d).toBe(-4);
    expect(s("n", 1).n).toBe(2);
    expect(s("n", 7.4).n).toBe(7);
    expect(s("m", 40).m).toBe(12);
    expect(s("qa", -5).qa).toBe(-3);
    expect(s("qc", 10).qc).toBe(6);
    expect(s("k", -8).k).toBe(-5);
    expect(s("unknown", 1)).toBe(base);
  });

  it("gives a finite number for every output, even at the extremes (z ÷ 0 alone is NaN, shown as \"undefined\")", () => {
    // Only the answer of a division by w = 0 has no value.
    const undefinedWhenDividingByZero = new Set(["resultRe", "resultIm", "resultModulus", "resultArgDeg"]);
    for (const op of COMPLEX_OP_ORDER)
      for (const state of [
        { a: 0, b: 0, c: 0, d: 0, qa: 0, qb: 0, qc: 0 },
        { a: 99, b: -99, c: -99, d: 99, n: 99, m: -4, qa: 99, qb: -99, qc: 99, k: 99 },
        { a: -4, b: 0, c: -4, d: 0, qa: -3, qb: 6, qc: -6, k: -5 },
      ]) {
        const r = derive(state, { op });
        for (const key of model.outputs) {
          if (r.resultDefined === 0 && undefinedWhenDividingByZero.has(key)) {
            expect(r[key], `${op} ${key}`).toBeNaN();
            continue;
          }
          expect(Number.isFinite(r[key]), `${op} ${key}`).toBe(true);
          expect(Object.is(r[key], -0), `${op} ${key} is −0`).toBe(false);
        }
      }
  });
});
