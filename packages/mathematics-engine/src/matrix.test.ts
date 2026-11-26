import { describe, expect, it } from "vitest";
import {
  MATRIX_GRID_ORDER,
  MATRIX_GRIDS,
  matrixCofactor3,
  matrixDet3,
  matrixMinor3,
  matrixModel as model,
  matrixRatio,
  type MatrixParams,
  type MatrixState,
} from "./matrix";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<MatrixState> = {}, params: Partial<MatrixParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const A = (a: number, b: number, c: number, d: number, more: Partial<MatrixState> = {}) => ({ a, b, c, d, ...more });

describe("a matrix as a transformation", () => {
  it("sends î to the first column and ĵ to the second", () => {
    const r = derive(A(2, 1, 1, 3, { px: 1, py: 0 }));
    expect(r).toMatchObject({ a11: 2, a12: 1, a21: 1, a22: 3, imageX: 2, imageY: 1 });
    expect(derive(A(2, 1, 1, 3, { px: 0, py: 1 }))).toMatchObject({ imageX: 1, imageY: 3 });
  });

  it("sends (2, 1) under [1 2; 3 −1] to (4, 5)", () => {
    expect(derive(A(1, 2, 3, -1, { px: 2, py: 1 }))).toMatchObject({ imageX: 4, imageY: 5 });
  });

  it("builds the ready-made families exactly", () => {
    expect(derive({ theta: Math.PI / 2 }, { source: "rotation" })).toMatchObject({ a11: 0, a12: -1, a21: 1, a22: 0, det: 1, isOrthogonal: 1 });
    expect(derive({ theta: Math.PI / 6 }, { source: "rotation" }).a11).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(derive({ theta: Math.PI / 4 }, { source: "reflection" })).toMatchObject({ a11: 0, a12: 1, a21: 1, a22: 0, det: -1, isOrthogonal: 1 });
    expect(derive({ theta: 0 }, { source: "reflection" })).toMatchObject({ a11: 1, a12: 0, a21: 0, a22: -1 });
    expect(derive({ k: 2 }, { source: "shear" })).toMatchObject({ a11: 1, a12: 2, a21: 0, a22: 1, det: 1 });
    expect(derive({ k: -1.5 }, { source: "stretch" })).toMatchObject({ a11: -1.5, a22: 1, det: -1.5, orientation: -1 });
  });

  it("keeps lengths under a rotation by any angle, but not under a shear", () => {
    for (const theta of [0, Math.PI / 12, Math.PI / 3, -2.5]) {
      const r = derive({ theta, px: 1, py: 2 }, { source: "rotation" });
      expect(r.lengthOut, `θ = ${theta}`).toBeCloseTo(Math.sqrt(5), 12);
      expect(r.det).toBe(1);
    }
    const shear = derive({ k: 1, px: 0, py: 1 }, { source: "shear" });
    expect(shear.lengthOut).toBeCloseTo(Math.SQRT2, 12);
    expect(shear.isOrthogonal).toBe(0);
  });
});

describe("the determinant", () => {
  it("is ad − bc, the signed area of the image of the unit square", () => {
    expect(derive(A(3, 1, 1, 2))).toMatchObject({ det: 5, area: 5, orientation: 1, rank: 2 });
    expect(derive(A(1, 2, 2, 1))).toMatchObject({ det: -3, area: 3, orientation: -1 });
    expect(derive(A(-2, 0, 0, -3))).toMatchObject({ det: 6, orientation: 1 });
  });

  it("is zero when the plane is squashed onto a line, or a point", () => {
    expect(derive(A(2, 4, 1, 2))).toMatchObject({ det: 0, orientation: 0, rank: 1, invertible: 0 });
    expect(derive(A(0, 0, 0, 0))).toMatchObject({ det: 0, rank: 0 });
    expect(derive(A(2, 2, 1, 1)).det).toBe(0);
  });

  it("changes sign but not size when the picture is flipped", () => {
    expect(derive(A(2, 0, 0, 1))).toMatchObject({ det: 2, area: 2 });
    expect(derive(A(-2, 0, 0, 1))).toMatchObject({ det: -2, area: 2 });
  });

  it("multiplies: |AB| = |A||B|", () => {
    for (const second of ["rotate", "reflect", "shear", "stretch"] as const) {
      const r = derive(A(1, 2, 3, 4), { second });
      expect(r.detAB, second).toBe(r.det * r.detB);
    }
  });
});

describe("the product", () => {
  it("multiplies rows into columns: [1 2; 3 4] × shear [1 1; 0 1]", () => {
    const r = derive(A(1, 2, 3, 4), { second: "shear" });
    expect([r.ab11, r.ab12, r.ab21, r.ab22]).toEqual([1, 3, 3, 7]);
    expect([r.ba11, r.ba12, r.ba21, r.ba22]).toEqual([4, 6, 3, 4]);
    expect(r.commute).toBe(0);
  });

  it("commutes only sometimes", () => {
    expect(derive(A(2, 0, 0, 2), { second: "rotate" }).commute).toBe(1);
    expect(derive(A(0, -1, 1, 0), { second: "rotate" }).commute).toBe(1);
    expect(derive(A(1, 0, 0, -1), { second: "rotate" }).commute).toBe(0);
    expect(derive(A(1, 1, 0, 1), { second: "shear" }).commute).toBe(1);
    expect(derive(A(2, 0, 0, 1), { second: "shear" }).commute).toBe(0);
    expect(derive(A(2, 0, 0, 1), { second: "stretch" }).commute).toBe(1);
  });
});

describe("the adjoint and the inverse", () => {
  it("swaps the diagonal and negates the rest: adj [4 2; 3 1] = [1 −2; −3 4]", () => {
    const r = derive(A(4, 2, 3, 1));
    expect([r.adj11, r.adj12, r.adj21, r.adj22]).toEqual([1, -2, -3, 4]);
    expect(r.det).toBe(-2);
    expect([r.inv11, r.inv12, r.inv21, r.inv22]).toEqual([-0.5, 1, 1.5, -2]);
  });

  it("gives A⁻¹ with A A⁻¹ = I, and nothing when |A| = 0", () => {
    const r = derive(A(2, 1, 1, 3));
    expect([r.inv11, r.inv12, r.inv21, r.inv22]).toEqual([0.6, -0.2, -0.2, 0.4]);
    expect(r.a11 * r.inv11 + r.a12 * r.inv21).toBeCloseTo(1, 12);
    expect(r.a11 * r.inv12 + r.a12 * r.inv22).toBeCloseTo(0, 12);
    const flat = derive(A(2, 4, 1, 2));
    expect(flat.invertible).toBe(0);
    // No inverse: NaN, shown as "undefined", never 0.
    for (const v of [flat.inv11, flat.inv12, flat.inv21, flat.inv22]) expect(v).toBeNaN();
  });

  it("grows the inverse as the determinant shrinks", () => {
    expect(derive(A(2, 1, 1, 1)).inv11).toBe(1);
    expect(derive(A(2, 1, 1.5, 1)).inv11).toBe(2);
  });

  it("writes exact fractions", () => {
    expect(matrixRatio(3, 5)).toEqual({ num: 3, den: 5 });
    expect(matrixRatio(-1, 5)).toEqual({ num: -1, den: 5 });
    expect(matrixRatio(9, -6)).toEqual({ num: -3, den: 2 });
    expect(matrixRatio(1.5, 0.25)).toEqual({ num: 6, den: 1 });
    expect(matrixRatio(0, -3)).toEqual({ num: 0, den: 1 });
    expect(matrixRatio(1, 0)).toBeNull();
    expect(matrixRatio(Math.sqrt(3) / 2, 1)).toBeNull();
  });
});

describe("special matrices", () => {
  it("splits A into a symmetric and a skew-symmetric part", () => {
    const r = derive(A(1, 3, -1, 2));
    expect(r).toMatchObject({ tr12: -1, tr21: 3, sym12: 1, skew12: 2, symmetry: 0 });
    // ½(A + Aᵀ) + ½(A − Aᵀ) gives back the off-diagonal entries.
    expect(r.sym12 + r.skew12).toBe(r.a12);
    expect(r.sym12 - r.skew12).toBe(r.a21);
  });

  it("knows symmetric from skew-symmetric", () => {
    expect(derive(A(1, 2, 2, 3)).symmetry).toBe(1);
    expect(derive(A(0, 3, -3, 0)).symmetry).toBe(2);
    expect(derive(A(1, 2, -2, 1)).symmetry).toBe(0);
    expect(derive(A(0, 0, 0, 0)).symmetry).toBe(3);
  });

  it("calls a matrix orthogonal when its columns are perpendicular unit vectors", () => {
    expect(derive(A(0, 1, 1, 0)).isOrthogonal).toBe(1);
    expect(derive(A(1, 0, 0, -1)).isOrthogonal).toBe(1);
    expect(derive(A(2, 0, 0, 0.5)).isOrthogonal).toBe(0);
    expect(derive(A(1, 1, -1, 1))).toMatchObject({ isOrthogonal: 0, columnDot: 0 });
  });
});

describe("linear systems", () => {
  it("solves 2x + y = 4, x + 3y = 3 by Cramer's rule", () => {
    const r = derive(A(2, 1, 1, 3, { e: 4, f: 3 }));
    expect(r).toMatchObject({ det: 5, d1: 9, d2: 2, system: 0 });
    expect(r.solX).toBeCloseTo(1.8, 12);
    expect(r.solY).toBeCloseTo(0.4, 12);
    // And X = A⁻¹B gives the same.
    expect(r.inv11 * 4 + r.inv12 * 3).toBeCloseTo(1.8, 12);
  });

  it("solves the default system 2x + y = 5, x + 3y = 5 at (2, 1)", () => {
    expect(derive()).toMatchObject({ det: 5, solX: 2, solY: 1, system: 0 });
  });

  it("finds no solution for parallel lines and infinitely many for one line", () => {
    const parallel = derive(A(1, 2, 2, 4, { e: 3, f: 5 }));
    expect(parallel).toMatchObject({ det: 0, d1: 2, system: 1 });
    expect(parallel.solX).toBeNaN();
    expect(parallel.solY).toBeNaN();
    expect(derive(A(1, 2, 2, 4, { e: 3, f: 6 }))).toMatchObject({ det: 0, d1: 0, d2: 0, system: 2 });
    expect(derive(A(2, -1, 4, -2, { e: 1, f: 3 }))).toMatchObject({ system: 1 });
    expect(derive(A(1, -2, -2, 4, { e: 1, f: -2 }))).toMatchObject({ system: 2 });
    expect(derive(A(0, 1, 0, 2, { e: 2, f: 3 }))).toMatchObject({ system: 1 });
  });

  it("handles a zero row and the zero matrix", () => {
    expect(derive(A(0, 0, 1, 1, { e: 0, f: 2 })).system).toBe(2);
    expect(derive(A(0, 0, 1, 1, { e: 1, f: 2 })).system).toBe(1);
    expect(derive(A(0, 0, 0, 0, { e: 0, f: 0 })).system).toBe(2);
    expect(derive(A(0, 0, 0, 0, { e: 1, f: 0 })).system).toBe(1);
  });
});

describe("3 × 3 determinants", () => {
  it("expands [1 2 3; 4 5 6; 7 8 0] along row 1 to 27", () => {
    const r = derive({ x3: 0, line: 1 }, { grid3: "counting", expandBy: "row" });
    expect([r.le1, r.le2, r.le3]).toEqual([1, 2, 3]);
    expect([r.lm1, r.lm2, r.lm3]).toEqual([-48, -42, -3]);
    expect([r.lc1, r.lc2, r.lc3]).toEqual([-48, 42, -3]);
    expect([r.lt1, r.lt2, r.lt3]).toEqual([-48, 84, -9]);
    expect(r.det3).toBe(27);
  });

  it("gives 27 − 3x, so x = 9 makes it zero", () => {
    expect(derive({ x3: 9 }, { grid3: "counting" }).det3).toBe(0);
    expect(derive({ x3: 2 }, { grid3: "counting" }).det3).toBe(21);
  });

  it("evaluates NCERT's |1 2 4; −1 3 0; 4 1 0| = −52, easiest down column 3", () => {
    const r = derive({ x3: 0, line: 3 }, { grid3: "ncert", expandBy: "column" });
    expect([r.le1, r.le2, r.le3]).toEqual([4, 0, 0]);
    expect(r.lc1).toBe(-13);
    expect(r.det3).toBe(-52);
    expect(derive({ x3: 2 }, { grid3: "ncert" }).det3).toBe(-42);
  });

  it("multiplies the diagonal of a triangular matrix", () => {
    expect(derive({ x3: 4 }, { grid3: "triangular" }).det3).toBe(24);
  });

  it("gives the same Δ along every row and column, matching Sarrus", () => {
    for (const grid3 of MATRIX_GRID_ORDER) {
      for (const x3 of [-3, 0, 2.5, 7]) {
        const sarrus = matrixDet3(MATRIX_GRIDS[grid3](x3));
        for (const expandBy of ["row", "column"] as const) {
          for (const line of [1, 2, 3]) expect(derive({ x3, line }, { grid3, expandBy }).det3, `${grid3} ${expandBy} ${line}`).toBeCloseTo(sarrus, 9);
        }
      }
    }
  });

  it("signs cofactors in a chessboard", () => {
    const m = MATRIX_GRIDS.counting(0);
    expect(matrixMinor3(m, 2, 1)).toBe(2 * 0 - 3 * 8);
    expect(matrixCofactor3(m, 2, 1)).toBe(24);
    expect(matrixCofactor3(m, 2, 2)).toBe(1 * 0 - 3 * 7);
  });
});

describe("controls", () => {
  it("clamps every variable to its range", () => {
    let s = base;
    s = model.setVariable(s, "a", 9, model.defaultParams);
    s = model.setVariable(s, "e", -20, model.defaultParams);
    s = model.setVariable(s, "line", 7, model.defaultParams);
    s = model.setVariable(s, "theta", 10, model.defaultParams);
    s = model.setVariable(s, "x3", 50, model.defaultParams);
    expect(s).toMatchObject({ a: 4, e: -6, line: 3, theta: Math.PI, x3: 10 });
  });

  it("turns θ in steps of 15° and on play", () => {
    const s = model.step({ ...base, theta: 0 }, model.defaultParams, 1);
    expect(s.theta).toBeCloseTo(Math.PI / 12, 12);
    expect(model.advance({ ...base, theta: 0 }, 2, model.defaultParams).theta).toBeCloseTo(Math.PI / 2, 12);
    expect(model.advance({ ...base, theta: Math.PI }, 1, model.defaultParams).theta).toBeCloseTo(-0.75 * Math.PI, 12);
  });

  it("gives finite numbers and no −0 anywhere (A⁻¹ with |A| = 0, and x, y without a single solution, are NaN: \"undefined\")", () => {
    const states = [A(0, 0, 0, 0, { e: 0, f: 0, px: 0, py: 0 }), A(-4, 4, 4, -4), A(0.5, 0, 0, 0.5)];
    for (const st of states) {
      for (const source of ["entries", "rotation", "reflection", "shear", "stretch"] as const) {
        const r = derive(st, { source });
        for (const [key, v] of Object.entries(r)) {
          const noValue = (r.invertible === 0 && /^inv\d\d$/.test(key)) || (r.system !== 0 && (key === "solX" || key === "solY"));
          if (noValue) {
            expect(v, key).toBeNaN();
            continue;
          }
          expect(Number.isFinite(v), key).toBe(true);
          expect(Object.is(v, -0), key).toBe(false);
        }
      }
    }
  });
});
