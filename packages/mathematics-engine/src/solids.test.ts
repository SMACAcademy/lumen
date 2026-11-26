import { describe, expect, it } from "vitest";
import { SIMILAR_FIGURE_ORDER, SOLID_ORDER, solidsModel as model, type SolidsParams, type SolidsState } from "./solids";

const base: SolidsState = model.initialize(model.defaultParams);
const derive = (params: Partial<SolidsParams> = {}, state: Partial<SolidsState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const deg = (rad: number) => (rad * 180) / Math.PI;

describe("the wheel", () => {
  it("rolls 2πr in one turn: 44 cm for a 7 cm radius with π = 22/7", () => {
    expect(derive({ solid: "wheel" }, { r: 7 }).circumference).toBeCloseTo(44, 10);
    expect(derive({ solid: "wheel" }, { r: 3.5 }).circumference).toBeCloseTo(22, 10);
    expect(derive({ solid: "wheel" }, { r: 7, turns: 1 }).rolled).toBeCloseTo(44, 10);
    expect(derive({ solid: "wheel" }, { r: 7, turns: 2 }).rolled).toBeCloseTo(88, 10);
  });

  it("makes circumference ÷ diameter the π in use, whatever the size", () => {
    const r = derive({ solid: "wheel", pi: "3.14" }, { r: 5 });
    expect(r.circumference).toBeCloseTo(31.4, 10);
    expect(r.diameter).toBe(10);
    for (const radius of [1, 5, 12.5]) expect(derive({ pi: "3.14" }, { r: radius }).ratio).toBeCloseTo(3.14, 12);
    expect(derive({ pi: "22/7" }, { r: 7 }).ratio).toBeCloseTo(22 / 7, 12);
    expect(derive({ pi: "22/7" }).piChoice).toBe(0);
    expect(derive({ pi: "3.14" }).piChoice).toBe(1);
  });

  it("rolls on with play and stops after two turns", () => {
    let s = { ...base, turns: 0 };
    for (let i = 0; i < 20; i++) s = model.advance(s, 0.1, { ...model.defaultParams, solid: "wheel" });
    expect(s.turns).toBeCloseTo(1, 10);
    for (let i = 0; i < 100; i++) s = model.advance(s, 0.1, { ...model.defaultParams, solid: "wheel" });
    expect(s.turns).toBe(2);
  });
});

describe("the cylinder", () => {
  it("unrolls into a 44 × 10 rectangle: curved surface 440 cm², total 748 cm², volume 1540 cm³", () => {
    const r = derive({ solid: "cylinder" }, { r: 7, h: 10 });
    expect(r.csa).toBeCloseTo(440, 10);
    expect(r.tsa).toBeCloseTo(748, 10);
    expect(r.volume).toBeCloseTo(1540, 10);
    expect(r.baseArea).toBeCloseTo(154, 10);
  });

  it("holds four times as much when the radius doubles", () => {
    expect(derive({ solid: "cylinder" }, { r: 14, h: 10 }).volume).toBeCloseTo(6160, 10);
  });

  it("unrolls its label with play", () => {
    let s = { ...base, open: 0 };
    for (let i = 0; i < 30; i++) s = model.advance(s, 0.1, { ...model.defaultParams, solid: "cylinder" });
    expect(s.open).toBe(1);
  });
});

describe("the cone", () => {
  it("is a third of its cylinder: 154 cm³ for r = 3.5, h = 12, slant 12.5", () => {
    const r = derive({ solid: "cone" }, { r: 3.5, h: 12 });
    expect(r.volume).toBeCloseTo(154, 10);
    expect(r.coneVolume).toBeCloseTo(154, 10);
    expect(r.cylinderVolume).toBeCloseTo(462, 10);
    expect(r.slant).toBeCloseTo(12.5, 12);
    expect(r.csa).toBeCloseTo(137.5, 10);
    expect(r.tsa).toBeCloseTo(176, 10);
  });

  it("has slant 10 and curved surface 188.4 cm² for r = 6, h = 8 with π = 3.14", () => {
    const r = derive({ solid: "cone", pi: "3.14" }, { r: 6, h: 8 });
    expect(r.slant).toBeCloseTo(10, 12);
    expect(r.csa).toBeCloseTo(188.4, 10);
  });

  it("fills the cylinder with exactly three cones of water", () => {
    let s = { ...base, pours: 0 };
    const cone = { ...model.defaultParams, solid: "cone" as const };
    for (let i = 0; i < 40; i++) s = model.advance(s, 0.1, cone);
    expect(model.derive(s, cone).pours).toBeCloseTo(2, 10);
    expect(model.derive(s, cone).full).toBe(0);
    for (let i = 0; i < 40; i++) s = model.advance(s, 0.1, cone);
    expect(model.derive(s, cone)).toMatchObject({ pours: 3, fill: 1, full: 1 });
    expect(model.step({ ...base, pours: 1.4 }, cone, 1).pours).toBe(2);
  });
});

describe("the sphere and hemisphere", () => {
  it("has surface 4πr² = 616 cm² and volume 4/3 πr³ = 1437.33 cm³ for r = 7", () => {
    const r = derive({ solid: "sphere" }, { r: 7 });
    expect(r.tsa).toBeCloseTo(616, 10);
    expect(r.volume).toBeCloseTo(4312 / 3, 10);
  });

  it("holds eight times as much when the radius doubles", () => {
    expect(derive({ solid: "sphere" }, { r: 3.5 }).volume).toBeCloseTo(539 / 3, 10);
    expect(derive({ solid: "sphere" }, { r: 7 }).volume / derive({ solid: "sphere" }, { r: 3.5 }).volume).toBeCloseTo(8, 12);
  });

  it("gives a hemisphere a 308 cm² dome, 462 cm² in all with its flat face, for r = 7", () => {
    const r = derive({ solid: "hemisphere" }, { r: 7 });
    expect(r.csa).toBeCloseTo(308, 10);
    expect(r.tsa).toBeCloseTo(462, 10);
    expect(r.volume).toBeCloseTo(2156 / 3, 10);
  });
});

describe("combined solids", () => {
  it("covers NCERT's capsule (5 across, 14 long) with 220 units²", () => {
    const r = derive({ solid: "capsule" }, { r: 2.5, h: 9 });
    expect(r.tsa).toBeCloseTo(220, 10);
    expect(r.partA).toBeCloseTo(1237.5 / 7, 10);
    expect(r.partB).toBeCloseTo(1375 / 21, 10);
    expect(r.volume).toBeCloseTo(5087.5 / 21, 10);
  });

  it("uses 44 m² of canvas for NCERT's tent: r = 2, h = 2.1, slant 2.8", () => {
    const r = derive({ solid: "tent" }, { r: 2, h: 2.1, top: Math.sqrt(3.84) });
    expect(r.slant).toBeCloseTo(2.8, 12);
    expect(r.tsa).toBeCloseTo(44, 10);
  });

  it("gives NCERT's toy (cone on a hemisphere, r = 3.5, cone 12 tall) 214.5 cm²", () => {
    const r = derive({ solid: "icecream" }, { r: 3.5, h: 12 });
    expect(r.tsa).toBeCloseTo(214.5, 10);
    expect(r.volume).toBeCloseTo(154 + 539 / 6, 10);
    // A cone of height and radius 1 on a hemisphere of radius 1 holds π cm³.
    expect(derive({ solid: "icecream" }, { r: 1, h: 1 }).volume).toBeCloseTo(22 / 7, 12);
  });
});

describe("the area of a circle", () => {
  it("lays its sectors into a shape πr long and r tall: 22 × 7 = 154 cm² for r = 7 with π = 22/7", () => {
    const r = derive({ solid: "circle" }, { r: 7, sectors: 8 });
    expect(r.halfCircumference).toBeCloseTo(22, 10);
    expect(r.halfCircumference * r.r).toBeCloseTo(r.baseArea, 10);
    expect(r.baseArea).toBeCloseTo(154, 10);
    expect(r.circumference).toBeCloseTo(44, 10);
    expect(r).toMatchObject({ sectors: 8, csa: 0, tsa: 0, volume: 0 });
    expect(derive({ solid: "circle" }, { r: 14 }).baseArea).toBeCloseTo(616, 10);
    expect(derive({ solid: "circle", pi: "3.14" }, { r: 10 }).baseArea).toBeCloseTo(314, 10);
  });

  it("gets nearer a rectangle as the sectors get thinner", () => {
    const eight = derive({ solid: "circle" }, { r: 7, sectors: 8 }).scallop;
    const thirtyTwo = derive({ solid: "circle" }, { r: 7, sectors: 32 }).scallop;
    expect(eight).toBeCloseTo(7 * (1 - Math.cos(Math.PI / 8)), 12);
    expect(eight).toBeCloseTo(0.533, 3);
    expect(thirtyTwo).toBeCloseTo(0.0337, 4);
    expect(thirtyTwo).toBeLessThan(eight);
  });

  it("keeps the sectors even and in range, and lays them out with play", () => {
    expect(model.setVariable(base, "sectors", 9, model.defaultParams).sectors).toBe(10);
    expect(model.setVariable(base, "sectors", 2, model.defaultParams).sectors).toBe(4);
    expect(model.setVariable(base, "sectors", 99, model.defaultParams).sectors).toBe(32);
    expect(derive({ solid: "circle" }, { sectors: 13 }).sectors).toBe(14);
    let s = { ...base, cut: 0 };
    const circle = { ...model.defaultParams, solid: "circle" as const };
    for (let i = 0; i < 30; i++) s = model.advance(s, 0.1, circle);
    expect(s.cut).toBe(1);
    expect(model.step({ ...base, cut: 0.5 }, circle, -1).cut).toBe(0.25);
  });
});

describe("similar triangles", () => {
  it("doubles every side and keeps every angle when k = 2", () => {
    const r = derive({ figure: "copy" }, { k: 2, stretch: 1 });
    expect(r).toMatchObject({ pq: 8, qr: 12, rp: 10, ratioPQ: 2, ratioQR: 2, ratioRP: 2, similar: 1, perimeterABC: 15, perimeterPQR: 30 });
    expect(r.angleP).toBeCloseTo(r.angleA, 12);
    expect(r.angleQ).toBeCloseTo(r.angleB, 12);
    expect(r.angleR).toBeCloseTo(r.angleC, 12);
    expect(deg(r.angleA)).toBeCloseTo(82.82, 2);
    expect(deg(r.angleB)).toBeCloseTo(55.77, 2);
    expect(deg(r.angleC)).toBeCloseTo(41.41, 2);
    expect(deg(r.angleA + r.angleB + r.angleC)).toBeCloseTo(180, 10);
  });

  it("stops being similar when one side alone is stretched", () => {
    const r = derive({ figure: "copy" }, { k: 2, stretch: 1.2 });
    expect(r.similar).toBe(0);
    expect(r.qr).toBeCloseTo(14.4, 12);
    expect(Math.abs(r.angleP - r.angleA)).toBeGreaterThan(0.05);
    expect(deg(r.angleP + r.angleQ + r.angleR)).toBeCloseTo(180, 10);
  });
});

describe("the basic proportionality theorem", () => {
  it("makes DE parallel to BC exactly when AD/DB = AE/EC", () => {
    const r = derive({ figure: "bpt" }, { ad: 2, ae: 3 });
    expect(r).toMatchObject({ ad: 2, db: 4, ae: 3, ec: 6, ratioD: 0.5, ratioE: 0.5, parallel: 1 });
    // A parallel DE is the same fraction of BC as AD is of AB: 8 × 2/6.
    expect(r.de).toBeCloseTo(8 / 3, 12);
    expect(derive({ figure: "bpt" }, { ad: 4, ae: 6 })).toMatchObject({ ec: 3, ratioD: 2, ratioE: 2, parallel: 1 });
    const off = derive({ figure: "bpt" }, { ad: 2, ae: 5 });
    expect(off.parallel).toBe(0);
    expect(off.ratioE).toBeCloseTo(1.25, 12);
  });
});

describe("shadows", () => {
  it("makes the tower 42 m when a 6 m pole casts 4 m and the tower 28 m", () => {
    const r = derive({ figure: "shadow" }, { pole: 6, poleShadow: 4, towerShadow: 28 });
    expect(r.tower).toBeCloseTo(42, 12);
    expect(r.sunAngle).toBeCloseTo(Math.atan(1.5), 12);
  });
});

describe("the distance formula", () => {
  it("finds 5 from (1, 2) to (4, 6) and 10 from (−3, −2) to (3, 6)", () => {
    expect(derive({ figure: "distance" }, { x1: 1, y1: 2, x2: 4, y2: 6 })).toMatchObject({ runX: 3, runY: 4, distance: 5 });
    expect(derive({ figure: "distance" }, { x1: -3, y1: -2, x2: 3, y2: 6 })).toMatchObject({ runX: 6, runY: 8, distance: 10 });
  });

  it("snaps grid points to whole numbers, never −0", () => {
    const s = model.setVariable(base, "x1", -0.3, model.defaultParams);
    expect(Object.is(s.x1, -0)).toBe(false);
    expect(model.setVariable(base, "y2", 2.6, model.defaultParams).y2).toBe(3);
  });
});

describe("the model", () => {
  it("clamps every control to its range", () => {
    expect(model.setVariable(base, "r", 99, model.defaultParams).r).toBe(21);
    expect(model.setVariable(base, "k", 0, model.defaultParams).k).toBe(0.5);
    expect(model.setVariable(base, "ad", 6, model.defaultParams).ad).toBe(5.5);
    expect(model.setVariable(base, "nonsense", 1, model.defaultParams)).toBe(base);
  });

  it("gives a finite number for every output of every scene, even from wild state", () => {
    const wild: SolidsState = { r: 1e9, h: -5, top: NaN, turns: 9, open: -1, pours: 99, k: 0, stretch: 9, ad: 99, ae: -9, pole: 0, poleShadow: 0, towerShadow: 1e6, x1: 99, y1: -99, x2: NaN, y2: 0, sectors: NaN, cut: 9 };
    for (const solid of SOLID_ORDER) {
      for (const figure of SIMILAR_FIGURE_ORDER) {
        for (const state of [base, wild]) {
          const r = model.derive(state, { solid, figure, pi: "3.14" });
          for (const key of model.outputs) {
            expect(typeof r[key], `${solid} ${figure} ${key}`).toBe("number");
            expect(Number.isFinite(r[key]), `${solid} ${figure} ${key}`).toBe(true);
            expect(Object.is(r[key], -0), `${solid} ${figure} ${key} is −0`).toBe(false);
          }
        }
      }
    }
  });
});
