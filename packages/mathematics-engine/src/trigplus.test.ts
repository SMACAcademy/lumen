import { describe, expect, it } from "vitest";
import {
  TRIGPLUS_FUNCTIONS,
  TRIGPLUS_LIMITS,
  trigPlusFold,
  trigPlusGeneralSolution,
  trigPlusInverse,
  trigPlusModel as model,
  trigPlusSolutionsIn,
  trigPlusSmallAngle,
  trigPlusTanSum,
  type TrigPlusParams,
  type TrigPlusState,
} from "./trigplus";

const PI = Math.PI;
const d = (degrees: number) => (degrees * PI) / 180;
const base: TrigPlusState = model.initialize(model.defaultParams);
const derive = (state: Partial<TrigPlusState> = {}, params: Partial<TrigPlusParams> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("compound angles", () => {
  it("gives cos 75° = (√6 − √2)/4 and sin 75° = (√6 + √2)/4 from 45° + 30°", () => {
    const r = derive({ A: d(45), B: d(30) });
    expect(r.cosSumFormula).toBeCloseTo((Math.sqrt(6) - Math.sqrt(2)) / 4, 12);
    expect(r.sinSumFormula).toBeCloseTo((Math.sqrt(6) + Math.sqrt(2)) / 4, 12);
    expect(r.cosSum).toBeCloseTo(0.258819, 6);
    expect(r.sumDeg).toBeCloseTo(75, 10);
    // The two pieces: cos 45° cos 30° = √6/4, sin 45° sin 30° = √2/4.
    expect(r.cosACosB).toBeCloseTo(Math.sqrt(6) / 4, 12);
    expect(r.sinASinB).toBeCloseTo(Math.sqrt(2) / 4, 12);
  });

  it("gives cos 15° and sin 15° from 45° − 30°", () => {
    const r = derive({ A: d(45), B: d(30) });
    expect(r.cosDiffFormula).toBeCloseTo((Math.sqrt(6) + Math.sqrt(2)) / 4, 12);
    expect(r.sinDiffFormula).toBeCloseTo((Math.sqrt(6) - Math.sqrt(2)) / 4, 12);
  });

  it("makes cos(45° + 45°) exactly zero: the two pieces are both ½", () => {
    const r = derive({ A: d(45), B: d(45) });
    expect(r.cosACosB).toBeCloseTo(0.5, 12);
    expect(r.sinASinB).toBeCloseTo(0.5, 12);
    expect(r.cosSum).toBe(0);
    expect(r.tanSumDefined).toBe(0);
    expect(r.tanSum).toBe(0);
  });

  it("agrees with the angle itself everywhere, including tan(A + B)", () => {
    for (let a = 0; a <= 360; a += 25) {
      for (let b = 0; b <= 360; b += 35) {
        const r = derive({ A: d(a), B: d(b) });
        expect(r.cosSumFormula, `${a} ${b}`).toBeCloseTo(r.cosSum, 12);
        expect(r.sinSumFormula, `${a} ${b}`).toBeCloseTo(r.sinSum, 12);
        expect(r.cosDiffFormula, `${a} ${b}`).toBeCloseTo(r.cosDiff, 12);
        expect(r.sinDiffFormula, `${a} ${b}`).toBeCloseTo(r.sinDiff, 12);
        // NCERT's proof: the chord P₁P₃ equals the chord P₂P₄.
        expect(r.chordP1P3, `${a} ${b}`).toBeCloseTo(r.chordP2P4, 12);
        expect(r.chordP2P4 ** 2).toBeCloseTo(2 - 2 * r.cosSum, 12);
        if (r.tanSumDefined && Math.abs(Math.cos(r.A)) > 1e-6 && Math.abs(Math.cos(r.B)) > 1e-6) {
          const tA = Math.tan(r.A);
          const tB = Math.tan(r.B);
          if (Math.abs(1 - tA * tB) > 1e-6) expect(r.tanSum, `${a} ${b}`).toBeCloseTo((tA + tB) / (1 - tA * tB), 8);
        }
      }
    }
  });

  it("gives tan 75° = 2 + √3", () => {
    expect(derive({ A: d(45), B: d(30) }).tanSum).toBeCloseTo(2 + Math.sqrt(3), 12);
  });
});

describe("double and half angles", () => {
  it("gives sin 30° from 2 sin 15° cos 15°", () => {
    const r = derive({ A: d(15) });
    expect(r.sin2AFormula).toBeCloseTo(0.5, 12);
    expect(r.sin2A).toBeCloseTo(0.5, 12);
  });

  it("gives cos 2A three ways, all equal", () => {
    for (let a = 0; a <= 360; a += 15) {
      const r = derive({ A: d(a) });
      for (const form of [r.cos2AForm1, r.cos2AForm2, r.cos2AForm3]) expect(form, `${a}`).toBeCloseTo(r.cos2A, 12);
      expect(r.sin2AFormula).toBeCloseTo(r.sin2A, 12);
      expect(r.halfFormula).toBeCloseTo(r.sinHalfSq, 12);
      expect(r.pythagoras).toBeCloseTo(1, 14);
    }
    // cos 120° = −½, from A = 60°: cos² 60° − sin² 60° = ¼ − ¾.
    expect(derive({ A: d(60) }).cos2AForm1).toBeCloseTo(-0.5, 12);
  });

  it("gives sin² 15° = (1 − cos 30°)/2 = (2 − √3)/4", () => {
    expect(derive({ A: d(30) }).halfFormula).toBeCloseTo((2 - Math.sqrt(3)) / 4, 12);
  });

  it("has sin 2A the same at A = 30° and A = 60°", () => {
    expect(derive({ A: d(30) }).sin2A).toBeCloseTo(derive({ A: d(60) }).sin2A, 12);
  });
});

describe("trigonometric equations", () => {
  it("solves sin x = √3/2: principal solutions π/3 and 2π/3, general nπ + (−1)ⁿ π/3", () => {
    const r = derive({ k: Math.sqrt(3) / 2, n: -1 }, { func: "sin" });
    expect(r.alphaDeg).toBeCloseTo(60, 6);
    expect(r.principalCount).toBe(2);
    expect(r.principal1Deg).toBeCloseTo(60, 6);
    expect(r.principal2Deg).toBeCloseTo(120, 6);
    // n = −1: −π − π/3 = −4π/3, i.e. −240°.
    expect(r.solutionNDeg).toBeCloseTo(-240, 6);
    expect(r.fAtSolution).toBeCloseTo(Math.sqrt(3) / 2, 8);
    // In −5π/2 … 5π/2: n = −2 … 2 of the family, five solutions.
    expect(r.windowCount).toBe(5);
  });

  it("solves sin x = −½: principal solutions 7π/6 and 11π/6 (NCERT)", () => {
    const r = derive({ k: -0.5 }, { func: "sin" });
    expect(r.alphaDeg).toBeCloseTo(-30, 6);
    expect(r.principal1Deg).toBeCloseTo(210, 6);
    expect(r.principal2Deg).toBeCloseTo(330, 6);
  });

  it("solves cos x = ½ (x = 2nπ ± π/3) and cos x = −½ (x = 2nπ ± 2π/3)", () => {
    const half = derive({ k: 0.5, n: 1 }, { func: "cos" });
    expect(half.principal1Deg).toBeCloseTo(60, 6);
    expect(half.principal2Deg).toBeCloseTo(300, 6);
    expect(half.solutionNDeg).toBeCloseTo(420, 6);
    expect(half.solutionNOtherDeg).toBeCloseTo(300, 6);
    const minus = derive({ k: -0.5 }, { func: "cos" });
    expect(minus.alphaDeg).toBeCloseTo(120, 6);
    expect([minus.principal1Deg, minus.principal2Deg].map((x) => Math.round(x))).toEqual([120, 240]);
  });

  it("solves tan x = 1 (x = nπ + π/4) and tan x = −√3 (principal 2π/3, 5π/3)", () => {
    const one = derive({ k: 1, n: 1 }, { func: "tan" });
    expect(one.solutionNDeg).toBeCloseTo(225, 8);
    expect(one.principalCount).toBe(2);
    expect([one.principal1Deg, one.principal2Deg].map((x) => Math.round(x))).toEqual([45, 225]);
    const root3 = derive({ k: -Math.sqrt(3) }, { func: "tan" });
    expect([root3.principal1Deg, root3.principal2Deg].map((x) => Math.round(x))).toEqual([120, 300]);
    expect(one.windowCount).toBe(5);
  });

  it("counts one principal solution at the top and bottom, two at zero, none past 1", () => {
    const count = (func: TrigPlusParams["func"], k: number) => derive({ k }, { func }).principalCount;
    expect(count("sin", 1)).toBe(1);
    expect(count("sin", -1)).toBe(1);
    expect(count("sin", 0)).toBe(2); // 0 and π
    expect(count("cos", 1)).toBe(1); // 0
    expect(count("cos", -1)).toBe(1); // π
    expect(count("cos", 0)).toBe(2); // π/2, 3π/2
    expect(count("sin", 1.2)).toBe(0);
    expect(count("tan", 2)).toBe(2);
    expect(derive({ k: 1.2 }, { func: "cos" })).toMatchObject({ solvable: 0, alpha: 0, principalCount: 0, windowCount: 0, solutionN: 0 });
  });

  it("treats a slider's 1.0000000000000009 as 1", () => {
    expect(derive({ k: -2 + 0.01 * 300 }, { func: "sin" })).toMatchObject({ solvable: 1, principalCount: 1 });
  });

  it("finds every solution in a range from the general formula, and only solutions", () => {
    for (const f of TRIGPLUS_FUNCTIONS) {
      for (const k of [-0.9, -0.3, 0, 0.4, 0.95]) {
        const xs = trigPlusSolutionsIn(f, k, -10, 10);
        for (const x of xs) expect(f === "sin" ? Math.sin(x) : f === "cos" ? Math.cos(x) : Math.tan(x), `${f} ${k} ${x}`).toBeCloseTo(k, 9);
        // Two per period for sin and cos, one per period for tan.
        const expected = f === "tan" ? 20 / PI : 20 / PI;
        expect(Math.abs(xs.length - expected), `${f} ${k}`).toBeLessThanOrEqual(f === "tan" ? 1 : 2);
      }
    }
    expect(trigPlusGeneralSolution("sin", PI / 6, 3)).toBeCloseTo(3 * PI - PI / 6, 12);
    expect(trigPlusGeneralSolution("cos", PI / 6, -1, -1)).toBeCloseTo(-2 * PI - PI / 6, 12);
  });
});

describe("inverse functions", () => {
  it("returns principal values: sin⁻¹(½) = π/6, cos⁻¹(−½) = 2π/3, tan⁻¹(−1) = −π/4, sin⁻¹(−1) = −π/2", () => {
    expect(derive({ u: 0.5 }, { func: "sin" }).inverseDeg).toBeCloseTo(30, 10);
    expect(derive({ u: -0.5 }, { func: "cos" }).inverseDeg).toBeCloseTo(120, 10);
    expect(derive({ u: -1 }, { func: "tan" }).inverseDeg).toBeCloseTo(-45, 10);
    expect(derive({ u: -1 }, { func: "sin" }).inverseDeg).toBeCloseTo(-90, 10);
    expect(trigPlusInverse("sin", 1.5)).toBeNaN();
  });

  it("is undefined for sin⁻¹ and cos⁻¹ beyond ±1, but defined for tan⁻¹", () => {
    expect(derive({ u: 2 }, { func: "sin" })).toMatchObject({ inDomain: 0, inverse: 0, uInRange: 0, complementSum: 0 });
    expect(derive({ u: 2 }, { func: "tan" }).inDomain).toBe(1);
    expect(derive({ u: 2 }, { func: "tan" }).inverseDeg).toBeCloseTo(63.435, 3);
  });

  it("has sin⁻¹(−x) = −sin⁻¹x, cos⁻¹(−x) = π − cos⁻¹x and tan⁻¹(−x) = −tan⁻¹x", () => {
    for (const u of [-0.9, -0.2, 0.3, 0.8]) {
      expect(derive({ u }, { func: "sin" }).inverseOfNeg).toBeCloseTo(-derive({ u }, { func: "sin" }).inverse, 12);
      expect(derive({ u }, { func: "cos" }).inverseOfNeg).toBeCloseTo(PI - derive({ u }, { func: "cos" }).inverse, 12);
      expect(derive({ u }, { func: "tan" }).inverseOfNeg).toBeCloseTo(-derive({ u }, { func: "tan" }).inverse, 12);
    }
  });

  it("keeps sin⁻¹u + cos⁻¹u at π/2 across the whole domain", () => {
    for (let u = -1; u <= 1.0001; u += 0.125) {
      const r = derive({ u });
      expect(r.complementSum, `${u}`).toBeCloseTo(PI / 2, 12);
      expect(r.complementSumDeg).toBeCloseTo(90, 10);
    }
    // At u = −1: −90° + 180°.
    expect(derive({ u: -1 })).toMatchObject({ asinU: -PI / 2, acosU: PI });
  });

  it("folds θ back into the principal range: sin⁻¹(sin 150°) = 30°, cos⁻¹(cos(−60°)) = 60°, tan⁻¹(tan 135°) = −45°", () => {
    expect(derive({ theta: d(150) }, { func: "sin" })).toMatchObject({ foldSame: 0, foldDefined: 1 });
    expect(derive({ theta: d(150) }, { func: "sin" }).foldDeg).toBeCloseTo(30, 8);
    expect(derive({ theta: d(-60) }, { func: "cos" }).foldDeg).toBeCloseTo(60, 8);
    expect(derive({ theta: d(135) }, { func: "tan" }).foldDeg).toBeCloseTo(-45, 8);
    expect(derive({ theta: d(210) }, { func: "sin" }).foldDeg).toBeCloseTo(-30, 8);
    expect(derive({ theta: d(40) }, { func: "sin" }).foldSame).toBe(1);
    expect(derive({ theta: d(140) }, { func: "cos" }).foldSame).toBe(1);
    expect(trigPlusFold("tan", PI / 2)).toEqual({ value: 0, defined: false });
  });

  it("gives θ back exactly when θ is in the principal range", () => {
    for (let t = -360; t <= 360; t += 10) {
      const theta = d(t);
      expect(derive({ theta }, { func: "sin" }).foldSame, `sin ${t}`).toBe(t >= -90 && t <= 90 ? 1 : 0);
      expect(derive({ theta }, { func: "cos" }).foldSame, `cos ${t}`).toBe(t >= 0 && t <= 180 ? 1 : 0);
      const tan = derive({ theta }, { func: "tan" });
      if (Math.abs(t) % 180 === 90) expect(tan.foldDefined, `tan ${t}`).toBe(0);
      else expect(tan.foldSame, `tan ${t}`).toBe(t > -90 && t < 90 ? 1 : 0);
    }
  });
});

describe("tan⁻¹u + tan⁻¹v", () => {
  it("gives tan⁻¹½ + tan⁻¹⅓ = π/4 straight from the formula (uv < 1)", () => {
    const r = derive({ u: 0.5, v: 1 / 3 });
    expect(r.atanSumDeg).toBeCloseTo(45, 10);
    expect(r.tanFormulaDeg).toBeCloseTo(45, 10);
    expect(r.correction).toBe(0);
  });

  it("needs +π for tan⁻¹2 + tan⁻¹3 = 3π/4: the formula gives tan⁻¹(−1) = −π/4", () => {
    const r = derive({ u: 2, v: 3 });
    expect(r.atanSumDeg).toBeCloseTo(135, 10);
    expect(r.tanFormulaDeg).toBeCloseTo(-45, 10);
    expect(r.correction).toBe(1);
    expect(r.uv).toBe(6);
  });

  it("needs −π when both are negative and uv > 1", () => {
    const r = derive({ u: -2, v: -3 });
    expect(r.atanSumDeg).toBeCloseTo(-135, 10);
    expect(r.tanFormulaDeg).toBeCloseTo(45, 10);
    expect(r.correction).toBe(-1);
  });

  it("is undefined at uv = 1, where the sum is π/2", () => {
    const r = derive({ u: 2, v: 0.5 });
    expect(r).toMatchObject({ tanFormulaDefined: 0, tanFormula: 0, correction: 0 });
    expect(r.atanSumDeg).toBeCloseTo(90, 10);
  });

  it("always has sum = formula + correction × π", () => {
    for (let u = -3; u <= 3; u += 0.4) {
      for (let v = -3; v <= 3; v += 0.35) {
        const t = trigPlusTanSum(u, v);
        if (t.defined) expect(t.sum, `${u} ${v}`).toBeCloseTo(t.formula + t.correction * PI, 12);
      }
    }
  });
});

describe("the model", () => {
  it("clamps to the control ranges and keeps n a whole number", () => {
    let s = model.setVariable(base, "n", 7.6, model.defaultParams);
    expect(s.n).toBe(2);
    s = model.setVariable(s, "n", -0.6, model.defaultParams);
    expect(s.n).toBe(-1);
    for (const [id, [lo, hi]] of Object.entries(TRIGPLUS_LIMITS)) {
      expect(model.getVariable(model.setVariable(base, id, 1e6, model.defaultParams), id), id).toBe(hi);
      expect(model.getVariable(model.setVariable(base, id, -1e6, model.defaultParams), id), id).toBe(lo);
    }
    expect(model.setVariable(base, "nonsense", 1, model.defaultParams)).toBe(base);
  });

  it("turns B with play and steps it by 15°", () => {
    const later = model.advance({ ...base, B: 0 }, 1, model.defaultParams);
    expect(later.B).toBeCloseTo(d(30), 12);
    expect(model.step({ ...base, B: d(30) }, model.defaultParams, 1).B).toBeCloseTo(d(45), 12);
    expect(model.step({ ...base, B: 0 }, model.defaultParams, -1).B).toBeCloseTo(d(345), 12);
    let s = { ...base, B: 0 };
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.B).toBeGreaterThanOrEqual(0);
    expect(s.B).toBeLessThan(2 * PI);
  });

  it("gives a finite number for every output, never −0, at every corner", () => {
    for (const func of TRIGPLUS_FUNCTIONS) {
      for (const k of [-2, -1, 0, 1, 2]) {
        for (const u of [-3, -1, 0, 1, 3]) {
          for (const theta of [-2 * PI, -PI / 2, 0, PI / 2, 2 * PI]) {
            const r = model.derive({ A: 0, B: 2 * PI, k, n: -2, u, v: 1 / (u || 1), theta }, { func });
            for (const key of model.outputs) {
              expect(Number.isFinite(r[key]), `${func} ${k} ${u} ${theta} ${key}`).toBe(true);
              expect(Object.is(r[key], -0), `${func} ${key} is −0`).toBe(false);
            }
          }
        }
      }
    }
  });
});

describe("small angles", () => {
  it("sin θ ≈ θ is 1% out at about 14°, and the error grows with θ", () => {
    const at = (degrees: number, func: TrigPlusParams["func"] = "sin") => derive({ small: d(degrees) }, { func });
    expect(at(14).smallErrorPct).toBeCloseTo(1.002, 3);
    expect(at(13).smallErrorPct).toBeLessThan(1);
    expect(at(5).smallErrorPct).toBeCloseTo(0.127, 3);
    expect(at(30).smallErrorPct).toBeCloseTo(4.72, 2);
    expect(at(5).smallTrue).toBeCloseTo(Math.sin(d(5)), 12);
    expect(at(5).smallApprox).toBeCloseTo(d(5), 12);
    expect(at(14).smallDeg).toBeCloseTo(14, 9);
  });

  it("tan θ ≈ θ is about twice as far out, cos θ ≈ 1 − θ²/2 far closer", () => {
    expect(derive({ small: d(14) }, { func: "tan" }).smallErrorPct).toBeCloseTo(1.998, 3);
    const cos = derive({ small: d(20) }, { func: "cos" });
    expect(cos.smallApprox).toBeCloseTo(1 - d(20) ** 2 / 2, 12);
    expect(cos.smallErrorPct).toBeCloseTo(0.0656, 4);
    expect(trigPlusSmallAngle("sin", 0)).toEqual({ exact: 0, approx: 0, errorPct: 0 });
  });

  it("holds θ between 0 and 60°, and defaults it to 10° for older states", () => {
    expect(model.setVariable(base, "small", 2, model.defaultParams).small).toBeCloseTo(PI / 3, 12);
    expect(model.setVariable(base, "small", -1, model.defaultParams).small).toBe(0);
    const { small: _drop, ...older } = base;
    expect(model.derive(older, model.defaultParams).smallDeg).toBeCloseTo(10, 9);
    expect(model.getVariable(older, "small")).toBeCloseTo(PI / 18, 12);
  });
});
