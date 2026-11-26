import { photoelectricModel, type PhotoelectricParams, type PhotoelectricState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computePhotoelectricLayout, photoElectronPosition, photoelectricRenderer } from "./photoelectric/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = photoelectricModel.initialize(photoelectricModel.defaultParams);
const results = (state: Partial<PhotoelectricState> = {}, params: Partial<PhotoelectricParams> = {}) =>
  photoelectricModel.derive({ ...base, ...state }, { ...photoelectricModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  photoelectricRenderer.draw(rec.ctx, computePhotoelectricLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const PHOTOCELL = ["cell", "electrons", "iv"];
const MILLIKAN = ["cell", "electrons", "vnu"];
const PHOTONS = ["beam", "spectrum"];
const WAVES = ["gun", "scatter"];

describe("the photocell", () => {
  it("names the metal and gives K_max and V₀ with the words on", () => {
    const texts = render(results({ wavelength: 400 }), [...PHOTOCELL, "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Photocell: Caesium, φ = 2.14 eV", "Cs plate", "collector", "A", "400 nm", "I = 3.22 µA"]));
    expect(texts.join(" ")).toContain("K_max = hν − φ = 0.97 eV · V₀ = 0.97 V");
    expect(texts).toContain("−V₀ = −0.97 V");
  });

  it("says why nothing comes out below the threshold", () => {
    const texts = render(results({ wavelength: 600, power: 2 }), [...PHOTOCELL, "labels"]).texts().join(" ");
    expect(texts).toContain("hν = 2.07 eV < φ = 2.14 eV: no electrons");
  });

  it("draws electrons only above the threshold, more for more light", () => {
    const arcs = (state: Partial<PhotoelectricState>) => render(results(state), PHOTOCELL).of("arc").length;
    const none = arcs({ wavelength: 600, power: 2 });
    expect(arcs({ wavelength: 400, power: 2 }) - none).toBe(20);
    expect(arcs({ wavelength: 400, power: 0.5 }) - none).toBe(8);
  });

  it("turns back the slow electrons on a negative collector", () => {
    // On −0.5 V with V₀ = 0.97 V, an electron with half of K_max gets about 97% of the way, one with a fifth 39%.
    const slow = photoElectronPosition(0, 10, 1, 1, -0.5);
    expect(slow.share).toBeCloseTo(0.1, 9);
    expect(slow.across).toBeLessThanOrEqual(0.2);
    expect(photoElectronPosition(3, 10, 0.3, 1, 0).returning).toBe(false);
    expect(photoElectronPosition(3, 10, 0.3, 1, -2).across).toBeLessThan(0.5);
  });

  it("hides the answers without the words", () => {
    const texts = render(results({ wavelength: 400 }), PHOTOCELL).texts().join(" ");
    expect(texts).not.toMatch(/d µA|K_max|V₀ =|eV ·/);
    expect(texts).toContain("V = 0.00 V");
  });
});

describe("Millikan's graph", () => {
  it("gives ν₀ and the slope h/e", () => {
    const texts = render(results({ wavelength: 400 }), [...MILLIKAN, "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["ν₀ = 516 THz", "slope h/e, same for every metal", "stopping potential V₀ / V against ν / THz"]));
    expect(texts.join(" ")).toContain("ν = 750 THz · V₀ = 0.97 V · h/e = 4.14 × 10⁻¹⁵ V s");
    expect(render(results({ wavelength: 400 }), MILLIKAN).texts().join(" ")).not.toMatch(/THz ·|ν₀ =/);
  });
});

describe("photons", () => {
  it("give E, p and the photon flux with the words on", () => {
    const texts = render(results({ wavelength: 500, power: 2 }), [...PHOTONS, "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["λ = 500 nm · ν = 600 THz", "E = hν = 2.49 eV = 3.98 × 10⁻¹⁹ J", "p = h/λ = 1.33 × 10⁻²⁷ kg m/s"]));
    expect(texts.join(" ")).toContain("5.03 × 10¹⁵ photons/s at 2.00 mW");
    expect(texts).toEqual(expect.arrayContaining(["Cs", "K", "Na", "Ca", "Cu", "Pt"]));
  });

  it("hide them, and the thresholds, without the words", () => {
    const texts = render(results({ wavelength: 500 }), PHOTONS).texts().join(" ");
    expect(texts).not.toMatch(/eV|kg m\/s|photons\/s| Na /);
  });
});

describe("electron waves", () => {
  it("draw the bump and say where it is", () => {
    const texts = render(results({ accel: 54, detector: 50 }), [...WAVES, "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Davisson–Germer: electrons on nickel", "electron gun, 54 V", "θ = 50°", "λ = 0.167 nm", "peak 51.0°"]));
    expect(texts.join(" ")).toContain("D sin θ = 0.165 nm · reading 95");
  });

  it("hide λ and the peak without the words", () => {
    const texts = render(results({ accel: 54, detector: 50 }), WAVES).texts().join(" ");
    expect(texts).not.toMatch(/0\.167|peak|reading/);
  });
});

/** Render while noting each label's alignment, so its extent can be checked. */
const extents = (r: ReturnType<typeof results>, layers: string[], width: number) => {
  const rec = recordingContext();
  const spans: { text: string; left: number; right: number; y: number }[] = [];
  rec.ctx.fillText = (text: string, x: number, y: number) => {
    const w = text.length * 6;
    const align = rec.ctx.textAlign;
    const left = align === "center" ? x - w / 2 : align === "right" || align === "end" ? x - w : x;
    spans.push({ text, left, right: left + w, y });
  };
  photoelectricRenderer.draw(rec.ctx, computePhotoelectricLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, spans };
};

describe("on a phone", () => {
  it("keeps every label, disc and caption inside 325 px", () => {
    const cases: [Partial<PhotoelectricState>, Partial<PhotoelectricParams>, string[]][] = [
      [{ wavelength: 150, power: 2, collector: -8 }, { metal: "cs" }, PHOTOCELL],
      [{ wavelength: 400, collector: -0.5 }, { metal: "cs" }, PHOTOCELL],
      [{ wavelength: 580, power: 2, collector: 4 }, { metal: "cs" }, PHOTOCELL],
      [{ wavelength: 150, power: 2 }, { metal: "cs" }, PHOTOCELL],
      [{ wavelength: 200, power: 2 }, { metal: "pt" }, MILLIKAN],
      [{ wavelength: 150, power: 2 }, { metal: "cs" }, MILLIKAN],
      [{ wavelength: 750 }, { metal: "pt" }, PHOTOCELL],
      [{ wavelength: 150, power: 2 }, { metal: "k" }, PHOTONS],
      [{ wavelength: 750, power: 2 }, { metal: "pt" }, PHOTONS],
      [{ accel: 54, detector: 10 }, {}, WAVES],
      [{ accel: 150, detector: 90 }, {}, WAVES],
      [{ accel: 10, detector: 59 }, {}, WAVES],
    ];
    for (const [state, params, layers] of cases) {
      const { rec, spans } = extents(results(state, params), [...layers, "labels"], 325);
      for (const span of spans) {
        expect(span.left, span.text).toBeGreaterThanOrEqual(0);
        expect(span.right, span.text).toBeLessThanOrEqual(325);
        expect(span.y, span.text).toBeGreaterThanOrEqual(0);
        expect(span.y, span.text).toBeLessThanOrEqual(400);
        expect(span.text.length, span.text).toBeLessThanOrEqual(55);
      }
      for (const call of rec.of("arc")) {
        const [x, y, r] = call.args as [number, number, number];
        expect(x - r, "disc").toBeGreaterThanOrEqual(0);
        expect(x + r, "disc").toBeLessThanOrEqual(325);
        expect(y + r, "disc").toBeLessThanOrEqual(400);
      }
    }
  });
});
