import { describe, expect, it } from "vitest";
import { space3dModel as model, SPACE3D_COMPONENT_MAX, type Space3dParams, type Space3dState } from "./space3d";

const base = model.initialize(model.defaultParams);
type V = readonly [number, number, number];
const vec = (key: "a" | "b" | "c" | "e" | "n", v: V): Partial<Space3dState> => ({ [`${key}x`]: v[0], [`${key}y`]: v[1], [`${key}z`]: v[2] });
const derive = (state: Partial<Space3dState> = {}, params: Partial<Space3dParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the section formula", () => {
  const ends = { ...vec("a", [1, -2, 4]), ...vec("b", [4, 4, 1]) };

  it("divides AB internally in m : n", () => {
    expect(derive({ ...ends, m: 2, n: 1 })).toMatchObject({ px: 3, py: 2, pz: 2, sectionOk: 1 });
    expect(derive({ ...ends, m: 1, n: 2 })).toMatchObject({ px: 2, py: 0, pz: 3 });
    // The midpoint.
    const mid = derive({ ...ends, m: 3, n: 3 });
    expect([mid.px, mid.py, mid.pz]).toEqual([2.5, 1, 2.5]);
  });

  it("makes AP : PB equal m : n", () => {
    const r = derive({ ...ends, m: 2, n: 1 });
    expect(r.apLength / r.pbLength).toBeCloseTo(2, 10);
    expect(r.apLength + r.pbLength).toBeCloseTo(Math.hypot(3, 6, -3), 10);
  });

  it("divides externally, beyond B when m > n", () => {
    const r = derive({ ...vec("a", [1, 2, 3]), ...vec("b", [2, 3, 2]), m: 2, n: 1 }, { division: "external" });
    expect(r).toMatchObject({ px: 3, py: 4, pz: 1, sectionOk: 1, division: 1 });
    expect(r.apLength / r.pbLength).toBeCloseTo(2, 10);
  });

  it("flags external division in 1 : 1, which no point does", () => {
    const r = derive({ ...ends, m: 2, n: 2 }, { division: "external" });
    expect(r).toMatchObject({ sectionOk: 0, px: 0, py: 0, pz: 0, apLength: 0, pbLength: 0 });
  });

  it("puts P further from A as m grows", () => {
    const ap = [1, 2, 3, 4, 5].map((m) => derive({ ...ends, m, n: 1 }).apLength);
    for (let i = 1; i < ap.length; i++) expect(ap[i]).toBeGreaterThan(ap[i - 1]!);
  });
});

describe("the scalar product", () => {
  it("is a·b = |a||b| cos θ", () => {
    const r = derive({ ...vec("a", [1, 0, 1]), ...vec("b", [0, 1, 1]) });
    expect(r.dot).toBe(1);
    expect(r.angleDeg).toBeCloseTo(60, 10);
    expect(r.magA * r.magB * Math.cos(r.angle)).toBeCloseTo(r.dot, 12);
  });

  it("gives the projection of a on b as a·b/|b|, a shadow along b", () => {
    const r = derive({ ...vec("a", [2, 3, 2]), ...vec("b", [1, 2, 1]) });
    expect(r.dot).toBe(10);
    expect(r.projection).toBeCloseTo(10 / Math.sqrt(6), 12);
    expect(r.projection).toBeCloseTo(4.08, 2);
    expect([r.shadowX, r.shadowY, r.shadowZ].map((v) => v * 6)).toEqual([10, 20, 10].map((v) => expect.closeTo(v, 10)));
  });

  it("is zero for perpendicular vectors", () => {
    expect(derive({ ...vec("a", [3, 2, 1]), ...vec("b", [1, -2, 1]) })).toMatchObject({ dot: 0, perpendicular: 1, projection: 0 });
    expect(derive({ ...vec("a", [3, 2, 1]), ...vec("b", [1, -1.5, 1]) }).perpendicular).toBe(0);
  });

  it("has no angle with a zero vector", () => {
    const r = derive({ ...vec("a", [0, 0, 0]), ...vec("b", [1, 2, 2]) });
    expect(r).toMatchObject({ dotDefined: 0, angle: 0, perpendicular: 0, dot: 0, dirDefined: 0, dirSum: 0 });
    expect(derive({ ...vec("b", [0, 0, 0]) })).toMatchObject({ projection: 0, shadowX: 0, dotDefined: 0 });
  });
});

describe("the vector product", () => {
  it("follows i × j = k round the cycle", () => {
    const ij = derive({ ...vec("a", [1, 0, 0]), ...vec("b", [0, 1, 0]) });
    expect([ij.crossX, ij.crossY, ij.crossZ]).toEqual([0, 0, 1]);
    const jk = derive({ ...vec("a", [0, 1, 0]), ...vec("b", [0, 0, 1]) });
    expect([jk.crossX, jk.crossY, jk.crossZ]).toEqual([1, 0, 0]);
    const ji = derive({ ...vec("a", [0, 1, 0]), ...vec("b", [1, 0, 0]) });
    expect([ji.crossX, ji.crossY, ji.crossZ]).toEqual([0, 0, -1]);
  });

  it("is perpendicular to both, with length the area of the parallelogram", () => {
    const r = derive({ ...vec("a", [1, 2, 2]), ...vec("b", [2, 1, -2]) });
    expect([r.crossX, r.crossY, r.crossZ]).toEqual([-6, 6, -3]);
    expect(r.crossMag).toBeCloseTo(9, 12);
    expect(r.triangleArea).toBeCloseTo(4.5, 12);
    expect(r.crossX * r.ax + r.crossY * r.ay + r.crossZ * r.az).toBe(0);
    expect(r.crossX * r.bx + r.crossY * r.by + r.crossZ * r.bz).toBe(0);
    expect(r.magA * r.magB * Math.sin(r.angle)).toBeCloseTo(r.crossMag, 12);
  });

  it("keeps the area when the parallelogram is sheared", () => {
    for (const bx of [0, 1, 2, 3]) expect(derive({ ...vec("a", [2, 0, 0]), ...vec("b", [bx, 2, 0]) }).crossMag).toBe(4);
  });

  it("vanishes for parallel vectors", () => {
    expect(derive({ ...vec("a", [1, 2, -1]), ...vec("b", [-2, -4, 2]) })).toMatchObject({ crossMag: 0, parallel: 1, angleDeg: 180 });
    expect(derive({ ...vec("a", [0, 0, 0]) }).parallel).toBe(0);
  });
});

describe("the triple products", () => {
  it("gives the volume of the parallelepiped as [a b c]", () => {
    const r = derive({ ...vec("a", [1, 2, 0]), ...vec("b", [0, 1, 2]), ...vec("c", [2, 0, 1]) });
    expect(r).toMatchObject({ triple: 9, volume: 9, coplanar: 0, handed: 1 });
    expect(r.tetraVolume).toBeCloseTo(1.5, 12);
    // Swapping two vectors changes the sign but not the volume.
    const swapped = derive({ ...vec("a", [0, 1, 2]), ...vec("b", [1, 2, 0]), ...vec("c", [2, 0, 1]) });
    expect(swapped).toMatchObject({ triple: -9, volume: 9, handed: -1 });
  });

  it("is the unit cube's volume for i, j, k", () => {
    expect(derive({ ...vec("a", [1, 0, 0]), ...vec("b", [0, 1, 0]), ...vec("c", [0, 0, 1]) }).triple).toBe(1);
  });

  it("is zero exactly when the three are coplanar", () => {
    const flat = (z: number) => derive({ ...vec("a", [1, 1, 0]), ...vec("b", [0, 1, 1]), ...vec("c", [1, 2, z]) });
    expect(flat(1)).toMatchObject({ triple: 0, volume: 0, coplanar: 1, handed: 0 });
    expect(flat(3).triple).toBe(2);
    expect(flat(-1).triple).toBe(-2);
  });

  it("expands a × (b × c) as (a·c) b − (a·b) c", () => {
    const r = derive({ ...vec("a", [1, 2, 0]), ...vec("b", [0, 1, 2]), ...vec("c", [2, 0, 1]) });
    // b × c = (1, 4, −2); a × (1, 4, −2) = (−4, 2, 2).
    expect([r.vtX, r.vtY, r.vtZ]).toEqual([-4, 2, 2]);
    expect(r.vtMag).toBeCloseTo(Math.sqrt(24), 12);
  });
});

describe("direction cosines", () => {
  it("are the components of the unit vector, with squares summing to 1", () => {
    const r = derive(vec("a", [4, 2, 4]));
    expect(r.magA).toBe(6);
    expect([r.dirL, r.dirM, r.dirN]).toEqual([2 / 3, 1 / 3, 2 / 3]);
    expect(r.dirSum).toBeCloseTo(1, 12);
    expect(Math.cos(r.beta)).toBeCloseTo(1 / 3, 12);
    expect(r.betaDeg).toBeCloseTo(70.53, 2);
    expect(r.alphaDeg).toBeCloseTo(48.19, 2);
  });

  it("are equal, about 54.7° each, for a vector along (1, 1, 1)", () => {
    const r = derive(vec("a", [1, 1, 1]));
    expect(r.dirL).toBeCloseTo(1 / Math.sqrt(3), 12);
    expect(r.dirM).toBeCloseTo(r.dirN, 12);
    expect(r.alphaDeg).toBeCloseTo(54.74, 2);
  });
});

describe("two lines", () => {
  it("finds the NCERT shortest distance between skew lines", () => {
    // r = i + 2j + k + λ(i − j + k) and r = 2i − j − k + μ(2i + j + 2k).
    const r = derive({ ...vec("a", [1, 2, 1]), ...vec("b", [1, -1, 1]), ...vec("c", [2, -1, -1]), ...vec("e", [2, 1, 2]) });
    expect(r.linesRelation).toBe(2);
    expect(r.shortestDistance).toBeCloseTo(3 / Math.SQRT2, 12);
    // The segment between the feet is that long and perpendicular to both lines.
    const seg = [r.f2x - r.f1x, r.f2y - r.f1y, r.f2z - r.f1z] as const;
    expect(Math.hypot(...seg)).toBeCloseTo(r.shortestDistance, 10);
    expect(seg[0] * 1 + seg[1] * -1 + seg[2] * 1).toBeCloseTo(0, 10);
    expect(seg[0] * 2 + seg[1] * 1 + seg[2] * 2).toBeCloseTo(0, 10);
  });

  it("measures the acute angle between lines", () => {
    const r = derive({ ...vec("b", [1, 1, 0]), ...vec("e", [-1, 0, 1]) });
    expect(r.linesAngleDeg).toBeCloseTo(60, 10);
    expect(derive({ ...vec("b", [1, 0, 0]), ...vec("e", [0, 3, 0]) }).linesAngleDeg).toBeCloseTo(90, 10);
  });

  it("knows when lines meet: the x-axis and a line through (0, −2, z) along (0, 1, 1)", () => {
    const at = (z: number) => derive({ ...vec("a", [-2, 0, 0]), ...vec("b", [1, 0, 0]), ...vec("c", [0, -2, z]), ...vec("e", [0, 1, 1]) });
    expect(at(2).shortestDistance).toBeCloseTo(4 / Math.SQRT2, 12);
    expect(at(2).linesRelation).toBe(2);
    expect(at(-2)).toMatchObject({ linesRelation: 0, shortestDistance: 0, f1x: 0, f1y: 0, f1z: 0, f2x: 0, f2y: 0, f2z: 0 });
  });

  it("handles parallel lines separately", () => {
    const r = derive({ ...vec("a", [0, 0, 0]), ...vec("b", [1, 0, 0]), ...vec("c", [2, 3, 4]), ...vec("e", [-2, 0, 0]) });
    expect(r).toMatchObject({ linesRelation: 1, shortestDistance: 5, linesAngleDeg: 0, f1x: 0, f2x: 0, f2y: 3, f2z: 4 });
    expect(derive({ ...vec("a", [0, 0, 0]), ...vec("b", [1, 0, 0]), ...vec("c", [3, 0, 0]), ...vec("e", [2, 0, 0]) }).linesRelation).toBe(3);
  });

  it("does not care which point of a line is used", () => {
    const at = (y: number) => derive({ ...vec("a", [0, 0, 0]), ...vec("b", [1, 0, 0]), ...vec("c", [0, y, 2]), ...vec("e", [0, 1, 0]) }).shortestDistance;
    expect(at(-2)).toBe(2);
    expect(at(3)).toBe(2);
  });

  it("flags a line with no direction", () => {
    expect(derive({ ...vec("e", [0, 0, 0]) })).toMatchObject({ linesRelation: 4, shortestDistance: 0, linesAngle: 0 });
  });
});

describe("the plane", () => {
  const plane = { ...vec("n", [2, -1, 2]), d: 3 };

  it("gives the distance from a point as |n·a − D|/|n|", () => {
    const r = derive({ ...plane, ...vec("a", [3, 1, 2]) });
    expect(r.normalMag).toBe(3);
    expect(r.planeDistance).toBe(2);
    expect(r.originDistance).toBe(1);
    // The foot lies on the plane, 2 away from A.
    expect(2 * r.footX - r.footY + 2 * r.footZ).toBeCloseTo(3, 12);
    expect(Math.hypot(r.footX - 3, r.footY - 1, r.footZ - 2)).toBeCloseTo(2, 12);
    expect(derive({ ...plane, ...vec("a", [3, 1, 2]), d: 9 })).toMatchObject({ planeDistance: 0, onPlane: 1 });
  });

  it("measures the angle between a line and the plane", () => {
    const r = derive({ ...vec("n", [1, 1, 0]), d: 0, ...vec("a", [0, 0, 0]), ...vec("b", [1, 0, 1]) });
    expect(r.linePlaneDeg).toBeCloseTo(30, 10);
    expect(r.lineMeetsPlane).toBe(1);
  });

  it("finds where the line meets the plane", () => {
    const r = derive({ ...vec("n", [0, 0, 1]), d: 2, ...vec("a", [1, 1, -1]), ...vec("b", [1, 0, 1]) });
    expect(r).toMatchObject({ lineMeetsPlane: 1, hitX: 4, hitY: 1, hitZ: 2 });
    expect(r.linePlaneDeg).toBeCloseTo(45, 10);
  });

  it("tells a line parallel to the plane from one lying in it", () => {
    expect(derive({ ...vec("n", [0, 0, 1]), d: 2, ...vec("a", [1, 1, 0]), ...vec("b", [1, 2, 0]) })).toMatchObject({ lineMeetsPlane: 0, linePlaneAngle: 0 });
    expect(derive({ ...vec("n", [0, 0, 1]), d: 2, ...vec("a", [1, 1, 2]), ...vec("b", [1, 2, 0]) }).lineMeetsPlane).toBe(2);
  });

  it("is no plane with a zero normal", () => {
    expect(derive({ ...vec("n", [0, 0, 0]) })).toMatchObject({ planeDefined: 0, planeDistance: 0, lineMeetsPlane: 3 });
  });
});

describe("the model", () => {
  it("clamps every control and keeps outputs finite with no −0", () => {
    let s = model.setVariable(base, "ax", 99, model.defaultParams);
    expect(s.ax).toBe(SPACE3D_COMPONENT_MAX);
    s = model.setVariable(s, "m", 0, model.defaultParams);
    expect(s.m).toBe(1);
    s = model.setVariable(s, "d", -40, model.defaultParams);
    expect(s.d).toBe(-12);
    s = model.setVariable(s, "yaw", 10, model.defaultParams);
    expect(s.yaw).toBeCloseTo(Math.PI, 12);
    const zero = { ...vec("a", [0, 0, 0]), ...vec("b", [0, 0, 0]), ...vec("c", [0, 0, 0]), ...vec("e", [0, 0, 0]), ...vec("n", [0, 0, 0]), d: 0 };
    for (const state of [base, s, { ...base, ...zero }, { ...base, ...vec("a", [-0, -1, 0]) }]) {
      for (const division of ["internal", "external"] as const) {
        const r = model.derive(state, { division });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });

  it("turns the view when played, and leaves the geometry alone", () => {
    const later = model.advance(base, 2, model.defaultParams);
    expect(later.yaw).toBeCloseTo(base.yaw + Math.PI / 4, 12);
    expect(model.derive(later, model.defaultParams).crossMag).toBe(model.derive(base, model.defaultParams).crossMag);
    expect(model.advance({ ...base, yaw: 3 }, 2, model.defaultParams).yaw).toBeLessThan(0);
    expect(model.step(base, model.defaultParams, 1).yaw).toBeCloseTo(Math.PI / 6 + Math.PI / 12, 12);
  });
});
