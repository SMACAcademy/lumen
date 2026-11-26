import { describe, expect, it } from "vitest";
import { SOLVETRI_RANGES, SOLVETRI_SIGHT_ORDER, solveTriAmbiguous, solveTriModel as model, type SolveTriParams, type SolveTriState } from "./solvetri";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<SolveTriState> = {}, params: Partial<SolveTriParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the 3-4-5 triangle", () => {
  const r = derive({ a: 4, b: 3, angleC: 90 });

  it("has c = 5, area 6, R = 2.5 and r = 1", () => {
    expect(r.c).toBeCloseTo(5, 12);
    expect(r.area).toBeCloseTo(6, 12);
    expect(r.heron).toBeCloseTo(6, 12);
    expect(r.semi).toBeCloseTo(6, 12);
    expect(r.circumR).toBeCloseTo(2.5, 12);
    expect(r.inR).toBeCloseTo(1, 12);
    expect(r.kind).toBe(1);
  });

  it("makes the cosine rule Pythagoras: the 2ab cos C term vanishes", () => {
    expect(r.cosTerm).toBe(0);
    expect(r.cSquared).toBeCloseTo(25, 12);
    expect(r.sumSquares).toBe(25);
  });

  it("puts the circumcentre at the hypotenuse's midpoint and the orthocentre at the right angle", () => {
    expect(r.ox).toBeCloseTo((r.ax + r.bx) / 2, 12);
    expect(r.oy).toBeCloseTo(r.ay / 2, 12);
    expect(r.hx).toBe(0);
    expect(r.hy).toBe(0);
    // The incircle of radius 1 touches both legs, so its centre is (1, 1) from C.
    expect(r.ix).toBeCloseTo(1, 12);
    expect(r.iy).toBeCloseTo(1, 12);
  });

  it("has angles 53.13°, 36.87° and 90°", () => {
    expect(r.angleA).toBeCloseTo(53.130102, 5);
    expect(r.angleB).toBeCloseTo(36.869898, 5);
  });
});

describe("the sine and cosine rules", () => {
  it("gives c = 7 for a = 5, b = 8, C = 60°, and A = 38.21° by the sine rule", () => {
    const r = derive({ a: 5, b: 8, angleC: 60 });
    expect(r.c).toBeCloseTo(7, 12);
    expect(r.cosTerm).toBeCloseTo(40, 12);
    expect(r.angleA).toBeCloseTo(38.2132, 4);
    expect(Math.sin((r.angleA * Math.PI) / 180)).toBeCloseTo((5 * Math.sin(Math.PI / 3)) / 7, 12);
  });

  it("adds the term when C is obtuse: C = 120° gives c² = 129", () => {
    const r = derive({ a: 5, b: 8, angleC: 120 });
    expect(r.cosTerm).toBeCloseTo(-40, 12);
    expect(r.c).toBeCloseTo(Math.sqrt(129), 12);
    expect(r.kind).toBe(2);
  });

  it("keeps a/sin A = b/sin B = c/sin C = 2R for any triangle, and the angles sum to 180°", () => {
    for (const [a, b, angleC] of [[4, 3, 90], [5, 8, 60], [2, 9, 150], [10, 1, 10], [6, 6, 37]] as const) {
      const r = derive({ a, b, angleC });
      expect(r.ratioA, `${a} ${b} ${angleC}`).toBeCloseTo(r.twoR, 9);
      expect(r.ratioB).toBeCloseTo(r.twoR, 9);
      expect(r.ratioC).toBeCloseTo(r.twoR, 9);
      expect(r.angleA + r.angleB + r.angleC).toBeCloseTo(180, 9);
      expect(r.heron).toBeCloseTo(r.area, 9);
      expect(r.circumR).toBeCloseTo((a * b * r.c) / (4 * r.area), 9);
      // The circumcentre is R from each corner.
      expect(Math.hypot(r.ox, r.oy)).toBeCloseTo(r.circumR, 9);
      expect(Math.hypot(r.ox - r.bx, r.oy)).toBeCloseTo(r.circumR, 9);
      expect(Math.hypot(r.ox - r.ax, r.oy - r.ay)).toBeCloseTo(r.circumR, 9);
    }
  });
});

describe("the centres", () => {
  it("puts G, O and H on Euler's line with GH = 2·OG, and OI² = R² − 2Rr", () => {
    for (const [a, b, angleC] of [[5, 8, 60], [2, 9, 150], [7, 4, 40]] as const) {
      const r = derive({ a, b, angleC });
      expect(r.gh).toBeCloseTo(2 * r.og, 9);
      const cross = (r.gx - r.ox) * (r.hy - r.oy) - (r.gy - r.oy) * (r.hx - r.ox);
      expect(cross).toBeCloseTo(0, 9);
      expect(r.oi ** 2).toBeCloseTo(r.circumR ** 2 - 2 * r.circumR * r.inR, 9);
      // The orthocentre: AH is perpendicular to BC (the x-axis), BH to CA.
      expect(r.hx).toBeCloseTo(r.ax, 9);
      expect((r.hx - r.bx) * r.ax + r.hy * r.ay).toBeCloseTo(0, 9);
    }
  });

  it("brings all four centres together in an equilateral triangle", () => {
    const r = derive({ a: 5, b: 5, angleC: 60 });
    expect(r.og).toBe(0);
    expect(r.gh).toBe(0);
    expect(r.oi).toBe(0);
    expect(r.circumR).toBeCloseTo(5 / Math.sqrt(3), 12);
    expect(r.inR).toBeCloseTo(r.circumR / 2, 12);
  });

  it("gives area ½ab sin C = 12 for 6, 8 and 30°", () => {
    expect(derive({ a: 6, b: 8, angleC: 30 }).area).toBeCloseTo(12, 12);
  });

  it("swells the circle as an isosceles triangle flattens: R from 3.54 to 9.66", () => {
    expect(derive({ a: 5, b: 5, angleC: 90 }).circumR).toBeCloseTo(3.5355, 4);
    expect(derive({ a: 5, b: 5, angleC: 150 }).circumR).toBeCloseTo(9.6593, 4);
  });

  it("calls a triangle acute, right or obtuse by its largest angle", () => {
    expect(derive({ a: 5, b: 5, angleC: 60 }).kind).toBe(0);
    expect(derive({ a: 6, b: 8, angleC: 90 }).kind).toBe(1);
    expect(derive({ a: 6, b: 4, angleC: 40 }).kind).toBe(2); // the big angle is A
    expect(derive({ a: 7, b: 8, angleC: 70 }).kind).toBe(0);
    expect(derive({ a: 5, b: 5, angleC: 120 }).kind).toBe(2);
  });
});

describe("the ambiguous case", () => {
  const count = (ssaA: number, ssaB: number, ssaSide: number) => derive({ ssaA, ssaB, ssaSide }).ssaCount;

  it("with A = 30° and b = 10 (so h = 5): none below 5, one at 5, two between 5 and 10, one from 10", () => {
    expect(derive({ ssaA: 30, ssaB: 10 }).ssaHeight).toBeCloseTo(5, 12);
    expect([4, 5, 7, 9.9, 10, 12].map((a) => count(30, 10, a))).toEqual([0, 1, 2, 2, 1, 1]);
    expect(derive({ ssaA: 30, ssaB: 10, ssaSide: 5 }).ssaB1).toBe(90);
  });

  it("gives two triangles for a = 7, both obeying the sine rule", () => {
    const r = derive({ ssaA: 30, ssaB: 10, ssaSide: 7 });
    expect(r.ssaB1).toBeCloseTo(45.5847, 4);
    expect(r.ssaB2).toBeCloseTo(180 - 45.5847, 4);
    for (const [B, c] of [[r.ssaB1, r.ssaC1], [r.ssaB2, r.ssaC2]] as const) {
      const C = 180 - 30 - B;
      expect(7 / Math.sin(Math.PI / 6)).toBeCloseTo(10 / Math.sin((B * Math.PI) / 180), 9);
      expect(c / Math.sin((C * Math.PI) / 180)).toBeCloseTo(14, 9);
    }
    expect(r.ssaC1).toBeGreaterThan(r.ssaC2);
  });

  it("allows an obtuse A only when a > b", () => {
    expect([8, 9, 10, 12].map((a) => count(120, 10, a))).toEqual([0, 0, 0, 1]);
  });

  it("matches the solver used by the model", () => {
    expect(solveTriAmbiguous(30, 10, 7).solutions).toHaveLength(2);
  });
});

describe("heights and distances", () => {
  it("makes a tower seen at 60° from 30 m away 30√3 ≈ 51.96 m tall", () => {
    const r = derive({ elev: 60, dist: 30 }, { sight: "tower" });
    expect(r.sightHeight).toBeCloseTo(30 * Math.sqrt(3), 10);
    expect(r.sightLine).toBeCloseTo(60, 10);
    expect(derive({ elev: 45, dist: 40 }, { sight: "tower" }).sightHeight).toBeCloseTo(40, 10);
  });

  it("finds a tower 10√3 ≈ 17.32 m tall from 30° and 60° seen 20 m apart", () => {
    const r = derive({ elev: 60, far: 30, gap: 20 }, { sight: "two-points" });
    expect(r.sightHeight).toBeCloseTo(10 * Math.sqrt(3), 10);
    expect(r.sightNear).toBeCloseTo(10, 10);
    expect(r.sightFar).toBeCloseTo(30, 10);
    expect(r.sightOk).toBe(1);
    expect(derive({ elev: 30, far: 60 }, { sight: "two-points" })).toMatchObject({ sightOk: 0, sightHeight: 0 });
  });

  it("puts two ships seen at 45° and 30° from a 75 m lighthouse 75(√3 − 1) ≈ 54.9 m apart", () => {
    const r = derive({ elev: 45, far: 30, tall: 75 }, { sight: "lighthouse" });
    expect(r.sightNear).toBeCloseTo(75, 10);
    expect(r.sightFar).toBeCloseTo(75 * Math.sqrt(3), 10);
    expect(r.sightGap).toBeCloseTo(75 * (Math.sqrt(3) - 1), 10);
    expect(r.sightHeight).toBe(75);
  });
});

describe("the model", () => {
  it("clamps every variable to its range", () => {
    for (const key of Object.keys(SOLVETRI_RANGES) as (keyof SolveTriState)[]) {
      expect(model.setVariable(base, key, 1e6, model.defaultParams)[key]).toBe(SOLVETRI_RANGES[key][1]);
      expect(model.setVariable(base, key, -1e6, model.defaultParams)[key]).toBe(SOLVETRI_RANGES[key][0]);
    }
    expect(model.setVariable(base, "nonsense", 3, model.defaultParams)).toBe(base);
  });

  it("opens angle C with play and steps it by 15°", () => {
    let s = { ...base, angleC: 160 };
    s = model.advance(s, 0.4, model.defaultParams);
    expect(s.angleC).toBeCloseTo(168, 10);
    s = model.advance(s, 0.2, model.defaultParams);
    expect(s.angleC).toBe(10);
    expect(model.step({ ...base, angleC: 90 }, model.defaultParams, 1).angleC).toBe(105);
    expect(model.step({ ...base, angleC: 92 }, model.defaultParams, -1).angleC).toBe(90);
  });

  it("gives a finite number for every output at the corners of every range", () => {
    const lo = Object.fromEntries(Object.entries(SOLVETRI_RANGES).map(([k, [min]]) => [k, min])) as unknown as SolveTriState;
    const hi = Object.fromEntries(Object.entries(SOLVETRI_RANGES).map(([k, [, max]]) => [k, max])) as unknown as SolveTriState;
    const mixed: SolveTriState = { ...lo, a: 10, angleC: 170, ssaB: 12, elev: 80, far: 79 };
    for (const sight of SOLVETRI_SIGHT_ORDER) {
      for (const state of [lo, hi, mixed, { ...base, a: Number.NaN }]) {
        const r = model.derive(state, { sight });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), `${sight} ${key}`).toBe(true);
          expect(Object.is(r[key], -0), `${sight} ${key} is −0`).toBe(false);
        }
      }
    }
  });
});
