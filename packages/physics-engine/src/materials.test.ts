import { describe, expect, it } from "vitest";
import { areaOf, MATERIALS, materialsModel as model, strainAt, yieldStrain } from "./materials";

const P = model.defaultParams;
const derive = (load: number, over: Partial<typeof P> = {}) => model.derive({ load }, { ...P, ...over });

describe("the wire itself", () => {
  it("area comes from the diameter, and quadruples when it doubles", () => {
    expect(areaOf({ ...P, diameter: 1 })).toBeCloseTo(Math.PI * 0.0005 ** 2, 15);
    expect(areaOf({ ...P, diameter: 2 })).toBeCloseTo(4 * areaOf({ ...P, diameter: 1 }), 15);
  });

  it("a thicker wire carries the same load at less stress", () => {
    expect(derive(100, { diameter: 2 }).stress).toBeCloseTo(derive(100, { diameter: 1 }).stress / 4, 3);
  });

  it("a longer wire stretches further for the same strain", () => {
    expect(derive(100, { length: 4 }).extension).toBeCloseTo(2 * derive(100, { length: 2 }).extension, 9);
    expect(derive(100, { length: 4 }).strain).toBeCloseTo(derive(100, { length: 2 }).strain, 12);
  });
});

describe("Hooke's law, while it holds", () => {
  it("extension is proportional to load below the yield point", () => {
    const one = derive(50);
    const two = derive(100);
    expect(one.elastic).toBe(1);
    expect(two.elastic).toBe(1);
    expect(two.extension).toBeCloseTo(2 * one.extension, 9);
  });

  it("stress over strain is Young's modulus, and matches the material", () => {
    const r = derive(100);
    expect(r.stress / r.strain).toBeCloseTo(MATERIALS.steel.youngsModulus, 0);
    expect(r.measuredModulus).toBeCloseTo(r.youngsModulus, 0);
  });

  it("a stiffer material stretches less under the same load", () => {
    expect(derive(50, { material: "steel" }).extension).toBeLessThan(derive(50, { material: "copper" }).extension);
    expect(derive(50, { material: "copper" }).extension).toBeLessThan(derive(50, { material: "nylon" }).extension);
  });

  it("energy stored is ½ × load × extension while it is elastic", () => {
    const r = derive(120);
    expect(r.elastic).toBe(1);
    expect(r.energyStored).toBeCloseTo(0.5 * r.load * (r.extension / 1000), 9);
  });
});

describe("past the elastic limit", () => {
  it("yielding shows up as a sudden run of extension for little more load", () => {
    const yieldLoad = derive(0).yieldLoad;
    const just = derive(yieldLoad * 0.99);
    const past = derive(yieldLoad * 1.1);
    expect(just.elastic).toBe(1);
    expect(past.plastic).toBe(1);
    // A tenth more load, but far more than a tenth more stretch.
    expect(past.extension / just.extension).toBeGreaterThan(2);
  });

  it("stress over strain is no longer Young's modulus once it has yielded", () => {
    const past = derive(derive(0).yieldLoad * 1.2);
    expect(past.measuredModulus).toBeLessThan(past.youngsModulus);
  });

  it("the wire breaks past the breaking load, and reports the break", () => {
    const breaking = derive(0).breakingLoad;
    expect(derive(breaking * 0.99).broken).toBe(0);
    const gone = derive(breaking * 1.05);
    expect(gone.broken).toBe(1);
    expect(gone.elastic).toBe(0);
    expect(gone.plastic).toBe(0);
    // It parted at its breaking stress: nothing beyond that is carried.
    expect(gone.stress).toBeGreaterThan(gone.ultimateStress);
    expect(gone.strain).toBeCloseTo(MATERIALS.steel.breakStrain, 9);
  });

  it("brittle glass is elastic right up to the break, with no plastic stretch", () => {
    const breaking = derive(0, { material: "glass" }).breakingLoad;
    expect(derive(breaking * 0.99, { material: "glass" }).elastic).toBe(1);
    expect(derive(breaking * 1.01, { material: "glass" }).broken).toBe(1);
    // It never yields: the whole curve is the straight line.
    for (const load of [10, 20, 30]) {
      const r = derive(load, { material: "glass" });
      expect(r.plastic).toBe(0);
      expect(r.measuredModulus).toBeCloseTo(r.youngsModulus, 0);
    }
  });

  it("a ductile wire stretches much further before it goes than a brittle one", () => {
    const at = (material: "copper" | "glass") => {
      const r = derive(0, { material });
      return derive(r.breakingLoad, { material }).strainPercent;
    };
    expect(at("copper")).toBeGreaterThan(20);
    expect(at("glass")).toBeLessThan(0.2);
  });
});

describe("the curve itself", () => {
  it("strain rises with stress and never runs past the breaking strain", () => {
    for (const id of ["steel", "copper", "nylon", "glass", "aluminium"] as const) {
      const m = MATERIALS[id];
      let last = -1;
      for (const fraction of [0, 0.3, 0.7, 1, 1.5]) {
        const strain = strainAt(m, m.ultimateStress * fraction);
        expect(strain).toBeGreaterThanOrEqual(last);
        expect(strain).toBeLessThanOrEqual(m.breakStrain + 1e-12);
        last = strain;
      }
      // The curve passes through both named points.
      expect(strainAt(m, m.yieldStress)).toBeCloseTo(yieldStrain(m), 12);
      expect(strainAt(m, m.ultimateStress)).toBeCloseTo(m.breakStrain, 12);
    }
  });
});

describe("the run", () => {
  it("play hangs weight on until the wire has had enough", () => {
    let state = model.initialize(P);
    for (let i = 0; i < 200; i++) state = model.advance(state, 0.1, P);
    expect(model.derive(state, P).broken).toBe(1);
  });

  it("stepping moves in tenths of the breaking load, and stops at nothing", () => {
    const breaking = derive(0).breakingLoad;
    expect(model.step({ load: 0 }, P, 1).load).toBeCloseTo(breaking / 10, 6);
    expect(model.step({ load: 0 }, P, -1).load).toBe(0);
  });

  it("the load can be set by hand, within the lab's limits", () => {
    expect(model.setVariable({ load: 0 }, "load", 150, P).load).toBe(150);
    expect(model.setVariable({ load: 0 }, "load", -5, P).load).toBe(0);
    expect(model.setVariable({ load: 0 }, "load", 9999, P).load).toBe(600);
  });
});
