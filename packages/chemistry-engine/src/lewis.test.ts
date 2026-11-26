import { describe, expect, it } from "vitest";
import { averageBondOrder, bestStructures, LEWIS_MOLECULES as M, lewisModel as model, type LewisParams, lewisStructure } from "./lewis";

const bonds = (id: keyof typeof M) => bestStructures(M[id]).map((s) => s.bonds.join(""));

describe("the best structure", () => {
  it("is O=C=O for CO₂, with no formal charge", () => {
    expect(bonds("co2")).toEqual(["22"]);
    expect(bestStructures(M.co2)[0]).toMatchObject({ totalFormalCharge: 0, valenceElectrons: 16 });
  });

  it("puts −1 on carbon and +1 on oxygen in CO's triple bond", () => {
    expect(bonds("co")).toEqual(["3"]);
    expect(bestStructures(M.co)[0]).toMatchObject({ fcCentral: -1, fcTerminals: [1] });
    expect(bestStructures(M.cn)[0]).toMatchObject({ fcCentral: -1, fcTerminals: [0] });
  });

  it("is H–C≡N, N≡N, and all single bonds in water and ammonia", () => {
    expect(bonds("hcn")).toEqual(["13"]);
    expect(bonds("n2")).toEqual(["3"]);
    expect(bonds("h2o")).toEqual(["11"]);
    expect(bonds("nh3")).toEqual(["111"]);
  });
});

describe("resonance", () => {
  it("gives ozone two structures and a bond order of 1.5", () => {
    expect(bonds("o3").sort()).toEqual(["12", "21"]);
    expect(averageBondOrder(M.o3)).toBe(1.5);
    expect(bestStructures(M.o3)[0]).toMatchObject({ fcCentral: 1 });
  });

  it("gives nitrate and carbonate three each, and a bond order of 4/3", () => {
    expect(bonds("no3").sort()).toEqual(["112", "121", "211"]);
    expect(bonds("co3")).toHaveLength(3);
    expect(averageBondOrder(M.no3)).toBeCloseTo(4 / 3, 12);
    expect(bonds("no2")).toHaveLength(2);
  });
});

describe("structures that do not work", () => {
  it("catches too few electrons for the bonds, and an overfull central atom", () => {
    expect(lewisStructure(M.co, [3])).toMatchObject({ short: false, valid: true });
    expect(lewisStructure(M.o3, [2, 2])).toMatchObject({ overfull: true, valid: false });
    expect(lewisStructure(M.co2, [1, 1])).toMatchObject({ octets: false, valid: false });
    expect(lewisStructure(M.no3, [3, 3, 3])).toMatchObject({ short: false, overfull: true, valid: false });
  });

  it("keeps a bond to hydrogen single", () => {
    expect(lewisStructure(M.hcn, [3, 3]).bonds).toEqual([1, 3]);
  });
});

describe("the model", () => {
  const derive = (molecule: LewisParams["molecule"], b: number[]) => model.derive({ b1: b[0] ?? 1, b2: b[1] ?? 1, b3: b[2] ?? 1, clock: 0 }, { molecule });

  it("reports whether this is a best structure, and how many there are", () => {
    expect(derive("o3", [1, 2])).toMatchObject({ valid: 1, best: 1, resonance: 2, averageBondOrder: 1.5 });
    expect(derive("co2", [1, 3])).toMatchObject({ valid: 1, best: 0, totalFormalCharge: 2 });
    const r = derive("co2", [2, 2]);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });

  it("steps through the resonance structures on Play", () => {
    const s = model.advance({ b1: 2, b2: 1, b3: 1, clock: 1.4 }, 0.1, { molecule: "no3" });
    expect(derive("no3", [s.b1, s.b2, s.b3])).toMatchObject({ best: 1 });
    expect([s.b1, s.b2, s.b3]).not.toEqual([2, 1, 1]);
  });
});
