import { waveOpticsModel, type WaveOpticsParams, type WaveOpticsState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeWaveOpticsLayout, waveOpticsMix, waveOpticsRenderer, waveOpticsRgb } from "./waveoptics/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const S = waveOpticsModel.initialize(waveOpticsModel.defaultParams);
const results = (state: Partial<WaveOpticsState> = {}, params: Partial<WaveOpticsParams> = {}) =>
  waveOpticsModel.derive({ ...S, ...state }, { ...waveOpticsModel.defaultParams, ...params });

interface Text {
  text: string;
  x: number;
  y: number;
  align: string;
}

const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const texts: Text[] = [];
  // Note each text with the alignment in force when it was drawn.
  const ctx = new Proxy(rec.ctx, {
    get(target, key: string) {
      const value = (target as unknown as Record<string, unknown>)[key];
      if (key !== "fillText") return value;
      return (text: string, x: number, y: number) => {
        texts.push({ text: String(text), x, y, align: String((target as unknown as Record<string, unknown>).textAlign ?? "left") });
        (value as (...args: unknown[]) => void)(text, x, y);
      };
    },
    set(target, key: string, value) {
      (target as unknown as Record<string, unknown>)[key] = value;
      return true;
    },
  });
  const layout = computeWaveOpticsLayout(width);
  waveOpticsRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, layout, words: texts, all: () => texts.map((t) => t.text).join(" | ") };
};

const MODES: Record<string, string[]> = {
  huygens: ["huygens", "wavelets", "labels"],
  double: ["double", "screen", "curve", "labels"],
  single: ["single", "screen", "curve", "labels"],
  resolve: ["rayleigh", "image", "curve", "labels"],
  polarise: ["polarise", "curve", "labels"],
  brewster: ["brewster", "polarisation", "labels"],
  film: ["thinfilm", "colours", "curve", "labels"],
};
const without = (mode: string) => MODES[mode]!.filter((l) => l !== "labels");

describe("the colour of light", () => {
  it("makes violet blue-purple, green green and red red", () => {
    const [vr, vg, vb] = waveOpticsRgb(400);
    expect(vb).toBeGreaterThan(vr);
    expect(vg).toBe(0);
    expect(waveOpticsRgb(550)[1]).toBe(1);
    expect(waveOpticsRgb(700)).toEqual([1, 0, 0]);
  });

  it("mixes the whole spectrum, evenly lit, to white", () => {
    for (const c of waveOpticsMix(() => 1)) expect(c).toBeCloseTo(1, 12);
    for (const c of waveOpticsMix(() => 0)) expect(c).toBe(0);
  });
});

describe("Young's double slit", () => {
  it("measures the fringe width and reads the probe, with the labels on", () => {
    const text = render(results({ probe: 2.4 }), MODES.double!).all();
    expect(text).toContain("β = 1.20 mm");
    expect(text).toContain("Δ = 2.00λ: bright, I = 4.00 I₀");
    expect(text).toContain("d = 0.50 mm");
    expect(text).toContain("D = 1.0 m");
    expect(render(results({ probe: 0.6 }), MODES.double!).all()).toContain("Δ = 0.50λ: dark, I = 0.00 I₀");
  });

  it("hides the fringe width and the brightness without the labels", () => {
    const text = render(results({ probe: 0.3 }), without("double")).all();
    expect(text).not.toMatch(/β|I₀|Δ/);
  });

  it("paints the screen, and says what one slit and two lamps do", () => {
    expect(render(results(), MODES.double!).of("fillRect").length).toBeGreaterThan(100);
    expect(render(results({}, { slits: "one" }), MODES.double!).all()).toContain("One slit: even light");
    expect(render(results({}, { slits: "one" }), MODES.double!).all()).toContain("S₂ covered");
    expect(render(results({}, { slits: "lamps" }), MODES.double!).all()).toContain("I₀ + I₀ = 2I₀");
    expect(render(results({}, { light: "white" }), MODES.double!).all()).toContain("White centre");
  });
});

describe("single slit", () => {
  it("marks the central maximum 2λD/a wide, and the dark fringes", () => {
    expect(render(results({ slitWidth: 0.1 }), MODES.single!).all()).toContain("2λD/a = 12.0 mm");
    expect(render(results({ slitWidth: 0.1, probe: 12 }), MODES.single!).all()).toContain("a·y/D = 2λ: dark");
    expect(render(results({ slitWidth: 0.1 }), without("single")).all()).not.toContain("2λD/a");
  });
});

describe("Huygens", () => {
  it("draws the construction and states Snell's law", () => {
    const rec = render(results({ incidence: 30, index: 1.5 }), MODES.huygens!);
    expect(rec.words.map((w) => w.text)).toEqual(expect.arrayContaining(["A", "B", "C", "E", "i", "r"]));
    expect(rec.all()).toContain("sin i / sin r = 1.50 = c/v, v = 2.00×10⁸ m/s");
    expect(rec.all()).toContain("λ in glass = 400 nm");
    // The wavelet from A.
    expect(rec.of("arc").length).toBeGreaterThan(4);
  });
});

describe("resolving power", () => {
  it("says whether two stars are resolved, and hides θmin without the labels", () => {
    expect(render(results({ wavelength: 550, aperture: 10, separation: 10 }), MODES.resolve!).all()).toContain("Resolved: 10.0 ≥ 1.22λ/D = 6.71 µrad");
    expect(render(results({ wavelength: 550, aperture: 10, separation: 5 }), MODES.resolve!).all()).toContain("One blur: 5.0 < 1.22λ/D = 6.71 µrad");
    const hidden = render(results({ wavelength: 550, aperture: 10, separation: 10 }), without("resolve")).all();
    expect(hidden).not.toMatch(/6\.7|θmin|µrad/);
    expect(hidden).toContain("D = 10 cm");
  });
});

describe("polarisation and Brewster", () => {
  it("applies Malus's law to the analyser", () => {
    expect(render(results({ analyser: 60 }), MODES.polarise!).all()).toContain("I = ½I₀ cos²60° = 0.125 I₀");
    expect(render(results({ analyser: 60 }), MODES.polarise!).all()).toContain("θ = 60°");
  });

  it("names Brewster's angle only with the labels, and marks the right angle there", () => {
    const at = render(results({ index: 1.5, incidence: 56 }), MODES.brewster!);
    expect(at.all()).toContain("θB = tan⁻¹ 1.50 = 56.3°: fully polarised");
    expect(at.all()).toContain("90°");
    expect(render(results({ index: 1.5, incidence: 30 }), MODES.brewster!).all()).toMatch(/Reflected light \d+% polarised · θB = 56\.3°/);
    const hidden = render(results({ index: 1.5, incidence: 56 }), without("brewster")).all();
    expect(hidden).not.toMatch(/56\.3|θB|90°/);
  });
});

describe("thin films", () => {
  it("adds λ/2 for one phase flip and says bright or dark", () => {
    expect(render(results({ index: 1.33, thickness: 100, incidence: 0, wavelength: 550 }), MODES.film!).all()).toContain("2nt cos r + λ/2 = 0.98λ: bright");
    const coating = render(results({ index: 1.38, thickness: 100, incidence: 0, wavelength: 550 }, { below: "glass" }), MODES.film!);
    expect(coating.all()).toContain("2nt cos r = 0.50λ: dark");
    expect(coating.words.filter((w) => w.text === "π")).toHaveLength(2);
    expect(render(results({ index: 1.33 }), MODES.film!).words.filter((w) => w.text === "π")).toHaveLength(1);
  });
});

describe("on a phone", () => {
  const cases: [string, ReturnType<typeof results>][] = [
    ["huygens", results({ incidence: 85, index: 2 })],
    ["huygens", results({ incidence: 10, index: 1.1 })],
    ["double", results({ probe: 20 })],
    ["double", results({ probe: -9.9, slitSep: 0.1, screenDist: 2, wavelength: 700 }, { slits: "lamps" })],
    ["double", results({ probe: 0 }, { light: "white" })],
    ["single", results({ slitWidth: 0.5, probe: -20 })],
    ["resolve", results({ aperture: 2, separation: 40 })],
    ["resolve", results({ aperture: 100, separation: 0.5 })],
    ["polarise", results({ analyser: 135 })],
    ["brewster", results({ incidence: 85, index: 2 })],
    ["brewster", results({ incidence: 0, index: 1 })],
    ["film", results({ incidence: 85, thickness: 1000, index: 2 }, { below: "glass" })],
  ];

  it.each(cases.map(([mode, r], k) => [`${mode} #${k}`, mode, r] as const))("keeps every word of %s inside 325 px", (_name, mode, r) => {
    const rec = render(r, MODES[mode]!, 325);
    expect(rec.layout.height).toBeGreaterThanOrEqual(330);
    expect(rec.layout.height).toBeLessThanOrEqual(420);
    for (const w of rec.words) {
      const width = w.text.length * 6;
      const left = w.align === "center" ? w.x - width / 2 : w.align === "right" ? w.x - width : w.x;
      expect(left, w.text).toBeGreaterThanOrEqual(0);
      expect(left + width, w.text).toBeLessThanOrEqual(325);
      expect(w.y, w.text).toBeGreaterThanOrEqual(0);
      expect(w.y, w.text).toBeLessThanOrEqual(rec.layout.height);
      expect(w.text.length, w.text).toBeLessThanOrEqual(55);
    }
  });

  it("keeps the screen strip and graph inside the canvas", () => {
    const { strip, graph, scene, height } = computeWaveOpticsLayout(325);
    for (const box of [strip, graph, scene]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(325);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
    const rec = render(results(), MODES.double!, 325);
    for (const call of rec.of("fillRect")) {
      const [x, , w] = call.args as number[];
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x! + w!).toBeLessThanOrEqual(325.5);
    }
  });
});
