import { rateLawModel, type RateLawParams, type RateLawState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { computeRateLawLayout, rateLawRenderer, ratePlotDomain } from "./ratelaw/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: RateLawState = { a0: 1, k: 0.05, t: 0, T: 300, Ea: 10, steric: 1 };
const results = (params: Partial<RateLawParams> = {}, state: Partial<RateLawState> = {}) =>
  rateLawModel.derive({ ...base, ...state }, { ...rateLawModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  rateLawRenderer.draw(rec.ctx, computeRateLawLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the rate-law renderer draws", () => {
  it("writes out the rate law for each order", () => {
    const words = (order: RateLawParams["order"]) => render(results({ order }, { a0: 0.5, k: 0.1 }), ["rate", "labels"]).texts().join(" ");
    expect(words("zero")).toContain("rate = k[A]⁰ = 0.10 = 0.100 mol L⁻¹ min⁻¹");
    expect(words("first")).toContain("rate = k[A] = 0.10 × 0.50 = 0.050");
    expect(words("second")).toContain("rate = k[A]² = 0.10 × 0.50² = 0.025");
    expect(render(results(), ["rate"]).texts()).toEqual(expect.arrayContaining(["n = 0", "n = 1", "n = 2"]));
  });

  it("marks the halvings on the [A] plot, and says which plots are straight", () => {
    const conc = render(results({ order: "first" }, { t: 10 }), ["time", "labels"]).texts();
    expect(conc).toEqual(expect.arrayContaining(["½", "¼", "⅛"]));
    expect(conc.join(" ")).toContain("[A] = 0.61 mol/L at 10 min · first t½ = 13.9 min");
    expect(render(results({ order: "first", plot: "log" }), ["time", "labels"]).texts().join(" ")).toContain("ln[A] against t is straight: first order, slope −0.050");
    expect(render(results({ order: "second", plot: "inverse" }), ["time", "labels"]).texts().join(" ")).toContain("1/[A] against t is straight: second order, slope 0.050");
    expect(render(results({ order: "second", plot: "log" }), ["time", "labels"]).texts().join(" ")).toContain("bends away from the ruler");
  });

  it("keeps the answers off the drawing when the words are hidden", () => {
    const texts = render(results({ order: "first" }, { t: 10 }), ["time"]).texts().join(" ");
    expect(texts).not.toContain("t½");
    expect(texts).not.toContain("½");
    expect(render(results(), ["energy"]).texts().join(" ")).not.toContain("in 1000");
  });

  it("shades the tail beyond Eₐ and counts the collisions that react", () => {
    const rec = render(results({}, { Ea: 12.5, T: 500, steric: 0.2 }), ["energy", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Eₐ", "500 K", "300 K"]));
    expect(rec.texts().join(" ")).toContain("e^(−Eₐ/RT) = 0.049 · P = 0.20 → 9.9 in 1000 react");
    expect(render(results({}, { Ea: 40, T: 300 }), ["energy", "labels"]).texts().join(" ")).toContain("10^−7.0");
  });

  it("gives every plot a y-range that holds the start of the run", () => {
    for (const order of [0, 1, 2]) {
      for (const a0 of [0.1, 1, 2]) {
        for (const k of [0.01, 0.2]) {
          const log = ratePlotDomain("log", order, a0, k);
          expect(log[0], `log ${order} ${a0} ${k}`).toBeLessThan(Math.log(a0));
          expect(log[1]).toBeGreaterThan(Math.log(a0));
          const inverse = ratePlotDomain("inverse", order, a0, k);
          expect(inverse[1], `inverse ${order} ${a0} ${k}`).toBeGreaterThan(1 / a0);
          expect(inverse[1]).toBeLessThanOrEqual((12 / a0) * 1.1 + 1e-9);
        }
      }
    }
  });
});
