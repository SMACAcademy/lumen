import { waveMotionModel, type WaveMotionParams, type WaveMotionState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeWaveMotionLayout, waveFixed, waveMotionRenderer, waveScientific } from "./wavemotion/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const P = waveMotionModel.defaultParams;
const results = (state: Partial<WaveMotionState> = {}, params: Partial<WaveMotionParams> = {}) =>
  waveMotionModel.derive({ ...waveMotionModel.initialize(P), ...state }, { ...P, ...params });

/** A recording context that also notes where each piece of text sits, by its alignment. */
function render(r: ReturnType<typeof results>, layers: string[], width = 800) {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const inner = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(inner, {
    get(target, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          const align = typeof target.textAlign === "string" ? target.textAlign : "left";
          placed.push({ text, x, y, align });
          (target.fillText as (...a: unknown[]) => void)(text, x, y);
        };
      }
      return target[key];
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeWaveMotionLayout(width);
  waveMotionRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, placed, layout, text: () => rec.texts().join(" | ") };
}

/** Every word stays on the canvas, at about 6 px a character. */
function expectOnCanvas(out: ReturnType<typeof render>) {
  const { width, height } = out.layout;
  for (const { text, x, y, align } of out.placed) {
    const w = text.length * 6;
    const from = align === "center" ? x - w / 2 : align === "right" || align === "end" ? x - w : x;
    expect(from, `"${text}" starts off the canvas`).toBeGreaterThanOrEqual(0);
    expect(from + w, `"${text}" runs off the canvas`).toBeLessThanOrEqual(width);
    expect(y, `"${text}"`).toBeGreaterThanOrEqual(0);
    expect(y, `"${text}"`).toBeLessThanOrEqual(height);
  }
  for (const call of [...out.of("moveTo"), ...out.of("lineTo")]) {
    const [x, y] = call.args as [number, number];
    expect(x).toBeGreaterThanOrEqual(-1);
    expect(x).toBeLessThanOrEqual(width + 1);
    expect(y).toBeGreaterThanOrEqual(-1);
    expect(y).toBeLessThanOrEqual(height + 1);
  }
}

const MODES: [string, string[], Partial<WaveMotionState>, Partial<WaveMotionParams>][] = [
  ["string", ["string", "labels"], { amplitude: 20 }, { medium: "string" }],
  ["air", ["string", "labels"], { frequency: 256, amplitude: 20 }, { medium: "air" }],
  ["speeds", ["speeds", "labels"], { temperature: 50 }, {}],
  ["superpose", ["superpose", "labels"], { amplitude: 20, phaseDifference: 0 }, {}],
  ["reflect", ["reflect", "labels"], { clock: 4 }, { end: "fixed" }],
  ["free", ["reflect", "labels"], { clock: 1 }, { end: "free" }],
  ["standing", ["standing", "labels"], { harmonic: 6 }, { system: "string" }],
  ["closed", ["standing", "labels"], { harmonic: 6, length: 0.2 }, { system: "closed" }],
  ["open", ["standing", "labels"], { harmonic: 1 }, { system: "open" }],
  ["tube", ["tube", "labels"], { frequency: 512, column: 15.9 }, {}],
  ["beats", ["beats", "labels"], { frequency: 256, frequency2: 300 }, {}],
  ["doppler", ["doppler", "labels"], { frequency: 500, sourceSpeed: -100, observerSpeed: -100, clock: 7 }, {}],
  ["decibel", ["decibel", "labels"], { power: 10, distance: 1 }, {}],
  ["decibel-far", ["decibel", "labels"], { power: 0.01, distance: 100 }, {}],
];

describe("number formats", () => {
  it("writes a true minus and no −0, and powers of ten", () => {
    expect(waveFixed(-2.5, 1)).toBe("−2.5");
    expect(waveFixed(-0.001, 1)).toBe("0.0");
    expect(waveScientific(7.957747e-4)).toBe("7.96 × 10⁻⁴");
    expect(waveScientific(0.0796)).toBe("0.0796");
  });
});

describe("the travelling wave", () => {
  it("marks one bit of string moving up and down, and gives v and λ with the words", () => {
    const out = render(results({ tension: 100, density: 10, frequency: 50 }), ["string", "labels"]).text();
    expect(out).toContain("Transverse wave on a string");
    expect(out).toContain("this bit only moves up and down");
    expect(out).toContain("v = √(T/μ) = 100 m/s · λ = v/f = 2.00 m");
    expect(out).toContain("each bit moves at most Aω = 3.14 m/s");
  });

  it("hides the wavelength's value without the words", () => {
    const out = render(results({ tension: 100, density: 10, frequency: 50 }), ["string"]).texts();
    expect(out).toContain("λ");
    expect(out.join(" ")).not.toContain("2.00");
  });

  it("shows sound as rows of particles with compressions and rarefactions", () => {
    const out = render(results({ frequency: 256 }, { medium: "air" }), ["string", "labels"]);
    expect(out.text()).toContain("Longitudinal wave: sound in air");
    expect(out.text()).toContain("this one swings back and forth");
    expect(out.text()).toContain("v = √(γP/ρ) = 343 m/s · λ = v/f = 1.34 m");
    expect(out.texts()).toEqual(expect.arrayContaining(["C", "R"]));
    expect(out.of("arc").length).toBeGreaterThan(150);
  });
});

describe("the other scenes", () => {
  it("plots Laplace above Newton", () => {
    const out = render(results({ temperature: 0 }), ["speeds", "labels"]).text();
    expect(out).toContain("at 0 °C: Laplace 331 m/s, Newton 280 m/s");
    expect(out).toContain("Laplace: √(γP/ρ)");
  });

  it("adds two waves and names the interference", () => {
    expect(render(results({ amplitude: 10, phaseDifference: 180 }), ["superpose", "labels"]).text()).toContain("resultant 2A|cos(φ/2)| = 0.0 mm | destructive: they cancel");
    expect(render(results({ amplitude: 10, phaseDifference: 90 }), ["superpose", "labels"]).text()).toContain("y₂, φ = 90° ahead");
  });

  it("brings a pulse back inverted from a fixed end and upright from a free one", () => {
    const fixed = render(results({ clock: 4 }), ["reflect", "labels"], 325).text();
    expect(fixed).toContain("reflected");
    expect(fixed).toContain("a phase change of π");
    expect(render(results({ clock: 1 }, { end: "free" }), ["reflect", "labels"]).text()).toContain("incident");
    expect(render(results({}, { end: "free" }), ["reflect", "labels"]).text()).toContain("no phase change");
  });

  it("marks nodes and antinodes and names the harmonic", () => {
    const string = render(results({ harmonic: 3 }, { system: "string" }), ["standing", "labels"]);
    expect(string.texts().filter((t) => t === "N")).toHaveLength(4);
    expect(string.texts().filter((t) => t === "A")).toHaveLength(3);
    expect(string.text()).toContain("3rd harmonic · f = 3v/2L = 150 Hz");
    const closed = render(results({ harmonic: 2, length: 0.5 }, { system: "closed" }), ["standing", "labels"]);
    expect(closed.text()).toContain("3rd harmonic (n = 2) · f = 3v/4L = 515 Hz");
    expect(closed.texts().filter((t) => t === "N")).toHaveLength(2);
  });

  it("rings the resonance tube, and gives v only with the words", () => {
    const loud = render(results({ frequency: 512, column: 15.9 }), ["tube", "labels"]).text();
    expect(loud).toContain("1st resonance");
    expect(loud).toContain("l₁ = 15.9 cm · l₂ = 49.4 cm · e = 0.90 cm");
    expect(loud).toContain("v = 2f(l₂ − l₁) = 343 m/s");
    const quiet = render(results({ frequency: 512, column: 15.9 }), ["tube"]).text();
    expect(quiet).not.toMatch(/resonance|343|15\.9 cm ·/);
  });

  it("counts the beats", () => {
    const out = render(results({ frequency: 256, frequency2: 260 }), ["beats", "labels"]).text();
    expect(out).toContain("f_beat = |256 − 260| = 4 Hz");
    expect(out).toContain("heard as 258.0 Hz");
    expect(render(results({ frequency: 256, frequency2: 300 }), ["beats"]).text()).toContain("faster than drawn");
  });

  it("works out the Doppler shift with the signs written out, only with the words", () => {
    const out = render(results({ frequency: 500, sourceSpeed: 30 }), ["doppler", "labels"]).text();
    expect(out).toContain("f′ = 500 × (343 + 0)/(343 − 30) = 548 Hz");
    expect(out).toContain("higher than the source");
    expect(render(results({ frequency: 500, observerSpeed: -50 }), ["doppler", "labels"]).text()).toContain("(343 − 50)/(343 − 0) = 427 Hz");
    expect(render(results({ frequency: 500, sourceSpeed: 30 }), ["doppler"]).text()).not.toContain("548");
    // Fronts bunch up ahead of an approaching source: the newest front sits off-centre towards the listener.
    expect(render(results({ frequency: 500, sourceSpeed: 30 }), ["doppler"]).of("arc").length).toBeGreaterThanOrEqual(12);
  });

  it("reads the sound level off the meter only with the words", () => {
    const out = render(results({ power: 1, distance: 10 }), ["decibel", "labels"]).text();
    expect(out).toContain("89.0 dB");
    expect(out).toContain("I = P/4πr² = 7.96 × 10⁻⁴ W/m²");
    const hidden = render(results({ power: 1, distance: 10 }), ["decibel"]).text();
    expect(hidden).not.toContain("89");
  });
});

describe("on a phone", () => {
  it.each(MODES)("keeps the %s scene and its words on a 325 px canvas", (_name, layers, state, params) => {
    const out = render(results(state, params), layers, 325);
    expect(out.layout.height).toBeGreaterThanOrEqual(330);
    expect(out.layout.height).toBeLessThanOrEqual(420);
    expectOnCanvas(out);
    for (const text of out.texts()) expect(text.length, text).toBeLessThanOrEqual(55);
  });

  it.each(MODES)("draws the %s scene at a wide size too", (_name, layers, state, params) => {
    expectOnCanvas(render(results(state, params), layers, 800));
  });
});
