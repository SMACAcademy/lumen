import { halogensModel, type HalogensParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { barScale, BELOW_ROOM, computeHalogensLayout, halogensRenderer } from "./halogens/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<HalogensParams> = {}, position = 1, yaw = 0.6) =>
  halogensModel.derive({ position, yaw }, { ...halogensModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  halogensRenderer.draw(rec.ctx, computeHalogensLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("the trends view", () => {
  it("draws a bar and a symbol for each element, and reads off the chosen one", () => {
    const rec = render(results({ family: "halogens", property: "gain" }, 2), ["bars", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Electron gain enthalpy / kJ/mol", "F", "Cl", "Br", "I", "−333", "−349", "−325", "−296"]));
    expect(rec.texts().join(" ")).toContain("Chlorine: electron gain enthalpy −349 kJ/mol");
    expect(rec.of("fillRect")).toHaveLength(4);
  });

  it("draws bars below the zero line for negative values, above for positive", () => {
    const layout = computeHalogensLayout(375);
    const y = barScale(layout, [3.2, -7, -9.5, -10]);
    expect(y(3.2)).toBeLessThan(y(0));
    expect(y(-10)).toBeGreaterThan(y(0));
    // Room is left under the lowest bar for its number.
    expect(y(-10)).toBeCloseTo(layout.plot.bottom - BELOW_ROOM, 6);
    expect(barScale(layout, [84.9, 458.2])(0)).toBeCloseTo(layout.plot.bottom, 6);
  });

  it("outlines a missing value instead of drawing a bar", () => {
    const rec = render(results({ family: "noble", property: "radius" }, 6), ["bars", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(5);
    expect(rec.of("strokeRect")).toHaveLength(1);
    expect(rec.texts()).toContain("not given");
    expect(rec.texts().join(" ")).toContain("Radon: NCERT gives no radius");
  });

  it("keeps the numbers off the bars when the words are hidden", () => {
    const texts = render(results({ family: "noble", property: "boiling" }, 5), ["bars"]).texts();
    expect(texts).toContain("Xe");
    expect(texts.join(" ")).not.toMatch(/165|Xenon:/);
  });
});

describe("the displacement view", () => {
  it("writes the reaction and its E° when the halogen displaces", () => {
    const texts = render(results({ oxidant: "cl2", halide: "bromide" }), ["tubes", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["KBr solution", "+ Cl₂", "Br₂ set free", "orange"]));
    expect(texts.join(" ")).toContain("Cl₂ + 2Br⁻ → 2Cl⁻ + Br₂ · E° = 1.36 − 1.09 = +0.27 V");
  });

  it("says so when nothing happens", () => {
    const texts = render(results({ oxidant: "br2", halide: "chloride" }), ["tubes", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["no reaction", "orange"]));
    expect(texts.join(" ")).toContain("No reaction: E° = 1.09 − 1.36 = −0.27 V");
    expect(render(results({ oxidant: "i2", halide: "iodide" }), ["tubes", "labels"]).texts().join(" ")).toContain("the same halogen");
  });

  it("leaves the second tube a question when the words are hidden", () => {
    const texts = render(results({ oxidant: "cl2", halide: "iodide" }), ["tubes"]).texts();
    expect(texts).toContain("?");
    expect(texts.join(" ")).not.toMatch(/set free|brown|E°/);
  });
});

describe("the shapes view", () => {
  it("draws the central atom, every bonded atom and the lone pairs", () => {
    const rec = render(results({ compound: "xef4" }), ["shape", "labels"]);
    expect(rec.texts().filter((t) => t === "F")).toHaveLength(4);
    expect(rec.texts()).toEqual(expect.arrayContaining(["XeF₄", "Xe"]));
    expect(rec.of("ellipse")).toHaveLength(2);
    expect(rec.texts().join(" ")).toContain("4 bonds + 2 lone pairs: sp³d², square planar");
  });

  it("names oxygen separately in XeOF₄, and counts one lone pair", () => {
    const rec = render(results({ compound: "xeof4" }), ["shape", "labels"]);
    expect(rec.texts().filter((t) => t === "O")).toHaveLength(1);
    expect(rec.texts().filter((t) => t === "F")).toHaveLength(4);
    expect(rec.texts().join(" ")).toContain("5 bonds + 1 lone pair: sp³d², square pyramidal");
  });

  it("hides the lone pairs with the words, so they can be worked out", () => {
    const rec = render(results({ compound: "xef2" }), ["shape"]);
    expect(rec.of("ellipse")).toHaveLength(0);
    expect(rec.texts().join(" ")).not.toContain("lone");
  });

  it("keeps every atom of IF₇ inside a phone's canvas, however it is turned", () => {
    for (const yaw of [0, 0.6, 1.7, 3.1, 4.4]) {
      const rec = render(results({ compound: "if7" }, 1, yaw), ["shape"], 325);
      for (const call of rec.of("arc")) {
        const [x, y, r] = call.args as [number, number, number];
        expect(x - r).toBeGreaterThanOrEqual(0);
        expect(x + r).toBeLessThanOrEqual(325);
        expect(y - r).toBeGreaterThanOrEqual(24);
        expect(y + r).toBeLessThanOrEqual(330 - 28);
      }
    }
  });
});
