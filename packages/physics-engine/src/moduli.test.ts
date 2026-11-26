import { describe, expect, it } from "vitest";
import { MODULI_MATERIAL_ORDER, moduliCompression, moduliModel as model, type ModuliParams, type ModuliState } from "./moduli";

const P = model.defaultParams;
const zero: ModuliState = { pressure: 0, shearForce: 0, tension: 0 };
const derive = (state: Partial<ModuliState> = {}, over: Partial<ModuliParams> = {}) => model.derive({ ...zero, ...state }, { ...P, ...over });

describe("squeezing from every side: the bulk modulus", () => {
  it("uses NCERT's bulk moduli", () => {
    expect(derive({}, { material: "steel" }).bulkModulusGPa).toBe(160);
    expect(derive({}, { material: "water" }).bulkModulusGPa).toBeCloseTo(2.2, 12);
    expect(derive({}, { material: "air" }).bulkModulusGPa).toBeCloseTo(1e-4, 15);
  });

  it("compresses water 1.34% under 3 km of sea (29.4 MPa)", () => {
    // ρgh = 1000 × 9.8 × 3000 = 2.94 × 10⁷ Pa; ΔV/V = 2.94e7 / 2.2e9.
    const r = derive({ pressure: 29.4 }, { material: "water" });
    expect(r.compression).toBeCloseTo(0.013364, 6);
    expect(r.compressionPercent).toBeCloseTo(1.336, 3);
  });

  it("barely dents a steel cube: 0.625 cm³ out of a litre at 100 MPa", () => {
    const r = derive({ pressure: 100 }, { material: "steel", size: 10 });
    expect(r.volume).toBe(1000);
    expect(r.compression).toBeCloseTo(6.25e-4, 12);
    expect(r.volumeDecrease).toBeCloseTo(0.625, 9);
    expect(r.newVolume).toBeCloseTo(999.375, 9);
    expect(r.measuredBulkGPa).toBeCloseTo(160, 9);
  });

  it("halves the air with one extra atmosphere (Boyle's law), and its bulk modulus is its pressure", () => {
    const r = derive({ pressure: 0.1 }, { material: "air" });
    expect(r.compression).toBeCloseTo(0.5, 12);
    expect(r.newVolume).toBeCloseTo(500, 9);
    expect(r.measuredBulkGPa).toBeCloseTo(2e-4, 15);
    // For a small squeeze it matches Δp/B.
    expect(moduliCompression("air", 100)).toBeCloseTo(100 / 1e5, 5);
  });

  it("gives compressibility as 1/B", () => {
    expect(derive({}, { material: "water" }).compressibility).toBeCloseTo(1 / 2.2, 12);
    expect(derive({}, { material: "steel" }).compressibility).toBeCloseTo(0.00625, 12);
  });

  it("ranks the materials from stiffest to squashiest", () => {
    const k = MODULI_MATERIAL_ORDER.map((material) => derive({}, { material }).compressibility);
    for (let i = 1; i < k.length; i++) expect(k[i]).toBeGreaterThan(k[i - 1]!);
  });
});

describe("shear: the shear modulus", () => {
  it("slides the top of a 10 cm steel cube 10 µm under 84 kN", () => {
    // F/A = 84 000 / 0.01 = 8.4 MPa; θ = 8.4e6 / 84e9 = 1e-4; Δx = 0.1 m × 1e-4.
    const r = derive({ shearForce: 84 }, { material: "steel", size: 10 });
    expect(r.faceArea).toBe(100);
    expect(r.shearStress).toBeCloseTo(8.4, 9);
    expect(r.shearStrain).toBeCloseTo(1e-4, 12);
    expect(r.shearDisplacement).toBeCloseTo(10, 9);
    expect(r.shearModulusGPa).toBe(84);
  });

  it("slides aluminium further: G is 25 GPa", () => {
    // 50 kN on 100 cm² is 5 MPa; θ = 5e6 / 25e9 = 2e-4; Δx = 20 µm.
    expect(derive({ shearForce: 50 }, { material: "aluminium" }).shearDisplacement).toBeCloseTo(20, 9);
  });

  it("gives a bigger cube a smaller slide under the same force: Δx = F/(GL)", () => {
    const small = derive({ shearForce: 84 }, { size: 10 }).shearDisplacement;
    const big = derive({ shearForce: 84 }, { size: 20 }).shearDisplacement;
    expect(big).toBeCloseTo(small / 2, 9);
  });

  it("knows a fluid cannot hold a shear", () => {
    expect(derive({ shearForce: 10 }, { material: "water" })).toMatchObject({ holdsShape: 0, shearModulusGPa: 0, shearStrain: 0, fluid: 1 });
  });
});

describe("stretch: Poisson's ratio", () => {
  it("narrows a 1 mm steel wire by 0.29 µm under 157 N", () => {
    const r = derive({ tension: 157 }, { material: "steel", diameter: 1, length: 2 });
    expect(r.wireArea).toBeCloseTo(0.785398, 5);
    expect(r.tensileStress).toBeCloseTo(199.898, 2);
    expect(r.longStrain).toBeCloseTo(9.9949e-4, 7);
    expect(r.extension).toBeCloseTo(1.999, 3);
    expect(r.lateralStrain).toBeCloseTo(2.8985e-4, 7);
    expect(r.diameterDecrease).toBeCloseTo(0.28985, 4);
    expect(r.measuredPoisson).toBeCloseTo(0.29, 12);
    expect(r.overLimit).toBe(0);
  });

  it("grows the wire's volume by ε(1 − 2σ)", () => {
    const r = derive({ tension: 157 }, { material: "steel" });
    expect(r.wireVolumeStrain).toBeCloseTo(9.9949e-4 * 0.42, 8);
    expect(r.wireVolumeStrain).toBeGreaterThan(0);
  });

  it("flags a stress past the elastic limit", () => {
    expect(derive({ tension: 250 }, { material: "steel", diameter: 1 }).overLimit).toBe(1); // 318.3 MPa > 300 (NCERT Table 8.1)
    expect(derive({ tension: 200 }, { material: "steel", diameter: 2 }).overLimit).toBe(0);
  });

  it("gives Poisson's ratio between 0.2 and 0.4 for the metals and glass", () => {
    for (const material of ["steel", "copper", "aluminium", "glass"] as const) {
      const sigma = derive({ tension: 50 }, { material }).measuredPoisson;
      expect(sigma).toBeGreaterThanOrEqual(0.2);
      expect(sigma).toBeLessThanOrEqual(0.4);
    }
  });
});

describe("controls", () => {
  it("clamps every load to its slider", () => {
    expect(model.setVariable(zero, "pressure", 500, P).pressure).toBe(100);
    expect(model.setVariable(zero, "shearForce", -3, P).shearForce).toBe(0);
    expect(model.setVariable(zero, "tension", 1000, P).tension).toBe(300);
  });

  it("plays and steps the load of the current setup only", () => {
    const s = model.advance(zero, 1, { ...P, setup: "shear" });
    expect(s).toEqual({ pressure: 0, shearForce: 10, tension: 0 });
    expect(model.step(zero, { ...P, setup: "stretch" }, 1).tension).toBe(15);
    expect(model.step(zero, P, -1).pressure).toBe(0);
  });

  it("numbers every output for every material and setup", () => {
    for (const material of MODULI_MATERIAL_ORDER)
      for (const setup of ["squeeze", "shear", "stretch"] as const) {
        for (const state of [zero, { pressure: 100, shearForce: 100, tension: 300 }]) {
          const r = model.derive(state, { ...P, material, setup });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), `${material} ${setup} ${key}`).toBe(true);
            expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
      }
  });
});
