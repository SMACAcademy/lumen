import { transitionModel } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeTransitionLayout, transitionRenderer } from "./transition/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (Z: number, ox: number) => transitionModel.derive({ Z, ox, clock: 0 }, transitionModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  transitionRenderer.draw(rec.ctx, computeTransitionLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const IONS = ["strip", "ion", "dboxes", "solution", "labels"];

describe("what the transition renderer draws", () => {
  it("names the species, its d count and its colour", () => {
    const texts = render(results(26, 2), IONS).texts();
    expect(texts).toEqual(expect.arrayContaining(["Fe²⁺", "green"]));
    expect(texts.join(" ")).toContain("3d⁶");
    expect(texts.join(" ")).toContain("μ = √(4 × 6) = 4.90 BM");
  });

  it("says why d⁰ and d¹⁰ ions are colourless, and why permanganate is not", () => {
    expect(render(results(30, 2), IONS).texts().join(" ")).toContain("so colourless and diamagnetic");
    expect(render(results(25, 7), IONS).texts().join(" ")).toContain("charge transfer");
  });

  it("draws a spin arrow for each d electron", () => {
    // Fe²⁺: five up, one down — three strokes each.
    const d6 = render(results(26, 2), ["dboxes"]).of("stroke").length;
    const d5 = render(results(26, 3), ["dboxes"]).of("stroke").length;
    expect(d6 - d5).toBe(1);
  });

  it("puts every oxidation state on the chart and fits a phone", () => {
    // 1 + 2 + 4 + 3 + 5 + 2 + 2 + 1 + 2 + 1 states.
    expect(render(results(25, 7), ["states"]).of("arc")).toHaveLength(23);
    const layout = computeTransitionLayout(375);
    expect(layout.tile * 10).toBeLessThanOrEqual(375);
  });
});
