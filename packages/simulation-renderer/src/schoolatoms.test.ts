import { schoolAtomsModel, SA_SUBSTANCE_ORDER, SA_SUBSTANCES, type SchoolAtomsParams, type SchoolAtomsState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { atomicityName, computeSchoolAtomsLayout, massSum, moleculePositions, octaveCell, saScientific, schoolAtomsRenderer, trendCentre } from "./schoolatoms/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: SchoolAtomsState = { mass: 8, octave: 2, member: 1 };
const results = (params: Partial<SchoolAtomsParams> = {}, state: Partial<SchoolAtomsState> = {}) =>
  schoolAtomsModel.derive({ ...base, ...state }, { ...schoolAtomsModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  schoolAtomsRenderer.draw(rec.ctx, computeSchoolAtomsLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

describe("text helpers", () => {
  it("writes powers of ten and sums of masses", () => {
    expect(saScientific(1.2044e24)).toBe("1.204 × 10²⁴");
    expect(saScientific(6.022e22)).toBe("6.022 × 10²²");
    expect(saScientific(0.25)).toBe("0.25");
    expect(massSum({ H: 2, O: 1 })).toBe("2 × 1 + 16 = 18 u");
    expect(massSum({ Na: 1, Cl: 1 })).toBe("23 + 35.5 = 58.5 u");
    expect([1, 2, 3, 4, 8].map(atomicityName)).toEqual(["monatomic", "diatomic", "triatomic", "tetra-atomic", "poly-atomic"]);
  });
});

describe("the molecule view", () => {
  it("draws one disc per atom", () => {
    expect(render(results({ substance: "s8" }), ["molecule"]).of("arc")).toHaveLength(8);
    expect(render(results({ substance: "h2o" }), ["molecule"]).of("arc")).toHaveLength(3);
  });

  it("gives the molecular mass only with the labels", () => {
    expect(text(results({ substance: "h2o" }), ["molecule", "labels"])).toContain("molecular mass = 2 × 1 + 16 = 18 u");
    expect(text(results({ substance: "o3" }), ["molecule", "labels"])).toContain("3 atoms in one molecule: triatomic");
    const hidden = text(results({ substance: "h2o" }), ["molecule"]);
    expect(hidden).toContain("Atomic masses: H = 1 u, O = 16 u");
    expect(hidden).not.toContain("18 u");
  });

  it("keeps every molecule on a phone's canvas", () => {
    const layout = computeSchoolAtomsLayout(325);
    for (const id of SA_SUBSTANCE_ORDER) {
      for (const a of moleculePositions(SA_SUBSTANCES[id], layout.width / 2, 150, 18)) {
        expect(a.x - 18, id).toBeGreaterThanOrEqual(0);
        expect(a.x + 18, id).toBeLessThanOrEqual(325);
        expect(a.y - 18, id).toBeGreaterThan(30);
      }
    }
  });
});

describe("the formula view", () => {
  it("crosses the valencies into the formula", () => {
    const t = text(results({ cation: "al", anion: "so4" }), ["formula", "labels"]);
    expect(t).toContain("Al₂(SO₄)₃");
    expect(t).toContain("charges: 2 × (+3) = +6, 3 × (−2) = −6");
    expect(t).toContain("mass = 2 × 27 + 3 × 96 = 342 u");
    expect(text(results({ cation: "mg", anion: "o" }), ["formula", "labels"])).toContain("crossed 2 and 2, then cancelled the common factor");
  });

  it("hides the answer without the labels", () => {
    const t = text(results({ cation: "al", anion: "so4" }), ["formula"]);
    expect(t).toContain("Al ? SO₄ ?");
    expect(t).not.toContain("342");
  });
});

describe("the mole view", () => {
  it("goes from grams to moles to particles", () => {
    const t = text(results({ substance: "na" }, { mass: 46 }), ["mole", "labels"]);
    expect(t).toContain("46 g");
    expect(t).toContain("÷ 23 g/mol");
    expect(t).toContain("2 mol");
    expect(t).toContain("1.204 × 10²⁴ atoms");
    expect(text(results({ substance: "o2" }, { mass: 8 }), ["mole", "labels"])).toContain("= 3.011 × 10²³ atoms (2 in each)");
  });

  it("hides moles and particles without the labels", () => {
    const t = text(results({ substance: "he" }, { mass: 52 }), ["mole"]);
    expect(t).toContain("? mol");
    expect(t).not.toContain("13 mol");
  });
});

describe("the early tables", () => {
  it("marks the average of a triad", () => {
    const t = text(results({ triad: "li-na-k" }), ["triads", "labels"]);
    expect(t).toContain("(6.9 + 39.0) ÷ 2 = 22.95");
    expect(t).toContain("Na is 0.05 from it (0.22%): a triad");
    expect(text(results({ triad: "n-p-as" }), ["triads", "labels"])).toContain("not a triad");
    expect(text(results({ triad: "li-na-k" }), ["triads"])).not.toContain("22.95");
  });

  it("picks out an element and its eighth in Newlands' table", () => {
    expect(text(results({}, { octave: 2 }), ["octaves", "labels"])).toContain("Li → Na: the eighth element on");
    expect(text(results({}, { octave: 11 }), ["octaves", "labels"])).toContain("not alike: past calcium the octaves fail");
    expect(text(results({}, { octave: 11 }), ["octaves"])).not.toContain("not alike");
  });

  it("shows Mendeleev's gap and the element that filled it", () => {
    const t = text(results({ gap: "eka-silicon", pair: "te-i" }), ["mendeleev", "labels"]);
    expect(t).toContain("oxide EO₂, chloride ECl₄");
    expect(t).toContain("mass 72.6 (0.83% off)");
    expect(t).toContain("Mass puts them the wrong way round");
    expect(text(results({ gap: "eka-aluminium" }), ["mendeleev", "labels"])).toContain("oxide E₂O₃, chloride ECl₃");
    expect(text(results({ gap: "eka-silicon" }), ["mendeleev"])).toContain("oxide ?, chloride ?");
  });
});

describe("the trends view", () => {
  it("names the element and its valency", () => {
    const t = text(results({ series: "period-3" }, { member: 4 }), ["trends", "labels"]);
    expect(t).toContain("Si: Z = 14, period 3, group 14, a metalloid");
    expect(t).toContain("radius 117 pm · 4 outer electrons, valency 4");
  });

  it("draws bigger atoms for bigger radii", () => {
    const rec = render(results({ series: "group-1" }), ["trends"]);
    const radii = rec.of("arc").map((c) => c.args[2] as number);
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1]!);
  });

  it("hides the radii and the metal colours without the labels", () => {
    expect(text(results({ series: "group-14" }), ["trends"])).not.toMatch(/metal|pm/);
  });
});

describe("on a phone", () => {
  const cases: [Partial<SchoolAtomsParams>, Partial<SchoolAtomsState>, string][] = [
    [{ substance: "nacl" }, {}, "molecule"],
    [{ substance: "s8" }, {}, "molecule"],
    [{ cation: "ca", anion: "po4" }, {}, "formula"],
    [{ cation: "mg", anion: "o" }, {}, "formula"],
    [{ substance: "nacl" }, { mass: 150 }, "mole"],
    [{ triad: "ca-sr-ba" }, {}, "triads"],
    [{}, { octave: 22 }, "octaves"],
    [{ gap: "eka-aluminium", pair: "ar-k" }, {}, "mendeleev"],
    [{ series: "period-2" }, { member: 8 }, "trends"],
    [{ series: "group-14" }, { member: 3 }, "trends"],
  ];

  it.each(cases)("keeps the text of %o inside 325 px", (params, state, layer) => {
    const layout = computeSchoolAtomsLayout(325);
    const rec = recordingContext();
    const drawn: { t: string; x: number; y: number; align: string }[] = [];
    const ctx = rec.ctx as unknown as Record<string, unknown>;
    ctx.fillText = (t: string, x: number, y: number) => drawn.push({ t, x, y, align: String(ctx.textAlign ?? "left") });
    schoolAtomsRenderer.draw(rec.ctx, layout, { results: results(params, state), trace: null, layers: new Set([layer, "labels"]), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    expect(drawn.length).toBeGreaterThan(3);
    for (const { t, x, y, align } of drawn) {
      expect(t.length, t).toBeLessThanOrEqual(55);
      const w = t.length * 6;
      const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      expect(left, t).toBeGreaterThanOrEqual(0);
      expect(left + w, t).toBeLessThanOrEqual(325);
      expect(y, t).toBeLessThanOrEqual(layout.height);
      expect(y, t).toBeGreaterThanOrEqual(0);
    }
  });

  it("fits the octave table and the trend row inside", () => {
    const layout = computeSchoolAtomsLayout(325);
    const last = octaveCell(layout, 33);
    expect(octaveCell(layout, 7).x + octaveCell(layout, 7).width).toBeLessThanOrEqual(325 - 16 + 0.01);
    expect(last.y + last.height).toBeLessThan(layout.height - 60);
    const t = trendCentre(layout, 8, 8);
    expect(t.x + t.cell / 2).toBeLessThanOrEqual(325 - 16 + 0.01);
  });
});
