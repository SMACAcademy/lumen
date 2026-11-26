import { describe, expect, it } from "vitest";
import {
  compositionModel as model,
  empiricalOf,
  FORMULA_COMPOUND_ORDER,
  FORMULA_COMPOUNDS,
  formulaText,
  ISOTOPE_ELEMENT_ORDER,
  type CompositionParams,
  type CompositionState,
} from "./composition";

const base: CompositionState = { abundance: 50, sample: 18, soluteMass: 58.5, volume: 1000, density: 1 };
const derive = (params: Partial<CompositionParams> = {}, state: Partial<CompositionState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("atomic mass", () => {
  it("averages the isotopes by how common they are", () => {
    expect(derive({ element: "chlorine" }, { abundance: 75.77 }).averageMass).toBeCloseTo(35.453, 2);
    expect(derive({ element: "chlorine" }, { abundance: 100 }).averageMass).toBe(34.969);
    expect(derive({ element: "chlorine" }, { abundance: 0 }).averageMass).toBe(36.966);
  });

  it("gives the periodic table's values at natural abundance", () => {
    const natural = ISOTOPE_ELEMENT_ORDER.map((element) => Math.round(derive({ element }).naturalMass * 100) / 100);
    expect(natural).toEqual([35.45, 10.81, 63.55, 79.9, 6.94]);
  });

  it("knows when the mix is nature's", () => {
    expect(derive({ element: "bromine" }, { abundance: 51 }).atNatural).toBe(1);
    expect(derive({ element: "bromine" }, { abundance: 60 }).atNatural).toBe(0);
  });
});

describe("formulae", () => {
  it("weighs glucose and shares the mass out", () => {
    const r = derive({ compound: "glucose" });
    expect(r).toMatchObject({ molarMass: 180, percentC: 40, empiricalMass: 30, multiple: 6, isEmpirical: 0 });
    expect(r.percentH).toBeCloseTo(6.67, 2);
    expect(r.percentO).toBeCloseTo(53.33, 2);
  });

  it("adds every compound's percentages to 100", () => {
    for (const compound of FORMULA_COMPOUND_ORDER) {
      const r = derive({ compound });
      expect(r.percentC + r.percentH + r.percentO, compound).toBeCloseTo(100, 10);
      expect(r.empiricalMass * r.multiple, compound).toBe(r.molarMass);
    }
  });

  it("reduces formulae to the simplest ratio", () => {
    const empirical = (id: CompositionParams["compound"]) => formulaText(empiricalOf(FORMULA_COMPOUNDS[id].atoms).atoms);
    expect(["formaldehyde", "acetic-acid", "glucose"].map((id) => empirical(id as CompositionParams["compound"]))).toEqual(["CH₂O", "CH₂O", "CH₂O"]);
    expect([empirical("ethyne"), empirical("benzene")]).toEqual(["CH", "CH"]);
    expect([empirical("hydrogen-peroxide"), empirical("ethane"), empirical("water"), empirical("ethanol")]).toEqual(["HO", "CH₃", "H₂O", "C₂H₆O"]);
  });

  it("writes formulae with subscripts", () => {
    expect(FORMULA_COMPOUND_ORDER.map((id) => formulaText(FORMULA_COMPOUNDS[id].atoms))).toEqual([
      "H₂O", "H₂O₂", "CO₂", "CH₄", "C₂H₆", "C₂H₂", "C₆H₆", "CH₂O", "C₂H₄O₂", "C₆H₁₂O₆", "C₂H₆O",
    ]);
  });

  it("counts moles and molecules in a sample", () => {
    expect(derive({ compound: "water" }, { sample: 18 })).toMatchObject({ moles: 1, molecules: 6.022 });
    expect(derive({ compound: "glucose" }, { sample: 90 }).moles).toBe(0.5);
  });
});

describe("concentration", () => {
  it("makes 58.5 g of salt in 500 mL a 2 M solution", () => {
    expect(derive({ solute: "nacl" }, { soluteMass: 58.5, volume: 500 })).toMatchObject({ soluteMoles: 1, molarity: 2 });
  });

  it("halves the molarity when the volume doubles, at the same moles", () => {
    expect(derive({}, { volume: 1000 }).molarity).toBeCloseTo(derive({}, { volume: 500 }).molarity / 2, 10);
  });

  it("works out molality, mole fraction and mass % from the solvent's mass", () => {
    // 40 g NaOH made up to 1000 mL at 1.04 g/mL: 1040 g of solution, 1000 g of water.
    const r = derive({ solute: "naoh" }, { soluteMass: 40, volume: 1000, density: 1.04 });
    expect(r.solventMass).toBeCloseTo(1000, 10);
    expect(r.molarity).toBe(1);
    expect(r.molality).toBeCloseTo(1, 10);
    expect(r.moleFraction).toBeCloseTo(1 / (1 + 1000 / 18), 10);
    expect(r.massPercent).toBeCloseTo(100 * 40 / 1040, 10);
  });

  it("puts molality above molarity when the solute takes up room", () => {
    const r = derive({ solute: "glucose" }, { soluteMass: 90, volume: 500, density: 1 });
    expect(r.molality).toBeGreaterThan(r.molarity);
  });
});

describe("the model", () => {
  it("keeps every control in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["abundance", 200], ["sample", 0], ["soluteMass", 999], ["volume", 1], ["density", 9]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toEqual({ abundance: 100, sample: 1, soluteMass: 100, volume: 250, density: 1.4 });
    const r = model.derive(s, model.defaultParams);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
    expect(r.solventMass).toBeGreaterThan(0);
  });

  it("sweeps the isotope mix on play", () => {
    let s = model.initialize(model.defaultParams);
    s = model.advance(s, 1, model.defaultParams);
    expect(s.abundance).toBe(60);
    expect(model.step(s, model.defaultParams, 1).abundance).toBe(65);
  });
});
