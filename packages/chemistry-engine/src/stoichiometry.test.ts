import { describe, expect, it } from "vitest";
import { LIMITING, limitingReagent, stoichiometryModel, type StoichParams } from "./stoichiometry";

const WATER: StoichParams = { reaction: "water", massA: 4, massB: 32 };
const derive = (params: StoichParams, progress = 0) => stoichiometryModel.derive({ progress }, params);

describe("grams into moles", () => {
  it("turns 4 g of hydrogen and 32 g of oxygen into 2 mol and 1 mol", () => {
    const r = derive(WATER);
    expect(r.molesAStart).toBe(2);
    expect(r.molesBStart).toBe(1);
  });
});

describe("the limiting reagent", () => {
  it("finds 4 g H₂ and 32 g O₂ exactly in proportion, making 36 g of water", () => {
    const r = derive(WATER, 1);
    expect(r.limiting).toBe(LIMITING.exact);
    expect(r.theoreticalYield).toBeCloseTo(36, 9);
    expect(r.molesA).toBe(0);
    expect(r.molesB).toBe(0);
  });

  it("makes oxygen limiting when there is extra hydrogen, and leaves the extra behind", () => {
    const p = { ...WATER, massA: 8 };
    const r = derive(p, 1);
    expect(r.limiting).toBe(LIMITING.second);
    expect(r.theoreticalYield).toBeCloseTo(36, 9);
    expect(r.excessLeft).toBeCloseTo(4, 9);
    expect(r.massANow).toBeCloseTo(4, 9);
  });

  it("does not make more product from more of the excess reagent", () => {
    expect(derive({ ...WATER, massB: 64 }).theoreticalYield).toBeCloseTo(derive(WATER).theoreticalYield, 9);
  });

  it("uses the coefficients: ammonia needs three H₂ for every N₂", () => {
    const p: StoichParams = { reaction: "ammonia", massA: 28, massB: 6 };
    const r = derive(p, 1);
    expect(r.limiting).toBe(LIMITING.exact);
    expect(r.theoreticalYield).toBeCloseTo(34, 9);
    expect(derive({ ...p, massB: 0 }).massBNeeded).toBeCloseTo(6, 9);
  });

  it("makes two products from methane, with oxygen limiting when there is too little of it", () => {
    const p: StoichParams = { reaction: "methane", massA: 16, massB: 32 };
    const r = derive(p, 1);
    expect(r.limiting).toBe(LIMITING.second);
    expect(r.massC).toBeCloseTo(22, 9); // half a mole of CO₂
    expect(r.massD).toBeCloseTo(18, 9); // one mole of water
    expect(r.excessLeft).toBeCloseTo(8, 9); // half the methane left
  });

  it("reports nothing to react when a reactant is missing", () => {
    expect(limitingReagent({ ...WATER, massB: 0 }).limiting).toBe(LIMITING.none);
    expect(derive({ ...WATER, massB: 0 }, 1).theoreticalYield).toBe(0);
  });
});

describe("conservation of mass", () => {
  it("keeps the total mass the same at every stage of the reaction", () => {
    const p: StoichParams = { reaction: "methane", massA: 20, massB: 50 };
    for (const progress of [0, 0.3, 0.7, 1]) expect(derive(p, progress).totalMass).toBeCloseTo(70, 9);
  });
});

describe("running it", () => {
  it("runs to completion in the reaction time and steps a quarter at a time", () => {
    expect(stoichiometryModel.advance({ progress: 0 }, 2, WATER).progress).toBeCloseTo(0.5, 12);
    expect(stoichiometryModel.advance({ progress: 0.9 }, 2, WATER).progress).toBe(1);
    expect(stoichiometryModel.step({ progress: 0.1 }, WATER, 1).progress).toBe(0.25);
    expect(stoichiometryModel.setVariable({ progress: 0 }, "progress", 5, WATER).progress).toBe(1);
  });
});
