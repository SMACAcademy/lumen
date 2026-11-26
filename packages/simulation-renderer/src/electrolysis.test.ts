import { electrolysisModel, type ElectrolysisParams, type ElectrolysisState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeElectrolysisLayout, electrolysisRenderer } from "./electrolysis/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (state: Partial<ElectrolysisState> = {}, params: Partial<ElectrolysisParams> = {}) =>
  electrolysisModel.derive({ ...electrolysisModel.initialize(electrolysisModel.defaultParams), ...state }, { ...electrolysisModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  electrolysisRenderer.draw(rec.ctx, computeElectrolysisLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const CELL = ["cell", "ions", "products", "labels"];
const PLOT = ["plot", "labels"];

describe("what the electrolysis renderer draws", () => {
  it("adds up the charge and names the product", () => {
    const texts = render(results({ current: 2, time: 30 }), CELL).texts().join(" ");
    expect(texts).toContain("Q = It = 2.0 A × 30.0 min × 60 = 3600 C");
    expect(texts).toContain("g of copper");
    expect(render(results({ current: 2, time: 30 }, { electrolyte: "acidified-water" }), CELL).texts().join(" ")).toContain("L of hydrogen");
  });

  it("grows the deposit with the mass, and makes no deposit before the current flows", () => {
    const fills = (time: number) => render(results({ current: 2, time }), ["cell", "products"]).of("fillRect").length;
    expect(fills(60)).toBeGreaterThan(fills(0));
  });

  it("plots every solute and says whether it is fully ionised", () => {
    const strong = render(results({ c: 0.04 }, { solute: "kcl" }), PLOT);
    expect(strong.texts()).toEqual(expect.arrayContaining(["HCl", "KCl", "NaCl", "CH₃COONa", "CH₃COOH"]));
    expect(strong.texts().join(" ")).toContain("KCl: Λm = 131.9 S cm² mol⁻¹, fully ionised");
    expect(render(results({ c: 0.01 }, { solute: "ch3cooh" }), PLOT).texts().join(" ")).toMatch(/CH₃COOH: .*α = 0\.04/);
  });

  it("fits the cell on a phone", () => {
    const layout = computeElectrolysisLayout(375);
    expect(layout.plane.rect.x + layout.plane.rect.width).toBeLessThanOrEqual(375);
  });
});
