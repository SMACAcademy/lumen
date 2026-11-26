import { describe, expect, it } from "vitest";
import { nameOrganic, organicGraphFromSketch, type OrganicSketch } from "./organic";
import {
  OXY_ACIDS,
  OXY_ALCOHOLS,
  OXY_ALKOXIDES,
  OXY_BOILING,
  OXY_ETHERS,
  OXY_HALIDES,
  OXY_PHENOL_REACTIONS,
  OXY_PRODUCT_CLASSES,
  OXY_REAGENTS,
  OXY_SUBSTRATES,
  oxyAlcoholFacts,
  oxyCleave,
  oxycompoundModel as model,
  oxyEtherCode,
  oxyMolarMass,
  oxyReact,
  oxyTurbid,
  oxyWilliamson,
  type OxyParams,
  type OxyState,
} from "./oxycompound";

const base: OxyState = model.initialize(model.defaultParams);
const derive = (state: Partial<OxyState> = {}, params: Partial<OxyParams> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const sketchName = (s: OrganicSketch) => nameOrganic(organicGraphFromSketch(s)).name;
const pKa = (name: string) => OXY_ACIDS.find((a) => a.name === name)!.pKa;

describe("alcohols", () => {
  it("are named by the organic-basics namer exactly as listed", () => {
    for (const a of OXY_ALCOHOLS) expect(sketchName(a.sketch), a.name).toBe(a.name);
  });

  it("are classified by the carbons on the carbinol carbon", () => {
    expect(OXY_ALCOHOLS.map((a) => oxyAlcoholFacts(a).degree)).toEqual([0, 1, 1, 2, 1, 2, 1, 3]);
  });

  it("follow the Lucas test: 3° at once, 2° in about 5 minutes, 1° not at room temperature", () => {
    const lucas = OXY_ALCOHOLS.map((a) => oxyAlcoholFacts(a).lucas);
    expect(lucas).toEqual([2, 2, 2, 1, 2, 1, 2, 0]);
    expect(oxyTurbid(0, 0)).toBe(true);
    expect(oxyTurbid(1, 4.9)).toBe(false);
    expect(oxyTurbid(1, 5)).toBe(true);
    expect(oxyTurbid(2, 10)).toBe(false);
  });

  it("oxidise: 1° → aldehyde → acid, 2° → ketone, 3° not with mild oxidants", () => {
    const ox = OXY_ALCOHOLS.map((a) => {
      const f = oxyAlcoholFacts(a);
      return [a.name, f.oxidation, f.aldehyde, f.acid, f.ketone];
    });
    expect(ox).toEqual([
      ["methanol", 0, "methanal", "methanoic acid", null],
      ["ethanol", 0, "ethanal", "ethanoic acid", null],
      ["propan-1-ol", 0, "propanal", "propanoic acid", null],
      ["propan-2-ol", 1, null, null, "propanone"],
      ["butan-1-ol", 0, "butanal", "butanoic acid", null],
      ["butan-2-ol", 1, null, null, "butanone"],
      ["2-methylpropan-1-ol", 0, "2-methylpropanal", "2-methylpropanoic acid", null],
      ["2-methylpropan-2-ol", 2, null, null, null],
    ]);
  });

  it("dehydrate to the Saytzeff alkene under NCERT's conditions", () => {
    const de = OXY_ALCOHOLS.map((a) => {
      const f = oxyAlcoholFacts(a);
      return [a.name, f.alkene, f.dehydration?.kelvin ?? null];
    });
    expect(de).toEqual([
      ["methanol", null, null],
      ["ethanol", "ethene", 443],
      ["propan-1-ol", "propene", 443],
      ["propan-2-ol", "propene", 440],
      ["butan-1-ol", "but-1-ene", 443],
      ["butan-2-ol", "but-2-ene", 440],
      ["2-methylpropan-1-ol", "2-methylpropene", 443],
      ["2-methylpropan-2-ol", "2-methylpropene", 358],
    ]);
    expect(oxyAlcoholFacts(OXY_ALCOHOLS[5]!).alkeneCisTrans).toBe(true);
    expect(oxyAlcoholFacts(OXY_ALCOHOLS[7]!).dehydration?.reagent).toBe("20% H₃PO₄");
  });

  it("give iodoform when they hold CH₃CH(OH)–", () => {
    expect(OXY_ALCOHOLS.filter((a) => oxyAlcoholFacts(a).iodoform).map((a) => a.name)).toEqual(["ethanol", "propan-2-ol", "butan-2-ol"]);
  });

  it("boil far above hydrocarbons and ethers of similar mass", () => {
    const bp = (name: string) => OXY_BOILING.find((b) => b.name === name)!;
    expect(oxyMolarMass(bp("ethanol").atoms)).toBeCloseTo(46.07, 2);
    expect(oxyMolarMass(bp("propane").atoms)).toBeCloseTo(44.1, 1);
    expect(bp("ethanol").kelvin - bp("methoxymethane").kelvin).toBeGreaterThan(100);
    expect(bp("butan-1-ol").kelvin - bp("ethoxyethane").kelvin).toBeGreaterThan(80);
    expect(Math.abs(bp("pentane").kelvin - bp("ethoxyethane").kelvin)).toBeLessThan(2);
    expect(bp("phenol").kelvin).toBeGreaterThan(bp("methylbenzene").kelvin);
  });
});

describe("acidity", () => {
  it("runs carboxylic acids > phenols > water > alcohols", () => {
    const maxOf = (family: number) => Math.max(...OXY_ACIDS.filter((a) => a.family === family).map((a) => a.pKa));
    const minOf = (family: number) => Math.min(...OXY_ACIDS.filter((a) => a.family === family).map((a) => a.pKa));
    expect(pKa("water")).toBeLessThan(minOf(1));
    expect(pKa("phenol")).toBeLessThan(pKa("water"));
    expect(maxOf(3)).toBeLessThan(pKa("phenol"));
    expect(pKa("ethanol")).toBeLessThan(pKa("propan-2-ol"));
    expect(pKa("propan-2-ol")).toBeLessThan(pKa("2-methylpropan-2-ol"));
  });

  it("is raised by –NO₂ at o and p more than at m, and lowered by –CH₃", () => {
    expect(pKa("4-nitrophenol")).toBeLessThan(pKa("3-nitrophenol"));
    expect(pKa("2-nitrophenol")).toBeLessThan(pKa("3-nitrophenol"));
    expect(pKa("3-nitrophenol")).toBeLessThan(pKa("phenol"));
    expect(pKa("2,4,6-trinitrophenol")).toBeLessThan(pKa("2,4-dinitrophenol"));
    expect(pKa("2,4-dinitrophenol")).toBeLessThan(pKa("4-nitrophenol"));
    for (const c of ["2-methylphenol", "3-methylphenol", "4-methylphenol"]) expect(pKa(c), c).toBeGreaterThan(pKa("phenol"));
  });

  it("follows the −I and +I effects in carboxylic acids", () => {
    expect(pKa("trifluoroethanoic acid")).toBeLessThan(pKa("trichloroethanoic acid"));
    expect(pKa("trichloroethanoic acid")).toBeLessThan(pKa("chloroethanoic acid"));
    expect(pKa("chloroethanoic acid")).toBeLessThan(pKa("methanoic acid"));
    expect(pKa("methanoic acid")).toBeLessThan(pKa("benzoic acid"));
    expect(pKa("benzoic acid")).toBeLessThan(pKa("ethanoic acid"));
    expect(pKa("ethanoic acid")).toBeLessThan(pKa("propanoic acid"));
  });
});

describe("phenol's reactions", () => {
  const added = (i: number) => OXY_PHENOL_REACTIONS[i]!.products.map((p) => p.ring.filter((g) => g.pos !== 1).map((g) => `${g.pos}${g.group}`).join(" "));
  it("put new groups ortho and para to –OH", () => {
    expect(added(0)).toEqual(["2Br 4Br 6Br"]);
    expect(added(1)).toEqual(["4Br", "2Br"]);
    expect(OXY_PHENOL_REACTIONS[1]!.products.map((p) => p.tag)).toEqual(["major", "minor"]);
    expect(added(2)).toEqual(["2NO2", "4NO2"]);
    expect(added(3)).toEqual(["2NO2 4NO2 6NO2"]);
    expect(added(4)).toEqual(["2COOH"]);
    expect(added(5)).toEqual(["2CHO"]);
    expect(OXY_PHENOL_REACTIONS.map((r) => r.products[0]!.name)).toEqual([
      "2,4,6-tribromophenol",
      "4-bromophenol",
      "2-nitrophenol",
      "2,4,6-trinitrophenol",
      "2-hydroxybenzoic acid",
      "2-hydroxybenzaldehyde",
      "sodium phenoxide",
      "benzene",
    ]);
  });

  it("count the groups added and whether they are o/p", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map((i) => derive({}, { phenolReaction: i }).groupsAdded)).toEqual([3, 1, 1, 3, 1, 1, 0, 0]);
    expect([0, 4, 5, 6].map((i) => derive({}, { phenolReaction: i }).orthoPara)).toEqual([1, 1, 1, 0]);
  });
});

describe("ethers", () => {
  it("are made by Williamson's synthesis only from methyl and 1° halides cleanly", () => {
    const table = OXY_HALIDES.map((h) => OXY_ALKOXIDES.map((o) => oxyWilliamson(h, o).outcome));
    expect(table).toEqual([
      [0, 0, 0, 0], // CH₃Br
      [0, 0, 0, 0], // C₂H₅Br
      [1, 1, 1, 1], // (CH₃)₂CHBr: elimination competes
      [2, 2, 2, 2], // (CH₃)₃CBr: alkene only
      [3, 3, 3, 3], // C₆H₅Br: no SN2
    ]);
    expect(oxyWilliamson(0, 3)).toMatchObject({ ether: "(CH₃)₃C–O–CH₃", etherName: "2-methoxy-2-methylpropane", etherCode: 14 });
    expect(oxyWilliamson(3, 0)).toMatchObject({ ether: null, alkene: "(CH₃)₂C=CH₂", etherCode: 0 });
    expect(oxyWilliamson(0, 4).etherName).toBe("methoxybenzene");
    expect(oxyWilliamson(1, 1).etherName).toBe("ethoxyethane");
    expect(oxyWilliamson(2, 0)).toMatchObject({ etherName: "2-methoxypropane", alkene: "CH₃CH=CH₂" });
    expect(oxyEtherCode(3, 0)).toBe(oxyEtherCode(0, 3));
  });

  it("name every ether Williamson can make", () => {
    for (const h of OXY_HALIDES) for (const o of OXY_ALKOXIDES) {
      const w = oxyWilliamson(h, o);
      if (w.ether) expect(w.etherName, w.ether).toBeTruthy();
    }
  });

  it("are split by HI as NCERT says", () => {
    expect(OXY_ETHERS.map(([a, b]) => [oxyCleave(a, b).products, oxyCleave(a, b).mechanism])).toEqual([
      ["CH₃I + C₂H₅OH", 1],
      ["CH₃I + (CH₃)₂CHOH", 1],
      ["(CH₃)₃CI + CH₃OH", 2],
      ["CH₃I + C₆H₅OH", 1],
      ["C₂H₅I + C₂H₅OH", 1],
    ]);
    expect(derive({}, { ether: 3 }).phenolFormed).toBe(1);
  });
});

describe("carbonyl reactions", () => {
  // Reagents: Tollens, Fehling, iodoform, 2,4-DNP, dil. NaOH, conc. NaOH, Clemmensen, Wolff–Kishner, HCN, CH₃MgBr, K₂Cr₂O₇, HVZ, soda lime.
  const EXPECTED: Record<string, number[]> = {
    methanal: [1, 2, 0, 4, 0, 6, 7, 7, 8, 9, 10, 0, 0],
    ethanal: [1, 2, 3, 4, 5, 5, 7, 7, 8, 9, 10, 0, 0],
    propanal: [1, 2, 0, 4, 5, 5, 7, 7, 8, 9, 10, 0, 0],
    benzaldehyde: [1, 0, 0, 4, 0, 6, 7, 7, 8, 9, 10, 0, 0],
    propanone: [0, 0, 3, 4, 5, 5, 7, 7, 8, 9, 0, 0, 0],
    "1-phenylethanone": [0, 0, 3, 4, 5, 5, 7, 7, 8, 9, 0, 0, 0],
    "pentan-3-one": [0, 0, 0, 4, 5, 5, 7, 7, 8, 9, 0, 0, 0],
    ethanol: [0, 0, 3, 0, 0, 0, 0, 0, 0, 15, 10, 0, 0],
    "propan-2-ol": [0, 0, 3, 0, 0, 0, 0, 0, 0, 15, 11, 0, 0],
    "ethanoic acid": [0, 0, 0, 0, 14, 14, 0, 0, 0, 15, 0, 12, 13],
  };

  it.each(OXY_SUBSTRATES.map((s, i) => [s.name, i] as const))("%s: every reagent gives the known result", (name, i) => {
    const row = OXY_REAGENTS.map((_, r) => oxyReact(i, r).productClass);
    expect(row).toEqual(EXPECTED[name]);
    OXY_REAGENTS.forEach((_, r) => {
      const x = oxyReact(i, r);
      expect(x.reacts, `${name} + ${OXY_REAGENTS[r]!.name}`).toBe(x.productClass !== 0);
      if (x.reacts) expect(x.product, `${name} + ${OXY_REAGENTS[r]!.name}`).not.toMatch(/undefined/);
      expect(x.why.length).toBeGreaterThan(0);
    });
  });

  it("writes the products out", () => {
    const p = (s: number, r: number) => oxyReact(s, r).product;
    expect(p(1, 0)).toBe("CH₃COO⁻ + Ag");
    expect(p(1, 2)).toBe("CHI₃ + HCOO⁻Na⁺");
    expect(p(4, 2)).toBe("CHI₃ + CH₃COO⁻Na⁺");
    expect(p(1, 4)).toBe("CH₃CH(OH)CH₂CHO");
    expect(p(0, 5)).toBe("CH₃OH + HCOO⁻Na⁺");
    expect(p(3, 5)).toBe("C₆H₅CH₂OH + C₆H₅COO⁻Na⁺");
    expect(p(5, 6)).toBe("C₆H₅CH₂CH₃");
    expect(p(4, 7)).toBe("CH₃CH₂CH₃");
    expect(p(4, 8)).toBe("(CH₃)₂C(OH)CN");
    expect(p(4, 9)).toBe("(CH₃)₃COH");
    expect(p(8, 10)).toBe("CH₃COCH₃");
    expect(p(9, 11)).toBe("ClCH₂COOH");
    expect(p(9, 12)).toBe("CH₄ + Na₂CO₃");
  });

  it("gives 1°, 2° and 3° alcohols with a Grignard reagent", () => {
    expect(OXY_SUBSTRATES.map((_, i) => oxyReact(i, 9).productDegree)).toEqual([1, 2, 2, 2, 3, 3, 3, 0, 0, 0]);
  });

  it("names its aldol and Grignard products correctly (checked by the IUPAC namer)", () => {
    const C = (n: number) => Array.from({ length: n }, () => "C");
    const oh = (at: number) => ({ at, atoms: ["O"] });
    const oxo = (at: number) => ({ at, atoms: ["O"], order: 2 });
    const me = (at: number) => ({ at, atoms: ["C"] });
    const et = (at: number) => ({ at, atoms: ["C", "C"] });
    const named = (i: number, key: "aldol" | "grignard") => OXY_SUBSTRATES[i]![key]!.name;
    expect(sketchName({ atoms: C(4), branches: [oh(1), oxo(3)] })).toBe(named(1, "aldol"));
    expect(sketchName({ atoms: C(5), branches: [oxo(0), me(1), oh(2)] })).toBe(named(2, "aldol"));
    expect(sketchName({ atoms: C(5), branches: [oxo(1), oh(3), me(3)] })).toBe(named(4, "aldol"));
    expect(sketchName({ atoms: C(7), branches: [oxo(2), me(3), oh(4), et(4)] })).toBe(named(6, "aldol"));
    expect(sketchName({ atoms: ["C", "C", "O"] })).toBe(named(0, "grignard"));
    expect(sketchName({ atoms: C(3), branches: [oh(1)] })).toBe(named(1, "grignard"));
    expect(sketchName({ atoms: C(4), branches: [oh(1)] })).toBe(named(2, "grignard"));
    expect(sketchName({ atoms: C(3), branches: [oh(1), me(1)] })).toBe(named(4, "grignard"));
    expect(sketchName({ atoms: C(5), branches: [oh(2), me(2)] })).toBe(named(6, "grignard"));
  });

  it("lists the groups on C=O in step with the counts", () => {
    for (const s of OXY_SUBSTRATES) {
      if (s.type === 1 || s.type === 2) {
        expect(s.groups, s.name).toBeDefined();
        expect(s.groups!.filter((g) => g !== "H").length, s.name).toBe(s.carbonGroups);
        expect(s.aromatic, s.name).toBe(s.groups!.includes("C₆H₅"));
      } else expect(s.groups, s.name).toBeUndefined();
    }
  });

  it("labels every product class", () => {
    for (let s = 0; s < OXY_SUBSTRATES.length; s++) for (let r = 0; r < OXY_REAGENTS.length; r++) expect(OXY_PRODUCT_CLASSES[oxyReact(s, r).productClass]).toBeDefined();
  });
});

describe("the model", () => {
  it("runs the Lucas clock with Play and clamps it", () => {
    const later = model.advance({ ...base, minutes: 9.5 }, 2, model.defaultParams);
    expect(later.minutes).toBe(10);
    expect(model.step(base, model.defaultParams, 1).minutes).toBe(1);
    expect(derive({ alcohol: 5, minutes: 4 }).turbid).toBe(0);
    expect(derive({ alcohol: 5, minutes: 6 }).turbid).toBe(1);
    expect(derive({ alcohol: 7, minutes: 0 }).turbid).toBe(1);
    expect(derive({ alcohol: 2, minutes: 10 }).turbid).toBe(0);
  });

  it("clamps every variable to its range", () => {
    expect(model.setVariable(base, "alcohol", 99, model.defaultParams).alcohol).toBe(7);
    expect(model.setVariable(base, "alcohol", -3, model.defaultParams).alcohol).toBe(0);
    expect(model.setVariable(base, "minutes", 50, model.defaultParams).minutes).toBe(10);
    expect(model.setVariable(base, "halide", 9, model.defaultParams).halide).toBe(4);
    expect(model.setVariable(base, "alkoxide", Number.NaN, model.defaultParams).alkoxide).toBe(0);
    expect(model.setVariable(base, "nothing", 1, model.defaultParams)).toBe(base);
  });

  it("gives finite numbers for every output, everywhere", () => {
    for (let alcohol = 0; alcohol < OXY_ALCOHOLS.length; alcohol++) {
      for (let s = 0; s < OXY_SUBSTRATES.length; s++) {
        for (let r = 0; r < OXY_REAGENTS.length; r++) {
          const out = derive({ alcohol, halide: s % 5, alkoxide: r % 4 }, { substrate: s, reagent: r, acid: (s + r) % OXY_ACIDS.length, ether: r % 5, phenolReaction: s % 8, bpCompound: r % 8 });
          for (const k of model.outputs) {
            expect(Number.isFinite(out[k]), k).toBe(true);
            expect(Object.is(out[k], -0), k).toBe(false);
          }
        }
      }
    }
    const wild = derive({ alcohol: Number.NaN, minutes: Number.POSITIVE_INFINITY }, { acid: 999, substrate: -4, reagent: 3.6 });
    for (const k of model.outputs) expect(Number.isFinite(wild[k]), k).toBe(true);
  });

  it("reports pKa and Ka together", () => {
    const r = derive({}, { acid: 14 });
    expect(r.pKa).toBe(4.76);
    expect(r.ka).toBeCloseTo(1.74e-5, 7);
    expect(r.anionSpread).toBe(2);
    expect(derive({}, { acid: 4 }).anionSpread).toBe(1);
  });

  it("makes tert-butyl methyl ether only from CH₃Br and tert-butoxide", () => {
    expect(derive({ halide: 0, alkoxide: 2 })).toMatchObject({ williamson: 0, etherCode: 14 });
    expect(derive({ halide: 3, alkoxide: 0 })).toMatchObject({ williamson: 2, etherCode: 0 });
  });
});
