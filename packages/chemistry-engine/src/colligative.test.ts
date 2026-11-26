import { describe, expect, it } from "vitest";
import { colligativeModel, PHASE, SOLVENTS, soluteFraction, vapourPressure, type ColligativeParams } from "./colligative";

const WATER: ColligativeParams = { solvent: "water", solute: "glucose", m: 1 };
const derive = (params: ColligativeParams, T = 20) => colligativeModel.derive({ T }, params);

describe("freezing and boiling points", () => {
  it("lowers water's freezing point by 1.86 K and raises its boiling point by 0.52 K per molal of glucose", () => {
    const r = derive(WATER);
    expect(r.deltaTf).toBeCloseTo(1.86, 12);
    expect(r.TfSolution).toBeCloseTo(-1.86, 12);
    expect(r.deltaTb).toBeCloseTo(0.52, 12);
    expect(r.TbSolution).toBeCloseTo(100.52, 12);
  });

  it("counts particles, not formula units: salt doubles it, calcium chloride triples it", () => {
    expect(derive({ ...WATER, solute: "nacl" }).deltaTf).toBeCloseTo(2 * 1.86, 12);
    expect(derive({ ...WATER, solute: "cacl2" }).deltaTf).toBeCloseTo(3 * 1.86, 12);
  });

  it("halves it for ethanoic acid in benzene, which pairs up into dimers", () => {
    const r = derive({ solvent: "benzene", solute: "ethanoic", m: 1 });
    expect(r.i).toBe(0.5);
    expect(r.deltaTf).toBeCloseTo(0.5 * 5.12, 12);
    expect(derive({ ...WATER, solute: "ethanoic" }).i).toBe(1);
  });

  it("makes no change at all with nothing dissolved", () => {
    const r = derive({ ...WATER, m: 0 });
    expect(r.TfSolution).toBe(0);
    expect(r.TbSolution).toBe(100);
  });
});

describe("the two beakers", () => {
  it("freezes the pure water first as it cools, while the solution stays liquid", () => {
    const r = derive(WATER, -1);
    expect(r.statePure).toBe(PHASE.solid);
    expect(r.stateSolution).toBe(PHASE.liquid);
    expect(derive(WATER, -2).stateSolution).toBe(PHASE.solid);
  });

  it("boils the pure water first as it heats", () => {
    const r = derive(WATER, 100.3);
    expect(r.statePure).toBe(PHASE.boiling);
    expect(r.stateSolution).toBe(PHASE.liquid);
  });
});

describe("vapour pressure and osmosis", () => {
  it("gives the pure solvent 1 atm at its boiling point", () => {
    expect(vapourPressure(SOLVENTS.water, 100)).toBeCloseTo(1, 12);
    expect(vapourPressure(SOLVENTS.water, 90)).toBeLessThan(1);
  });

  it("lowers the solution's vapour pressure by the mole fraction of solute (Raoult)", () => {
    const x = soluteFraction(WATER);
    expect(x).toBeCloseTo(1 / (1 + 1000 / 18), 12);
    const r = derive(WATER, 80);
    expect((r.vapourPure - r.vapourSolution) / r.vapourPure).toBeCloseTo(x, 12);
  });

  it("puts the solution's 1 atm point close to the boiling point the formula gives", () => {
    // Kb comes from the same physics, so the two agree for a dilute solution.
    const r = derive(WATER, 100.52);
    expect(r.vapourSolution).toBeCloseTo(1, 1);
  });

  it("gives π = iCRT: 0.1 M glucose at 298 K pushes with about 2.45 atm", () => {
    expect(derive({ ...WATER, m: 0.1 }).osmoticPressure).toBeCloseTo(2.45, 2);
    expect(derive({ ...WATER, m: 0.1, solute: "nacl" }).osmoticPressure).toBeCloseTo(4.89, 2);
  });
});

describe("the thermometer", () => {
  it("warms steadily when played and steps a degree at a time, within its range", () => {
    expect(colligativeModel.advance({ T: 20 }, 1, WATER).T).toBe(26);
    expect(colligativeModel.advance({ T: 125 }, 10, WATER).T).toBe(130);
    expect(colligativeModel.step({ T: 20.4 }, WATER, -1).T).toBe(19);
    expect(colligativeModel.setVariable({ T: 0 }, "T", -100, WATER).T).toBe(-30);
  });
});
