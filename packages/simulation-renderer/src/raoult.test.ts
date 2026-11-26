import { raoultModel, type RaoultParams } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeRaoultLayout, raoultRenderer } from "./raoult/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<RaoultParams>, xA = 0.5, pressure = 1) =>
  raoultModel.derive({ xA, pressure, clock: 0 }, { ...raoultModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  raoultRenderer.draw(rec.ctx, computeRaoultLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the Raoult renderer draws", () => {
  it("names the pure liquids and reads off the mixture", () => {
    const texts = render(results({ pair: "benzene-toluene" }), ["curves", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["pure toluene", "pure benzene"]));
    expect(texts.join(" ")).toContain("p = 8.3 kPa · ideal · vapour 77% benzene");
  });

  it("draws Raoult's dashed lines only when the pair deviates, and marks the azeotrope", () => {
    const ideal = render(results({ pair: "benzene-toluene" }), ["curves"]);
    const real = render(results({ pair: "ethanol-water" }), ["curves", "labels"]);
    expect(real.of("setLineDash").length).toBeGreaterThan(ideal.of("setLineDash").length);
    expect(real.texts()).toContain("azeotrope");
    expect(real.texts().join(" ")).toContain("positive deviation");
    expect(render(results({ pair: "acetone-chloroform" }), ["curves", "labels"]).texts().join(" ")).toContain("negative deviation");
  });

  it("dissolves more gas at more pressure, and more CO₂ than N₂", () => {
    const dots = (gas: RaoultParams["gas"], p: number) => render(results({ gas }, 0.5, p), ["flask"]).of("arc").length;
    expect(dots("co2", 1)).toBeGreaterThan(dots("n2", 1));
    expect(dots("co2", 2)).toBeGreaterThan(dots("co2", 1));
    expect(render(results({ gas: "o2" }), ["flask", "labels"]).texts().join(" ")).toContain("mmol per litre");
  });
});
