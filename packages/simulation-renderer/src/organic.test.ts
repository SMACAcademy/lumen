import { organicModel, ORGANIC_SUBSTITUENT_ORDER, type OrganicParams, type OrganicState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeOrganicLayout, intermediateMolecule, organicRatioText, organicRenderer, paperGeometry, pKaX, resonancePicture } from "./organic/renderer";
import { implicitHydrogens } from "./shared/molecule";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: OrganicState = organicModel.initialize(organicModel.defaultParams);
const results = (state: Partial<OrganicState> = {}, params: Partial<OrganicParams> = {}) =>
  organicModel.derive({ ...base, ...state }, { ...organicModel.defaultParams, ...params });

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
  const layout = computeOrganicLayout(width);
  organicRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, layout, text: () => rec.texts().join(" | ") };
};

const NAMING = ["structure", "numbers", "labels"];
const VIEWS: [string, Partial<OrganicState>, Partial<OrganicParams>, string[]][] = [
  ["naming", { chain: 8, ethyl: 4, methyl: 2, methyl2: 7, bond: 1, bondAt: 5, group: 1, groupAt: 1 }, {}, NAMING],
  ["naming, small", { chain: 1, methyl: 0, group: 3, groupAt: 1 }, {}, NAMING],
  ["naming, invalid", { chain: 4, methyl: 2, group: 3, groupAt: 2 }, {}, NAMING],
  ["isomers", { isomer: 3, other: 5 }, { formula: "c4h10o" }, ["isomers", "labels"]],
  ["isomers, alkenes", { isomer: 1, other: 3 }, { formula: "c4h8" }, ["isomers", "labels"]],
  ["isomers, carbonyls", { isomer: 0, other: 1 }, { formula: "c3h6o" }, ["isomers", "labels"]],
  ["acids", {}, { acid: 9 }, ["acids", "labels"]],
  ["resonance", {}, { substituent: "cooh" }, ["resonance", "labels"]],
  ["intermediates", { degree: 3 }, { species: "anion" }, ["intermediates", "labels"]],
  ["electromeric", {}, {}, ["electromeric"]],
  ["paper", { front: 10 }, {}, ["paper", "labels"]],
  ["paper, early", { front: 1 }, {}, ["paper", "labels"]],
];

describe("naming view", () => {
  it("names the molecule and gives its formula", () => {
    const r = render(results({ chain: 4, methyl: 2 }), NAMING);
    expect(r.texts()).toEqual(expect.arrayContaining(["2-methylbutane", "C₅H₁₂ · alkane · 72.15 g/mol", "1", "2", "3", "4"]));
  });

  it("says when the parent chain is not the one drawn, or is numbered from the other end", () => {
    expect(render(results({ chain: 4, methyl: 0, ethyl: 2 }), NAMING).text()).toContain("Longest chain: 5 C, not the one drawn");
    expect(render(results({ chain: 4, methyl: 3 }), NAMING).text()).toContain("Numbered from the other end: lower locants");
    expect(render(results({ chain: 3, methyl: 0, group: 2, groupAt: 2 }), NAMING).text()).toContain("Also written propanone");
    expect(render(results({ chain: 5, methyl: 0, bond: 1, bondAt: 2 }), NAMING).text()).toContain("Has cis and trans forms");
  });

  it("explains a structure it will not name", () => {
    const t = render(results({ chain: 4, methyl: 0, group: 3, groupAt: 2 }), NAMING).texts();
    expect(t).toEqual(expect.arrayContaining(["No name", "C2: a carbon would have more than four bonds"]));
  });

  it("hides the name and the numbering without words", () => {
    const t = render(results({ chain: 4, methyl: 0, ethyl: 2 }), ["structure", "numbers"]).texts();
    expect(t).toContain("name: ?");
    expect(t.join(" ")).not.toMatch(/methylpentane|Longest/);
    expect(t).not.toContain("5");
  });

  it("labels the oxygen of an alcohol and leaves skeletal carbons bare", () => {
    const t = render(results({ chain: 3, methyl: 0, group: 1, groupAt: 2 }), NAMING).texts();
    expect(t).toEqual(expect.arrayContaining(["propan-2-ol", "O", "H"]));
    expect(t).not.toContain("C");
  });
});

describe("isomers view", () => {
  it("shows two isomers and how they are related", () => {
    const t = render(results({ isomer: 4, other: 6 }, { formula: "c4h10o" }), ["isomers", "labels"]).text();
    expect(t).toContain("A: 1-methoxypropane");
    expect(t).toContain("B: ethoxyethane");
    expect(t).toContain("A and B are metamers");
    expect(t).toContain("7 structural in all · four alcohols, three ethers");
    expect(render(results({ isomer: 1, other: 2 }, { formula: "c4h8" }), ["isomers", "labels"]).text()).toContain("A and B are geometrical isomers");
  });

  it("hides the relation and the count without words", () => {
    const t = render(results({ isomer: 4, other: 6 }, { formula: "c4h10o" }), ["isomers"]).text();
    expect(t).not.toMatch(/metamers|structural/);
    expect(t).toContain("C₄H₁₀O");
    expect(t).not.toContain("7 shown");
  });
});

describe("inductive view", () => {
  it("gives pKa, Ka and the strength against ethanoic acid", () => {
    const t = render(results({}, { acid: 3 }), ["acids", "labels"]).text();
    expect(t).toContain("Cl₃CCOOH · trichloroethanoic acid");
    expect(t).toContain("pKa = 0.64");
    expect(t).toContain("13 000× as strong as ethanoic acid");
    expect(t).toContain("3 Cl on the α carbon: −I pulls electrons");
    expect(organicRatioText(10 ** 4.12)).toBe("13 000");
    expect(organicRatioText(10 ** (4.76 - 4.82))).toBe("0.87");
  });

  it("marks the pull on the C–Cl bonds and back along the chain", () => {
    // ClCH₂COOH: one C–Cl mark, one C–C mark. 4-chlorobutanoic acid: one C–Cl mark and three C–C marks.
    const marks = (acid: number) => render(results({}, { acid }), ["acids"]).of("fill").length;
    expect(marks(10) - marks(1)).toBe(2);
    expect(marks(0)).toBe(marks(7));
  });

  it("puts strong acids to the left of the scale", () => {
    const layout = computeOrganicLayout(325);
    expect(pKaX(layout, 0.64)).toBeLessThan(pKaX(layout, 4.76));
    expect(pKaX(layout, -3)).toBe(pKaX(layout, 0));
    expect(render(results({}, { acid: 3 }), ["acids"]).text()).not.toContain("pKa =");
  });
});

describe("resonance view", () => {
  it("draws two curly arrows and the contributor", () => {
    const r = render(results({}, { substituent: "oh" }), ["resonance", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["–OH: −I, +R", "CH₂=CH–OH ⟷ ⁻CH₂–CH=OH⁺"]));
    expect(r.of("quadraticCurveTo")).toHaveLength(2);
    expect(render(results({}, { substituent: "cn" }), ["resonance", "labels"]).text()).toContain("–CN: −I, −R");
    expect(render(results({}, { substituent: "ch3" }), ["resonance", "labels"]).text()).toContain("hyperconjugation");
  });

  it("hides the effect and the arrows without words", () => {
    const r = render(results({}, { substituent: "no2" }), ["resonance"]);
    expect(r.text()).not.toMatch(/−R|\+R/);
    expect(r.of("quadraticCurveTo")).toHaveLength(0);
  });

  it("builds every picture with sensible hydrogens", () => {
    for (const id of ORGANIC_SUBSTITUENT_ORDER) {
      const { molecule } = resonancePicture(id);
      molecule.atoms.forEach((_, i) => expect(implicitHydrogens(molecule, i), `${id} ${i}`).toBeGreaterThanOrEqual(0));
      expect(implicitHydrogens(molecule, 0), id).toBe(2); // the CH₂= end
    }
    const nitro = resonancePicture("no2").molecule;
    expect(implicitHydrogens(nitro, 2)).toBe(0); // N⁺: four bonds
  });
});

describe("intermediates view", () => {
  it("names the species and gives its α-H, hybridisation and electrons", () => {
    const t = render(results({ degree: 3 }, { species: "cation" }), ["intermediates", "labels"]).text();
    expect(t).toContain("(CH₃)₃C⁺ · 3° carbocation");
    expect(t).toContain("α-H: 9 · sp² · 6 valence electrons");
    expect(t).toContain("stability increases →");
    expect(render(results({ degree: 0 }, { species: "anion" }), ["intermediates", "labels"]).text()).toContain("← stability increases");
  });

  it("draws two p lobes for sp², one lone-pair lobe for the carbanion", () => {
    expect(render(results({}, { species: "cation" }), ["intermediates"]).of("ellipse")).toHaveLength(2);
    expect(render(results({}, { species: "anion" }), ["intermediates"]).of("ellipse")).toHaveLength(1);
    expect(render(results({ degree: 3 }, { species: "cation" }), ["intermediates"]).text()).not.toContain("α-H");
  });

  it("gives the central carbon no hydrogens of its own", () => {
    for (const s of ["cation", "radical", "anion"] as const) {
      for (let d = 0; d <= 3; d++) expect(implicitHydrogens(intermediateMolecule(s, d), 0)).toBe(0);
    }
    expect(implicitHydrogens(intermediateMolecule("cation", 2), 1)).toBe(3);
  });
});

describe("electromeric and paper views", () => {
  it("shows +E and −E with three arrows", () => {
    const r = render(results(), ["electromeric"]);
    expect(r.text()).toContain("→ CH₃–CH₂⁺");
    expect(r.text()).toContain("→ (CH₃)₂C(CN)–O⁻");
    expect(r.of("quadraticCurveTo")).toHaveLength(3);
  });

  it("puts each spot Rf × front up the paper, and gives Rf with words", () => {
    const r = render(results({ front: 8 }), ["paper", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["B: 3.6 cm · Rf 0.45", "front: 8.0 cm"]));
    const g = paperGeometry(r.layout);
    const spots = r.of("ellipse").map((c) => c.args[1] as number);
    expect(spots[1]).toBeCloseTo(g.base - 3.6 * g.perCm, 6);
    const hidden = render(results({ front: 8 }), ["paper"]).texts();
    expect(hidden).toEqual(expect.arrayContaining(["A", "B", "C"]));
    expect(hidden.join(" ")).not.toContain("Rf 0.45");
  });
});

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
  });

  it("keeps the paper and its ruler on the canvas", () => {
    const layout = computeOrganicLayout(325);
    const g = paperGeometry(layout);
    expect(g.left - 22 - 6 * 2).toBeGreaterThanOrEqual(0);
    expect(g.right + 10 + "B: 10.0 cm · Rf 0.45".length * 6).toBeLessThanOrEqual(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
  });
});
