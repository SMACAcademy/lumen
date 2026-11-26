import { matterWaveModel, type MatterWaveParams, type MatterWaveState } from "@ise/chemistry-engine";
import { describe, expect, it } from "vitest";
import { blurWidths, computeMatterWaveLayout, drawnWavelength, matterWaveRenderer, rulerX } from "./matterwave/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: MatterWaveState = { logSpeed: 6, logDx: -10, impact: 100, energy: 5.5 };
const results = (params: Partial<MatterWaveParams> = {}, state: Partial<MatterWaveState> = {}) =>
  matterWaveModel.derive({ ...base, ...state }, { ...matterWaveModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  matterWaveRenderer.draw(rec.ctx, computeMatterWaveLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the scattering view draws", () => {
  it("names the nucleus and says how far the alpha turns", () => {
    const rec = render(results({}, { impact: 20 }), ["foil", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Au", "α →"]));
    expect(rec.texts().join(" ")).toContain("20 fm off-centre: turned 92° · head-on stop at 41 fm");
  });

  it("draws a fan of ten paths and the chosen one", () => {
    expect(render(results(), ["foil"]).of("stroke").length).toBeGreaterThanOrEqual(11);
  });

  it("bends the chosen path for a nucleus and leaves it straight for Thomson's atom", () => {
    const ys = (r: ReturnType<typeof results>) => {
      const rec = render(r, ["foil"]);
      // The chosen path is the last one drawn before its arrowhead: collect every lineTo height.
      return rec.of("lineTo").map((c) => c.args[1] as number);
    };
    const layout = computeMatterWaveLayout(800);
    const straight = layout.cy - 20 * layout.perFm;
    expect(ys(results({ atomModel: "pudding" }, { impact: 20 })).filter((y) => Math.abs(y - straight) < 1e-6).length).toBeGreaterThan(0);
    expect(Math.min(...ys(results({}, { impact: 20 })))).toBeLessThan(straight - 30);
    const pudding = render(results({ atomModel: "pudding" }), ["foil", "labels"]).texts();
    expect(pudding).toContain("positive charge everywhere, electrons dotted in it");
    expect(pudding).not.toContain("Au");
    expect(pudding.join(" ")).toContain("no alpha turns more than 0.02°");
  });

  it("keeps the widest miss in view on a phone", () => {
    const layout = computeMatterWaveLayout(375);
    expect(layout.cy - 200 * layout.perFm).toBeGreaterThan(0);
    expect(layout.cy + 200 * layout.perFm).toBeLessThan(layout.height - 40);
  });
});

describe("what the wave view draws", () => {
  it("names the particle, marks λ on the ruler and says what it could diffract from", () => {
    const rec = render(results({ particle: "electron" }), ["wave", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["electron at 10⁶ m/s", "nucleus", "atom", "light", "λ", "10⁻³⁶", "10⁻⁶"]));
    expect(rec.texts().join(" ")).toContain("λ = h/mv = 7.3 × 10⁻¹⁰ m: diffracts from crystals");
    expect(render(results({ particle: "ball" }, { logSpeed: 1.5 }), ["wave", "labels"]).texts().join(" ")).toContain("far smaller than a nucleus");
  });

  it("draws longer waves for a longer wavelength, and keeps λ on the ruler", () => {
    expect(drawnWavelength(-10)).toBeGreaterThan(drawnWavelength(-34));
    const layout = computeMatterWaveLayout(375);
    expect(rulerX(layout, -50)).toBe(layout.ruler.x1);
    expect(rulerX(layout, 0)).toBe(layout.ruler.x2);
    expect(rulerX(layout, -10)).toBeGreaterThan(rulerX(layout, -15));
  });
});

describe("what the uncertainty view draws", () => {
  it("spreads the velocity as the position sharpens", () => {
    const sharp = blurWidths(-14, 150);
    const loose = blurWidths(-4, 150);
    expect(sharp.position).toBeLessThan(loose.position);
    expect(sharp.velocity).toBeGreaterThan(loose.velocity);
    expect(sharp.position + sharp.velocity).toBeCloseTo(loose.position + loose.velocity, 10);
  });

  it("gives Δx always and Δv only with the words on", () => {
    const shown = render(results({ particle: "electron" }), ["blur", "labels"]).texts();
    expect(shown).toEqual(expect.arrayContaining(["Δx = 10⁻¹⁰ m", "Δv ≥ 5.8 × 10⁵ m/s"]));
    expect(shown.join(" ")).toContain("Δv ≥ h / 4πmΔx = 5.8 × 10⁵ m/s");
    const hidden = render(results({ particle: "electron" }), ["blur"]).texts();
    expect(hidden).toContain("Δx = 10⁻¹⁰ m");
    expect(hidden.join(" ")).not.toContain("Δv ≥");
  });

  it("keeps the answers off the other views when the words are hidden", () => {
    expect(render(results(), ["wave"]).texts()).not.toContain("λ");
    expect(render(results({}, { impact: 20 }), ["foil"]).texts().join(" ")).not.toContain("turned");
  });
});

describe("the ruler's landmarks", () => {
  it("do not run into each other, or off the edge, on a phone", () => {
    const layout = computeMatterWaveLayout(325);
    // At about 6 px a letter: nucleus and atom end on their marks, light starts on its own.
    expect(rulerX(layout, -10) - "atom".length * 6).toBeGreaterThan(rulerX(layout, -15) + 4);
    expect(rulerX(layout, -6.3)).toBeGreaterThan(rulerX(layout, -10) + 4);
    expect(rulerX(layout, -6.3) + "light".length * 6).toBeLessThanOrEqual(325);
  });
});
