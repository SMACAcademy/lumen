import { crystalModel, type CrystalParams, LIGANDS } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeCrystalLayout, crystalRenderer } from "./crystal/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (metal: CrystalParams["metal"], ligand: string) =>
  crystalModel.derive({ ligand: LIGANDS.findIndex((l) => l.id === ligand), clock: 0 }, { metal });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  crystalRenderer.draw(rec.ctx, computeCrystalLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const ALL = ["splitting", "spectrum", "labels"];

describe("what the crystal renderer draws", () => {
  it("writes the complex, its splitting and what it absorbs", () => {
    const texts = render(results("ti3", "h2o"), ALL).texts();
    expect(texts).toEqual(expect.arrayContaining(["[Ti(H₂O)₆]³⁺", "violet", "absorbs 493 nm", "Δo"]));
    expect(texts.join(" ")).toContain("20,300 cm⁻¹");
  });

  it("says high spin or low spin, and why", () => {
    expect(render(results("fe2", "cn"), ALL).texts().join(" ")).toContain("low spin, 0 unpaired");
    expect(render(results("fe2", "h2o"), ALL).texts().join(" ")).toContain("high spin, 4 unpaired");
    expect(render(results("cr3", "nh3"), ALL).texts().join(" ")).toContain("only one way to fill");
    expect(render(results("zn2", "nh3"), ALL).texts().join(" ")).toContain("colourless");
  });

  it("shows the CFSE, and marks ultraviolet absorption as such", () => {
    expect(render(results("co3", "nh3"), ALL).texts()).toContain("CFSE = −2.4 Δo");
    expect(render(results("co3", "cn"), ALL).texts()).toContain("absorbs UV");
  });

  it("draws one box per d orbital, twice over", () => {
    expect(render(results("ti3", "h2o"), ["splitting"]).of("strokeRect")).toHaveLength(5);
  });
});
