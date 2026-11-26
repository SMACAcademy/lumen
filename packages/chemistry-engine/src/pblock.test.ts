import { describe, expect, it } from "vitest";
import { favoursLowerState, P_GROUPS, P_PERIODS, pBlockModel as model, pElement } from "./pblock";

const at = (group: number, period: number) => model.derive({ group, period, clock: 0 }, model.defaultParams);

describe("the elements", () => {
  it("turn from non-metal to metal down a group, as NCERT sorts them", () => {
    expect(P_PERIODS.map((p) => pElement(15, p).character)).toEqual([2, 2, 1, 1, 0]);
    expect(P_PERIODS.map((p) => pElement(14, p).character)).toEqual([2, 2, 1, 0, 0]);
    expect(P_PERIODS.map((p) => pElement(16, p).character)).toEqual([2, 2, 1, 1, 0]);
    expect(pElement(13, 2).character).toBe(2);
  });

  it("lose electronegativity down the halogens", () => {
    const en = P_PERIODS.map((p) => at(17, p).en);
    for (let i = 1; i < en.length; i++) expect(en[i]).toBeLessThan(en[i - 1]!);
    expect(at(18, 3)).toMatchObject({ hasEn: 0 });
  });

  it("have the inert pair effect only in Tl, Pb and Bi", () => {
    const heavy = P_GROUPS.flatMap((g) => P_PERIODS.filter((p) => favoursLowerState(g, p)).map((p) => pElement(g, p).symbol));
    expect(heavy).toEqual(["Tl", "Pb", "Bi"]);
    expect(at(14, 6)).toMatchObject({ groupOx: 4, lowerOx: 2, inertPair: 1 });
    expect(at(13, 3)).toMatchObject({ groupOx: 3, inertPair: 0 });
  });

  it("show the oxides turning basic down a group", () => {
    expect(at(13, 2).oxide).toBe(2);
    expect(at(13, 3).oxide).toBe(1);
    expect(at(15, 6).oxide).toBe(0);
  });
});

describe("the hydrides", () => {
  it("boil higher down each group, except that hydrogen bonding lifts NH₃, H₂O and HF", () => {
    for (const g of [15, 16, 17]) {
      const [first, second, third] = [2, 3, 4].map((p) => at(g, p).hydrideBp);
      expect(first, String(g)).toBeGreaterThan(second!);
      expect(third, String(g)).toBeGreaterThan(second!);
      expect(at(g, 2).hBonding).toBe(1);
    }
    const methane = [2, 3, 4, 5].map((p) => at(14, p).hydrideBp);
    for (let i = 1; i < methane.length; i++) expect(methane[i]).toBeGreaterThan(methane[i - 1]!);
    expect(at(14, 2).hBonding).toBe(0);
  });

  it("close their bond angles and weaken their bonds down a group", () => {
    const angles = [2, 3, 4, 5, 6].map((p) => at(15, p).hydrideAngle);
    for (let i = 1; i < angles.length; i++) expect(angles[i]).toBeLessThan(angles[i - 1]!);
    const bonds = [2, 3, 4, 5].map((p) => at(17, p).bondEnthalpy);
    for (let i = 1; i < bonds.length; i++) expect(bonds[i]).toBeLessThan(bonds[i - 1]!);
  });

  it("mark what NCERT does not give as missing", () => {
    expect(at(14, 6)).toMatchObject({ hasHydride: 0, hydrideBp: 0 });
    expect(at(17, 2)).toMatchObject({ hasAngle: 0, hasEnthalpy: 1 });
    expect(at(13, 3)).toMatchObject({ hasHydride: 0 });
  });

  it("numbers every output, and Play walks down the group", () => {
    expect(model.advance({ group: 15, period: 6, clock: 0.95 }, 0.1, model.defaultParams).period).toBe(2);
    const r = at(15, 2);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
