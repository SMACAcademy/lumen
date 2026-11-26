import { acCircuitModel, type AcParams, type AcState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { acCircuitRenderer, acSci, acWavelength, computeAcLayout } from "./accircuit/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = acCircuitModel.initialize(acCircuitModel.defaultParams);
const results = (params: Partial<AcParams> = {}, state: Partial<AcState> = {}) =>
  acCircuitModel.derive({ ...base, ...state }, { ...acCircuitModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  acCircuitRenderer.draw(rec.ctx, computeAcLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

const PHASE = ["circuit", "phasors", "traces", "labels"];
const LCR = ["circuit", "phasors", "resonance", "labels"];

describe("number formatting", () => {
  it("writes powers of ten and wavelengths readably", () => {
    expect(acSci(2.998e8)).toBe("3.00 × 10⁸");
    expect(acSci(4.427e-8)).toBe("4.43 × 10⁻⁸");
    expect(acWavelength(537e-9)).toBe("537 nm");
    expect(acWavelength(0.03)).toBe("3.00 cm");
    expect(acWavelength(1e-14)).toBe("0.010 pm");
  });
});

describe("the phase view", () => {
  it("says ELI for an inductor and ICE for a capacitor", () => {
    expect(text(results({ circuit: "L" }), PHASE)).toContain("current lags the voltage by 90° (ELI)");
    expect(text(results({ circuit: "C" }), PHASE)).toContain("current leads the voltage by 90° (ICE)");
    expect(text(results({ circuit: "R" }), PHASE)).toContain("keeps step");
  });

  it("gives the reactance and current only with the words", () => {
    const L = text(results({ circuit: "L" }), PHASE);
    expect(L).toContain("X_L = ωL = 31.4 Ω");
    expect(L).toContain("I = 7.32 A rms");
    expect(L).toContain("V peak 325 V");
    const hidden = text(results({ circuit: "C" }), ["circuit", "phasors", "traces"]);
    expect(hidden).not.toMatch(/325|0\.723|318/);
  });

  it("draws V and I phasors, and V_R, V_L, V_C for the LCR circuit", () => {
    expect(render(results({ circuit: "L" }), PHASE).texts()).toEqual(expect.arrayContaining(["V", "I", "L", "~"]));
    expect(render(results({ circuit: "LCR" }), PHASE).texts()).toEqual(expect.arrayContaining(["V", "V_R", "V_L", "V_C", "R", "L", "C"]));
  });

  it("says by how much an LCR current lags or leads", () => {
    expect(text(results({ circuit: "LCR" }, { resistance: 30, freq: 200 }), PHASE)).toContain("current lags the voltage by 56.9°");
    expect(text(results({ circuit: "LCR" }, { resistance: 30, freq: 50 }), PHASE)).toContain("leads");
  });

  it("adds p = vi and its average in the power view", () => {
    const t = text(results({ circuit: "R" }, { resistance: 100 }), ["phasors", "traces", "power", "labels"]);
    expect(t).toContain("P = V I cos φ = 529 W · cos φ = 1.00");
    expect(t).toContain("average p");
  });
});

describe("the resonance view", () => {
  it("marks f₀ and reports Q with the words, and hides the axis numbers without them", () => {
    const r = results({ circuit: "LCR" }, { resistance: 10, freq: 159 });
    const t = text(r, LCR);
    expect(t).toContain("f₀ 159 Hz");
    expect(t).toContain("f 159 Hz · I 23.0 A · Q 10.0 · at resonance");
    const hidden = render(r, ["circuit", "phasors", "resonance"]).texts();
    expect(hidden.join(" ")).not.toMatch(/159|23|f₀/);
  });

  it("asks for the LCR circuit when another is chosen", () => {
    expect(text(results({ circuit: "R" }), LCR)).toContain("Choose Series LCR");
  });
});

describe("the transformer view", () => {
  it("draws the turns in proportion and gives Vs only with the words", () => {
    const r = results({}, { vrms: 230, np: 1000, ns: 50, resistance: 10 });
    const rec = render(r, ["transformer", "labels"]);
    const t = rec.texts().join(" | ");
    expect(t).toContain("Np = 1000");
    expect(t).toContain("Vs 11.5 V");
    expect(t).toContain("step-down · Vs/Vp = Ns/Np = 0.050");
    expect(t).toContain("lost: all of it, and more");
    expect(text(r, ["transformer"])).not.toContain("11.5");
    expect(text(results({}, { vrms: 230, np: 100, ns: 2000 }), ["transformer", "labels"])).toContain("lost: 0.095%");
  });
});

describe("the LC view", () => {
  it("puts the energy in the capacitor at the start and in the coil a quarter cycle later", () => {
    const t = text(results({}, { theta: 0 }), ["lc", "labels"]);
    expect(t).toContain("f₀ = 159 Hz · T = 6.28 ms · total 0.500 mJ");
    expect(render(results({}, { theta: 0 }), ["lc"]).texts().filter((s) => s === "+")).toHaveLength(5);
    expect(render(results({}, { theta: Math.PI / 2 }), ["lc"]).texts().filter((s) => s === "+")).toHaveLength(0);
    expect(text(results({}, { theta: 0 }), ["lc"])).not.toContain("159");
  });
});

describe("the displacement-current view", () => {
  it("equates the current in the wires and across the gap", () => {
    const r = results({ circuit: "C" }, { vrms: 230, freq: 50, capacitance: 10, theta: 1 });
    expect(text(r, ["capacitor", "labels"])).toContain("i = i_d = ε₀ dΦ_E/dt = 0.723 A rms");
    expect(text(r, ["capacitor"])).not.toContain("0.723");
    expect(text(results({ circuit: "R" }), ["capacitor"])).toContain("Choose a circuit with a capacitor");
  });
});

describe("the wave and spectrum views", () => {
  it("gives B₀, the intensity and the pressure with the words", () => {
    const t = text(results({}, { e0: 300 }), ["wave", "labels"]);
    expect(t).toContain("B₀ = E₀/c = 1.00 µT");
    expect(t).toContain("intensity I = 120 W/m²");
    expect(t).toContain("c = 1/√(μ₀ε₀) = 3.00 × 10⁸ m/s");
    expect(text(results({}, { e0: 300 }), ["wave"])).not.toMatch(/µT|W\/m²/);
  });

  it("names the band, its source and a use", () => {
    const t = text(results({}, { lambdaExp: -2 }), ["wave", "spectrum", "labels"]);
    expect(t).toContain("Microwaves");
    expect(t).toContain("Use: radar, ovens, Wi-Fi");
    expect(t).toContain("λ = 1.00 cm · f = c/λ = 3.00 × 10¹⁰ Hz");
    expect(text(results({}, { lambdaExp: -6.27 }), ["wave", "spectrum"])).toContain("Visible light");
  });
});

describe("on a phone", () => {
  it("keeps every label on a 325 px canvas and every caption short", () => {
    const views: [Partial<AcParams>, Partial<AcState>, string[]][] = [
      [{ circuit: "L" }, {}, PHASE],
      [{ circuit: "LCR" }, { resistance: 1, freq: 2000, inductance: 1000, capacitance: 100 }, PHASE],
      [{ circuit: "LCR" }, { resistance: 10, freq: 159 }, LCR],
      [{ circuit: "LCR" }, { resistance: 200, freq: 2000 }, LCR],
      [{ circuit: "R" }, {}, ["phasors", "traces", "power", "labels"]],
      [{}, { np: 50, ns: 2000, vrms: 240 }, ["transformer", "labels"]],
      [{}, { np: 1000, ns: 10 }, ["transformer", "labels"]],
      [{}, { theta: 2 }, ["lc", "labels"]],
      [{ circuit: "C" }, { theta: 1 }, ["capacitor", "labels"]],
      [{}, { e0: 1000 }, ["wave", "labels"]],
      [{}, { lambdaExp: -14 }, ["wave", "spectrum", "labels"]],
      [{}, { lambdaExp: 3 }, ["wave", "spectrum", "labels"]],
    ];
    for (const [params, state, layers] of views) {
      const rec = recordingContext();
      const placed: { t: string; left: number; right: number; y: number }[] = [];
      // Catch each label with the alignment it was drawn with.
      rec.ctx.fillText = (t: string, x: number, y: number) => {
        const w = t.length * 6;
        const align = rec.ctx.textAlign;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        placed.push({ t, left, right: left + w, y });
      };
      acCircuitRenderer.draw(rec.ctx, computeAcLayout(325), { results: results(params, state), trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
      expect(placed.length).toBeGreaterThan(3);
      for (const { t, left, right, y } of placed) {
        expect(left, `${t} left`).toBeGreaterThanOrEqual(0);
        expect(right, `${t} right`).toBeLessThanOrEqual(325);
        expect(y, `${t} y`).toBeGreaterThan(0);
        expect(y, `${t} y`).toBeLessThan(400);
        expect(t.length, t).toBeLessThanOrEqual(55);
      }
    }
  });

  it("keeps the phasors, schematic, plot and spectrum inside the canvas", () => {
    const l = computeAcLayout(325);
    expect(l.phasor.x - l.phasor.r).toBeGreaterThanOrEqual(12);
    expect(l.phasor.x + l.phasor.r).toBeLessThan(l.schematic.x);
    expect(l.schematic.x + l.schematic.width).toBeLessThanOrEqual(325 - 8);
    expect(l.plot.x + l.plot.width).toBeLessThanOrEqual(325 - 8);
    expect(l.spectrum.x + l.spectrum.width).toBeLessThanOrEqual(325 - 8);
    expect(l.height).toBeGreaterThanOrEqual(330);
    expect(l.height).toBeLessThanOrEqual(420);
  });
});
