import { describe, expect, it } from "vitest";
import {
  CIRCLE_SCHOOL_DEFAULT_STATE,
  CIRCLE_SCHOOL_RANGES,
  circleSchoolCrossings,
  circleSchoolHeron,
  circleSchoolModel as model,
  circleSchoolSection,
  type CircleSchoolParams,
  type CircleSchoolState,
} from "./circleschool";

const derive = (state: Partial<CircleSchoolState> = {}, params: Partial<CircleSchoolParams> = {}) =>
  model.derive({ ...CIRCLE_SCHOOL_DEFAULT_STATE, ...state }, { ...model.defaultParams, ...params });

describe("a line and a circle", () => {
  it("misses, touches, then cuts as the line comes closer", () => {
    expect(derive({ radius: 5, gap: 8 })).toMatchObject({ crossings: 0, chord: 0 });
    expect(derive({ radius: 5, gap: 5 })).toMatchObject({ crossings: 1, chord: 0 });
    expect(derive({ radius: 5, gap: 3 })).toMatchObject({ crossings: 2, chord: 8 });
    expect(derive({ radius: 5, gap: 0 })).toMatchObject({ crossings: 2, chord: 10 });
    expect([4.9, 4.97, 5.03, 5.1].map((d) => circleSchoolCrossings(d, 5))).toEqual([2, 1, 1, 0]);
  });
});

describe("the tangent at a point", () => {
  it("cuts the circle again unless it is at right angles to the radius", () => {
    expect(derive({ radius: 5, tilt: 90 })).toMatchObject({ tiltCrossings: 1, tiltChord: 0, isTangent: 1, lineDistance: 5 });
    expect(derive({ radius: 5, tilt: 60 })).toMatchObject({ tiltCrossings: 2, tiltChord: 5, isTangent: 0 });
    expect(derive({ radius: 5, tilt: 120 }).tiltChord).toBe(5);
    expect(derive({ radius: 5, tilt: 0 })).toMatchObject({ tiltChord: 10, lineDistance: 0 });
    expect(derive({ radius: 5, tilt: 89 }).isTangent).toBe(0);
  });

  it("puts the line r sin(angle) from the centre: a chord's half and that distance make r by Pythagoras", () => {
    for (const tilt of [20, 45, 70, 135]) {
      const r = derive({ radius: 6, tilt });
      expect((r.tiltChord / 2) ** 2 + r.lineDistance ** 2).toBeCloseTo(36, 6);
    }
  });

  it("keeps the tangent at the radius's distance wherever P is", () => {
    for (const touch of [0, 30, 145, 270, 359]) expect(derive({ radius: 5, tilt: 90, touch }).lineDistance).toBe(5);
    expect(derive({ radius: 5, touch: 90 })).toMatchObject({ px: 0, py: 5 });
  });

  it("walks P round the circle on Play and steps it by 15°", () => {
    expect(model.advance({ ...CIRCLE_SCHOOL_DEFAULT_STATE, touch: 350 }, 1, model.defaultParams).touch).toBeCloseTo(20, 9);
    expect(model.step({ ...CIRCLE_SCHOOL_DEFAULT_STATE, touch: 40 }, model.defaultParams, 1).touch).toBe(60);
    expect(model.step({ ...CIRCLE_SCHOOL_DEFAULT_STATE, touch: 0 }, model.defaultParams, -1).touch).toBe(345);
  });
});

describe("two tangents from a point", () => {
  it("gives two equal tangents √(d² − r²) long from outside", () => {
    expect(derive({ radius: 5, dist: 13 })).toMatchObject({ tangentCount: 2, tangentLength: 12 });
    // NCERT: a tangent 24 cm long from a point 25 cm from the centre — the radius is 7 cm.
    expect(derive({ radius: 7, dist: 25 }).tangentLength).toBe(24);
    expect(derive({ radius: 3, dist: 5 }).tangentLength).toBe(4);
  });

  it("gives one tangent from a point on the circle and none from inside", () => {
    expect(derive({ radius: 5, dist: 5 })).toMatchObject({ tangentCount: 1, tangentLength: 0, tangentAngle: 0 });
    expect(derive({ radius: 5, dist: 3 })).toMatchObject({ tangentCount: 0, tangentLength: 0, centreAngle: 0 });
  });

  it("makes the angle between the tangents and the angle at the centre add to 180°", () => {
    const r = derive({ radius: 5, dist: 10 });
    expect(r.tangentAngle).toBeCloseTo(60, 9);
    expect(r.centreAngle).toBeCloseTo(120, 9);
    expect(derive({ radius: 4, dist: 17 }).angleSum).toBeCloseTo(180, 9);
  });
});

describe("sectors and segments", () => {
  it("gives NCERT's arc of 22 cm and sector of 231 cm² for r = 21 cm, θ = 60°, π = 22/7", () => {
    const r = derive({ radius: 21, theta: 60 }, { pi: "22/7" });
    expect(r.arc).toBeCloseTo(22, 9);
    expect(r.sectorArea).toBeCloseTo(231, 9);
    expect(r.circleArea).toBeCloseTo(1386, 9);
    expect(r.circumference).toBeCloseTo(132, 9);
    expect(r.sectorChord).toBe(21);
    expect(r.piChoice).toBe(0);
  });

  it("gives NCERT's 4.19 cm² and 46.05 cm² for a 30° sector of radius 4 cm with π = 3.14", () => {
    const r = derive({ radius: 4, theta: 30 }, { pi: "3.14" });
    expect(r.sectorArea).toBeCloseTo(4.1867, 4);
    expect(r.majorSector).toBeCloseTo(46.0533, 4);
    expect(r.piChoice).toBe(1);
  });

  it("gives NCERT's segment for r = 21 cm, θ = 120°: 462 − 441√3/4 cm²", () => {
    const r = derive({ radius: 21, theta: 120 }, { pi: "22/7" });
    expect(r.sectorArea).toBeCloseTo(462, 9);
    expect(r.triangleArea).toBeCloseTo((441 * Math.sqrt(3)) / 4, 6);
    expect(r.segment).toBeCloseTo(271.04, 2);
    expect(r.segment + r.majorSegment).toBeCloseTo(1386, 9);
  });

  it("makes a quarter circle's segment πr²/4 − r²/2, and adds the triangle past 180°", () => {
    const quarter = derive({ radius: 14, theta: 90 }, { pi: "22/7" });
    expect(quarter).toMatchObject({ triangleArea: 98 });
    expect(quarter.segment).toBeCloseTo(154 - 98, 9);
    expect(derive({ radius: 14, theta: 180 }).triangleArea).toBe(0);
    const big = derive({ radius: 14, theta: 270 }, { pi: "22/7" });
    expect(big.segment).toBeCloseTo(462 + 98, 9);
    expect(big.majorSegment).toBeCloseTo(616 - 560, 9);
  });

  it("makes a 45° sector of radius 14 cm exactly 77 cm²", () => {
    expect(derive({ radius: 14, theta: 45 }).sectorArea).toBeCloseTo(77, 9);
  });
});

describe("the section formula", () => {
  it("divides (−1, 7) to (4, −3) at (1, 3) in the ratio 2 : 3, as in NCERT", () => {
    const r = derive({ ax: -1, ay: 7, bx: 4, by: -3, m: 2, n: 3 });
    expect(r).toMatchObject({ sectionX: 1, sectionY: 3, midX: 1.5, midY: 2 });
    expect(r.apLength / r.pbLength).toBeCloseTo(2 / 3, 12);
    expect(r.apLength + r.pbLength).toBeCloseTo(r.abLength, 12);
  });

  it("puts (−1, 6) on (−3, 10) to (6, −8) in the ratio 2 : 7, and (7, 3) on (4, −3) to (8, 5) at 3 : 1", () => {
    expect(circleSchoolSection(-3, 10, 6, -8, 2, 7)).toEqual([-1, 6]);
    expect(circleSchoolSection(4, -3, 8, 5, 3, 1)).toEqual([7, 3]);
  });

  it("lands on the midpoint when m = n", () => {
    const r = derive({ ax: 2, ay: -4, bx: 6, by: 8, m: 3, n: 3 });
    expect([r.sectionX, r.sectionY]).toEqual([r.midX, r.midY]);
    expect([r.midX, r.midY]).toEqual([4, 2]);
  });
});

describe("Heron's formula", () => {
  it("gives NCERT's 6 for sides 3, 4, 5, and 384 m² for the 40, 24, 32 m park", () => {
    expect(derive({ sideA: 3, sideB: 4, sideC: 5 })).toMatchObject({ semi: 6, heronProduct: 36, heronArea: 6, closes: 1, heronKind: 2 });
    expect(derive({ sideA: 40, sideB: 24, sideC: 32 })).toMatchObject({ semi: 48, sMinusA: 8, sMinusB: 24, sMinusC: 16, heronArea: 384 });
  });

  it("gives 8√30 for sides 8, 11, 13, and 25√3 for an equilateral triangle of side 10", () => {
    expect(circleSchoolHeron(8, 11, 13).area).toBeCloseTo(8 * Math.sqrt(30), 9);
    expect(circleSchoolHeron(10, 10, 10).area).toBeCloseTo(25 * Math.sqrt(3), 9);
    expect(derive({ sideA: 10, sideB: 10, sideC: 10 }).heronKind).toBe(1);
    expect(derive({ sideA: 2, sideB: 3, sideC: 4 }).heronKind).toBe(3);
  });

  it("agrees with half base times height", () => {
    // 5, 5, 6: base 6, height 4.
    expect(derive({ sideA: 5, sideB: 5, sideC: 6 }).heronArea).toBe(12);
    expect(derive({ sideA: 13, sideB: 14, sideC: 15 }).heronArea).toBe(84);
  });

  it("finds no triangle when the two short sides do not beat the long one", () => {
    expect(derive({ sideA: 1, sideB: 2, sideC: 3 })).toMatchObject({ closes: 0, heronArea: 0, heronKind: 0 });
    expect(derive({ sideA: 2, sideB: 3, sideC: 6 })).toMatchObject({ closes: 0, heronArea: 0 });
  });
});

describe("the model", () => {
  it("clamps every variable to its range and ignores unknown ids", () => {
    for (const [key, [lo, hi]] of Object.entries(CIRCLE_SCHOOL_RANGES)) {
      expect(model.setVariable(CIRCLE_SCHOOL_DEFAULT_STATE, key, 1e6, model.defaultParams)[key as keyof CircleSchoolState]).toBe(hi);
      expect(model.setVariable(CIRCLE_SCHOOL_DEFAULT_STATE, key, -1e6, model.defaultParams)[key as keyof CircleSchoolState]).toBe(lo);
      expect(model.getVariable(CIRCLE_SCHOOL_DEFAULT_STATE, key)).toBe(CIRCLE_SCHOOL_DEFAULT_STATE[key as keyof CircleSchoolState]);
    }
    expect(model.setVariable(CIRCLE_SCHOOL_DEFAULT_STATE, "nope", 3, model.defaultParams)).toBe(CIRCLE_SCHOOL_DEFAULT_STATE);
  });

  it("gives a finite number for every output, even at the edges", () => {
    const edges: CircleSchoolState[] = [
      Object.fromEntries(Object.entries(CIRCLE_SCHOOL_RANGES).map(([k, [lo]]) => [k, lo])) as unknown as CircleSchoolState,
      Object.fromEntries(Object.entries(CIRCLE_SCHOOL_RANGES).map(([k, [, hi]]) => [k, hi])) as unknown as CircleSchoolState,
      Object.fromEntries(Object.keys(CIRCLE_SCHOOL_RANGES).map((k) => [k, Number.NaN])) as unknown as CircleSchoolState,
      model.initialize(model.defaultParams),
    ];
    for (const state of edges) {
      for (const pi of ["22/7", "3.14"] as const) {
        const r = model.derive(state, { pi });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
