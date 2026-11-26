import { enthalpyModel, type EnthalpyParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeEnthalpyLayout, enthalpyRenderer, enthalpyScale } from "./enthalpy/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (reaction: EnthalpyParams["reaction"], n = 1) => enthalpyModel.derive({ n, clock: 0 }, { reaction });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  enthalpyRenderer.draw(rec.ctx, computeEnthalpyLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the enthalpy renderer draws", () => {
  it("puts higher enthalpy higher up", () => {
    const y = enthalpyScale(computeEnthalpyLayout(800), [-890, 0]);
    expect(y(0)).toBeLessThan(y(-890));
  });

  it("draws the direct route and the route through the elements", () => {
    const texts = render(results("methane-liquid"), ["hess", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["reactants", "products", "elements (0)", "ΔH = −890.3 kJ", "+74.8 kJ", "−965.1 kJ"]));
    expect(texts.join(" ")).toContain("Exothermic: 1 mol of reaction releases 890.3 kJ");
  });

  it("says when heat is taken in", () => {
    expect(render(results("limestone", 2), ["hess", "labels"]).texts().join(" ")).toContain("Endothermic: 2 mol of reaction takes in 356.6 kJ");
  });

  it("breaks and forms bonds for gases, and declines for solids and liquids", () => {
    const hcl = render(results("hcl"), ["bonds", "labels"]).texts().join(" ");
    expect(hcl).toContain("break: +678.2 kJ");
    expect(hcl).toContain("form: −862 kJ");
    expect(hcl).toContain("Estimate −183.8 kJ/mol");
    expect(render(results("limestone"), ["bonds"]).texts().join(" ")).toContain("Bond enthalpies are for gases");
  });
});
