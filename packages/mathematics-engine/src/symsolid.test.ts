import { describe, expect, it } from "vitest";
import {
  SYMSOLID_ENDLESS,
  SYMSOLID_NET_FACES,
  SYMSOLID_NET_ORDER,
  SYMSOLID_RANGES,
  SYMSOLID_SHAPE_ORDER,
  SYMSOLID_SHAPES,
  SYMSOLID_SOLID_ORDER,
  SYMSOLID_SYMMETRY,
  symSolidFoldNet,
  symSolidInteriorAngles,
  symSolidMesh,
  symSolidModel as model,
  symSolidPolygon,
  type SymSolidParams,
  type SymSolidState,
} from "./symsolid";

const base: SymSolidState = { mirror: 60, turn: 0, sides: 5, pull: 0, baseSides: 4, fold: 0 };
const derive = (params: Partial<SymSolidParams> = {}, state: Partial<SymSolidState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("lines of symmetry", () => {
  it("finds n lines on a regular n-gon, and the known answers for the rest", () => {
    const expected: Record<string, [number, number]> = {
      triangle: [3, 3],
      square: [4, 4],
      pentagon: [5, 5],
      hexagon: [6, 6],
      octagon: [8, 8],
      rectangle: [2, 2],
      rhombus: [2, 2],
      kite: [1, 1],
      parallelogram: [0, 2],
      isosceles: [1, 1],
      scalene: [0, 1],
      A: [1, 1],
      E: [1, 1],
      F: [0, 1],
      H: [2, 2],
      N: [0, 2],
      T: [1, 1],
      X: [2, 2],
      Z: [0, 2],
    };
    for (const [id, [lines, order]] of Object.entries(expected)) {
      expect(SYMSOLID_SYMMETRY[id as keyof typeof SYMSOLID_SYMMETRY], id).toMatchObject({ lines, order });
    }
    expect(SYMSOLID_SYMMETRY.circle).toMatchObject({ lines: SYMSOLID_ENDLESS, order: SYMSOLID_ENDLESS });
  });

  it("puts the lines where they belong", () => {
    expect(SYMSOLID_SYMMETRY.rectangle.axes).toEqual([0, 90]);
    expect(SYMSOLID_SYMMETRY.kite.axes).toEqual([90]);
    expect(SYMSOLID_SYMMETRY.E.axes).toEqual([0]);
    expect(SYMSOLID_SYMMETRY.pentagon.axes).toEqual([18, 54, 90, 126, 162]);
    expect(SYMSOLID_SYMMETRY.octagon.axes).toEqual([0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5]);
    expect(SYMSOLID_SYMMETRY.hexagon.turns).toEqual([0, 60, 120, 180, 240, 300]);
  });

  it("folds the rectangle along its middle lines but not along a diagonal", () => {
    expect(derive({ shape: "rectangle" }, { mirror: 0 }).folds).toBe(1);
    expect(derive({ shape: "rectangle" }, { mirror: 90 }).folds).toBe(1);
    const diagonal = (Math.atan2(1.2, 2) * 180) / Math.PI;
    expect(derive({ shape: "rectangle" }, { mirror: Math.round(diagonal * 2) / 2 }).folds).toBe(0);
    expect(derive({ shape: "rectangle" }, { mirror: 45 }).folds).toBe(0);
    expect(derive({ shape: "square" }, { mirror: 45 }).folds).toBe(1);
    expect(derive({ shape: "circle" }, { mirror: 37 }).folds).toBe(1);
  });

  it("finds turns that are whole multiples of the smallest one", () => {
    for (const id of SYMSOLID_SHAPE_ORDER) {
      if (SYMSOLID_SHAPES[id].kind === "circle") continue;
      const { turns, order } = SYMSOLID_SYMMETRY[id];
      turns.forEach((t, k) => expect(t, id).toBeCloseTo((360 * k) / order, 6));
    }
  });

  it("checks whole strokes, not just their ends", () => {
    // The ends of N's strokes are symmetric about the vertical line, but the slant is not.
    expect(SYMSOLID_SYMMETRY.N.axes).toEqual([]);
    expect(derive({ shape: "N" }, { mirror: 90 }).folds).toBe(0);
    expect(derive({ shape: "A" }, { mirror: 90 }).folds).toBe(1);
  });
});

describe("rotational symmetry", () => {
  it("fits a square at every quarter turn, and counts four fits in a full turn", () => {
    expect([0, 45, 90, 135, 180, 270, 360].map((turn) => derive({ shape: "square" }, { turn }).turnFits)).toEqual([1, 0, 1, 0, 1, 1, 1]);
    expect([0, 89, 90, 200, 270, 360].map((turn) => derive({ shape: "square" }, { turn }).fitsCounted)).toEqual([0, 0, 1, 2, 3, 4]);
  });

  it("gives order 1 to a shape that only fits after a full turn", () => {
    expect(derive({ shape: "kite" }, { turn: 360 })).toMatchObject({ order: 1, fitsCounted: 1, smallestTurn: 360, hasRotational: 0 });
    expect(derive({ shape: "kite" }, { turn: 180 }).turnFits).toBe(0);
    expect(derive({ shape: "N" }, { turn: 180 })).toMatchObject({ order: 2, turnFits: 1, smallestTurn: 180, hasRotational: 1, lines: 0 });
  });

  it("turns a pentagon by 72°", () => {
    expect(derive({ shape: "pentagon" }, { turn: 72 })).toMatchObject({ turnFits: 1, smallestTurn: 72, fitsCounted: 1 });
    expect(derive({ shape: "pentagon" }, { turn: 60 }).turnFits).toBe(0);
  });

  it("steps from one fit to the next", () => {
    const s = model.step({ ...base, turn: 0 }, { ...model.defaultParams, shape: "hexagon" }, 1);
    expect(s.turn).toBe(60);
    expect(model.step({ ...base, turn: 0 }, { ...model.defaultParams, shape: "kite" }, 1).turn).toBe(360);
    expect(model.step({ ...base, turn: 0 }, { ...model.defaultParams, shape: "circle" }, 1).turn).toBe(15);
  });

  it("turns a circle any amount", () => {
    expect(derive({ shape: "circle" }, { turn: 33 })).toMatchObject({ turnFits: 1, fitsCounted: SYMSOLID_ENDLESS, smallestTurn: 0 });
  });
});

describe("polygons", () => {
  it("cuts an n-gon into n − 2 triangles whose angles add to (n − 2) × 180°", () => {
    for (let n = 3; n <= 12; n++) {
      const r = derive({}, { sides: n });
      expect(r.triangles).toBe(n - 2);
      expect(r.angleSum).toBe((n - 2) * 180);
      expect(r.measuredSum).toBeCloseTo(r.angleSum, 9);
      expect(r.eachInterior).toBeCloseTo(r.angleSum / n, 12);
      expect(r.angleA).toBeCloseTo(r.eachInterior, 9);
      expect(r.eachExterior).toBeCloseTo(360 / n, 12);
      expect(r.exteriorSum).toBeCloseTo(360, 9);
    }
    expect(derive({}, { sides: 6 })).toMatchObject({ angleSum: 720, eachInterior: 120, eachExterior: 60 });
    expect(derive({}, { sides: 8 })).toMatchObject({ angleSum: 1080, eachInterior: 135, eachExterior: 45 });
    expect(derive({}, { sides: 9 }).eachExterior).toBe(40);
  });

  it("keeps the sum when corner A is pulled out, and stays convex", () => {
    for (let n = 3; n <= 12; n++) {
      for (const pull of [0.1, 0.2, 0.3]) {
        const r = derive({}, { sides: n, pull });
        expect(r.measuredSum, `${n} ${pull}`).toBeCloseTo((n - 2) * 180, 9);
        expect(r.exteriorSum).toBeCloseTo(360, 9);
        expect(r.isRegular).toBe(0);
        for (const a of symSolidInteriorAngles(symSolidPolygon(n, pull))) expect(a).toBeLessThan(180);
      }
    }
    expect(derive({}, { sides: 6, pull: 0.3 }).angleA).toBeCloseTo(94.54, 2);
  });
});

describe("solids", () => {
  it("counts faces, edges and corners from the built solid", () => {
    expect(derive({ solid: "cube" })).toMatchObject({ faces: 6, edges: 12, vertices: 8, eulerSum: 2, isPolyhedron: 1 });
    expect(derive({ solid: "cuboid" })).toMatchObject({ faces: 6, edges: 12, vertices: 8, eulerSum: 2 });
    for (let n = 3; n <= 8; n++) {
      expect(derive({ solid: "prism" }, { baseSides: n })).toMatchObject({ faces: n + 2, edges: 3 * n, vertices: 2 * n, eulerSum: 2, baseSides: n });
      expect(derive({ solid: "pyramid" }, { baseSides: n })).toMatchObject({ faces: n + 1, edges: 2 * n, vertices: n + 1, eulerSum: 2 });
    }
    expect(derive({ solid: "prism" }, { baseSides: 5 })).toMatchObject({ faces: 7, edges: 15, vertices: 10 });
    expect(derive({ solid: "pyramid" }, { baseSides: 4 })).toMatchObject({ faces: 5, edges: 8, vertices: 5 });
  });

  it("counts the round solids' flat faces and curved surface apart, without Euler's formula", () => {
    expect(derive({ solid: "cylinder" })).toMatchObject({ faces: 2, curved: 1, edges: 2, vertices: 0, isPolyhedron: 0, eulerSum: 0 });
    expect(derive({ solid: "cone" })).toMatchObject({ faces: 1, curved: 1, edges: 1, vertices: 1, isPolyhedron: 0 });
    expect(derive({ solid: "sphere" })).toMatchObject({ faces: 0, curved: 1, edges: 0, vertices: 0, isPolyhedron: 0 });
  });

  it("points every face's normal outwards", () => {
    for (const solid of SYMSOLID_SOLID_ORDER) {
      const mesh = symSolidMesh(solid, 5);
      if (!mesh) continue;
      mesh.faces.forEach((face, i) => {
        const n = mesh.normals[i]!;
        // All corners lie on the face's own side of the plane.
        const p = mesh.vertices[face[0]!]!;
        for (const v of mesh.vertices) expect((v[0] - p[0]) * n[0] + (v[1] - p[1]) * n[1] + (v[2] - p[2]) * n[2]).toBeLessThanOrEqual(1e-9);
      });
    }
  });

  it("gives the top, front and side views", () => {
    expect(derive({ solid: "cube" })).toMatchObject({ topView: 4, frontView: 4, sideView: 4 });
    expect(derive({ solid: "cylinder" })).toMatchObject({ topView: 0, frontView: 40, sideView: 40 });
    expect(derive({ solid: "cone" })).toMatchObject({ topView: 0, frontView: 3, sideView: 3 });
    expect(derive({ solid: "pyramid" }, { baseSides: 4 })).toMatchObject({ topView: 4, frontView: 3 });
    expect(derive({ solid: "prism" }, { baseSides: 3 })).toMatchObject({ topView: 3, frontView: 40 });
    expect(derive({ solid: "sphere" })).toMatchObject({ topView: 0, frontView: 0, sideView: 0 });
  });
});

describe("nets of a cube", () => {
  it("closes the six good nets into a cube and not the others", () => {
    expect(Object.fromEntries(SYMSOLID_NET_ORDER.map((id) => [id, SYMSOLID_NET_FACES[id]]))).toEqual({
      cross: 6,
      ell: 6,
      zigzag: 6,
      "two-three-one": 6,
      stairs: 6,
      "three-three": 6,
      "row-of-six": 4,
      "five-and-one": 5,
      "u-shape": 5,
      block: 4,
    });
    expect(derive({ net: "cross" }).netFolds).toBe(1);
    expect(derive({ net: "block" }).netFolds).toBe(0);
  });

  it("folds into a unit cube: every corner on a corner of the cube", () => {
    const corners = symSolidFoldNet("cross", 1).flatMap((sq) => sq.corners);
    for (const p of corners) for (const x of p) expect(Math.abs(x - Math.round(x))).toBeLessThan(1e-9);
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const zs = corners.map((p) => p[2]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 9);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(1, 9);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(1, 9);
    // It folds away from the viewer.
    expect(Math.min(...ys)).toBeCloseTo(0, 9);
  });

  it("lies flat before folding, with the squares where the net puts them", () => {
    for (const id of SYMSOLID_NET_ORDER) {
      for (const sq of symSolidFoldNet(id, 0)) {
        expect(sq.corners.every((p) => Math.abs(p[1]) < 1e-12), id).toBe(true);
        expect(sq.corners[3][0]).toBeCloseTo(sq.cell[0], 12);
        expect(sq.corners[3][2]).toBeCloseTo(-sq.cell[1], 12);
      }
    }
  });
});

describe("the model", () => {
  it("clamps every control and numbers every output", () => {
    for (const [key, [lo, hi]] of Object.entries(SYMSOLID_RANGES)) {
      expect(model.setVariable(base, key, hi + 100, model.defaultParams)[key as keyof SymSolidState]).toBe(hi);
      expect(model.setVariable(base, key, lo - 100, model.defaultParams)[key as keyof SymSolidState]).toBe(lo);
    }
    for (const shape of SYMSOLID_SHAPE_ORDER) {
      for (const solid of SYMSOLID_SOLID_ORDER) {
        const r = model.derive({ mirror: 999, turn: -5, sides: 40, pull: 9, baseSides: 1, fold: 3 }, { shape, solid, net: "u-shape" });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${shape} ${solid} ${key}`).toBe(true);
      }
    }
  });

  it("turns and folds on play, and stops at a full turn and a full fold", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.turn).toBe(360);
    expect(s.fold).toBe(1);
  });
});
