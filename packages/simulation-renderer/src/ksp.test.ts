import { kspModel, type KspParams, type KspState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeKspLayout, ionsShown, kspRenderer, Q_DECADES, scaleX, SOLUBILITY_DECADES } from "./ksp/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: KspState = { common: 0, pCation: 6, pAnion: 6 };
const results = (salt: KspParams["salt"] = "agcl", state: Partial<KspState> = {}) => kspModel.derive({ ...base, ...state }, { salt });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  kspRenderer.draw(rec.ctx, computeKspLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const DISSOLVE = ["beaker", "scale", "labels"];
const MIX = ["beaker", "ionic", "labels"];

describe("what the solubility renderer draws", () => {
  it("writes the equilibrium with its coefficients, and Ksp", () => {
    expect(render(results("agcl"), DISSOLVE).texts()).toEqual(expect.arrayContaining(["AgCl(s) ⇌ Ag⁺ + Cl⁻", "Ksp = 1.8 × 10⁻¹⁰"]));
    expect(render(results("caf2"), DISSOLVE).texts()).toContain("CaF₂(s) ⇌ Ca²⁺ + 2F⁻");
    expect(render(results("ag2cro4"), DISSOLVE).texts()).toContain("Ag₂CrO₄(s) ⇌ 2Ag⁺ + CrO₄²⁻");
  });

  it("gives the solubility in water, and how far a common ion pushes it down", () => {
    expect(render(results("agcl"), DISSOLVE).texts().join(" ")).toContain("In pure water S = 1.3 × 10⁻⁵ mol/L");
    const texts = render(results("agcl", { common: 0.1 }), DISSOLVE).texts();
    expect(texts.join(" ")).toContain("0.10 M Cl⁻: S = 1.8 × 10⁻⁹ mol/L, 7500× less");
    expect(texts).toContain("+ NaCl");
  });

  it("draws fewer ions of the salt once the common ion is in", () => {
    expect(ionsShown(-5)).toBeGreaterThan(ionsShown(-9));
    expect(ionsShown(-40)).toBe(1);
  });

  it("clouds the beaker and settles a precipitate only when Q passes Ksp", () => {
    const clear = render(results("agcl", { pCation: 6, pAnion: 6 }), MIX);
    const cloudy = render(results("agcl", { pCation: 4, pAnion: 4 }), MIX);
    expect(clear.texts().join(" ")).toContain("Q = 1.0 × 10⁻¹² < Ksp: stays clear");
    expect(cloudy.texts().join(" ")).toContain("Q = 1.0 × 10⁻⁸ > Ksp: a precipitate forms");
    expect(clear.texts()).not.toContain("precipitate");
    expect(cloudy.texts()).toContain("precipitate");
    expect(cloudy.of("quadraticCurveTo")).toHaveLength(1);
    expect(clear.of("quadraticCurveTo")).toHaveLength(0);
  });

  it("keeps the answers off the drawing when the words are hidden", () => {
    expect(render(results("baso4"), ["beaker", "scale"]).texts().join(" ")).not.toContain("S =");
    expect(render(results("agcl", { pCation: 4, pAnion: 4 }), ["beaker", "ionic"]).texts().join(" ")).not.toContain("Q =");
  });

  it("keeps every marker on the scale, on a phone", () => {
    const layout = computeKspLayout(375);
    for (const value of [-60, -12, -5, -1, 3]) {
      const x = scaleX(layout, value, SOLUBILITY_DECADES);
      expect(x).toBeGreaterThanOrEqual(layout.scale.x1);
      expect(x).toBeLessThanOrEqual(layout.scale.x2);
    }
    expect(scaleX(layout, 0, Q_DECADES)).toBeCloseTo(375 / 2, 6);
    expect(layout.beaker.x + layout.beaker.width + 14 + "precipitate".length * 6).toBeLessThanOrEqual(375);
  });
});
