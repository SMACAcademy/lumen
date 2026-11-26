import { describe, expect, it } from "vitest";
import {
  SA_ANION_ORDER,
  SA_CATION_ORDER,
  SA_OCTAVES,
  SA_SERIES,
  SA_SUBSTANCE_ORDER,
  saCross,
  saFormulaText,
  schoolAtomsModel as model,
  type SchoolAtomsParams,
  type SchoolAtomsState,
} from "./schoolatoms";

const base: SchoolAtomsState = { mass: 8, octave: 2, member: 1 };
const derive = (params: Partial<SchoolAtomsParams> = {}, state: Partial<SchoolAtomsState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("atoms and molecules", () => {
  it("counts the atoms in a molecule: its atomicity", () => {
    expect(derive({ substance: "he" }).atomicity).toBe(1);
    expect(derive({ substance: "o2" }).atomicity).toBe(2);
    expect(derive({ substance: "o3" }).atomicity).toBe(3);
    expect(derive({ substance: "p4" }).atomicity).toBe(4);
    expect(derive({ substance: "s8" }).atomicity).toBe(8);
  });

  it("adds the atomic masses: H₂O = 18 u, NaCl = 58.5 u", () => {
    expect(derive({ substance: "h2o" }).molecularMass).toBe(18);
    expect(derive({ substance: "nacl" })).toMatchObject({ molecularMass: 58.5, particleKind: 2 });
    expect(derive({ substance: "s8" }).molecularMass).toBe(256);
    expect(derive({ substance: "co2" }).molecularMass).toBe(44);
    expect(derive({ substance: "nh3" }).molecularMass).toBe(17);
    expect(derive({ substance: "cl2" }).molecularMass).toBe(71);
  });

  it("tells elements from compounds", () => {
    expect(derive({ substance: "p4" }).elements).toBe(1);
    expect(derive({ substance: "h2o" }).elements).toBe(2);
  });
});

describe("writing formulae by crossing valencies", () => {
  it("crosses and cancels", () => {
    expect(saCross(3, 2)).toEqual([2, 3]);
    expect(saCross(2, 2)).toEqual([1, 1]);
    expect(saCross(3, 3)).toEqual([1, 1]);
    expect(saCross(2, 1)).toEqual([1, 2]);
  });

  it("writes NCERT's examples", () => {
    expect(saFormulaText("al", "so4")).toBe("Al₂(SO₄)₃");
    expect(saFormulaText("ca", "cl")).toBe("CaCl₂");
    expect(saFormulaText("na", "co3")).toBe("Na₂CO₃");
    expect(saFormulaText("mg", "o")).toBe("MgO");
    expect(saFormulaText("nh4", "so4")).toBe("(NH₄)₂SO₄");
    expect(saFormulaText("ca", "po4")).toBe("Ca₃(PO₄)₂");
    expect(saFormulaText("ca", "oh")).toBe("Ca(OH)₂");
  });

  it("balances the charges and weighs the formula unit", () => {
    expect(derive({ cation: "al", anion: "so4" })).toMatchObject({ cationCount: 2, anionCount: 3, totalPositive: 6, totalNegative: 6, formulaMass: 342, simplified: 0, ionsPerUnit: 5 });
    expect(derive({ cation: "ca", anion: "cl" }).formulaMass).toBe(111);
    expect(derive({ cation: "na", anion: "co3" }).formulaMass).toBe(106);
    expect(derive({ cation: "mg", anion: "o" })).toMatchObject({ formulaMass: 40, simplified: 1 });
    expect(derive({ cation: "ca", anion: "po4" }).formulaMass).toBe(310);
    expect(derive({ cation: "cu", anion: "so4" }).formulaMass).toBe(159.5);
  });

  it("always balances, for every pair", () => {
    for (const cation of SA_CATION_ORDER) {
      for (const anion of SA_ANION_ORDER) {
        const r = derive({ cation, anion });
        expect(r.totalPositive, `${cation} ${anion}`).toBe(r.totalNegative);
      }
    }
  });
});

describe("the mole", () => {
  it("does NCERT's class 9 examples", () => {
    expect(derive({ substance: "he" }, { mass: 52 }).moles).toBeCloseTo(13, 10);
    const sodium = derive({ substance: "na" }, { mass: 46 });
    expect(sodium.moles).toBeCloseTo(2, 10);
    expect(sodium.particles).toBeCloseTo(12.044e23, -18);
    const oxygen = derive({ substance: "o2" }, { mass: 8 });
    expect(oxygen.moles).toBeCloseTo(0.25, 10);
    expect(oxygen.particlesE23).toBeCloseTo(1.5055, 6);
    expect(oxygen.atomsE23).toBeCloseTo(3.011, 6);
    expect(derive({ substance: "c" }, { mass: 1.2 }).particlesE23).toBeCloseTo(0.6022, 6);
    expect(derive({ substance: "n2" }, { mass: 14 }).moles).toBeCloseTo(0.5, 10);
    expect(derive({ substance: "al" }, { mass: 108 }).moles).toBeCloseTo(4, 10);
    expect(derive({ substance: "co2" }, { mass: 22 }).moles).toBeCloseTo(0.5, 10);
  });

  it("gives more particles in 10 g the lighter each particle is", () => {
    const order = ["co2", "o2", "h2o", "he", "h2"] as const;
    const counts = order.map((substance) => derive({ substance }, { mass: 10 }).particles);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThan(counts[i - 1]!);
  });

  it("stays finite at zero mass and clamps the slider", () => {
    for (const substance of SA_SUBSTANCE_ORDER) expect(derive({ substance }, { mass: 0 }).moles).toBe(0);
    expect(model.setVariable(base, "mass", 999, model.defaultParams).mass).toBe(150);
    expect(model.setVariable(base, "mass", -3, model.defaultParams).mass).toBe(0);
  });
});

describe("Döbereiner's triads", () => {
  it("puts sodium at the average of lithium and potassium", () => {
    const r = derive({ triad: "li-na-k" });
    expect(r.triadAverage).toBeCloseTo(22.95, 10);
    expect(r.triadGap).toBeCloseTo(0.05, 10);
    expect(r.isTriad).toBe(1);
  });

  it("finds the other two triads, and not nitrogen's family", () => {
    expect(derive({ triad: "ca-sr-ba" })).toMatchObject({ triadAverage: 88.7, isTriad: 1 });
    expect(derive({ triad: "cl-br-i" })).toMatchObject({ triadAverage: 81.2, isTriad: 1 });
    const n = derive({ triad: "n-p-as" });
    expect(n.triadAverage).toBeCloseTo(44.45, 10);
    expect(n.triadOff).toBeCloseTo(30.26, 2);
    expect(n.isTriad).toBe(0);
  });
});

describe("Newlands' octaves", () => {
  const at = (label: string) => SA_OCTAVES.findIndex((s) => s.label === label) + 1;

  it("lays out NCERT's table, seven to a row", () => {
    expect(SA_OCTAVES).toHaveLength(33);
    expect(derive({}, { octave: at("Na") })).toMatchObject({ octaveNote: 2, octaveRow: 2, eighth: at("K") });
    expect(at("Ca")).toBe(17);
  });

  it("works up to calcium and fails after", () => {
    for (const label of ["Li", "Be", "B", "C", "N", "O", "F", "Na", "Mg"]) expect(derive({}, { octave: at(label) }).alike, label).toBe(1);
    for (const label of ["Al", "Si", "P", "S", "Cl", "K", "Ca"]) {
      const r = derive({}, { octave: at(label) });
      expect(r.alike, label).toBe(0);
      expect(r.pastCalcium, label).toBe(1);
    }
    expect(derive({}, { octave: at("Mg") }).pastCalcium).toBe(0);
    expect(derive({}, { octave: 30 })).toMatchObject({ hasEighth: 0, alike: 0, eighth: 0 });
  });
});

describe("Mendeleev", () => {
  it("predicts the oxide of a gap from its group", () => {
    expect(derive({ gap: "eka-aluminium" })).toMatchObject({ ekaOxideMetal: 2, ekaOxideOxygen: 3, ekaChloride: 3, ekaPredicted: 68, ekaMeasured: 69.7 });
    expect(derive({ gap: "eka-silicon" })).toMatchObject({ ekaOxideMetal: 1, ekaOxideOxygen: 2, ekaChloride: 4, ekaPredicted: 72, ekaMeasured: 72.6 });
    expect(derive({ gap: "eka-silicon" }).ekaError).toBeCloseTo(0.826, 3);
    expect(derive({ gap: "eka-aluminium" }).ekaError).toBeCloseTo(2.439, 3);
  });

  it("finds the pairs atomic mass puts in the wrong order", () => {
    expect(derive({ pair: "na-mg" }).massOrderAgrees).toBe(1);
    for (const pair of ["ar-k", "co-ni", "te-i"] as const) expect(derive({ pair }).massOrderAgrees, pair).toBe(0);
  });
});

describe("trends", () => {
  it("shrinks atoms across period 3 and grows them down group 1", () => {
    const p3 = [1, 2, 3, 4, 5, 6, 7].map((member) => derive({ series: "period-3" }, { member }).radius);
    expect(p3).toEqual([186, 160, 143, 117, 110, 104, 99]);
    const g1 = [1, 2, 3, 4, 5].map((member) => derive({ series: "group-1" }, { member }).radius);
    expect(g1).toEqual([152, 186, 231, 244, 262]);
    expect(derive({ series: "period-3" }, { member: 8 })).toMatchObject({ hasRadius: 0, radius: 0, character: 3 });
  });

  it("gives period 3's valencies 1, 2, 3, 4, 3, 2, 1, 0", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((member) => derive({ series: "period-3" }, { member }).valency)).toEqual([1, 2, 3, 4, 3, 2, 1, 0]);
  });

  it("turns non-metal to metal down group 14", () => {
    expect([1, 2, 3, 4, 5].map((member) => derive({ series: "group-14" }, { member }).character)).toEqual([0, 1, 1, 2, 2]);
  });

  it("keeps the member inside the series", () => {
    expect(derive({ series: "group-17" }, { member: 8 })).toMatchObject({ member: 4, trendZ: 53 });
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 20; i++) s = model.advance(s, 0.5, { ...model.defaultParams, series: "group-1" });
    expect(s.member).toBe(SA_SERIES["group-1"].length);
  });

  it("produces finite numbers everywhere", () => {
    for (let member = 1; member <= 8; member++) {
      const r = derive({ series: "period-2" }, { member, octave: member * 4 });
      for (const [k, v] of Object.entries(r)) expect(Number.isFinite(v), k).toBe(true);
    }
  });
});
