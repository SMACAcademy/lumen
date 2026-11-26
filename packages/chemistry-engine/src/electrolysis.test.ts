import { describe, expect, it } from "vitest";
import { degreeOfIonisation, electrolysisModel as model, type ElectrolysisParams, type ElectrolysisState, IONIC_SOLUTES } from "./electrolysis";

const P = model.defaultParams;
const derive = (state: Partial<ElectrolysisState> = {}, params: Partial<ElectrolysisParams> = {}) =>
  model.derive({ ...model.initialize(P), ...state }, { ...P, ...params });

describe("Faraday's first law", () => {
  it("counts the charge as current × time", () => {
    expect(derive({ current: 2, time: 30 }).charge).toBe(3600);
  });

  it("deposits 108 g of silver per faraday: 1 A for 96.5 min gives 6.48 g", () => {
    const r = derive({ current: 1, time: 96.5 }, { electrolyte: "silver-nitrate" });
    expect(r.molesElectrons).toBeCloseTo(0.06, 12);
    expect(r.cathodeMass).toBeCloseTo(6.48, 9);
  });

  it("doubles the mass for double the charge", () => {
    const one = derive({ current: 1, time: 20 }).cathodeMass;
    expect(derive({ current: 2, time: 20 }).cathodeMass).toBeCloseTo(2 * one, 12);
    expect(derive({ current: 1, time: 40 }).cathodeMass).toBeCloseTo(2 * one, 12);
  });
});

describe("Faraday's second law", () => {
  it("deposits masses in the ratio of M/n for the same charge", () => {
    const copper = derive({ current: 1, time: 60 }, { electrolyte: "copper-sulfate" });
    const silver = derive({ current: 1, time: 60 }, { electrolyte: "silver-nitrate" });
    expect(copper.cathodeMass / silver.cathodeMass).toBeCloseTo(63.5 / 2 / 108, 12);
    expect(copper.equivalentMass).toBe(31.75);
  });
});

describe("gases", () => {
  it("gives two volumes of hydrogen to one of oxygen from water", () => {
    const r = derive({ current: 2, time: 60 }, { electrolyte: "acidified-water" });
    expect(r).toMatchObject({ cathodeMass: 0, cathodeIsGas: 1 });
    expect(r.cathodeGas / r.anodeGas).toBeCloseTo(2, 12);
    // 0.06 faraday → 0.03 mol H₂ → 0.672 L.
    expect(derive({ current: 1, time: 96.5 }, { electrolyte: "acidified-water" }).cathodeGas).toBeCloseTo(0.672, 9);
  });

  it("gives sodium and chlorine from molten salt", () => {
    const r = derive({ current: 1, time: 96.5 }, { electrolyte: "molten-nacl" });
    expect(r.cathodeMass).toBeCloseTo(0.06 * 23, 9);
    expect(r.anodeGas).toBeCloseTo(0.03 * 22.4, 9);
  });
});

describe("conductance", () => {
  it("falls in a straight line against √c for a strong electrolyte", () => {
    const at = (c: number) => derive({ c }, { solute: "kcl" });
    const slope1 = (at(0.01).lambda - at(0.04).lambda) / (at(0.04).sqrtC - at(0.01).sqrtC);
    const slope2 = (at(0.04).lambda - at(0.09).lambda) / (at(0.09).sqrtC - at(0.04).sqrtC);
    expect(slope1).toBeCloseTo(90, 9);
    expect(slope2).toBeCloseTo(90, 9);
    expect(at(0.01).alpha).toBe(1);
  });

  it("ionises a weak electrolyte more on dilution, towards Λ°m", () => {
    const weak = (c: number) => derive({ c }, { solute: "ch3cooh" });
    expect(weak(0.001).alpha).toBeGreaterThan(weak(0.1).alpha);
    expect(weak(0.001).lambda).toBeGreaterThan(5 * weak(0.1).lambda);
    expect(weak(0.001).lambda).toBeLessThan(IONIC_SOLUTES.ch3cooh.lambdaZero);
    const alpha = degreeOfIonisation(1.8e-5, 0.1);
    expect((0.1 * alpha * alpha) / (1 - alpha)).toBeCloseTo(1.8e-5, 12);
  });

  it("finds Λ°m of acetic acid from strong electrolytes (Kohlrausch)", () => {
    const sum = IONIC_SOLUTES.hcl.lambdaZero + IONIC_SOLUTES.ch3coona.lambdaZero - IONIC_SOLUTES.nacl.lambdaZero;
    expect(Math.abs(sum - IONIC_SOLUTES.ch3cooh.lambdaZero)).toBeLessThan(0.5);
  });

  it("turns Λm into conductivity and resistance", () => {
    const r = derive({ c: 0.02 }, { solute: "kcl" });
    expect(r.kappa).toBeCloseTo((r.lambda * 0.02) / 1000, 12);
    expect(r.resistance).toBeCloseTo(1 / r.kappa, 9);
  });
});

describe("the model", () => {
  it("runs the clock and dilutes on Play, and numbers every output", () => {
    const s = model.advance({ current: 1, time: 0, c: 0.05 }, 1, P);
    expect(s.time).toBe(10);
    expect(s.c).toBeLessThan(0.05);
    expect(model.advance({ current: 1, time: 119, c: 0.0011 }, 1, P)).toMatchObject({ time: 0, c: 0.1 });
    const r = derive();
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
