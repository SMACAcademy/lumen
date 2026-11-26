import { describe, expect, it } from "vitest";
import { COMPLEX_COLOURS, COMPLEX_METALS, complexFormula, crystalModel as model, type CrystalParams, fillOctahedral, LIGANDS } from "./crystal";

const L = (id: string) => LIGANDS.findIndex((l) => l.id === id);
const complex = (metal: CrystalParams["metal"], ligand: string) => model.derive({ ligand: L(ligand), clock: 0 }, { metal });
const colourOf = (r: ReturnType<typeof complex>) => COMPLEX_COLOURS[r.colour];

describe("the splitting", () => {
  it("grows along the spectrochemical series", () => {
    const deltas = LIGANDS.map((_, i) => model.derive({ ligand: i, clock: 0 }, { metal: "co3" }).deltaO);
    for (let i = 1; i < deltas.length; i++) expect(deltas[i]).toBeGreaterThan(deltas[i - 1]!);
  });

  it("makes [Ti(H₂O)₆]³⁺ absorb near 498 nm and look violet", () => {
    const r = complex("ti3", "h2o");
    expect(r.deltaO).toBe(20300);
    expect(r.absorbed).toBeCloseTo(493, 0);
    expect(colourOf(r)).toBe("violet");
    expect(r).toMatchObject({ t2g: 1, eg: 0, unpaired: 1 });
  });
});

describe("high spin and low spin", () => {
  it("puts [Fe(CN)₆]⁴⁻ low spin and diamagnetic, [Fe(H₂O)₆]²⁺ high spin with four unpaired", () => {
    expect(complex("fe2", "cn")).toMatchObject({ lowSpin: 1, unpaired: 0, paramagnetic: 0, t2g: 6, eg: 0 });
    expect(complex("fe2", "h2o")).toMatchObject({ lowSpin: 0, unpaired: 4, t2g: 4, eg: 2 });
  });

  it("puts [Co(NH₃)₆]³⁺ low spin and [CoF₆]³⁻ high spin", () => {
    expect(complex("co3", "nh3")).toMatchObject({ lowSpin: 1, unpaired: 0 });
    expect(complex("co3", "f")).toMatchObject({ lowSpin: 0, unpaired: 4 });
  });

  it("leaves [Fe(CN)₆]³⁻ one unpaired electron, [Fe(H₂O)₆]³⁺ five", () => {
    expect(complex("fe3", "cn")).toMatchObject({ lowSpin: 1, unpaired: 1 });
    expect(complex("fe3", "h2o")).toMatchObject({ lowSpin: 0, unpaired: 5 });
  });

  it("gives no choice to d¹–d³ and d⁸", () => {
    expect(complex("cr3", "cn")).toMatchObject({ spinChoice: 0, unpaired: 3 });
    expect(complex("ni2", "co")).toMatchObject({ spinChoice: 0, unpaired: 2 });
  });
});

describe("stabilisation energy", () => {
  it("is −0.4 per t₂g electron and +0.6 per e_g electron", () => {
    expect(complex("co3", "nh3").cfse).toBe(-2.4);
    expect(complex("fe3", "h2o").cfse).toBe(0);
    expect(complex("cr3", "h2o").cfse).toBe(-1.2);
    expect(fillOctahedral(4, false)).toEqual({ t2g: [1, 1, 1], eg: [1, 0] });
    expect(fillOctahedral(4, true)).toEqual({ t2g: [2, 1, 1], eg: [0, 0] });
  });
});

describe("colour", () => {
  it("matches the textbook's cobalt(III) complexes", () => {
    expect(colourOf(complex("co3", "nh3"))).toBe("yellow");
    expect(colourOf(complex("co3", "cn"))).toBe("pale yellow");
    expect(colourOf(complex("co3", "f"))).toBe("blue");
  });

  it("leaves d⁰ and d¹⁰ colourless, and high-spin d⁵ only faintly coloured", () => {
    expect(complex("sc3", "h2o")).toMatchObject({ coloured: 0 });
    expect(colourOf(complex("zn2", "nh3"))).toBe("colourless");
    expect(colourOf(complex("fe3", "h2o"))).toBe("very pale");
    expect(colourOf(complex("ni2", "h2o"))).toBe("green");
  });
});

describe("formulae", () => {
  it("write the complex and its charge", () => {
    expect(complexFormula(COMPLEX_METALS.fe2, LIGANDS[L("cn")]!)).toBe("[Fe(CN)₆]⁴⁻");
    expect(complexFormula(COMPLEX_METALS.co3, LIGANDS[L("nh3")]!)).toBe("[Co(NH₃)₆]³⁺");
    expect(complexFormula(COMPLEX_METALS.co3, LIGANDS[L("en")]!)).toBe("[Co(en)₃]³⁺");
    expect(complexFormula(COMPLEX_METALS.co3, LIGANDS[L("f")]!)).toBe("[CoF₆]³⁻");
    expect(complex("fe3", "cn").charge).toBe(-3);
  });

  it("numbers every output, and Play climbs the series", () => {
    expect(model.advance({ ligand: 9, clock: 0.95 }, 0.1, model.defaultParams).ligand).toBe(0);
    const r = complex("ti3", "h2o");
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
