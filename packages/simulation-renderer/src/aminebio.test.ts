import { AMINEBIO_AMINES, AMINEBIO_DIAZO, aminebioModel, type AminebioParams, type AminebioState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import {
  aminebioRenderer,
  amineDrawing,
  aminoAcidMolecule,
  basePairs,
  computeAminebioLayout,
  diazoniumMolecule,
  diazoProductMolecule,
  haworthMolecule,
  pHX,
  pKbX,
  rotationX,
  temperatureX,
} from "./aminebio/renderer";
import { atomLabelText, implicitHydrogens } from "./shared/molecule";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: AminebioState = aminebioModel.initialize(aminebioModel.defaultParams);
const results = (state: Partial<AminebioState> = {}, params: Partial<AminebioParams> = {}) =>
  aminebioModel.derive({ ...base, ...state }, { ...aminebioModel.defaultParams, ...params });

interface Extent {
  text: string;
  left: number;
  right: number;
  y: number;
}

/** Render, and record where every piece of text lands (the recorder measures 6 px a character). */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const extents: Extent[] = [];
  let align = "left";
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    set(t, key: string, value) {
      if (key === "textAlign") align = String(value);
      t[key] = value;
      return true;
    },
    get(t, key: string) {
      const value = t[key] as (...args: unknown[]) => unknown;
      if (key !== "fillText") return value;
      return (s: string, x: number, y: number) => {
        const w = String(s).length * 6;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        extents.push({ text: String(s), left, right: left + w, y });
        return value(s, x, y);
      };
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeAminebioLayout(width);
  aminebioRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, layout, text: () => rec.texts().join(" | ") };
};

const amine = (name: string) => AMINEBIO_AMINES.findIndex((a) => a.name === name);

describe("basicity view", () => {
  it("names the amine and gives pKb, Kb and the comparison with ammonia", () => {
    const t = render(results({}, { amine: amine("aniline") }), ["basicity", "labels"]).text();
    expect(t).toContain("C₆H₅NH₂ · aniline");
    expect(t).toContain("pKb = 9.38 · Kb = 4.2 × 10⁻¹⁰");
    expect(t).toContain("NH₃ is 43 000× more basic");
    expect(t).toContain("N's lone pair is spread into the ring");
    expect(render(results({}, { amine: amine("N-ethylethanamine") }), ["basicity", "labels"]).text()).toContain("56× as basic as NH₃");
  });

  it("draws the two curly arrows of aniline's delocalisation only with words, and none for an alkylamine", () => {
    expect(render(results({}, { amine: amine("aniline") }), ["basicity", "labels"]).of("quadraticCurveTo")).toHaveLength(2);
    expect(render(results({}, { amine: amine("aniline") }), ["basicity"]).of("quadraticCurveTo")).toHaveLength(0);
    expect(render(results({}, { amine: amine("ethanamine") }), ["basicity", "labels"]).of("quadraticCurveTo")).toHaveLength(0);
    expect(render(results({}, { amine: amine("aniline") }), ["basicity"]).text()).not.toContain("pKb =");
  });

  it("builds every amine with the right hydrogens on N", () => {
    const nh = (name: string) => {
      const d = amineDrawing(AMINEBIO_AMINES[amine(name)]!);
      return implicitHydrogens(d.molecule, d.n);
    };
    expect(nh("ammonia")).toBe(3);
    expect(nh("methanamine")).toBe(2);
    expect(nh("N-methylmethanamine")).toBe(1);
    expect(nh("N,N-diethylethanamine")).toBe(0);
    expect(nh("aniline")).toBe(2);
    expect(nh("N-methylaniline")).toBe(1);
    expect(nh("N,N-dimethylaniline")).toBe(0);
    expect(nh("phenylmethanamine")).toBe(2);
    for (const a of AMINEBIO_AMINES) {
      const d = amineDrawing(a);
      d.molecule.atoms.forEach((_, i) => expect(implicitHydrogens(d.molecule, i), `${a.name} ${i}`).toBeGreaterThanOrEqual(0));
      if (a.kind === "aryl") d.molecule.atoms.slice(0, 6).forEach((_, i) => expect(implicitHydrogens(d.molecule, i), a.name).toBeLessThanOrEqual(1));
    }
  });

  it("puts stronger bases to the left of the scale", () => {
    const l = computeAminebioLayout(325);
    expect(pKbX(l, 3)).toBeLessThan(pKbX(l, 9.38));
    expect(pKbX(l, 20)).toBe(pKbX(l, 14));
  });
});

describe("preparation and tests views", () => {
  it("shows Hoffmann's lost carbon", () => {
    const r = render(results({ carbons: 4 }, { route: 5, substrate: 0 }), ["prep", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["Hoffmann bromamide degradation", "CH₃(CH₂)₂CONH₂", "butanamide", "CH₃(CH₂)₂NH₂", "propan-1-amine", "start: 4 C", "amine: 3 C (one leaves as CO₃²⁻)"]));
    // Four start beads, three product beads and one hollow (lost) bead.
    expect(r.of("arc")).toHaveLength(8);
    expect(render(results({ carbons: 4 }, { route: 5 }), ["prep"]).text()).toContain("product: ?");
  });

  it("says when a route gives no amine", () => {
    const t = render(results({}, { route: 4, substrate: 1 }), ["prep", "labels"]).text();
    expect(t).toContain("no amine");
    expect(t).toContain("Aryl halides do not react with the phthalimide anion");
  });

  it("gives each test's result with words", () => {
    const t = render(results({}, { amine: amine("N-ethylethanamine") }), ["tests", "labels"]).text();
    expect(t).toContain("Tests on (C₂H₅)₂NH");
    expect(t).toContain("no isocyanide: no smell");
    expect(t).toContain("sulphonamide, insoluble in KOH");
    const aniline = render(results({}, { amine: amine("aniline") }), ["tests", "labels"]).text();
    expect(aniline).toContain("R–NC, an isocyanide: foul smell");
    expect(aniline).toContain("a diazonium salt (at 273–278 K)");
    expect(render(results({}, { amine: amine("aniline") }), ["tests"]).text()).not.toContain("foul");
  });
});

describe("diazonium view", () => {
  it("draws Ar–N⁺≡N and the product, with the reaction named", () => {
    const d = diazoniumMolecule();
    expect(implicitHydrogens(d, 6)).toBe(0);
    expect(implicitHydrogens(d, 7)).toBe(0);
    expect(atomLabelText(d, 6, "skeletal")).toBe("N⁺");
    const t = render(results({}, { reagent: 2 }), ["diazo", "labels"]).text();
    expect(t).toContain("C₆H₅N₂⁺Cl⁻ + CuCN/KCN");
    expect(t).toContain("Sandmeyer reaction: N₂ lost");
    expect(t).toContain("benzonitrile");
    expect(render(results({}, { reagent: 10 }), ["diazo", "labels"]).text()).toContain("p-hydroxyazobenzene · orange dye");
    expect(render(results({}, { reagent: 11 }), ["diazo", "labels"]).text()).toContain("p-aminoazobenzene · yellow dye");
  });

  it("builds sensible products: an –N=N– bridge for the dyes", () => {
    AMINEBIO_DIAZO.forEach((_, k) => {
      const m = diazoProductMolecule(k);
      m.atoms.forEach((__, i) => expect(implicitHydrogens(m, i), `${k} ${i}`).toBeGreaterThanOrEqual(0));
    });
    const dye = diazoProductMolecule(10);
    expect(dye.bonds.filter((b) => b.order === 2 && dye.atoms[b.a]!.el === "N" && dye.atoms[b.b]!.el === "N")).toHaveLength(1);
    expect(dye.atoms.filter((a) => a.el === "C")).toHaveLength(12);
  });

  it("marks the temperature and says whether the salt keeps", () => {
    expect(render(results({ temperature: 276 }), ["diazo", "labels"]).text()).toContain("Kept: made and used at 273–278 K");
    expect(render(results({ temperature: 290 }), ["diazo", "labels"]).text()).toContain("Too warm: decomposes to phenol + N₂");
    expect(render(results({ temperature: 290 }), ["diazo"]).text()).not.toContain("Too warm");
    const l = computeAminebioLayout(325);
    expect(temperatureX(l, 273)).toBeLessThan(temperatureX(l, 278));
  });
});

describe("sugar views", () => {
  it("describes the sugar with words", () => {
    const t = render(results({}, { sugar: 3 }), ["sugars", "labels"]).text();
    expect(t).toContain("sucrose · C₁₂H₂₂O₁₁");
    expect(t).toContain("disaccharide · non-reducing");
    expect(t).toContain("Hydrolysis gives glucose + fructose");
    expect(t).toContain("M = 342.30 g/mol");
    expect(t).toContain("Sucrose +66.5° → invert sugar −19.95°");
    const hidden = render(results({}, { sugar: 3 }), ["sugars"]).text();
    expect(hidden).not.toMatch(/342|reducing/);
  });

  it("draws α with C1–OH down and β with it up", () => {
    const alpha = haworthMolecule("alpha");
    const beta = haworthMolecule("beta");
    expect(alpha.atoms[6]!.y).toBeGreaterThan(alpha.atoms[1]!.y);
    expect(beta.atoms[6]!.y).toBeLessThan(beta.atoms[1]!.y);
    expect(implicitHydrogens(alpha, 0)).toBe(0); // ring O
  });

  it("gives the mixture's rotation with words", () => {
    expect(render(results({ beta: 0 }), ["anomers", "labels"]).text()).toContain("Specific rotation of the mixture: +112.0°");
    expect(render(results({ beta: 64 }), ["anomers", "labels"]).text()).toContain("+52.3°");
    expect(render(results({ beta: 64 }), ["anomers"]).text()).not.toContain("+52.3°");
    const l = computeAminebioLayout(325);
    expect(rotationX(l, 18.7)).toBeLessThan(rotationX(l, 112));
  });
});

describe("protein, enzyme and DNA views", () => {
  it("draws glycine's forms with the right charges", () => {
    const label = (form: number, i: number) => atomLabelText(aminoAcidMolecule("H", form), i, "condensed");
    expect([label(1, 0), label(1, 3)]).toEqual(["H₃N⁺", "OH"]);
    expect([label(2, 0), label(2, 3)]).toEqual(["H₃N⁺", "O⁻"]);
    expect([label(3, 0), label(3, 3)]).toEqual(["H₂N", "O⁻"]);
    expect(label(2, 1)).toBe("CH₂");
    expect(atomLabelText(aminoAcidMolecule("CH₃", 2), 1, "condensed")).toBe("CH");
  });

  it("gives the form, charge, pI and peptide with words", () => {
    const t = render(results({ pH: 6, residues: 3 }, { aminoAcid: 0 }), ["proteins", "labels"]).text();
    expect(t).toContain("glycine at pH 6.0");
    expect(t).toContain("zwitterion · average charge 0.00");
    expect(t).toContain("pI = 5.97: no net charge");
    expect(t).toContain("3 amino acids · 2 peptide bonds · 2 H₂O lost");
    expect(t).toContain("M = 189.18 g/mol");
    expect(render(results({ pH: 1 }), ["proteins", "labels"]).text()).toContain("cation · average charge +0.96");
    expect(render(results({ pH: 6 }), ["proteins"]).text()).not.toContain("pI =");
    const l = computeAminebioLayout(325);
    expect(pHX(l, 2.34)).toBeLessThan(pHX(l, 9.6));
  });

  it("seats the substrate when the enzyme fits", () => {
    expect(render(results({}, { enzyme: 1, sugar: 4 }), ["enzymes", "labels"]).text()).toContain("Fits: maltose → 2 glucose");
    expect(render(results({}, { enzyme: 1, sugar: 3 }), ["enzymes", "labels"]).text()).toContain("No fit");
    const t = render(results({}, { vitamin: 5 }), ["enzymes", "labels"]).text();
    expect(t).toContain("Vitamin C · ascorbic acid");
    expect(t).toContain("Lack of it: scurvy (bleeding gums)");
    expect(render(results({}, { vitamin: 5 }), ["enzymes"]).text()).not.toContain("scurvy");
  });

  it("pairs the bases by Chargaff's rule", () => {
    const pairs = basePairs(20);
    expect(pairs).toHaveLength(10);
    expect(pairs.filter(([a]) => a === "G" || a === "C")).toHaveLength(4);
    for (const [a, b] of pairs) expect(`${a}${b}`).toMatch(/^(AT|TA|GC|CG)$/);
    const t = render(results({ guanine: 20 }, { base: 3 }), ["dna", "labels"]).text();
    expect(t).toContain("A 30%");
    expect(t).toContain("G 20%");
    expect(t).toContain("240 H-bonds per 100 pairs");
    expect(t).toContain("pyrimidine · pairs with A (2 H-bonds) · DNA only");
    const hidden = render(results({ guanine: 20 }), ["dna"]).texts();
    expect(hidden.join(" ")).not.toContain("30%");
    expect(hidden).not.toContain("G");
  });
});

const VIEWS: [string, Partial<AminebioState>, Partial<AminebioParams>, string[]][] = [
  ["basicity, aniline", {}, { amine: 8 }, ["basicity", "labels"]],
  ["basicity, nitroaniline", {}, { amine: 14 }, ["basicity", "labels"]],
  ["basicity, triethylamine", {}, { amine: 6 }, ["basicity", "labels"]],
  ["basicity, dimethylaniline", {}, { amine: 10 }, ["basicity", "labels"]],
  ["basicity, methoxyaniline", {}, { amine: 12 }, ["basicity", "labels"]],
  ["prep, Hoffmann", { carbons: 6 }, { route: 5 }, ["prep", "labels"]],
  ["prep, aryl nitro", {}, { route: 0, substrate: 1 }, ["prep", "labels"]],
  ["prep, nitrile", { carbons: 6 }, { route: 2 }, ["prep", "labels"]],
  ["prep, ammonolysis", { carbons: 6 }, { route: 1 }, ["prep", "labels"]],
  ["prep, Gabriel aryl", {}, { route: 4, substrate: 1 }, ["prep", "labels"]],
  ["tests", {}, { amine: 8 }, ["tests", "labels"]],
  ["tests, 3°", {}, { amine: 6 }, ["tests", "labels"]],
  ["diazo, coupling", { temperature: 303 }, { reagent: 10 }, ["diazo", "labels"]],
  ["diazo, nitro", {}, { reagent: 9 }, ["diazo", "labels"]],
  ["diazo, benzene", {}, { reagent: 8 }, ["diazo", "labels"]],
  ["sugars, sucrose", {}, { sugar: 3 }, ["sugars", "labels"]],
  ["sugars, starch", {}, { sugar: 6 }, ["sugars", "labels"]],
  ["sugars, lactose", {}, { sugar: 5 }, ["sugars", "labels"]],
  ["anomers", { beta: 64 }, {}, ["anomers", "labels"]],
  ["proteins, alanine", { pH: 13, residues: 10 }, { aminoAcid: 1 }, ["proteins", "labels"]],
  ["enzymes", {}, { enzyme: 3, sugar: 7, vitamin: 6 }, ["enzymes", "labels"]],
  ["enzymes, fit", {}, { enzyme: 2, sugar: 5, vitamin: 7 }, ["enzymes", "labels"]],
  ["dna", { guanine: 50 }, { base: 2 }, ["dna", "labels"]],
  ["dna, uracil", { guanine: 0 }, { base: 4 }, ["dna", "labels"]],
];

describe("on a phone", () => {
  it.each(VIEWS)("keeps the %s view inside a 325 px canvas", (_name, state, params, layers) => {
    const r = render(results(state, params), layers, 325);
    expect(r.extents.length).toBeGreaterThan(0);
    for (const e of r.extents) {
      expect(e.left, e.text).toBeGreaterThanOrEqual(0);
      expect(e.right, e.text).toBeLessThanOrEqual(325);
      expect(e.y, e.text).toBeGreaterThanOrEqual(0);
      expect(e.y, e.text).toBeLessThanOrEqual(r.layout.height);
      expect(e.text.length, e.text).toBeLessThanOrEqual(55);
    }
    for (const c of [...r.of("moveTo"), ...r.of("lineTo"), ...r.of("arc")]) {
      const [px, py] = c.args as number[];
      expect(px, c.method).toBeGreaterThanOrEqual(0);
      expect(px, c.method).toBeLessThanOrEqual(325);
      expect(py, c.method).toBeGreaterThanOrEqual(0);
      expect(py, c.method).toBeLessThanOrEqual(r.layout.height);
    }
  });

  it("is as tall as the house style asks", () => {
    expect(computeAminebioLayout(325).height).toBeGreaterThanOrEqual(330);
    expect(computeAminebioLayout(325).height).toBeLessThanOrEqual(420);
  });
});
