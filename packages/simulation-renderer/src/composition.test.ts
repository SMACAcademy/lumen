import { compositionModel, type CompositionParams, type CompositionState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { compositionRenderer, computeCompositionLayout, isotopeName, massFraction } from "./composition/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: CompositionState = { abundance: 50, sample: 18, soluteMass: 58.5, volume: 1000, density: 1 };
const results = (params: Partial<CompositionParams> = {}, state: Partial<CompositionState> = {}) =>
  compositionModel.derive({ ...base, ...state }, { ...compositionModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  compositionRenderer.draw(rec.ctx, computeCompositionLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the composition renderer draws", () => {
  it("counts out a hundred atoms and weighs their average", () => {
    const rec = render(results({ element: "chlorine" }, { abundance: 76 }), ["isotopes", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["³⁵Cl × 76", "³⁷Cl × 24", "35.45"]));
    expect(rec.texts().join(" ")).toContain("0.76 × 34.97 + 0.24 × 36.97 = 35.45 u");
    // A hundred atoms, two in the legend, two at the ends of the mass line.
    expect(rec.of("arc")).toHaveLength(104);
  });

  it("puts the average between the isotopes, nearer the commoner one", () => {
    expect(isotopeName(35, "Cl")).toBe("³⁵Cl");
    expect(massFraction(34.969, 34.969, 36.966)).toBe(0);
    expect(massFraction(35.45, 34.969, 36.966)).toBeLessThan(0.5);
    expect(massFraction(99, 34.969, 36.966)).toBe(1);
  });

  it("shows a molecule's atoms, the share of the mass and the empirical formula", () => {
    const rec = render(results({ compound: "glucose" }, { sample: 90 }), ["formula", "labels"]);
    const texts = rec.texts();
    expect(texts).toEqual(expect.arrayContaining(["Glucose  C₆H₁₂O₆", "C: 6 × 12", "H: 12 × 1", "O: 6 × 16", "72 g · 40.0%", "12 g · 6.7%", "96 g · 53.3%"]));
    expect(texts.join(" ")).toContain("Empirical formula CH₂O, × 6 = C₆H₁₂O₆");
    expect(texts.join(" ")).toContain("M = 180 g/mol · 90 g is 0.500 mol");
    // 24 atoms and three legend dots.
    expect(rec.of("arc")).toHaveLength(27);
    expect(render(results({ compound: "water" }), ["formula", "labels"]).texts().join(" ")).toContain("already the simplest ratio");
  });

  it("gives the four measures of a solution", () => {
    const texts = render(results({ solute: "nacl" }, { soluteMass: 58.5, volume: 500 }), ["flask", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["58.5 g NaCl, made up to 500 mL", "molarity", "2.00 mol/L", "molality", "mole fraction", "mass %", "11.7%"]));
    expect(texts.join(" ")).toContain("n = 58.5 g ÷ 58.5 g/mol = 1.00 mol in 0.50 L");
  });

  it("keeps the answers off the drawing when the words are hidden", () => {
    expect(render(results({ compound: "glucose" }), ["formula"]).texts().join(" ")).not.toMatch(/%|Empirical|g\/mol/);
    expect(render(results({}, { volume: 500 }), ["flask"]).texts().join(" ")).not.toMatch(/mol\/L|mol in/);
    expect(render(results({}, { abundance: 76 }), ["isotopes"]).texts().join(" ")).not.toContain("35.45");
  });

  it("fits the widest row of atoms on a phone", () => {
    const rec = render(results({ compound: "glucose" }), ["formula"], 375);
    const right = Math.max(...rec.of("arc").map((c) => (c.args[0] as number) + (c.args[2] as number)));
    expect(right).toBeLessThanOrEqual(375 - 8);
  });
});
