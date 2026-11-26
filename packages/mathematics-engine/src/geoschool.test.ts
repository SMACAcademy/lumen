import { describe, expect, it } from "vitest";
import {
  GEOSCHOOL_RANGES,
  GEOSCHOOL_RULE_ORDER,
  geoSchoolAngleKind,
  geoSchoolBuild,
  geoSchoolModel as model,
  type GeoSchoolParams,
  type GeoSchoolState,
} from "./geoschool";

const base = model.initialize(model.defaultParams);
const derive = (state: Partial<GeoSchoolState> = {}, params: Partial<GeoSchoolParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const RAD = Math.PI / 180;
const angleBetween = (u: readonly [number, number], v: readonly [number, number]) =>
  Math.acos((u[0] * v[0] + u[1] * v[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(v[0], v[1]))) / RAD;

describe("turning an arm", () => {
  it("names each kind of angle", () => {
    const kinds = [0, 45, 90, 135, 180, 270, 360].map((turn) => derive({ turn }).turnKind);
    expect(kinds).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect([89, 91, 179, 181, 359].map(geoSchoolAngleKind)).toEqual([1, 3, 3, 5, 5]);
  });

  it("gives the rest of the full turn", () => {
    expect(derive({ turn: 135 })).toMatchObject({ turn: 135, turnRest: 225 });
    expect(derive({ turn: 300 }).turnRest).toBe(60);
  });

  it("turns the arm (and walks P) on Play, round and round", () => {
    const later = model.advance({ ...base, turn: 350, pointP: 350 }, 1, model.defaultParams);
    expect(later.turn).toBeCloseTo(20, 9);
    expect(later.pointP).toBeCloseTo(20, 9);
    expect(model.step({ ...base, turn: 40 }, model.defaultParams, 1).turn).toBe(60);
  });
});

describe("two crossing lines", () => {
  it("makes a linear pair add to 180° and keeps opposite angles equal", () => {
    expect(derive({ cross: 50 })).toMatchObject({ supplement: 130, opposite: 50, complement: 40, hasComplement: 1 });
    expect(derive({ cross: 120 })).toMatchObject({ supplement: 60, opposite: 120, complement: 0, hasComplement: 0 });
  });
});

describe("parallel lines and a transversal", () => {
  it("makes corresponding and alternate angles equal, and co-interior ones add to 180°, when parallel", () => {
    expect(derive({ cut: 60, tilt: 0 })).toMatchObject({ corrTop: 60, corrBottom: 60, altTop: 120, altBottom: 120, coInteriorSum: 180, isParallel: 1 });
  });

  it("breaks all three when the lower line is tilted", () => {
    expect(derive({ cut: 60, tilt: 12 })).toMatchObject({ corrTop: 60, corrBottom: 48, altTop: 120, altBottom: 132, coInteriorSum: 168, isParallel: 0 });
    expect(derive({ cut: 70, tilt: -10 })).toMatchObject({ corrBottom: 80, coInteriorSum: 190 });
  });

  it("agrees with the angles measured off the drawing", () => {
    for (const [cut, tilt] of [[60, 12], [110, -20], [45, 30]] as const) {
      const r = derive({ cut, tilt });
      const up: [number, number] = [Math.cos(cut * RAD), Math.sin(cut * RAD)];
      const line2: [number, number] = [Math.cos(tilt * RAD), Math.sin(tilt * RAD)];
      // ∠5: line 2 forwards to the transversal upwards. ∠6: transversal upwards to line 2 backwards.
      expect(angleBetween(line2, up)).toBeCloseTo(r.corrBottom, 9);
      expect(angleBetween(up, [-line2[0], -line2[1]])).toBeCloseTo(r.altBottom, 9);
    }
  });
});

describe("the angles of a triangle", () => {
  it("measures the third angle off the drawing, and the three make 180°", () => {
    expect(derive({ angleA: 50, angleB: 60 })).toMatchObject({ triA: 50, triB: 60, triC: 70, triSum: 180, triKind: 1 });
    expect(derive({ angleA: 30, angleB: 60 })).toMatchObject({ triC: 90, triKind: 2 });
    expect(derive({ angleA: 100, angleB: 30 })).toMatchObject({ triC: 50, triKind: 3 });
    for (let A = 10; A <= 150; A += 20) for (let B = 10; B <= 170 - A; B += 20) expect(derive({ angleA: A, angleB: B }).triSum).toBe(180);
  });

  it("puts the apex of an equilateral triangle at (3, 3√3)", () => {
    const r = derive({ angleA: 60, angleB: 60 });
    expect(r.apexX).toBeCloseTo(3, 9);
    expect(r.apexY).toBeCloseTo(3 * Math.sqrt(3), 9);
    expect(r.triC).toBe(60);
  });

  it("makes the exterior angle the sum of the two opposite interior angles", () => {
    expect(derive({ angleA: 50, angleB: 60 })).toMatchObject({ exterior: 120, oppositeSum: 120 });
    expect(derive({ angleA: 45, angleB: 75 })).toMatchObject({ triC: 60, exterior: 105, oppositeSum: 105 });
  });

  it("keeps at least 10° for C", () => {
    expect(derive({ angleA: 150, angleB: 100 })).toMatchObject({ triA: 150, triB: 20, triC: 10 });
  });
});

describe("building a triangle from parts", () => {
  it("closes three sticks only when the two shorter beat the longest", () => {
    expect(derive({ sideP: 3, sideQ: 4, sideR: 5 })).toMatchObject({ triangles: 1, closes: 1, longest: 5, otherTwo: 7, builtXY: 5, builtXZ: 4, builtYZ: 3 });
    expect(derive({ sideP: 3, sideQ: 4, sideR: 8 })).toMatchObject({ triangles: 0, closes: 0, flat: 0, longest: 8, otherTwo: 7, builtXY: 0 });
    expect(derive({ sideP: 1, sideQ: 2, sideR: 3 })).toMatchObject({ triangles: 0, closes: 0, flat: 1 });
    expect(derive({ sideP: 8, sideQ: 3, sideR: 4 }).closes).toBe(0);
  });

  it("builds SAS, ASA and RHS triangles", () => {
    const sas = derive({ sideP: 5, sideQ: 5, angleA: 60 }, { rule: "sas" });
    expect(sas.triangles).toBe(1);
    expect(sas.builtYZ).toBeCloseTo(5, 9);
    const asa = derive({ sideP: 6, angleA: 50, angleB: 60 }, { rule: "asa" });
    expect([asa.buildZX, asa.buildZY]).toEqual([derive({ angleA: 50, angleB: 60 }).apexX, derive({ angleA: 50, angleB: 60 }).apexY]);
    expect(derive({ sideP: 6, sideQ: 10 }, { rule: "rhs" })).toMatchObject({ triangles: 1, builtXY: 6, builtYZ: 8, builtXZ: 10 });
    expect(derive({ sideP: 6, sideQ: 5 }, { rule: "rhs" }).triangles).toBe(0);
  });

  it("finds two different triangles for SSA 8, 6 and 40°", () => {
    const r = derive({ sideP: 8, sideQ: 6, angleA: 40 }, { rule: "ssa" });
    expect(r.triangles).toBe(2);
    expect(r.buildZX).toBeCloseTo(6.1284, 4);
    expect(r.buildZY).toBeCloseTo(5.1423, 4);
    expect(r.buildYX).toBeCloseTo(9.2198, 4);
    expect(r.buildY2X).toBeCloseTo(3.037, 3);
    // Both have XZ = 8, YZ = 6 and 40° at X — and yet they differ.
    for (const yx of [r.buildYX, r.buildY2X]) {
      expect(Math.hypot(r.buildZX - yx, r.buildZY)).toBeCloseTo(6, 8);
      expect(angleBetween([1, 0], [r.buildZX, r.buildZY])).toBeCloseTo(40, 6);
    }
    expect(derive({ sideP: 8, sideQ: 5, angleA: 40 }, { rule: "ssa" }).triangles).toBe(0);
    expect(derive({ sideP: 8, sideQ: 8, angleA: 40 }, { rule: "ssa" }).triangles).toBe(1);
    expect(derive({ sideP: 4, sideQ: 6, angleA: 120 }, { rule: "ssa" }).triangles).toBe(1);
  });

  it("knows which rules always fix the triangle", () => {
    const fixes = GEOSCHOOL_RULE_ORDER.map((rule) => derive({}, { rule }).ruleFixes);
    expect(fixes).toEqual([1, 1, 1, 1, 0, 0]);
    expect(derive({}, { rule: "aaa" }).triangles).toBe(3);
    expect(geoSchoolBuild("sss", 2, 3, 4, 50, 60).count).toBe(1);
  });
});

describe("quadrilaterals", () => {
  it("gives a parallelogram equal opposite angles and diagonals that bisect each other", () => {
    const r = derive({ quadBase: 6, quadSide: 4, quadAngle: 60, quadShift: 0 });
    expect(r).toMatchObject({ qA: 60, qB: 120, qC: 60, qD: 120, qSum: 360, bisect: 1, oppositeEqual: 1, isParallelogram: 1, sideCD: 6 });
    expect(r.sideBC).toBeCloseTo(4, 9);
    // AC = √76, BD = √28.
    expect(r.ao).toBeCloseTo(Math.sqrt(76) / 2, 9);
    expect(r.oc).toBeCloseTo(Math.sqrt(76) / 2, 9);
    expect(r.bo).toBeCloseTo(Math.sqrt(28) / 2, 9);
  });

  it("still adds to 360° when the top slides, but loses the rest", () => {
    const r = derive({ quadBase: 6, quadSide: 4, quadAngle: 60, quadShift: 2 });
    expect(r.qSum).toBe(360);
    expect(r.qB).toBeCloseTo(180 - Math.atan2(2 * Math.sqrt(3), 4) / RAD, 9);
    expect(r.qB).toBeCloseTo(139.1, 1);
    expect(r).toMatchObject({ qA: 60, qD: 120, bisect: 0, oppositeEqual: 0, isParallelogram: 0 });
  });
});

describe("angles in a circle", () => {
  it("makes the angle at the circumference half the angle at the centre", () => {
    expect(derive({ arc: 100, pointP: 90 })).toMatchObject({ angleP: 50, pSide: 1, centreForP: 100, twiceP: 100 });
    expect(derive({ arc: 120, pointP: 90 }).angleP).toBe(60);
  });

  it("keeps angles in the same segment equal", () => {
    for (const pointP of [0, 60, 120, 200]) expect(derive({ arc: 100, pointP }).angleP, `P at ${pointP}`).toBe(50);
  });

  it("uses the reflex angle at the centre for P on the minor arc, and makes a cyclic quadrilateral's opposite angles add to 180°", () => {
    const r = derive({ arc: 100, pointP: 90, pointQ: 270 });
    expect(r).toMatchObject({ angleQ: 130, qSide: 2, oppositeArcs: 1, sameSegment: 0, cyclicSum: 180 });
    expect(derive({ arc: 100, pointP: 270 })).toMatchObject({ angleP: 130, centreForP: 260, twiceP: 260 });
  });

  it("makes the angle in a semicircle a right angle", () => {
    for (const pointP of [10, 90, 150, 300]) expect(derive({ arc: 180, pointP }).angleP).toBe(90);
    expect(derive({ arc: 180 }).semicircle).toBe(1);
  });

  it("has no angle when P sits on A or B", () => {
    expect(derive({ arc: 100, pointP: 220 })).toMatchObject({ pSide: 0, angleP: 0 });
  });

  it("splits clock positions for an 80° chord into 40° and 140°", () => {
    const at = (pointP: number) => derive({ arc: 80, pointP }).angleP;
    expect([90, 0, 180, 210, 120, 330].map(at)).toEqual([40, 40, 40, 40, 40, 40]);
    expect([270, 300, 240].map(at)).toEqual([140, 140, 140]);
  });
});

describe("the model's contract", () => {
  it("clamps every variable to its range", () => {
    for (const [key, [lo, hi]] of Object.entries(GEOSCHOOL_RANGES)) {
      expect(model.setVariable(base, key, hi + 100, model.defaultParams)[key as keyof GeoSchoolState]).toBe(hi);
      expect(model.setVariable(base, key, lo - 100, model.defaultParams)[key as keyof GeoSchoolState]).toBe(lo);
    }
    expect(model.setVariable(base, "nonsense", 3, model.defaultParams)).toBe(base);
  });

  it("gives only finite numbers, never −0", () => {
    const states: Partial<GeoSchoolState>[] = [{}, { turn: 0, tilt: 0, quadShift: -2, arc: 20, pointP: 270 }, { angleA: 150, angleB: 150, arc: 180, pointP: 0 }];
    for (const rule of GEOSCHOOL_RULE_ORDER) {
      for (const s of states) {
        const r = derive(s, { rule });
        for (const key of model.outputs) {
          const v = r[key];
          expect(Number.isFinite(v), `${rule} ${key}`).toBe(true);
          expect(Object.is(v, -0), `${rule} ${key}`).toBe(false);
        }
      }
    }
  });
});
