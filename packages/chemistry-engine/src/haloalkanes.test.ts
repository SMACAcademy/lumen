import { describe, expect, it } from "vitest";
import {
  HALO_ARENES,
  HALO_BONDS,
  HALO_CHIRAL_MOLECULES,
  HALO_ELECTROPHILES,
  HALO_ELIMINATION_SUBSTRATES,
  HALO_SUBSTRATES,
  HALO_TETRAHEDRON,
  haloChiralConfiguration,
  haloConfiguration,
  haloEliminate,
  haloFrameConfiguration,
  haloModel as model,
  haloPathway,
  haloSn1Frames,
  haloSn2Frame,
  haloSuperimposes,
  haloUmbrella,
  type HaloParams,
  type HaloState,
} from "./haloalkanes";

const base: HaloState = model.initialize(model.defaultParams);
const derive = (state: Partial<HaloState> = {}, params: Partial<HaloParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the C–X bond (NCERT table)", () => {
  it("lengthens and weakens from F to I", () => {
    expect(HALO_BONDS.map((b) => b.length)).toEqual([139, 178, 193, 214]);
    expect(HALO_BONDS.map((b) => b.enthalpy)).toEqual([452, 351, 293, 234]);
    const r = [0, 1, 2, 3].map((halogen) => derive({ halogen }));
    expect(r.map((x) => x.bondLength)).toEqual([139, 178, 193, 214]);
    expect(r.map((x) => x.reactivityRank)).toEqual([1, 2, 3, 4]);
  });

  it("has CH₃Cl, not CH₃F, with the largest dipole moment", () => {
    const dipoles = HALO_BONDS.map((b) => b.dipole);
    expect(Math.max(...dipoles)).toBe(HALO_BONDS[1]!.dipole);
    expect(derive({ halogen: 1 }).dipole).toBeGreaterThan(derive({ halogen: 0 }).dipole);
  });

  it("polarises the bond Cδ+–Xδ− and raises the boiling point with size", () => {
    const r = [0, 1, 2, 3].map((halogen) => derive({ halogen }));
    for (const x of r) expect(x.enDiff).toBeGreaterThan(0);
    expect(r.map((x) => x.boilingPoint)).toEqual([-78.4, -24.2, 3.6, 42.4]);
  });
});

describe("SN2 and SN1", () => {
  it("orders SN2 CH₃X > 1° > 2° > 3° and SN1 the other way", () => {
    const sn2 = HALO_SUBSTRATES.map((s) => s.sn2);
    const sn1 = HALO_SUBSTRATES.map((s) => s.sn1);
    for (let i = 1; i < 4; i++) {
      expect(sn2[i]).toBeLessThan(sn2[i - 1]!);
      expect(sn1[i]).toBeGreaterThan(sn1[i - 1]!);
    }
    expect([0, 1, 2, 3].map((degree) => derive({ degree }).sn2Rank)).toEqual([4, 3, 2, 1]);
    expect([0, 1, 2, 3].map((degree) => derive({ degree }).alphaH)).toEqual([0, 3, 5, 9]);
  });

  it("follows rate = k[RX][Nu⁻] for SN2 and rate = k[RX] for SN1", () => {
    expect(derive({ rx: 0.1, nu: 0.1 }).sn2RateFactor).toBeCloseTo(1);
    expect(derive({ rx: 0.1, nu: 0.2 }).sn2RateFactor).toBeCloseTo(2);
    expect(derive({ rx: 0.2, nu: 0.2 }).sn2RateFactor).toBeCloseTo(4);
    expect(derive({ rx: 0.1, nu: 0.2 }).sn1RateFactor).toBeCloseTo(1);
    expect(derive({ rx: 0.3, nu: 0.05 }).sn1RateFactor).toBeCloseTo(3);
  });

  it("turns the umbrella inside out in SN2 (Walden inversion)", () => {
    const start = haloSn2Frame(0, 1);
    const ts = haloSn2Frame(0.5, 1);
    const end = haloSn2Frame(1, 1);
    for (const g of start.groups) expect(g.x).toBeCloseTo(-1 / 3);
    for (const g of ts.groups) expect(g.x).toBeCloseTo(0);
    for (const g of end.groups) expect(g.x).toBeCloseTo(1 / 3);
    expect(start.leavingBond).toBe(1);
    expect(ts.nuBond).toBe(0.5);
    expect(ts.leavingBond).toBe(0.5);
    expect(end.nuBond).toBe(1);
    expect(end.leavingBond).toBe(0);
    expect(end.nu!.x).toBeLessThan(0);
    // Every group stays one bond from carbon.
    for (const g of haloUmbrella(0.4)) expect(Math.hypot(g.x, g.y, g.z)).toBeCloseTo(1);
  });

  it("inverts (S)-2-bromobutane to (R)-butan-2-ol", () => {
    expect(haloFrameConfiguration(haloSn2Frame(0, 2), 2)).toBe(2);
    expect(haloFrameConfiguration(haloSn2Frame(1, 2), 2)).toBe(1);
    expect(derive({ degree: 2 })).toMatchObject({ configBefore: 2, configAfter: 1 });
    expect(derive({ degree: 1 })).toMatchObject({ configBefore: 0, configAfter: 0 });
  });

  it("blocks the back of a 3° carbon", () => {
    const f = haloSn2Frame(1, 3);
    expect(f.nuBond).toBe(0);
    expect(f.leavingBond).toBe(1);
    expect(derive({ degree: 3, progress: 1 })).toMatchObject({ sn2Blocked: 1, sn2Stage: 0 });
  });

  it("goes through a flat carbocation in SN1 and gives both configurations", () => {
    const [cation] = haloSn1Frames(0.45);
    expect(cation!.charge).toBe(1);
    expect(cation!.leavingBond).toBe(0);
    for (const g of cation!.groups) expect(g.x).toBeCloseTo(0);
    const products = haloSn1Frames(1);
    expect(products).toHaveLength(2);
    expect(products.map((f) => f.share)).toEqual([0.5, 0.5]);
    expect(products.map((f) => haloFrameConfiguration(f, 2)).sort()).toEqual([1, 2]);
    expect(derive({ progress: 0.1 }).sn1Stage).toBe(0);
    expect(derive({ progress: 0.45 }).sn1Stage).toBe(1);
    expect(derive({ progress: 1 }).sn1Stage).toBe(2);
  });

  it("reads R and S from coordinates", () => {
    // Lowest priority pointing back, 1 → 2 → 3 clockwise as seen from the front: R.
    const back = { x: 0, y: 0, z: -1 };
    const at = (deg: number) => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180), z: 0.33 });
    expect(haloConfiguration([{ p: at(90), priority: 1 }, { p: at(-30), priority: 2 }, { p: at(210), priority: 3 }, { p: back, priority: 4 }])).toBe(1);
    expect(haloConfiguration([{ p: at(90), priority: 1 }, { p: at(210), priority: 2 }, { p: at(-30), priority: 3 }, { p: back, priority: 4 }])).toBe(2);
  });
});

describe("choosing SN1 or SN2", () => {
  it.each([
    [0, true, true, 0],
    [0, false, true, 0],
    [1, true, false, 0],
    [1, false, true, 0],
    [2, true, false, 0],
    [2, false, true, 1],
    [2, true, true, 2],
    [2, false, false, 2],
    [3, true, true, 1],
    [3, false, true, 1],
    [3, true, false, 1],
  ])("degree %i, strong %s, protic %s → %i", (degree, strong, protic, pathway) => {
    expect(haloPathway(degree, strong, protic)).toBe(pathway);
    expect(derive({ degree }, { nucleophile: strong ? 1 : 0, solvent: protic ? 1 : 0 }).pathway).toBe(pathway);
  });

  it("warns that a strong base on a 2° or 3° halide also eliminates", () => {
    expect(derive({ degree: 3 }, { nucleophile: 1 }).eliminationRisk).toBe(1);
    expect(derive({ degree: 1 }, { nucleophile: 1 }).eliminationRisk).toBe(0);
    expect(derive({ degree: 3 }, { nucleophile: 0 }).eliminationRisk).toBe(0);
  });
});

describe("elimination (Saytzeff) and substitution", () => {
  const expected: [string, string, string[]][] = [
    ["bromoethane", "ethanol", ["ethene"]],
    ["1-bromobutane", "butan-1-ol", ["but-1-ene"]],
    ["2-bromopropane", "propan-2-ol", ["propene"]],
    ["2-bromobutane", "butan-2-ol", ["but-2-ene", "but-1-ene"]],
    ["2-bromopentane", "pentan-2-ol", ["pent-2-ene", "pent-1-ene"]],
    ["2-bromo-2-methylbutane", "2-methylbutan-2-ol", ["2-methylbut-2-ene", "2-methylbut-1-ene"]],
    ["2-bromo-2-methylpropane", "2-methylpropan-2-ol", ["2-methylpropene"]],
  ];
  it.each(expected)("%s → %s (aqueous) or %j (alcoholic, major first)", (name, alcohol, alkenes) => {
    const s = HALO_ELIMINATION_SUBSTRATES.find((x) => x.name === name)!;
    const r = haloEliminate(s);
    expect(r.alcohol.name).toBe(alcohol);
    expect(r.alkenes.map((a) => a.shortName)).toEqual(alkenes);
  });

  it("counts alkyl groups on the C=C and β-hydrogens", () => {
    const r = haloEliminate(HALO_ELIMINATION_SUBSTRATES[5]!);
    expect(r.alkenes.map((a) => a.alkyl)).toEqual([3, 2]);
    expect(r.betaHydrogens).toBe(8);
    expect(haloEliminate(HALO_ELIMINATION_SUBSTRATES[3]!).alkenes.map((a) => a.alkyl)).toEqual([2, 1]);
    expect(haloEliminate(HALO_ELIMINATION_SUBSTRATES[3]!).alkenes[0]!.cisTrans).toBe(true);
    expect(haloEliminate(HALO_ELIMINATION_SUBSTRATES[6]!).betaHydrogens).toBe(9);
  });

  it("gives an alcohol with aqueous KOH and alkenes with alcoholic KOH", () => {
    expect(derive({}, { substrate: 3, reagent: 0 }).productClass).toBe(0);
    expect(derive({}, { substrate: 3, reagent: 1 })).toMatchObject({ productClass: 1, alkeneCount: 2, majorAlkyl: 2, minorAlkyl: 1 });
    expect(derive({}, { substrate: 4 }).majorPercent).toBe(81);
    expect(derive({}, { substrate: 0 })).toMatchObject({ alkeneCount: 1, minorAlkyl: 0, substrateDegree: 1 });
  });
});

describe("chirality", () => {
  it("draws the (S) forms of butan-2-ol and 2-bromobutane, and (R) in the mirror", () => {
    expect(haloChiralConfiguration(HALO_CHIRAL_MOLECULES[0]!)).toBe(2);
    expect(haloChiralConfiguration(HALO_CHIRAL_MOLECULES[1]!)).toBe(2);
    expect(haloChiralConfiguration(HALO_CHIRAL_MOLECULES[1]!, true)).toBe(1);
    expect(derive({}, { molecule: 0 })).toMatchObject({ configA: 2, configB: 1, specificRotation: 13.5, chiral: 1, distinctGroups: 4 });
  });

  it("puts four groups at tetrahedral angles", () => {
    for (let i = 0; i < 4; i++) {
      for (let j = i + 1; j < 4; j++) {
        const a = HALO_TETRAHEDRON[i]!;
        const b = HALO_TETRAHEDRON[j]!;
        expect(a.x * b.x + a.y * b.y + a.z * b.z).toBeCloseTo(-1 / 3);
      }
    }
  });

  it("never superimposes a molecule with four different groups on its mirror image", () => {
    const turns = Array.from({ length: 13 }, (_, k) => k * 30);
    expect(turns.filter((t) => haloSuperimposes(HALO_CHIRAL_MOLECULES[0]!, t))).toEqual([]);
    expect(turns.filter((t) => haloSuperimposes(HALO_CHIRAL_MOLECULES[1]!, t))).toEqual([]);
    expect(turns.filter((t) => haloSuperimposes(HALO_CHIRAL_MOLECULES[2]!, t))).toEqual([180]);
    expect(turns.filter((t) => haloSuperimposes(HALO_CHIRAL_MOLECULES[3]!, t))).toEqual([60, 180, 300]);
    expect(derive({ turn: 180 }, { molecule: 2 })).toMatchObject({ superimposes: 1, chiral: 0, specificRotation: 0, distinctGroups: 3 });
  });

  it("gives a racemic mixture no rotation", () => {
    expect(derive({ plus: 100 }, { molecule: 1 }).mixtureRotation).toBeCloseTo(23.1);
    expect(derive({ plus: 0 }, { molecule: 1 }).mixtureRotation).toBeCloseTo(-23.1);
    expect(derive({ plus: 50 }, { molecule: 1 }).mixtureRotation).toBe(0);
    expect(derive({ plus: 75 }, { molecule: 0 })).toMatchObject({ mixtureRotation: 6.75, enantiomericExcess: 50 });
    expect(Object.is(derive({ plus: 50 }, { molecule: 2 }).mixtureRotation, -0)).toBe(false);
  });
});

describe("haloarenes", () => {
  it("needs milder conditions as –NO₂ groups are added ortho and para", () => {
    expect(HALO_ARENES.map((a) => a.temperature)).toEqual([623, 443, 368, 323]);
    expect([0, 1, 2, 3].map((arene) => derive({}, { arene }).opNitro)).toEqual([0, 1, 2, 3]);
  });

  it("has a shorter C–Cl bond in chlorobenzene than in CH₃Cl", () => {
    const r = derive();
    expect(r.arylBond).toBe(169);
    expect(r.alkylBond).toBe(178);
  });

  it("substitutes chlorobenzene ortho and para", () => {
    for (const e of HALO_ELECTROPHILES) {
      expect(e.ortho).toMatch(/^(1-chloro-2|2-chloro|1,2-)/);
      expect(e.para).toMatch(/^(1-chloro-4|4-chloro|1,4-)/);
    }
  });
});

describe("the model", () => {
  it("clamps every variable to its control's range", () => {
    expect(model.setVariable(base, "halogen", 9, model.defaultParams).halogen).toBe(3);
    expect(model.setVariable(base, "degree", 1.6, model.defaultParams).degree).toBe(2);
    expect(model.setVariable(base, "progress", -1, model.defaultParams).progress).toBe(0);
    expect(model.setVariable(base, "nu", 3, model.defaultParams).nu).toBe(0.5);
    expect(model.setVariable(base, "turn", 400, model.defaultParams).turn).toBe(360);
    expect(model.setVariable(base, "plus", -5, model.defaultParams).plus).toBe(0);
    expect(model.setVariable(base, "nothing", 1, model.defaultParams)).toBe(base);
  });

  it("plays the mechanism forward and stops at the end", () => {
    let s = { ...base };
    for (let i = 0; i < 50; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.progress).toBe(1);
    expect(model.step({ ...base, progress: 0.33 }, model.defaultParams, 1).progress).toBeCloseTo(0.4);
  });

  it("gives finite numbers for every output, in every corner", () => {
    for (const degree of [0, 3]) {
      for (const substrate of [0, 6]) {
        for (const molecule of [0, 3]) {
          const r = derive({ degree, progress: 1, plus: 50 }, { substrate, molecule, arene: 3, electrophile: 4, nucleophile: 0, solvent: 0 });
          for (const key of model.outputs) {
            expect(typeof r[key], key).toBe("number");
            expect(Number.isFinite(r[key]), key).toBe(true);
            expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
      }
    }
  });
});
