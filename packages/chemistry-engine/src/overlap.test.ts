import { describe, expect, it } from "vitest";
import {
  bondCounts,
  BONDED_MOLECULE_ORDER,
  BONDED_MOLECULES,
  h2Energy,
  OVERLAP_TYPE_ORDER,
  overlapIntegral,
  overlapModel as model,
  type OverlapParams,
} from "./overlap";

const derive = (params: Partial<OverlapParams> = {}, distance = 74) => model.derive({ distance }, { ...model.defaultParams, ...params });

describe("two hydrogen atoms", () => {
  it("are most stable 74 pm apart, 435.8 kJ/mol below separate atoms", () => {
    expect(h2Energy(74)).toBeCloseTo(-435.8, 10);
    for (const r of [40, 60, 70, 78, 100, 200]) expect(h2Energy(r), `${r} pm`).toBeGreaterThan(h2Energy(74));
    expect(derive({}, 74)).toMatchObject({ atMinimum: 1, repelling: 0 });
  });

  it("hardly notice each other far apart, and repel when pushed too close", () => {
    expect(Math.abs(h2Energy(400))).toBeLessThan(2);
    expect(h2Energy(35)).toBeGreaterThan(0);
    expect(derive({}, 40)).toMatchObject({ atMinimum: 0, repelling: 1 });
    expect(derive({}, 200)).toMatchObject({ atMinimum: 0, repelling: 0 });
  });

  it("fall in energy all the way in from far away to the minimum", () => {
    for (let r = 390; r >= 80; r -= 10) expect(h2Energy(r), `${r} pm`).toBeLessThan(h2Energy(r + 10));
  });

  it("overlap more the closer they are: completely at zero distance, three quarters at the bond length", () => {
    expect(overlapIntegral(0)).toBe(1);
    expect(overlapIntegral(74)).toBeCloseTo(0.753, 3);
    expect(overlapIntegral(400)).toBeLessThan(0.02);
    for (let r = 10; r <= 400; r += 10) expect(overlapIntegral(r)).toBeLessThan(overlapIntegral(r - 10));
  });
});

describe("kinds of overlap", () => {
  it("makes a sigma bond head-on, a pi bond side by side, and nothing when the halves cancel", () => {
    const kind = (overlapType: OverlapParams["overlapType"]) => {
      const r = derive({ overlapType });
      return [r.sigma, r.pi, r.zero, r.headOn];
    };
    expect(kind("ss")).toEqual([1, 0, 0, 1]);
    expect(kind("sp")).toEqual([1, 0, 0, 1]);
    expect(kind("pp-head")).toEqual([1, 0, 0, 1]);
    expect(kind("pp-side")).toEqual([0, 1, 0, 0]);
    expect(kind("sp-side")).toEqual([0, 0, 1, 0]);
    for (const overlapType of OVERLAP_TYPE_ORDER) {
      const r = derive({ overlapType });
      expect(r.sigma + r.pi + r.zero, overlapType).toBe(1);
    }
  });
});

describe("counting sigma and pi bonds", () => {
  it("gets the textbook counts", () => {
    const counts = Object.fromEntries(BONDED_MOLECULE_ORDER.map((id) => [id, [bondCounts(BONDED_MOLECULES[id]).sigma, bondCounts(BONDED_MOLECULES[id]).pi]]));
    expect(counts).toEqual({
      h2: [1, 0],
      ethane: [7, 0],
      ethene: [5, 1],
      ethyne: [3, 2],
      n2: [1, 2],
      o2: [1, 1],
      co2: [2, 2],
      hcn: [2, 2],
      methanal: [3, 1],
      benzene: [12, 3],
    });
  });

  it("reports them, with the double and triple bonds, from the model", () => {
    expect(derive({ molecule: "ethyne" })).toMatchObject({ sigmaBonds: 3, piBonds: 2, totalBonds: 5, doubleBonds: 0, tripleBonds: 1 });
    expect(derive({ molecule: "benzene" })).toMatchObject({ sigmaBonds: 12, piBonds: 3, doubleBonds: 3, tripleBonds: 0 });
  });

  it("draws every atom bonded, each with its usual number of bonds", () => {
    const valence: Record<string, number> = { H: 1, C: 4, N: 3, O: 2 };
    for (const id of BONDED_MOLECULE_ORDER) {
      const m = BONDED_MOLECULES[id];
      m.atoms.forEach((atom, i) => {
        const used = m.bonds.filter(([a, b]) => a === i || b === i).reduce((sum, [, , order]) => sum + order, 0);
        expect(used, `${id} atom ${i} (${atom.el})`).toBe(valence[atom.el]);
      });
    }
  });
});

describe("the model", () => {
  it("brings the atoms together on play and stops at the bond length", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 100; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.distance).toBe(74);
  });

  it("keeps the distance in range and numbers every output", () => {
    expect(model.setVariable({ distance: 100 }, "distance", 5, model.defaultParams).distance).toBe(30);
    expect(model.setVariable({ distance: 100 }, "distance", 900, model.defaultParams).distance).toBe(400);
    for (const molecule of BONDED_MOLECULE_ORDER) {
      for (const overlapType of OVERLAP_TYPE_ORDER) {
        const r = model.derive({ distance: 30 }, { molecule, overlapType });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${molecule} ${overlapType} ${key}`).toBe(true);
      }
    }
  });
});
