import { describe, expect, it } from "vitest";
import {
  CIRCLE_LINE_DEFAULT_STATE,
  CIRCLE_LINE_RANGES,
  circleLineModel as model,
  type CircleLineParams,
  type CircleLineState,
} from "./circleline";

const derive = (state: Partial<CircleLineState> = {}, params: Partial<CircleLineParams> = {}) =>
  model.derive({ ...CIRCLE_LINE_DEFAULT_STATE, ...state }, { ...model.defaultParams, ...params });
/** Two lines, A₁x + B₁y + C₁ = 0 and A₂x + B₂y + C₂ = 0. */
const lines = (l1: [number, number, number], l2: [number, number, number] = [1, 2, -8], extra: Partial<CircleLineState> = {}) =>
  derive({ a1: l1[0], b1: l1[1], c1: l1[2], a2: l2[0], b2: l2[1], c2: l2[2], ...extra });
const general = (g: number, f: number, c: number, extra: Partial<CircleLineState> = {}) => derive({ g, f, c, ...extra }, { form: "general" });

describe("the angle between two lines", () => {
  it("finds 45° between slopes 2 and −3, where tan θ = |(2 + 3)/(1 − 6)| = 1", () => {
    const r = lines([2, -1, 1], [3, 1, -4]);
    expect(r).toMatchObject({ m1: 2, m2: -3, slopeProduct: -6, lineRelation: 0, meets: 1 });
    expect(r.tanAngle).toBeCloseTo(1, 12);
    expect(r.angleDeg).toBeCloseTo(45, 10);
    expect(r.angle).toBeCloseTo(Math.PI / 4, 12);
    // 2x + 1 = 4 − 3x at x = 0.6.
    expect(r.meetX).toBeCloseTo(0.6, 12);
    expect(r.meetY).toBeCloseTo(2.2, 12);
  });

  it("calls slopes ½ and −2 perpendicular: m₁m₂ = −1", () => {
    const r = lines([1, -2, 4], [2, 1, -3]);
    expect(r).toMatchObject({ lineRelation: 2, slopeProduct: -1, tanAngle: 0, m1: 0.5, m2: -2 });
    expect(r.angleDeg).toBeCloseTo(90, 10);
    expect(r.meetX).toBeCloseTo(0.4, 12);
    expect(r.meetY).toBeCloseTo(2.2, 12);
  });

  it("handles a vertical line, where the slope formula breaks down", () => {
    // x = 2 against y = 3x: θ = 90° − tan⁻¹3, so tan θ = 1/3.
    const r = lines([1, 0, -2], [-3, 1, 0]);
    expect(r).toMatchObject({ vertical1: 1, vertical2: 0, m1: 0, m2: 3, slopeProduct: 0, lineRelation: 0, meetX: 2, meetY: 6 });
    expect(r.tanAngle).toBeCloseTo(1 / 3, 12);
    expect(r.angleDeg).toBeCloseTo(90 - (Math.atan(3) * 180) / Math.PI, 10);
    expect(lines([1, 0, -2], [0, 1, 5])).toMatchObject({ lineRelation: 2, meetX: 2, meetY: -5 });
  });

  it("tells parallel lines from the same line written twice", () => {
    expect(lines([3, -4, 7], [6, -8, -6])).toMatchObject({ lineRelation: 1, meets: 0, angle: 0 });
    expect(lines([1, 1, -1], [2, 2, -2])).toMatchObject({ lineRelation: 3, meets: 0 });
    expect(lines([1, 0, -1], [3, 0, 4])).toMatchObject({ lineRelation: 1 });
  });

  it("refuses A = B = 0 as a line, without NaN", () => {
    const r = lines([0, 0, 3], [1, 1, 0]);
    expect(r).toMatchObject({ line1Valid: 0, line2Valid: 1, lineRelation: 0, distance: 0, angle: 0 });
    for (const [key, value] of Object.entries(r)) expect(Number.isFinite(value), key).toBe(true);
  });
});

describe("distance from a point to a line", () => {
  it("puts (3, −5) 3/5 from 3x − 4y − 26 = 0, with the foot at (2.64, −4.52)", () => {
    const r = lines([3, -4, -26], [1, 2, -8], { px: 3, py: -5 });
    expect(r.distance).toBeCloseTo(0.6, 12);
    expect(r.footX).toBeCloseTo(2.64, 12);
    expect(r.footY).toBeCloseTo(-4.52, 12);
    expect(3 * r.footX - 4 * r.footY - 26).toBeCloseTo(0, 12);
    expect(r.side).toBe(1);
    expect(lines([3, -4, -26], [1, 2, -8], { px: 0, py: 0 })).toMatchObject({ side: -1 });
  });

  it("measures parallel lines after rescaling: 3x − 4y + 7 = 0 and 6x − 8y − 6 = 0 are 2 apart", () => {
    expect(lines([3, -4, 7], [6, -8, -6]).parallelDistance).toBeCloseTo(2, 12);
    expect(lines([3, -4, 7], [3, -4, 5]).parallelDistance).toBeCloseTo(0.4, 12);
    expect(lines([1, 0, -1], [2, 0, 4]).parallelDistance).toBeCloseTo(3, 12);
    expect(lines([3, -4, 7], [1, 2, 0]).parallelDistance).toBe(0);
  });
});

describe("the family L₁ + λL₂ = 0", () => {
  it("turns about the meeting point, and is horizontal at λ = −1 for x + y − 4 and x − y", () => {
    for (const lam of [-3, -1, 0, 0.5, 2, 7]) {
      const r = lines([1, 1, -4], [1, -1, 0], { lam });
      expect(r.meetX).toBe(2);
      expect(r.famA * 2 + r.famB * 2 + r.famC, `λ = ${lam}`).toBeCloseTo(0, 12);
    }
    expect(lines([1, 1, -4], [1, -1, 0], { lam: -1 })).toMatchObject({ famA: 0, famB: 2, famC: -4, famSlope: 0, famVertical: 0 });
    expect(lines([1, 1, -4], [1, -1, 0], { lam: 1 })).toMatchObject({ famB: 0, famVertical: 1 });
  });
});

describe("the circle's equation", () => {
  it("reads centre (2, −3) and radius 5 from x² + y² − 4x + 6y − 12 = 0", () => {
    const r = general(-2, 3, -12);
    expect(r).toMatchObject({ cx: 2, cy: -3, rSquared: 25, radius: 5, circleKind: 1, form: 1 });
  });

  it("calls g² + f² − c = 0 a point circle and g² + f² − c < 0 not a real circle", () => {
    expect(general(1, -2, 5)).toMatchObject({ rSquared: 0, radius: 0, circleKind: 0 });
    expect(general(2, 2, 10)).toMatchObject({ rSquared: -2, radius: 0, circleKind: -1, meetCount: 0, tangentLength: 0, commonTangents: 0 });
  });

  it("writes (x − 2)² + (y + 1)² = 9 in general form: g = −2, f = 1, c = −4", () => {
    expect(derive({ h: 2, k: -1, r: 3 })).toMatchObject({ circleG: -2, circleF: 1, circleC: -4, rSquared: 9, form: 0 });
  });
});

describe("a line against a circle", () => {
  const circle = { h: 0, k: 0, r: 5 };
  it("has 3x + 4y − 25 = 0 touch x² + y² = 25 at (3, 4)", () => {
    const r = lines([3, 4, -25], [1, 2, -8], circle);
    expect(r).toMatchObject({ meetCount: 1, chord: 0, discriminant: 0, centreDistance: 5 });
    expect(r.cut1x).toBeCloseTo(3, 12);
    expect(r.cut1y).toBeCloseTo(4, 12);
  });

  it("has 3x + 4y − 15 = 0 cut it in a chord of 8, at (5, 0) and (−1.4, 4.8)", () => {
    const r = lines([3, 4, -15], [1, 2, -8], circle);
    expect(r).toMatchObject({ meetCount: 2, centreDistance: 3 });
    expect(r.chord).toBeCloseTo(8, 12);
    // 25x² − 90x − 175 = 0 over 16: D = 100.
    expect(r.discriminant).toBeCloseTo(100, 10);
    const points = [[r.cut1x, r.cut1y], [r.cut2x, r.cut2y]].sort((p, q) => p[0]! - q[0]!);
    expect(points[0]![0]).toBeCloseTo(-1.4, 12);
    expect(points[0]![1]).toBeCloseTo(4.8, 12);
    expect(points[1]![0]).toBeCloseTo(5, 12);
    expect(points[1]![1]).toBeCloseTo(0, 12);
  });

  it("has x + y − 10 = 0 miss it, with a negative discriminant", () => {
    const r = lines([1, 1, -10], [1, 2, -8], circle);
    expect(r.meetCount).toBe(0);
    expect(r.centreDistance).toBeCloseTo(10 / Math.SQRT2, 12);
    expect(r.discriminant).toBeLessThan(0);
  });

  it("finds the tangent condition c² = r²(1 + m²): y = 2x + 10 touches x² + y² = 20", () => {
    const r = lines([2, -1, 10], [1, 2, -8], { h: 0, k: 0, r: Math.sqrt(20) });
    expect(r.meetCount).toBe(1);
    expect(lines([2, -1, 9], [1, 2, -8], { h: 0, k: 0, r: Math.sqrt(20) }).meetCount).toBe(2);
    // For y = mx + c and x² + y² = r² the discriminant is 4[r²(1 + m²) − c²]: 4(100 − 81) = 76.
    expect(lines([2, -1, 9], [1, 2, -8], { h: 0, k: 0, r: Math.sqrt(20) }).discriminant).toBeCloseTo(76, 9);
  });

  it("uses the y-quadratic for a vertical line: x = 4 cuts x² + y² = 25 in a chord of 6", () => {
    const r = lines([1, 0, -4], [1, 2, -8], circle);
    expect(r.chord).toBeCloseTo(6, 12);
    expect(r.discriminant).toBeCloseTo(36, 12);
    expect(lines([1, 0, -5], [1, 2, -8], circle).meetCount).toBe(1);
  });
});

describe("tangent and normal", () => {
  it("gives 3x + 4y = 25 at (3, 4) on x² + y² = 25, slope −3/4, with the normal 4/3", () => {
    const r = derive({ h: 0, k: 0, r: 5, phi: Math.atan2(4, 3) });
    expect(r.tx).toBeCloseTo(3, 12);
    expect(r.ty).toBeCloseTo(4, 12);
    expect(r.tangentA).toBeCloseTo(3, 12);
    expect(r.tangentB).toBeCloseTo(4, 12);
    expect(r.tangentC).toBeCloseTo(-25, 12);
    expect(r.tangentSlope).toBeCloseTo(-0.75, 12);
    expect(r.normalSlope).toBeCloseTo(4 / 3, 12);
  });

  it("uses xx₁ + yy₁ + g(x + x₁) + f(y + y₁) + c = 0: 3x + 4y − 19 = 0 at (5, 1) on x² + y² − 4x + 6y − 12 = 0", () => {
    const r = general(-2, 3, -12, { phi: Math.atan2(4, 3) });
    expect(r.tx).toBeCloseTo(5, 12);
    expect(r.ty).toBeCloseTo(1, 12);
    expect(r.tangentA).toBeCloseTo(3, 12);
    expect(r.tangentB).toBeCloseTo(4, 12);
    expect(r.tangentC).toBeCloseTo(-19, 12);
  });

  it("is horizontal at the top and vertical at the side", () => {
    expect(derive({ h: 0, k: 0, r: 5, phi: Math.PI / 2 })).toMatchObject({ tangentSlope: 0, tangentVertical: 0, normalVertical: 1, tx: 0, ty: 5 });
    expect(derive({ h: 0, k: 0, r: 5, phi: 0 })).toMatchObject({ tangentVertical: 1, tangentSlope: 0, normalSlope: 0, tx: 5, ty: 0 });
  });

  it("gives the tangent from (7, 2) to x² + y² − 4x + 6y − 12 = 0 a length √S₁ = 5", () => {
    const r = general(-2, 3, -12, { px: 7, py: 2 });
    expect(r).toMatchObject({ s1: 25, pointPosition: 1, tangentLength: 5 });
    for (const [x, y] of [[r.contact1x, r.contact1y], [r.contact2x, r.contact2y]] as const) {
      expect((x - 2) ** 2 + (y + 3) ** 2).toBeCloseTo(25, 10);
      // The radius to the point of contact is at right angles to the tangent.
      expect((x - 2) * (x - 7) + (y + 3) * (y - 2)).toBeCloseTo(0, 10);
      expect(Math.hypot(x - 7, y - 2)).toBeCloseTo(5, 10);
    }
  });

  it("puts a point inside, on or outside by the sign of S₁", () => {
    const at = (px: number, py: number) => derive({ h: 0, k: 0, r: 5, px, py });
    expect([at(3, 4), at(-5, 0), at(1, 2), at(0, -3), at(6, 0), at(4, 4)].map((r) => r.pointPosition)).toEqual([0, 0, -1, -1, 1, 1]);
    expect(at(1, 2)).toMatchObject({ s1: -20, tangentLength: 0 });
  });
});

describe("two circles and the radical axis", () => {
  const c1 = { h: 0, k: 0, r: 3 };
  it("finds x = 2 as the radical axis of x² + y² = 9 and (x − 4)² + y² = 9, with a common chord 2√5", () => {
    const r = derive({ ...c1, h2: 4, k2: 0, r2: 3 });
    expect(r).toMatchObject({ circlesRelation: 2, commonTangents: 2, radicalExists: 1, radicalA: 8, radicalB: 0, radicalC: -16, radicalX: 2, centreGap: 4 });
    expect(r.commonChord).toBeCloseTo(2 * Math.sqrt(5), 12);
  });

  it("counts the common tangents: 4, 3, 2, 1, 0", () => {
    const tangents = (h2: number, r2: number) => derive({ ...c1, h2, k2: 0, r2 }).commonTangents;
    expect([tangents(7, 2), tangents(5, 2), tangents(4, 2), tangents(1, 2), tangents(0.5, 1)]).toEqual([4, 3, 2, 1, 0]);
    expect(derive({ ...c1, h2: 3, k2: 4, r2: 2 }).circlesRelation).toBe(1);
    expect(derive({ ...c1, h2: 0, k2: 0, r2: 3 })).toMatchObject({ circlesRelation: 5, radicalExists: 0 });
    expect(derive({ ...c1, h2: 0, k2: 0, r2: 1 })).toMatchObject({ circlesRelation: 4, radicalExists: 0 });
  });

  it("puts the radical axis at right angles to the line of centres", () => {
    const r = derive({ h: 1, k: -2, r: 4, h2: -3, k2: 3, r2: 2.5 });
    // (A, B) of the axis is parallel to the vector between the centres.
    expect(r.radicalA * (r.cy2 - r.cy) - r.radicalB * (r.cx2 - r.cx)).toBeCloseTo(0, 12);
  });
});

describe("the family S + λL = 0", () => {
  it("passes through the origin at λ = −5 for x² + y² − 25 and x + y − 5, centre (2.5, 2.5)", () => {
    const r = lines([1, 1, -5], [1, 2, -8], { h: 0, k: 0, r: 5, lam: -5 });
    expect(r).toMatchObject({ famConst: 0, famCx: 2.5, famCy: 2.5, famRSquared: 12.5, famKind: 1 });
    expect(r.famR).toBeCloseTo(Math.sqrt(12.5), 12);
  });

  it("goes through the two points where the line cuts the circle, for every λ", () => {
    for (const lam of [-4, -1, 0.5, 3]) {
      const r = lines([3, 4, -15], [1, 2, -8], { h: 0, k: 0, r: 5, lam });
      for (const [x, y] of [[r.cut1x, r.cut1y], [r.cut2x, r.cut2y]] as const) {
        expect((x - r.famCx) ** 2 + (y - r.famCy) ** 2, `λ = ${lam}`).toBeCloseTo(r.famRSquared, 9);
      }
    }
  });
});

describe("the forms of a line through two points", () => {
  const ab = (a: [number, number], b: [number, number], extra: Partial<CircleLineState> = {}) => derive({ ax: a[0], ay: a[1], bx: b[0], by: b[1], ...extra });

  it("gives slope −3/2 through (3, −2) and (−1, 4): 3x + 2y − 5 = 0, inclination 123.7°", () => {
    const r = ab([3, -2], [-1, 4]);
    expect(r).toMatchObject({ abValid: 1, abVertical: 0, abSlope: -1.5, abA: 3, abB: 2, abC: -5 });
    expect(r.abInclination).toBeCloseTo(180 - (Math.atan(1.5) * 180) / Math.PI, 10);
    expect(Math.tan((r.abInclination * Math.PI) / 180)).toBeCloseTo(r.abSlope, 12);
  });

  it("reads 3x − 4y + 10 = 0 through (−2, 1) and (2, 4): slope 3/4, intercepts −10/3 and 5/2, normal p = 2 at ω = 126.87°", () => {
    const r = ab([-2, 1], [2, 4]);
    expect(r).toMatchObject({ abA: 3, abB: -4, abC: 10, abSlope: 0.75, abHasXIntercept: 1, abHasYIntercept: 1, abYIntercept: 2.5 });
    expect(r.abXIntercept).toBeCloseTo(-10 / 3, 12);
    expect(r.abNormalP).toBeCloseTo(2, 12);
    // −(3/5)x + (4/5)y = 2: cos ω = −0.6, sin ω = 0.8.
    expect(r.abNormalDeg).toBeCloseTo((Math.atan2(0.8, -0.6) * 180) / Math.PI, 10);
    expect(r.abFootX).toBeCloseTo(-1.2, 12);
    expect(r.abFootY).toBeCloseTo(1.6, 12);
    expect(3 * r.abFootX - 4 * r.abFootY + 10).toBeCloseTo(0, 12);
    // The same line from other points, scaled the same way.
    expect(ab([6, 7], [-6, -2])).toMatchObject({ abA: 3, abB: -4, abC: 10 });
  });

  it("writes y − 3 = −4(x + 2) as 4x + y + 5 = 0", () => {
    expect(ab([-2, 3], [-1, -1])).toMatchObject({ abSlope: -4, abA: 4, abB: 1, abC: 5, abYIntercept: -5 });
    expect(ab([-2, 3], [-1.5, 1])).toMatchObject({ abA: 4, abB: 1, abC: 5 });
  });

  it("scales halves to whole numbers: (0.5, 0) and (0, 1.5) give 3x + y − 1.5 = 0 as 6x + 2y − 3 = 0", () => {
    expect(ab([0.5, 0], [0, 1.5])).toMatchObject({ abA: 6, abB: 2, abC: -3, abXIntercept: 0.5, abYIntercept: 1.5 });
  });

  it("calls x₁ = x₂ vertical (slope undefined, θ = 90°) and y₁ = y₂ horizontal (θ = 0)", () => {
    const vertical = ab([3, -2], [3, 4]);
    expect(vertical).toMatchObject({ abVertical: 1, abSlope: 0, abInclination: 90, abA: 1, abB: 0, abC: -3, abHasYIntercept: 0, abYIntercept: 0, abXIntercept: 3, abNormalP: 3, abNormalDeg: 0 });
    const flat = ab([3, -2], [7, -2]);
    expect(flat).toMatchObject({ abVertical: 0, abSlope: 0, abInclination: 0, abA: 0, abB: 1, abC: 2, abHasXIntercept: 0, abYIntercept: -2, abNormalP: 2, abNormalDeg: 270 });
    expect(ab([7, -2], [3, -2]).abInclination).toBe(0);
  });

  it("puts ω in [0°, 180°) with p = 0 for a line through the origin", () => {
    expect(ab([0, 0], [1, 1])).toMatchObject({ abNormalP: 0, abNormalDeg: 135, abXIntercept: 0, abYIntercept: 0 });
    expect(ab([0, 0], [0, 5])).toMatchObject({ abNormalP: 0, abNormalDeg: 0 });
    expect(ab([-3, 0], [3, 0])).toMatchObject({ abNormalP: 0, abNormalDeg: 90 });
  });

  it("refuses A = B as a line, without NaN", () => {
    const r = ab([2, 2], [2, 2]);
    expect(r).toMatchObject({ abValid: 0, abVertical: 0, abSlope: 0, abA: 0, abB: 0, abC: 0, abNormalP: 0, abCollinear: 0 });
    for (const key of model.outputs) {
      expect(Number.isFinite(r[key]), key).toBe(true);
      expect(Object.is(r[key], -0), key).toBe(false);
    }
  });

  it("finds (x, −1), (2, 1), (4, 5) collinear only at x = 1, by equal slopes", () => {
    expect(ab([2, 1], [4, 5], { px: 1, py: -1 })).toMatchObject({ abCollinear: 1, abpArea: 0 });
    const off = ab([2, 1], [4, 5], { px: 3, py: -1 });
    expect(off).toMatchObject({ abCollinear: 0, abpArea: 4 });
  });

  it("leaves every other output alone", () => {
    const before = derive();
    const after = derive({ ax: 5, ay: -7, bx: -3, by: 9 });
    for (const key of model.outputs) if (!/^(ab|ax|ay|bx|by)/.test(key)) expect(after[key], key).toBe(before[key]);
  });
});

describe("the model's plumbing", () => {
  it("clamps every variable to its range", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, [lo, hi]] of Object.entries(CIRCLE_LINE_RANGES)) {
      s = model.setVariable(s, id, 1e6, model.defaultParams);
      expect(model.getVariable(s, id), id).toBe(hi);
      s = model.setVariable(s, id, -1e6, model.defaultParams);
      expect(model.getVariable(s, id), id).toBe(lo);
    }
    expect(model.setVariable(s, "nonsense", 3, model.defaultParams)).toBe(s);
  });

  it("walks the tangent point round the circle and wraps", () => {
    const s = model.advance({ ...CIRCLE_LINE_DEFAULT_STATE, phi: 6 }, 1, model.defaultParams);
    expect(s.phi).toBeCloseTo(6.5 - 2 * Math.PI, 12);
    expect(model.step({ ...CIRCLE_LINE_DEFAULT_STATE, phi: 0 }, model.defaultParams, -1).phi).toBeCloseTo((23 * Math.PI) / 12, 12);
  });

  it("produces every output as a finite number, never −0", () => {
    for (const params of [{ form: "centre" as const }, { form: "general" as const }]) {
      const r = model.derive(model.initialize(params), params);
      for (const key of model.outputs) {
        expect(Number.isFinite(r[key]), key).toBe(true);
        expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
  });
});
