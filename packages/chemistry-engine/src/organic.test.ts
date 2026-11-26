import { describe, expect, it } from "vitest";
import {
  nameOrganic,
  ORGANIC_ACIDS,
  ORGANIC_FORMULA_ORDER,
  ORGANIC_ISOMERS,
  ORGANIC_SUBSTITUENT_ORDER,
  ORGANIC_SUBSTITUENTS,
  organicBuild,
  organicFormula,
  organicFormulaText,
  organicGraphFromSketch,
  organicIsomerRelation,
  organicModel as model,
  organicShortName,
  type OrganicBuild,
  type OrganicGraph,
  type OrganicParams,
  type OrganicSketch,
  type OrganicState,
} from "./organic";

const none: OrganicBuild = { chain: 4, bond: 0, bondAt: 1, group: 0, groupAt: 1, methyl: 0, methyl2: 0, ethyl: 0 };
const named = (b: Partial<OrganicBuild>) => organicBuild({ ...none, ...b }).named?.name;
const sketchName = (s: OrganicSketch) => nameOrganic(organicGraphFromSketch(s)).name;
const C = (n: number) => Array.from({ length: n }, () => "C");

const base: OrganicState = { ...model.initialize(model.defaultParams) };
const derive = (state: Partial<OrganicState> = {}, params: Partial<OrganicParams> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("naming alkanes", () => {
  it("names straight chains", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((chain) => named({ chain }))).toEqual(["methane", "ethane", "propane", "butane", "pentane", "hexane", "heptane", "octane"]);
  });

  it("numbers from the end nearer the branch", () => {
    expect(named({ methyl: 2 })).toBe("2-methylbutane");
    expect(named({ methyl: 3 })).toBe("2-methylbutane");
    expect(named({ chain: 5, methyl: 4 })).toBe("2-methylpentane");
    expect(named({ chain: 5, methyl: 3 })).toBe("3-methylpentane");
  });

  it("finds the longest chain, even through a branch", () => {
    expect(named({ ethyl: 2 })).toBe("3-methylpentane");
    expect(named({ chain: 3, methyl: 1 })).toBe("butane");
    expect(named({ chain: 1, methyl: 1 })).toBe("ethane");
    expect(named({ chain: 4, ethyl: 1 })).toBe("hexane");
    expect(organicBuild({ ...none, ethyl: 2 }).named?.chain).toHaveLength(5);
  });

  it("puts prefixes in alphabetical order, with di- and tri-", () => {
    expect(named({ chain: 6, ethyl: 3, methyl: 2 })).toBe("3-ethyl-2-methylhexane");
    expect(named({ chain: 6, ethyl: 4, methyl: 5 })).toBe("3-ethyl-2-methylhexane");
    expect(named({ chain: 4, methyl: 2, methyl2: 2 })).toBe("2,2-dimethylbutane");
    expect(named({ chain: 5, methyl: 2, methyl2: 4 })).toBe("2,4-dimethylpentane");
    expect(named({ chain: 5, methyl: 2, methyl2: 2, ethyl: 4 })).toBe("2,2,4-trimethylhexane");
    expect(sketchName({ atoms: C(5), branches: [{ at: 1, atoms: ["C"] }, { at: 1, atoms: ["C"] }, { at: 3, atoms: ["C"] }] })).toBe("2,2,4-trimethylpentane");
  });

  it("gives the lower locant to the prefix cited first when all else ties", () => {
    expect(named({ chain: 6, ethyl: 3, methyl: 4 })).toBe("3-ethyl-4-methylhexane");
    expect(named({ chain: 6, ethyl: 4, methyl: 3 })).toBe("3-ethyl-4-methylhexane");
  });

  it("chooses the chain with more branches when two are equally long", () => {
    // Both six-carbon chains of 3-ethyl-2-methylhexane: the right one has two branches, not one isopropyl.
    const result = organicBuild({ ...none, chain: 6, ethyl: 3, methyl: 2 }).named!;
    expect(result.prefixes.map((p) => p.name)).toEqual(["ethyl", "methyl"]);
  });

  it("names branched branches in brackets", () => {
    const branched = (branch: [number, number][]): OrganicGraph => {
      const carbons = Array.from({ length: 7 + branch.length }, () => ({ oh: 0, oxo: false }));
      const bonds = Array.from({ length: 6 }, (_, i) => ({ a: i, b: i + 1, order: 1 as const }));
      branch.forEach(([a, b]) => bonds.push({ a, b, order: 1 }));
      return { carbons, bonds };
    };
    // Heptane with CH(CH₃)₂ on C4: atoms 7 (CH), 8, 9 (CH₃).
    expect(nameOrganic(branched([[3, 7], [7, 8], [7, 9]])).name).toBe("4-(1-methylethyl)heptane");
    expect(nameOrganic(branched([[3, 7], [7, 8], [7, 9], [7, 10]])).name).toBe("4-(1,1-dimethylethyl)heptane");
  });
});

describe("naming alkenes and alkynes", () => {
  it("gives the multiple bond the lowest locant", () => {
    expect(named({ bond: 1, bondAt: 2 })).toBe("but-2-ene");
    expect(named({ bond: 1, bondAt: 3 })).toBe("but-1-ene");
    expect(named({ bond: 2, bondAt: 1 })).toBe("but-1-yne");
    expect(named({ chain: 5, bond: 2, bondAt: 2 })).toBe("pent-2-yne");
    expect(named({ chain: 6, bond: 1, bondAt: 3 })).toBe("hex-3-ene");
  });

  it("puts the multiple bond before the branches", () => {
    expect(named({ chain: 5, bond: 2, bondAt: 3, methyl: 2 })).toBe("4-methylpent-2-yne");
    expect(named({ bond: 1, bondAt: 1, methyl: 2 })).toBe("2-methylbut-1-ene");
    expect(named({ bond: 1, bondAt: 2, methyl: 2 })).toBe("2-methylbut-2-ene");
    expect(named({ bond: 1, bondAt: 1, methyl: 3 })).toBe("3-methylbut-1-ene");
  });

  it("leaves locants out of two-carbon parents, and knows NCERT's short forms", () => {
    expect(named({ chain: 2, bond: 1 })).toBe("ethene");
    expect(named({ chain: 2, bond: 2 })).toBe("ethyne");
    expect(named({ chain: 3, bond: 1, bondAt: 1 })).toBe("prop-1-ene");
    expect(organicShortName("prop-1-ene")).toBe("propene");
    expect(named({ chain: 3, bond: 1, bondAt: 1, methyl: 2 })).toBe("2-methylprop-1-ene");
    expect(organicShortName("2-methylprop-1-ene")).toBe("2-methylpropene");
    expect(organicShortName("butane")).toBeNull();
  });

  it("multiplies ene with an added a", () => {
    expect(sketchName({ atoms: C(4), orders: [2, 1, 2] })).toBe("buta-1,3-diene");
  });
});

describe("naming by functional group", () => {
  it("names alcohols, aldehydes, ketones and acids", () => {
    expect(named({ chain: 3, group: 1, groupAt: 2 })).toBe("propan-2-ol");
    expect(named({ chain: 3, group: 1, groupAt: 3 })).toBe("propan-1-ol");
    expect(named({ chain: 2, group: 1, groupAt: 1 })).toBe("ethanol");
    expect(named({ chain: 1, group: 1 })).toBe("methanol");
    expect(named({ group: 2, groupAt: 1 })).toBe("butanal");
    expect(named({ chain: 1, group: 2 })).toBe("methanal");
    expect(named({ group: 2, groupAt: 3 })).toBe("butan-2-one");
    expect(named({ chain: 3, group: 2, groupAt: 2 })).toBe("propan-2-one");
    expect(named({ chain: 5, group: 2, groupAt: 3 })).toBe("pentan-3-one");
    expect(named({ group: 3, groupAt: 4 })).toBe("butanoic acid");
    expect(named({ chain: 2, group: 3, groupAt: 2 })).toBe("ethanoic acid");
    expect(named({ chain: 1, group: 3 })).toBe("methanoic acid");
  });

  it("decides aldehyde or ketone by where the C=O is", () => {
    expect(derive({ chain: 4, methyl: 0, group: 2, groupAt: 4 }).compoundClass).toBe(4);
    expect(derive({ chain: 4, methyl: 0, group: 2, groupAt: 2 }).compoundClass).toBe(5);
  });

  it("numbers from the principal group, which outranks the branches and the multiple bond", () => {
    expect(named({ chain: 3, methyl: 2, group: 1, groupAt: 2 })).toBe("2-methylpropan-2-ol");
    expect(named({ chain: 3, methyl: 2, group: 1, groupAt: 1 })).toBe("2-methylpropan-1-ol");
    expect(named({ chain: 3, methyl: 2, group: 3, groupAt: 3 })).toBe("2-methylpropanoic acid");
    expect(named({ chain: 3, methyl: 2, group: 2, groupAt: 1 })).toBe("2-methylpropanal");
    expect(named({ methyl: 3, group: 2, groupAt: 2 })).toBe("3-methylbutan-2-one");
    expect(named({ chain: 5, bond: 1, bondAt: 1, group: 1, groupAt: 4 })).toBe("pent-4-en-2-ol");
    expect(named({ bond: 1, bondAt: 3, group: 2, groupAt: 2 })).toBe("but-3-en-2-one");
    expect(named({ bond: 1, bondAt: 2, group: 3, groupAt: 1 })).toBe("but-2-enoic acid");
  });

  it("makes the lower-priority group a prefix: –COOH > –CHO > >C=O > –OH", () => {
    const oh = (at: number) => ({ at, atoms: ["O"] });
    const oxo = (at: number) => ({ at, atoms: ["O"], order: 2 });
    expect(sketchName({ atoms: C(4), branches: [oxo(1), oh(3)] })).toBe("4-hydroxybutan-2-one");
    expect(sketchName({ atoms: C(4), branches: [oxo(1), oxo(3), oh(3)] })).toBe("3-oxobutanoic acid");
    expect(sketchName({ atoms: C(4), branches: [oxo(0), oxo(3), oh(3)] })).toBe("4-oxobutanoic acid");
    expect(sketchName({ atoms: C(4), branches: [oh(0), oxo(3)] })).toBe("4-hydroxybutanal");
  });

  it("multiplies the suffix and keeps the e before a consonant", () => {
    const oh = (at: number) => ({ at, atoms: ["O"] });
    expect(sketchName({ atoms: C(4), branches: [oh(1), oh(2)] })).toBe("butane-2,3-diol");
    expect(sketchName({ atoms: C(2), branches: [oh(0), oh(1)] })).toBe("ethane-1,2-diol");
    expect(sketchName({ atoms: C(5), branches: [{ at: 1, atoms: ["O"], order: 2 }, { at: 3, atoms: ["O"], order: 2 }] })).toBe("pentane-2,4-dione");
    expect(sketchName({ atoms: C(6), branches: [{ at: 0, atoms: ["O"], order: 2 }, oh(0), { at: 5, atoms: ["O"], order: 2 }, oh(5)] })).toBe("hexanedioic acid");
  });
});

describe("what the builder will not make", () => {
  it("refuses a carbon with five bonds", () => {
    expect(derive({ chain: 4, methyl: 0, group: 3, groupAt: 2 })).toMatchObject({ valid: 0, problem: 1, problemAt: 2, parentLength: 0 });
    expect(derive({ chain: 4, methyl: 2, bond: 2, bondAt: 2 })).toMatchObject({ valid: 0, problem: 1, problemAt: 2 });
  });

  it("leaves out enols and ketenes", () => {
    expect(derive({ chain: 4, methyl: 0, bond: 1, bondAt: 1, group: 1, groupAt: 1 })).toMatchObject({ valid: 0, problem: 2 });
    expect(derive({ chain: 4, methyl: 0, bond: 1, bondAt: 1, group: 2, groupAt: 1 })).toMatchObject({ valid: 0, problem: 2 });
  });

  it("keeps every position inside the chain", () => {
    const r = derive({ chain: 3, methyl: 7, groupAt: 8, bondAt: 7 });
    expect(r).toMatchObject({ chain: 3, methyl: 3, groupAt: 3, bondAt: 2 });
    expect(model.setVariable(base, "chain", 2, model.defaultParams)).toMatchObject({ chain: 2, methyl: 2 });
    expect(model.setVariable(base, "methyl", 9, model.defaultParams).methyl).toBe(4);
    expect(model.setVariable(base, "chain", 40, model.defaultParams).chain).toBe(8);
  });
});

describe("the builder's other outputs", () => {
  it("counts the formula and molar mass", () => {
    expect(organicFormulaText(organicFormula(organicBuild({ ...none, methyl: 2 }).graph))).toBe("C₅H₁₂");
    expect(organicFormulaText(organicFormula(organicBuild({ ...none, group: 3, groupAt: 1 }).graph))).toBe("C₄H₈O₂");
    expect(organicFormulaText(organicFormula(organicBuild({ ...none, chain: 3, group: 1, groupAt: 2 }).graph))).toBe("C₃H₈O");
    expect(derive({ chain: 4, methyl: 0 }).molarMass).toBeCloseTo(58.12, 2);
  });

  it("reports branches and locants", () => {
    expect(derive({ chain: 6, ethyl: 3, methyl: 2 })).toMatchObject({ parentLength: 6, methylCount: 1, ethylCount: 1, substituentCount: 2, locantSum: 5, chainChanged: 0 });
    expect(derive({ chain: 4, methyl: 3 })).toMatchObject({ reversed: 1, locantSum: 2, chainChanged: 0 });
    expect(derive({ chain: 4, methyl: 0, ethyl: 2 })).toMatchObject({ parentLength: 5, chainChanged: 1, methylCount: 1, ethylCount: 0 });
    expect(derive({ chain: 5, methyl: 0, bond: 1, bondAt: 1, group: 1, groupAt: 4 })).toMatchObject({ principalLocant: 2, bondLocant: 4, compoundClass: 3 });
  });

  it("ranks the principal group", () => {
    const p = (group: number, groupAt: number) => derive({ chain: 4, methyl: 0, group, groupAt }).principalPriority;
    expect([p(0, 1), p(1, 2), p(2, 2), p(2, 1), p(3, 1)]).toEqual([0, 1, 2, 3, 4]);
  });

  it("flags alkenes with cis and trans forms", () => {
    const ct = (b: Partial<OrganicBuild>) => derive({ ...none, ...b }).cisTrans;
    expect(ct({ bond: 1, bondAt: 2 })).toBe(1);
    expect(ct({ bond: 1, bondAt: 1 })).toBe(0);
    expect(ct({ bond: 1, bondAt: 2, methyl: 2 })).toBe(0);
    expect(ct({ chain: 5, bond: 1, bondAt: 2 })).toBe(1);
    expect(ct({ chain: 5, bond: 1, bondAt: 2, methyl: 3 })).toBe(1);
    expect(ct({ chain: 3, bond: 1, bondAt: 1, methyl: 2 })).toBe(0);
    expect(ct({ chain: 6, bond: 1, bondAt: 3 })).toBe(1);
    expect(ct({ bond: 2, bondAt: 2 })).toBe(0);
  });
});

describe("isomers", () => {
  const set = (id: keyof typeof ORGANIC_ISOMERS) => ORGANIC_ISOMERS[id].isomers;
  const rel = (id: keyof typeof ORGANIC_ISOMERS, a: number, b: number) => organicIsomerRelation(set(id)[a]!, set(id)[b]!);

  it("lists isomers that really share the formula, with the names the namer gives", () => {
    for (const id of ORGANIC_FORMULA_ORDER) {
      for (const isomer of ORGANIC_ISOMERS[id].isomers) {
        if (isomer.cls === "ether") continue;
        const g = organicGraphFromSketch(isomer.sketch);
        expect(organicFormulaText(organicFormula(g)), isomer.name).toBe(ORGANIC_ISOMERS[id].formula);
        expect(nameOrganic(g).name, isomer.name).toBe(isomer.name.replace(/^(cis|trans)-/, ""));
      }
    }
  });

  it("classifies NCERT's examples", () => {
    expect(rel("c5h12", 0, 1)).toBe(1); // pentane, 2-methylbutane: chain
    expect(rel("c5h12", 1, 2)).toBe(1);
    expect(rel("c4h10", 0, 1)).toBe(1);
    expect(rel("c3h8o", 0, 1)).toBe(2); // propan-1-ol, propan-2-ol: position
    expect(rel("c3h8o", 0, 2)).toBe(3); // propanol, methoxyethane: functional group
    expect(rel("c2h6o", 0, 1)).toBe(3); // ethanol, methoxymethane
    expect(rel("c3h6o", 0, 1)).toBe(3); // propanal, propanone
    expect(rel("c4h10o", 4, 6)).toBe(4); // methoxypropane, ethoxyethane: metamers
    expect(rel("c4h10o", 5, 6)).toBe(4);
    expect(rel("c4h10o", 4, 5)).toBe(2); // 1- and 2-methoxypropane: position
    expect(rel("c4h10o", 0, 1)).toBe(2);
    expect(rel("c4h10o", 0, 2)).toBe(1);
    expect(rel("c4h10o", 1, 3)).toBe(1);
    expect(rel("c4h10o", 2, 3)).toBe(2);
    expect(rel("c4h10o", 0, 6)).toBe(3);
    expect(rel("c4h8", 1, 2)).toBe(5); // cis and trans but-2-ene: geometrical
    expect(rel("c4h8", 0, 1)).toBe(2); // but-1-ene, but-2-ene: position
    expect(rel("c4h8", 0, 3)).toBe(1); // but-1-ene, 2-methylpropene: chain
    expect(rel("c4h8", 2, 2)).toBe(0);
  });

  it("is symmetric", () => {
    for (const id of ORGANIC_FORMULA_ORDER) {
      const list = set(id);
      for (let a = 0; a < list.length; a++) for (let b = 0; b < list.length; b++) expect(rel(id, a, b)).toBe(rel(id, b, a));
    }
  });

  it("counts structural isomers in all", () => {
    expect(derive({}, { formula: "c4h10o" })).toMatchObject({ isomerCount: 7, structuralTotal: 7 });
    expect(derive({}, { formula: "c5h12" })).toMatchObject({ isomerCount: 3, structuralTotal: 3 });
    expect(derive({}, { formula: "c4h8" })).toMatchObject({ isomerCount: 4, structuralTotal: 5 });
    expect(derive({ isomer: 6, other: 6 }, { formula: "c2h6o" })).toMatchObject({ isomer: 1, other: 1, relation: 0 });
  });
});

describe("electronic effects", () => {
  it("makes the acid stronger with each chlorine (−I)", () => {
    const pKa = [0, 1, 2, 3].map((acid) => derive({}, { acid }).pKa);
    expect(pKa).toEqual([4.76, 2.86, 1.26, 0.64]);
    expect(derive({}, { acid: 3 }).relativeStrength).toBeCloseTo(10 ** 4.12, 0);
    expect(derive({}, { acid: 1 }).ka).toBeCloseTo(1.38e-3, 5);
  });

  it("follows electronegativity, and fades with distance", () => {
    const pKa = (acid: number) => ORGANIC_ACIDS[acid]!.pKa;
    expect(pKa(4)).toBeLessThan(pKa(1)); // F < Cl < Br < I
    expect(pKa(1)).toBeLessThan(pKa(5));
    expect(pKa(5)).toBeLessThan(pKa(6));
    expect(pKa(8)).toBeLessThan(pKa(9)); // α < β < γ < none
    expect(pKa(9)).toBeLessThan(pKa(10));
    expect(pKa(10)).toBeLessThan(pKa(7));
  });

  it("knows +R and −R groups, and that every one but –CH₃ is −I", () => {
    const plus = ORGANIC_SUBSTITUENT_ORDER.filter((id) => ORGANIC_SUBSTITUENTS[id].resonance === 1);
    const minus = ORGANIC_SUBSTITUENT_ORDER.filter((id) => ORGANIC_SUBSTITUENTS[id].resonance === -1);
    expect(plus).toEqual(["nh2", "oh", "och3", "cl"]);
    expect(minus).toEqual(["no2", "cn", "cho", "cooh"]);
    expect(ORGANIC_SUBSTITUENT_ORDER.filter((id) => ORGANIC_SUBSTITUENTS[id].inductive === 1)).toEqual(["ch3"]);
    expect(derive({}, { substituent: "ch3" })).toMatchObject({ inductive: 1, resonance: 0 });
  });
});

describe("reactive intermediates", () => {
  it("orders carbocations and radicals 3° > 2° > 1° > methyl, and carbanions the other way", () => {
    const rank = (species: OrganicParams["species"]) => [0, 1, 2, 3].map((degree) => derive({ degree }, { species }).stabilityRank);
    expect(rank("cation")).toEqual([1, 2, 3, 4]);
    expect(rank("radical")).toEqual([1, 2, 3, 4]);
    expect(rank("anion")).toEqual([4, 3, 2, 1]);
  });

  it("counts α-hydrogens for hyperconjugation", () => {
    expect([0, 1, 2, 3].map((degree) => derive({ degree }).alphaH)).toEqual([0, 3, 6, 9]);
  });

  it("gives each its electrons and hybridisation", () => {
    expect(derive({}, { species: "cation" })).toMatchObject({ electrons: 6, hybridisation: 2, charge: 1 });
    expect(derive({}, { species: "radical" })).toMatchObject({ electrons: 7, hybridisation: 2, charge: 0 });
    expect(derive({}, { species: "anion" })).toMatchObject({ electrons: 8, hybridisation: 3, charge: -1 });
  });
});

describe("chromatography", () => {
  it("moves each spot Rf times as far as the solvent", () => {
    const r = derive({ front: 8 });
    expect(r.distanceB).toBeCloseTo(3.6, 10);
    expect(r.distanceB / r.front).toBeCloseTo(r.rfB, 10);
    expect([r.rfA, r.rfB, r.rfC]).toEqual([0.2, 0.45, 0.75]);
  });

  it("runs the solvent up the paper on play, and stops at the top", () => {
    let s = model.setVariable(base, "front", 0, model.defaultParams);
    for (let i = 0; i < 20; i++) s = model.advance(s, 1, model.defaultParams);
    expect(s.front).toBe(10);
  });
});

describe("every output", () => {
  it("is a finite number, never −0", () => {
    const states: Partial<OrganicState>[] = [{}, { chain: 1, front: 0 }, { group: 3, groupAt: 2 }, { chain: 8, ethyl: 1, methyl: 1, methyl2: 8, bond: 2, bondAt: 7 }];
    for (const state of states) {
      for (const formula of ORGANIC_FORMULA_ORDER) {
        const r = derive(state, { formula, species: "radical", substituent: "ch3" });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
