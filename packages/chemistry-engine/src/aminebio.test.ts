import { describe, expect, it } from "vitest";
import {
  AMINEBIO_AMINES,
  AMINEBIO_BASES,
  AMINEBIO_BETA_EQUILIBRIUM,
  AMINEBIO_DIAZO,
  AMINEBIO_ENZYMES,
  AMINEBIO_SUGARS,
  AMINEBIO_VITAMINS,
  aminebioAlkyl,
  aminebioAminoAcid,
  aminebioForm,
  aminebioModel as model,
  aminebioMolarMass,
  aminebioNetCharge,
  aminebioPrepare,
  aminebioRotation,
  type AminebioParams,
  type AminebioState,
} from "./aminebio";

const base = model.initialize(model.defaultParams);
const run = (state: Partial<AminebioState> = {}, params: Partial<AminebioParams> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const amineIndex = (name: string) => AMINEBIO_AMINES.findIndex((a) => a.name === name);
const pKb = (name: string) => run({}, { amine: amineIndex(name) }).pKb;

describe("basicity of amines (NCERT Table 9.3)", () => {
  it("has NCERT's pKb values", () => {
    expect(pKb("ammonia")).toBe(4.75);
    expect(pKb("methanamine")).toBe(3.38);
    expect(pKb("N-methylmethanamine")).toBe(3.27);
    expect(pKb("N,N-dimethylmethanamine")).toBe(4.22);
    expect(pKb("ethanamine")).toBe(3.29);
    expect(pKb("N-ethylethanamine")).toBe(3.0);
    expect(pKb("N,N-diethylethanamine")).toBe(3.25);
    expect(pKb("aniline")).toBe(9.38);
    expect(pKb("phenylmethanamine")).toBe(4.7);
  });

  it("orders the methyl amines in water: (CH₃)₂NH > CH₃NH₂ > (CH₃)₃N > NH₃", () => {
    const kb = ["N-methylmethanamine", "methanamine", "N,N-dimethylmethanamine", "ammonia"].map((n) => run({}, { amine: amineIndex(n) }).kb);
    for (let i = 1; i < kb.length; i++) expect(kb[i - 1]!).toBeGreaterThan(kb[i]!);
  });

  it("orders the ethyl amines in water: (C₂H₅)₂NH > (C₂H₅)₃N > C₂H₅NH₂ > NH₃", () => {
    const kb = ["N-ethylethanamine", "N,N-diethylethanamine", "ethanamine", "ammonia"].map((n) => run({}, { amine: amineIndex(n) }).kb);
    for (let i = 1; i < kb.length; i++) expect(kb[i - 1]!).toBeGreaterThan(kb[i]!);
  });

  it("makes aniline far weaker than ammonia, and benzylamine slightly stronger", () => {
    expect(run({}, { amine: amineIndex("aniline") }).vsAmmonia).toBeCloseTo(10 ** -4.63, 10);
    expect(run({}, { amine: amineIndex("phenylmethanamine") }).vsAmmonia).toBeGreaterThan(1);
    expect(run({}, { amine: amineIndex("ammonia") }).vsAmmonia).toBe(1);
  });

  it("strengthens aniline with –CH₃ and –OCH₃, weakens it with –Cl and –NO₂", () => {
    const aniline = pKb("aniline");
    expect(pKb("4-methylaniline")).toBeLessThan(aniline);
    expect(pKb("4-methoxyaniline")).toBeLessThan(aniline);
    expect(pKb("4-chloroaniline")).toBeGreaterThan(aniline);
    expect(pKb("4-nitroaniline")).toBeGreaterThan(pKb("4-chloroaniline"));
    for (const a of AMINEBIO_AMINES) {
      if (a.ringEffect > 0) expect(a.pKb, a.name).toBeLessThan(aniline);
      if (a.ringEffect < 0) expect(a.pKb, a.name).toBeGreaterThan(aniline);
    }
  });

  it("counts N–H bonds in the amine and its cation", () => {
    expect(run({}, { amine: amineIndex("N,N-diethylethanamine") })).toMatchObject({ degree: 3, nH: 0, cationNH: 1 });
    expect(run({}, { amine: amineIndex("ammonia") })).toMatchObject({ degree: 0, nH: 3, cationNH: 4 });
  });
});

describe("tests for amines", () => {
  const tests = (name: string) => {
    const r = run({}, { amine: amineIndex(name) });
    return [r.carbylamine, r.hinsberg, r.nitrous];
  };
  it("carbylamine for 1° only; Hinsberg by class; nitrous acid by 1° aliphatic or aromatic", () => {
    expect(tests("ethanamine")).toEqual([1, 1, 1]);
    expect(tests("aniline")).toEqual([1, 1, 2]);
    expect(tests("phenylmethanamine")).toEqual([1, 1, 1]);
    expect(tests("N-ethylethanamine")).toEqual([0, 2, 0]);
    expect(tests("N-methylaniline")).toEqual([0, 2, 0]);
    expect(tests("N,N-diethylethanamine")).toEqual([0, 3, 0]);
    expect(tests("N,N-dimethylaniline")).toEqual([0, 3, 0]);
    expect(tests("ammonia")).toEqual([0, 0, 0]);
  });
});

describe("preparing amines", () => {
  it("writes alkyl groups", () => {
    expect(aminebioAlkyl(1)).toBe("CH₃");
    expect(aminebioAlkyl(2)).toBe("CH₃CH₂");
    expect(aminebioAlkyl(4)).toBe("CH₃(CH₂)₃");
  });

  it("Hoffmann bromamide: one carbon fewer (ethanamide → methanamine, propanamide → ethanamine)", () => {
    expect(aminebioPrepare(5, 0, 2)).toMatchObject({ start: "CH₃CONH₂", startName: "ethanamide", product: "CH₃NH₂", productName: "methanamine", productCarbons: 1 });
    expect(aminebioPrepare(5, 0, 3)).toMatchObject({ startName: "propanamide", productName: "ethanamine", productCarbons: 2 });
    expect(aminebioPrepare(5, 0, 4)).toMatchObject({ startName: "butanamide", productName: "propan-1-amine", productCarbons: 3 });
    expect(aminebioPrepare(5, 0, 1).works).toBe(0);
    expect(aminebioPrepare(5, 1, 1)).toMatchObject({ startName: "benzamide", productName: "aniline", ringAmine: 1, productCarbons: 6, startCarbons: 7 });
  });

  it("reductions keep the carbon count; a nitrile adds one to the halide it came from", () => {
    expect(aminebioPrepare(0, 0, 2)).toMatchObject({ startName: "nitroethane", productName: "ethanamine", productCarbons: 2 });
    expect(aminebioPrepare(2, 0, 2)).toMatchObject({ start: "CH₃CN", startName: "ethanenitrile", product: "CH₃CH₂NH₂", productCarbons: 2 });
    expect(aminebioPrepare(3, 0, 3)).toMatchObject({ start: "CH₃CH₂CONH₂", productName: "propan-1-amine", productCarbons: 3 });
    expect(aminebioPrepare(0, 1, 1)).toMatchObject({ startName: "nitrobenzene", productName: "aniline", ringAmine: 1 });
    expect(aminebioPrepare(2, 1, 1)).toMatchObject({ startName: "benzonitrile", productName: "phenylmethanamine", ringAmine: 0 });
  });

  it("Gabriel gives a pure 1° alkyl amine but fails on an aryl halide; ammonolysis gives a mixture", () => {
    expect(aminebioPrepare(4, 0, 2)).toMatchObject({ startName: "bromoethane", productName: "ethanamine", productClass: 1, works: 1 });
    expect(aminebioPrepare(4, 1, 1)).toMatchObject({ works: 0, productClass: 0 });
    expect(aminebioPrepare(1, 0, 2)).toMatchObject({ productClass: 2, works: 1 });
    expect(aminebioPrepare(1, 1, 1).works).toBe(0);
  });

  it("reports carbons and molar mass of the product", () => {
    const r = run({ carbons: 4 }, { route: 5, substrate: 0 });
    expect(r).toMatchObject({ startCarbons: 4, productCarbons: 3, carbonChange: -1 });
    expect(r.productMass).toBeCloseTo(3 * 12.01 + 9 * 1.008 + 14.01, 6); // C₃H₉N
    expect(run({}, { route: 0, substrate: 1 }).productMass).toBeCloseTo(93.13, 2); // aniline
  });
});

describe("diazonium salts", () => {
  const byName = (n: string) => AMINEBIO_DIAZO.findIndex((d) => d.productName === n && d.named !== 2);
  it("Sandmeyer, Gattermann, Balz–Schiemann and the replacements", () => {
    expect(AMINEBIO_DIAZO[0]).toMatchObject({ reagent: "CuCl/HCl", product: "C₆H₅Cl", named: 1 });
    expect(AMINEBIO_DIAZO[2]).toMatchObject({ reagent: "CuCN/KCN", product: "C₆H₅CN", named: 1 });
    expect(AMINEBIO_DIAZO[3]).toMatchObject({ reagent: "Cu/HCl", product: "C₆H₅Cl", named: 2 });
    expect(AMINEBIO_DIAZO[byName("fluorobenzene")]).toMatchObject({ named: 3 });
    expect(AMINEBIO_DIAZO[byName("iodobenzene")]!.reagent).toBe("KI");
    expect(AMINEBIO_DIAZO[byName("benzene")]!.reagent).toContain("H₃PO₂");
  });

  it("coupling keeps the nitrogen and gives coloured azo dyes: orange with phenol, yellow with aniline", () => {
    for (const d of AMINEBIO_DIAZO) expect(d.keepsNitrogen, d.reagent).toBe(d.named === 4 ? 1 : 0);
    expect(run({}, { reagent: 10 })).toMatchObject({ keepsNitrogen: 1, dyeColour: 1 });
    expect(run({}, { reagent: 11 })).toMatchObject({ keepsNitrogen: 1, dyeColour: 2 });
    expect(run({}, { reagent: 0 }).dyeColour).toBe(0);
  });

  it("molar masses of the products", () => {
    expect(run({}, { reagent: 0 }).diazoMass).toBeCloseTo(112.55, 2);
    expect(run({}, { reagent: 7 }).diazoMass).toBeCloseTo(94.11, 2);
    expect(run({}, { reagent: 10 }).diazoMass).toBeCloseTo(198.22, 2);
  });

  it("keeps the salt only at 273–278 K", () => {
    expect(run({ temperature: 275 }).saltKept).toBe(1);
    expect(run({ temperature: 278 }).saltKept).toBe(1);
    expect(run({ temperature: 283 }).saltKept).toBe(0);
  });
});

describe("carbohydrates", () => {
  const sugar = (name: string) => run({}, { sugar: AMINEBIO_SUGARS.findIndex((s) => s.name === name) });
  it("classifies and tests for reducing sugars", () => {
    expect(sugar("glucose")).toMatchObject({ sugarClass: 1, reducing: 1, carbonyl: 1 });
    expect(sugar("fructose")).toMatchObject({ sugarClass: 1, reducing: 1, carbonyl: 2 });
    expect(sugar("sucrose")).toMatchObject({ sugarClass: 2, reducing: 0, sugarUnits: 2 });
    expect(sugar("maltose")).toMatchObject({ sugarClass: 2, reducing: 1 });
    expect(sugar("lactose")).toMatchObject({ sugarClass: 2, reducing: 1 });
    expect(sugar("starch")).toMatchObject({ sugarClass: 3, reducing: 0, branched: 1 });
    expect(sugar("cellulose")).toMatchObject({ sugarClass: 3, reducing: 0, branched: 0 });
  });

  it("molar masses: glucose 180.16, sucrose = 2 × 180.16 − 18.02", () => {
    expect(sugar("glucose").sugarMass).toBeCloseTo(180.16, 2);
    expect(sugar("sucrose").sugarMass).toBeCloseTo(342.3, 2);
    expect(sugar("sucrose").sugarMass).toBeCloseTo(2 * sugar("glucose").sugarMass - aminebioMolarMass({ H: 2, O: 1 }), 9);
    expect(sugar("starch").sugarMass).toBe(0);
  });

  it("rotation of an α/β mixture: +112° to +18.7°, +52.5° at about 64 % β", () => {
    expect(aminebioRotation(0)).toBe(112);
    expect(aminebioRotation(100)).toBeCloseTo(18.7, 9);
    expect(AMINEBIO_BETA_EQUILIBRIUM).toBeCloseTo(63.77, 2);
    expect(aminebioRotation(AMINEBIO_BETA_EQUILIBRIUM)).toBeCloseTo(52.5, 9);
    expect(run({ beta: 64 }).rotation).toBeCloseTo(52.29, 2);
  });

  it("mutarotates towards equilibrium when played", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 1000; i++) s = model.advance(s, 0.05, model.defaultParams);
    expect(s.beta).toBeCloseTo(AMINEBIO_BETA_EQUILIBRIUM, 3);
    expect(model.derive(s, model.defaultParams).rotation).toBeCloseTo(52.5, 3);
  });

  it("invert sugar is laevorotatory: (52.5 − 92.4) ÷ 2", () => {
    expect(run().invertRotation).toBeCloseTo(-19.95, 9);
  });
});

describe("amino acids and peptides", () => {
  const gly = aminebioAminoAcid(0);
  it("glycine: pI 5.97, charge +1 → 0 → −1 across pH", () => {
    expect(run({}, { aminoAcid: 0 }).pI).toBeCloseTo(5.97, 9);
    expect(aminebioNetCharge(gly, 0)).toBeGreaterThan(0.99);
    expect(Math.abs(aminebioNetCharge(gly, 5.97))).toBeLessThan(1e-9);
    expect(aminebioNetCharge(gly, 14)).toBeLessThan(-0.99);
    expect([aminebioForm(gly, 1), aminebioForm(gly, 6), aminebioForm(gly, 12)]).toEqual([1, 2, 3]);
  });

  it("glycine is not chiral; alanine is", () => {
    expect(run({}, { aminoAcid: 0 }).chiral).toBe(0);
    expect(run({}, { aminoAcid: 1 }).chiral).toBe(1);
  });

  it("n amino acids: n − 1 peptide bonds; Gly-Gly-Gly is 189.18 g/mol", () => {
    const r = run({ residues: 3 }, { aminoAcid: 0 });
    expect(r.peptideBonds).toBe(2);
    expect(r.peptideMass).toBeCloseTo(3 * 75.07 - 2 * 18.016, 9);
    expect(r.peptideMass).toBeCloseTo(189.18, 2);
    expect(run({ residues: 1 }, { aminoAcid: 1 }).peptideMass).toBeCloseTo(89.09, 1);
  });
});

describe("enzymes, vitamins and bases", () => {
  it("an enzyme fits only its own substrate", () => {
    expect(run({}, { enzyme: 0, sugar: 3 }).fits).toBe(1);
    expect(run({}, { enzyme: 0, sugar: 4 }).fits).toBe(0);
    expect(run({}, { enzyme: 1, sugar: 4 }).fits).toBe(1);
    expect(run({}, { enzyme: 3, sugar: 6 }).fits).toBe(1);
    expect(run({}, { enzyme: 3, sugar: 7 }).fits).toBe(0);
    expect(AMINEBIO_ENZYMES).toHaveLength(5);
  });

  it("A, D, E and K are fat-soluble; B and C water-soluble", () => {
    const fat = AMINEBIO_VITAMINS.filter((v) => v.fatSoluble).map((v) => v.name);
    expect(fat).toEqual(["A", "D", "E", "K"]);
    expect(AMINEBIO_VITAMINS.find((v) => v.name === "C")!.disease).toContain("scurvy");
    expect(AMINEBIO_VITAMINS.find((v) => v.name === "B₁")!.disease).toBe("beri beri");
    expect(AMINEBIO_VITAMINS.find((v) => v.name === "D")!.disease).toContain("rickets");
    expect(AMINEBIO_VITAMINS.filter((v) => v.stored && !v.fatSoluble).map((v) => v.name)).toEqual(["B₁₂"]);
  });

  it("DNA has A, G, C, T; RNA has U instead of T; A=T with 2 H-bonds, G≡C with 3", () => {
    const letters = (key: "inDNA" | "inRNA") => AMINEBIO_BASES.filter((b) => b[key]).map((b) => b.letter).join("");
    expect(letters("inDNA")).toBe("AGCT");
    expect(letters("inRNA")).toBe("AGCU");
    expect(run({}, { base: 0 })).toMatchObject({ purine: 1, partner: 3, pairHBonds: 2 });
    expect(run({}, { base: 1 })).toMatchObject({ purine: 1, partner: 2, pairHBonds: 3 });
    expect(run({}, { base: 4 })).toMatchObject({ purine: 0, inDNA: 0, inRNA: 1 });
  });

  it("Chargaff: 20 % G gives 20 % C and 30 % each of A and T", () => {
    expect(run({ guanine: 20 })).toMatchObject({ cytosine: 20, adenine: 30, thymine: 30, gcContent: 40, hBondsPer100: 240 });
    expect(run({ guanine: 0 }).hBondsPer100).toBe(200);
    expect(run({ guanine: 50 }).hBondsPer100).toBe(300);
  });
});

describe("model contract", () => {
  it("clamps every state variable", () => {
    expect(model.setVariable(base, "carbons", 9, model.defaultParams).carbons).toBe(6);
    expect(model.setVariable(base, "temperature", 100, model.defaultParams).temperature).toBe(273);
    expect(model.setVariable(base, "beta", -5, model.defaultParams).beta).toBe(0);
    expect(model.setVariable(base, "pH", 20, model.defaultParams).pH).toBe(14);
    expect(model.setVariable(base, "residues", 0, model.defaultParams).residues).toBe(1);
    expect(model.setVariable(base, "guanine", 70, model.defaultParams).guanine).toBe(50);
  });

  it("gives finite numbers for every output, for every choice", () => {
    for (let amine = 0; amine < AMINEBIO_AMINES.length; amine++) {
      for (let route = 0; route < 6; route++) {
        for (const substrate of [0, 1]) {
          for (const carbons of [1, 6]) {
            const r = model.derive({ ...base, carbons }, { ...model.defaultParams, amine, route, substrate, reagent: amine % 12, sugar: amine % 9, base: amine % 5, vitamin: amine % 9 });
            for (const key of model.outputs) {
              expect(typeof r[key], key).toBe("number");
              expect(Number.isFinite(r[key]), key).toBe(true);
              expect(Object.is(r[key], -0), key).toBe(false);
            }
          }
        }
      }
    }
  });
});
