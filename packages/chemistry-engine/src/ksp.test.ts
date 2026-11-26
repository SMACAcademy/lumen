import { describe, expect, it } from "vitest";
import {
  kspModel as model,
  molarSolubility,
  solubilityWithCommonIon,
  SPARINGLY_SOLUBLE as SALTS,
  SPARINGLY_SOLUBLE_ORDER,
  type KspParams,
  type KspState,
} from "./ksp";

const base: KspState = { common: 0, pCation: 6, pAnion: 6 };
const derive = (salt: KspParams["salt"] = "agcl", state: Partial<KspState> = {}) => model.derive({ ...base, ...state }, { salt });

describe("solubility in pure water", () => {
  it("is √Ksp for a 1:1 salt", () => {
    expect(molarSolubility(SALTS.agcl)).toBeCloseTo(1.342e-5, 8);
    expect(derive("baso4").microSolubility).toBeCloseTo(10.49, 2);
  });

  it("is (Ksp/4)^⅓ for a 1:2 salt and (Ksp/27)^¼ for a 1:3 salt", () => {
    expect(molarSolubility(SALTS.caf2)).toBeCloseTo(Math.cbrt(5.3e-9 / 4), 12);
    expect(molarSolubility(SALTS.caf2)).toBeCloseTo(1.1e-3, 4);
    expect(molarSolubility(SALTS.feoh3)).toBeCloseTo((1e-38 / 27) ** 0.25, 16);
    expect([derive("agcl").ions, derive("caf2").ions, derive("ag2cro4").ions, derive("feoh3").ions]).toEqual([2, 3, 3, 4]);
  });

  it("makes silver chromate more soluble than silver chloride, despite its smaller Ksp", () => {
    expect(SALTS.ag2cro4.ksp).toBeLessThan(SALTS.agcl.ksp);
    expect(molarSolubility(SALTS.ag2cro4)).toBeGreaterThan(molarSolubility(SALTS.agcl));
    expect(molarSolubility(SALTS.ag2cro4)).toBeCloseTo(6.5e-5, 6);
  });

  it("leaves every saturated solution with an ionic product of exactly Ksp", () => {
    for (const id of SPARINGLY_SOLUBLE_ORDER) {
      const salt = SALTS[id];
      const s = molarSolubility(salt);
      expect((salt.x * s) ** salt.x * (salt.y * s) ** salt.y / salt.ksp, id).toBeCloseTo(1, 10);
    }
  });
});

describe("the common-ion effect", () => {
  it("changes nothing when no common ion is added", () => {
    for (const id of SPARINGLY_SOLUBLE_ORDER) expect(derive(id), id).toMatchObject({ suppression: 1 });
  });

  it("still satisfies Ksp with the common ion there", () => {
    for (const id of SPARINGLY_SOLUBLE_ORDER) {
      for (const c of [1e-6, 0.001, 0.1]) {
        const salt = SALTS[id];
        const s = solubilityWithCommonIon(salt, c);
        expect((salt.x * s) ** salt.x * (c + salt.y * s) ** salt.y / salt.ksp, `${id} ${c}`).toBeCloseTo(1, 8);
      }
    }
  });

  it("tends to Ksp ÷ c for a 1:1 salt once c is large", () => {
    const r = derive("agcl", { common: 0.1 });
    expect(r.dissolved).toBeCloseTo(1.8e-9, 12);
    expect(r.nanoDissolved).toBeCloseTo(1.8, 3);
    expect(r.suppression).toBeGreaterThan(7000);
  });

  it("lowers the solubility more the more is added, and never changes Ksp", () => {
    const s = [0, 0.005, 0.05, 0.1].map((common) => derive("caf2", { common }));
    for (let i = 1; i < s.length; i++) expect(s[i]!.dissolved).toBeLessThan(s[i - 1]!.dissolved);
    expect(new Set(s.map((r) => r.ksp)).size).toBe(1);
  });
});

describe("the ionic product", () => {
  it("is compared with Ksp to say whether a precipitate forms", () => {
    expect(derive("agcl", { pCation: 6, pAnion: 6 })).toMatchObject({ logQ: -12, saturation: -1, precipitates: 0 });
    expect(derive("agcl", { pCation: 4, pAnion: 4 })).toMatchObject({ logQ: -8, saturation: 1, precipitates: 1 });
    expect(derive("agcl", { pCation: 4.5, pAnion: 5 }).precipitates).toBe(1);
    expect(derive("agcl", { pCation: 5, pAnion: 5 }).precipitates).toBe(0);
  });

  it("raises the anion to its power: CaF₂ uses [F⁻]²", () => {
    expect(derive("caf2", { pCation: 3, pAnion: 3 })).toMatchObject({ logQ: -9, precipitates: 0 });
    expect(derive("caf2", { pCation: 2, pAnion: 3 })).toMatchObject({ logQ: -8, precipitates: 1 });
  });
});

describe("the model", () => {
  it("stirs in the common ion on play, and stops at 0.1 mol/L", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.common).toBeCloseTo(0.1, 10);
  });

  it("keeps every control in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["common", 5], ["pCation", 0], ["pAnion", 40]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toEqual({ common: 0.1, pCation: 1, pAnion: 12 });
    for (const salt of SPARINGLY_SOLUBLE_ORDER) {
      const r = model.derive(s, { salt });
      for (const key of model.outputs) expect(Number.isFinite(r[key]), `${salt} ${key}`).toBe(true);
    }
  });
});
