import { describe, expect, it } from "vitest";
import { ENTHALPY_REACTIONS as R, enthalpyModel as model, type EnthalpyParams, reactionEnthalpy, reactionEquation } from "./enthalpy";

const at = (reaction: EnthalpyParams["reaction"], n = 1) => model.derive({ n, clock: 0 }, { reaction });

describe("enthalpy of reaction from formation enthalpies", () => {
  it("gives NCERT's values", () => {
    expect(reactionEnthalpy(R["methane-liquid"])).toBe(-890.3);
    expect(reactionEnthalpy(R["carbon-monoxide"])).toBe(-110.5);
    expect(reactionEnthalpy(R.hcl)).toBe(-184.6);
    expect(reactionEnthalpy(R.ammonia)).toBe(-92.2);
    expect(reactionEnthalpy(R.limestone)).toBe(178.3);
  });

  it("obeys Hess's law: C → CO₂ is C → CO then CO → CO₂", () => {
    const cToCO2 = -393.5;
    const coToCO2 = cToCO2 - reactionEnthalpy(R["carbon-monoxide"]);
    expect(coToCO2).toBeCloseTo(-283.0, 9);
    expect(reactionEnthalpy(R["carbon-monoxide"]) + coToCO2).toBeCloseTo(cToCO2, 9);
  });

  it("is more exothermic when the water condenses: 2 × 44 kJ", () => {
    expect(reactionEnthalpy(R["methane-gas"]) - reactionEnthalpy(R["methane-liquid"])).toBeCloseTo(88, 9);
  });

  it("marks endothermic reactions", () => {
    expect(at("limestone")).toMatchObject({ exothermic: 0 });
    expect(at("nitric-oxide")).toMatchObject({ exothermic: 0, deltaH: 180.4 });
    expect(at("water").exothermic).toBe(1);
  });
});

describe("heat and amount", () => {
  it("scales with the moles of reaction: ΔH is extensive", () => {
    expect(at("water", 2).heat).toBeCloseTo(2 * at("water", 1).heat, 9);
    expect(at("limestone", 1).heat).toBe(-178.3);
  });
});

describe("bond enthalpies", () => {
  it("estimate gas-phase reactions close to the true value", () => {
    for (const id of ["hcl", "methane-gas", "ethene", "nitric-oxide"] as const) {
      const r = at(id);
      expect(r.hasBonds, id).toBe(1);
      expect(Math.abs(r.bondEstimate - r.deltaH), id).toBeLessThan(15);
    }
    expect(Math.abs(at("ammonia").bondEstimate - at("ammonia").deltaH)).toBeLessThan(15);
  });

  it("are not used where a solid or liquid takes part", () => {
    expect(at("methane-liquid").hasBonds).toBe(0);
    expect(at("limestone").hasBonds).toBe(0);
  });

  it("writes the equation and numbers every output", () => {
    expect(reactionEquation(R["carbon-monoxide"])).toBe("C(graphite) + ½O₂(g) → CO(g)");
    const r = at("hcl");
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
