import { describe, expect, it } from "vitest";
import { ATOM_ISOTOPES, elementAt, ELEMENTS, MASS_NUMBERS, nearestIsotope, periodicModel, type PeriodicParams, type PeriodicState } from "./periodic";

const derive = (Z: number, property: PeriodicParams["property"] = "radius") => periodicModel.derive({ Z }, { property });

describe("the data", () => {
  it("has the first twenty elements in order, in the right places", () => {
    expect(ELEMENTS.map((e) => e.Z)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(elementAt(11)).toMatchObject({ symbol: "Na", period: 3, group: 1 });
    expect(elementAt(17)).toMatchObject({ symbol: "Cl", period: 3, group: 17 });
  });

  it("shrinks atoms across a period and grows them down a group", () => {
    const period3 = [11, 12, 13, 14, 15, 16, 17].map((Z) => elementAt(Z).radius!);
    expect(period3).toEqual([...period3].sort((a, b) => b - a));
    expect(elementAt(3).radius!).toBeLessThan(elementAt(11).radius!);
    expect(elementAt(11).radius!).toBeLessThan(elementAt(19).radius!);
  });

  it("keeps the ionisation exceptions: boron below beryllium, oxygen below nitrogen", () => {
    expect(elementAt(5).ionisation).toBeLessThan(elementAt(4).ionisation);
    expect(elementAt(8).ionisation).toBeLessThan(elementAt(7).ionisation);
    expect(elementAt(13).ionisation).toBeLessThan(elementAt(12).ionisation);
  });

  it("makes chlorine, not fluorine, the most eager to gain an electron", () => {
    const most = ELEMENTS.filter((e) => e.electronGain !== null).reduce((a, b) => (b.electronGain! < a.electronGain! ? b : a));
    expect(most.symbol).toBe("Cl");
  });

  it("makes fluorine the most electronegative, and leaves the noble gases without a value", () => {
    const top = ELEMENTS.filter((e) => e.electronegativity !== null).reduce((a, b) => (b.electronegativity! > a.electronegativity! ? b : a));
    expect(top.symbol).toBe("F");
    expect(elementAt(10).electronegativity).toBeNull();
  });
});

describe("the model", () => {
  it("reports the chosen property, and says when there is none", () => {
    expect(derive(11).value).toBe(186);
    expect(derive(11, "ionisation").value).toBe(496);
    const neon = derive(10, "electronegativity");
    expect(neon.hasValue).toBe(0);
    expect(neon.nobleGas).toBe(1);
  });

  it("rounds to a whole element and stays in range", () => {
    expect(derive(10.6).Z).toBe(11);
    expect(periodicModel.setVariable({ Z: 3 }, "Z", 99, { property: "radius" }).Z).toBe(20);
    expect(periodicModel.step({ Z: 3 }, { property: "radius" }, -1).Z).toBe(2);
    expect(periodicModel.advance({ Z: 1 }, 100, { property: "radius" }).Z).toBe(20);
  });

  it("marks metals", () => {
    expect(derive(11).metal).toBe(1);
    expect(derive(13).metal).toBe(1);
    expect(derive(1).metal).toBe(0);
    expect(derive(17).metal).toBe(0);
  });
});

describe("electron shells, valency and the nucleus", () => {
  const at = (Z: number) => periodicModel.derive({ Z }, periodicModel.defaultParams);

  it("fills shells 2, 8, 8 and then starts the fourth", () => {
    expect(at(11)).toMatchObject({ shellK: 2, shellL: 8, shellM: 1, shellN: 0, shells: 3, valenceElectrons: 1 });
    expect(at(20)).toMatchObject({ shellK: 2, shellL: 8, shellM: 8, shellN: 2, shells: 4, valenceElectrons: 2 });
    expect(at(1)).toMatchObject({ shellK: 1, shells: 1, valenceElectrons: 1 });
  });

  it("works out valency from the outer shell", () => {
    expect(at(11).valency).toBe(1); // sodium gives one away
    expect(at(17).valency).toBe(1); // chlorine takes one
    expect(at(6).valency).toBe(4); // carbon shares four
    expect(at(8).valency).toBe(2);
    expect(at(10).valency).toBe(0); // neon's shell is full
    expect(at(2).valency).toBe(0); // so is helium's
  });

  it("counts protons and neutrons in the most common isotope", () => {
    expect(at(17)).toMatchObject({ protons: 17, massNumber: 35, neutrons: 18 });
    expect(at(6)).toMatchObject({ protons: 6, massNumber: 12, neutrons: 6 });
    expect(at(1).neutrons).toBe(0);
  });
});

describe("isotopes and isobars", () => {
  const P = periodicModel.defaultParams;
  const set = (given: Record<string, number>, params: PeriodicParams = P) => {
    let s: PeriodicState = periodicModel.initialize(params);
    for (const [k, v] of Object.entries(given)) s = periodicModel.setVariable(s, k, v, params);
    return periodicModel.derive(s, params);
  };

  it("lists each element's natural isotopes, including its most common one", () => {
    ATOM_ISOTOPES.forEach((list, i) => {
      expect(list).toContain(MASS_NUMBERS[i]);
      expect(Math.min(...list)).toBeGreaterThanOrEqual(i + 1);
    });
    expect(ATOM_ISOTOPES[0]).toEqual([1, 2, 3]);
    expect(ATOM_ISOTOPES[16]).toEqual([35, 37]);
  });

  it("starts at the most common isotope, so the old outputs keep their meaning", () => {
    expect(set({ Z: 17 })).toMatchObject({ isotopeMass: 35, isotopeNeutrons: 18, massNumber: 35, neutrons: 18, isotopes: 2 });
    expect(set({ Z: 17, A: 37 })).toMatchObject({ isotopeMass: 37, isotopeNeutrons: 20, massNumber: 35, neutrons: 18 });
  });

  it("counts neutrons as A − Z for hydrogen's three isotopes and carbon-14", () => {
    expect([1, 2, 3].map((A) => set({ Z: 1, A }).isotopeNeutrons)).toEqual([0, 1, 2]);
    expect(set({ Z: 6, A: 14 })).toMatchObject({ protons: 6, isotopeNeutrons: 8, radioactive: 1 });
    expect(set({ Z: 6, A: 12 }).radioactive).toBe(0);
    expect(set({ Z: 1, A: 3 }).radioactive).toBe(1);
  });

  it("snaps A to a real isotope and clamps it to 1–48", () => {
    expect(nearestIsotope(17, 36)).toBe(35);
    expect(set({ Z: 17, A: 99 }).isotopeMass).toBe(37);
    expect(set({ Z: 1, A: 0 }).isotopeMass).toBe(1);
    expect(periodicModel.getVariable({ Z: 17 }, "A")).toBe(35);
  });

  it("keeps the isotope when the new element has it, and drops it otherwise", () => {
    const k40 = periodicModel.setVariable({ Z: 18, A: 40 }, "Z", 19, P);
    expect(k40).toEqual({ Z: 19, A: 40 });
    expect(periodicModel.setVariable({ Z: 17, A: 37 }, "Z", 18, P)).toEqual({ Z: 18 });
    expect(periodicModel.step({ Z: 1, A: 2 }, P, 1)).toEqual({ Z: 2 });
  });

  it("isotopes share their chemistry: changing A leaves valency and shells alone", () => {
    const cl35 = set({ Z: 17, A: 35 });
    const cl37 = set({ Z: 17, A: 37 });
    expect(cl37.valency).toBe(cl35.valency);
    expect(cl37.valenceElectrons).toBe(cl35.valenceElectrons);
    expect(cl37.shells).toBe(cl35.shells);
  });

  it("averages chlorine to 35.5 u from 75% chlorine-35 and 25% chlorine-37 (NCERT)", () => {
    expect(set({ Z: 17, A: 37 }, { ...P, mix: 75 }).averageMass).toBeCloseTo(35.5, 10);
    expect(set({ Z: 17, A: 37 }, { ...P, mix: 50 }).averageMass).toBeCloseTo(36, 10);
    expect(set({ Z: 17 }, { ...P, mix: 75 }).averageMass).toBe(35);
    expect(set({ Z: 17, A: 37 }).averageMass).toBe(35); // the default sample is all chlorine-35
    expect(periodicModel.derive({ Z: 17, A: 37 }, { property: "radius" }).mix).toBe(100);
    expect(set({ Z: 17, A: 37 }, { ...P, mix: 140 }).mix).toBe(100);
  });

  it("calcium-40 and argon-40 are isobars: same A, different Z", () => {
    const ca = set({ Z: 20 });
    const ar = set({ Z: 18 });
    expect(ca.isotopeMass).toBe(40);
    expect(ar.isotopeMass).toBe(40);
    expect(ca.protons).not.toBe(ar.protons);
    expect([ca.isotopeNeutrons, ar.isotopeNeutrons]).toEqual([20, 22]);
  });

  it("gives finite numbers for every element and isotope", () => {
    for (let Z = 1; Z <= 20; Z++) {
      for (const A of ATOM_ISOTOPES[Z - 1]!) {
        for (const v of Object.values(set({ Z, A }, { ...P, mix: 30 }))) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
