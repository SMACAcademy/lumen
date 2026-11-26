import { semiconductorModel, type SemiconductorParams, type SemiconductorState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeSemiconductorLayout, semiconductorRenderer, semiPowerOfTen, semiWavelengthColour } from "./semiconductor/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = semiconductorModel.initialize(semiconductorModel.defaultParams);
const results = (params: Partial<SemiconductorParams> = {}, state: Partial<SemiconductorState> = {}) =>
  semiconductorModel.derive({ ...base, ...state }, { ...semiconductorModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  semiconductorRenderer.draw(rec.ctx, computeSemiconductorLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const words = (r: ReturnType<typeof results>, layers: string[]) => render(r, layers).texts().join(" | ");

describe("the bands view", () => {
  it("draws all four solids and names the chosen one", () => {
    const t = words(results({ solid: "silicon" }), ["bands", "labels"]);
    expect(t).toContain("Copper");
    expect(t).toContain("Diamond");
    expect(t).toContain("1.1 eV");
    expect(t).toContain("5.4 eV");
    expect(t).toContain("Silicon: E_g = 1.1 eV — a semiconductor");
    expect(words(results({ solid: "diamond" }), ["bands", "labels"])).toContain("Diamond: E_g = 5.4 eV — an insulator");
    expect(words(results({ solid: "metal" }), ["bands", "labels"])).toContain("the bands overlap");
  });

  it("hides the gaps without the words", () => {
    expect(words(results({ solid: "germanium" }), ["bands"])).not.toMatch(/eV/);
  });
});

describe("the doping view", () => {
  it("puts an arsenic atom in n-type silicon and gives the densities", () => {
    const t = words(results({ dopant: "pentavalent" }, { ppm: 1 }), ["lattice", "labels"]);
    expect(t).toContain("n-type silicon");
    expect(t).toContain("As");
    expect(t).toContain("5.0 × 10²² /m³");
    expect(t).toContain("4.5 × 10⁹ /m³");
  });

  it("puts boron in p-type, and hides the numbers without the words", () => {
    const t = words(results({ dopant: "trivalent" }, { ppm: 1 }), ["lattice"]);
    expect(t).toContain("p-type silicon");
    expect(t).toContain("B");
    expect(t).not.toContain("10²²");
    expect(words(results({ dopant: "none" }), ["lattice"])).toContain("Intrinsic (pure) silicon");
  });

  it("writes powers of ten", () => {
    expect(semiPowerOfTen(1.5e16)).toBe("1.5 × 10¹⁶");
    expect(semiPowerOfTen(9.96e9)).toBe("1.0 × 10¹⁰");
    expect(semiPowerOfTen(0)).toBe("0");
  });
});

describe("the junction view", () => {
  it("names the bias and gives the barrier and layer", () => {
    const t = words(results({ device: "silicon" }, { bias: 0.3 }), ["junction", "labels"]);
    expect(t).toContain("Silicon diode: forward bias");
    expect(t).toContain("barrier 0.40 V · layer 0.32 µm");
    expect(words(results({}, { bias: -5 }), ["junction"])).toContain("reverse bias");
    expect(words(results({}, { bias: -5 }), ["junction"])).not.toContain("barrier 5.70");
  });
});

describe("the I–V view", () => {
  it("plots the characteristic and reads off the operating point", () => {
    const t = words(results({ device: "silicon" }, { bias: 0.7 }), ["curve", "labels"]);
    expect(t).toContain("I–V characteristic (model)");
    expect(t).toContain("cut-in 0.71 V");
    expect(t).toContain("V = 0.70 V · I = 7.49 mA");
    expect(words(results({ device: "germanium" }, { bias: -5 }), ["curve", "labels"])).toContain("I = −1.000 µA");
    expect(words(results({ device: "germanium" }, { bias: 0.6 }), ["curve", "labels"])).toContain("beyond its rating");
    expect(words(results({ device: "zener" }, { bias: -6.1 }), ["curve", "labels"])).toContain("V_Z = 6.0 V");
  });

  it("hides the cut-in without the words", () => {
    expect(words(results({}, { bias: 0.7 }), ["curve"])).not.toContain("cut-in");
  });
});

describe("the rectifier view", () => {
  it("gives the DC level and ripple", () => {
    expect(words(results({ rectifier: "half", filter: 0 }, { peak: 10 }), ["rectifier", "labels"])).toContain("DC 2.84 V · ripple 9.30 V at 50 Hz");
    const t = words(results({ rectifier: "full", filter: 1 }, { peak: 10, capacitance: 100 }), ["rectifier", "labels"]);
    expect(t).toContain("Full-wave rectifier + capacitor");
    expect(t).toContain("ripple 0.77 V at 100 Hz");
    expect(words(results({ filter: 0 }), ["rectifier"])).not.toContain("DC");
  });
});

describe("the Zener view", () => {
  it("shows the currents and the steady output", () => {
    const t = words(results({}, { vin: 10 }), ["zener", "labels"]);
    expect(t).toContain("I_S 20.0 mA");
    expect(t).toContain("I_Z 16.0 mA");
    expect(t).toContain("I_L 4.0 mA");
    expect(t).toContain("V_in 10.0 V → V_out 6.00 V · I_Z 16.0 mA");
    expect(words(results({}, { vin: 5 }), ["zener"])).toContain("has not broken down");
  });
});

describe("the light views", () => {
  it("names the LED's wavelength and colour only with the words", () => {
    expect(words(results({}, { gap: 1.9 }), ["led", "labels"])).toContain("E_g 1.90 eV → λ = 653 nm (red)");
    expect(words(results({}, { gap: 1.9 }), ["led"])).not.toContain("653");
    // No wavelength marker on the spectrum without the words.
    expect(render(results({}, { gap: 1.9 }), ["led"]).of("moveTo").length).toBeLessThan(render(results({}, { gap: 1.9 }), ["led", "labels"]).of("moveTo").length);
    expect(semiWavelengthColour(650)).toBe("rgb(255,0,0)");
    expect(semiWavelengthColour(1000)).toBe("rgb(140,140,150)");
  });

  it("gives the photocurrent and the solar cell's numbers", () => {
    const t = words(results({}, { light: 1000 }), ["photo", "labels"]);
    expect(t).toContain("500.0 µA");
    expect(t).toContain("I_sc 3.50 A · V_oc 0.569 V · best 1.63 W");
    expect(words(results({}, { light: 0 }), ["photo", "labels"])).toContain("I_sc 0.00 A");
  });
});

describe("the transistor view", () => {
  it("names the region and gives the gain", () => {
    expect(words(results({}, { vi: 1 }), ["transistor", "labels"])).toContain("V_i 1.00 V → V_o 7.00 V · gain 10");
    expect(words(results({}, { vi: 0.5 }), ["transistor"])).toContain("cut off");
    expect(words(results({}, { vi: 4 }), ["transistor"])).toContain("saturated");
  });
});

describe("the gates view", () => {
  it("draws the truth table, with the outputs only with the words", () => {
    const shown = render(results({ gate: "nand" }, { a: 1, b: 1 }), ["gates", "labels"]).texts();
    expect(shown).toEqual(expect.arrayContaining(["NAND gate", "A = 1", "B = 1", "Y = 0"]));
    expect(shown.filter((t) => t === "?")).toHaveLength(0);
    const hidden = render(results({ gate: "nand" }, { a: 1, b: 1 }), ["gates"]).texts();
    expect(hidden.filter((t) => t === "?")).toHaveLength(4);
    expect(render(results({ gate: "not" }, { a: 0 }), ["gates"]).texts()).toEqual(expect.arrayContaining(["NOT gate", "Y = 1"]));
    expect(words(results({ gate: "nand-or" }, { a: 0, b: 1 }), ["gates"])).toContain("built from 3 NAND gates alone");
  });
});

describe("on a phone", () => {
  const views: [string, Partial<SemiconductorParams>, Partial<SemiconductorState>][] = [
    ["bands", { solid: "diamond" }, {}],
    ["lattice", { dopant: "pentavalent" }, { ppm: 6 }],
    ["junction", { device: "germanium" }, { bias: -10 }],
    ["junction", { device: "silicon" }, { bias: 0.6 }],
    ["curve", { device: "zener" }, { bias: -6.2 }],
    ["curve", { device: "germanium" }, { bias: 0.24 }],
    ["rectifier", { rectifier: "full", filter: 1 }, { peak: 20, capacitance: 10, t: 0.03 }],
    ["zener", {}, { vin: 20 }],
    ["led", {}, { gap: 3.4 }],
    ["led", {}, { gap: 1.4 }],
    ["photo", {}, { light: 1000 }],
    ["transistor", { beta: 250 }, { vi: 5 }],
    ["gates", { gate: "nand-or" }, { a: 1, b: 1 }],
    ["gates", { gate: "nor" }, { a: 0, b: 1 }],
  ];

  it.each(views)("keeps the %s view's words on a 325 px canvas", (layer, params, state) => {
    const width = 325;
    const layout = computeSemiconductorLayout(width);
    const rec = recordingContext();
    const placed: { text: string; x: number; y: number; align: string }[] = [];
    (rec.ctx as unknown as { fillText: (t: string, x: number, y: number) => void }).fillText = (text, x, y) =>
      placed.push({ text, x, y, align: String((rec.ctx as unknown as { textAlign?: string }).textAlign ?? "left") });
    semiconductorRenderer.draw(rec.ctx, layout, { results: results(params, state), trace: null, layers: new Set([layer, "labels"]), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    expect(placed.length).toBeGreaterThan(2);
    for (const { text, x, y, align } of placed) {
      const w = text.length * 6;
      const [from, to] = align === "center" ? [x - w / 2, x + w / 2] : align === "right" ? [x - w, x] : [x, x + w];
      expect(from, text).toBeGreaterThanOrEqual(0);
      expect(to, text).toBeLessThanOrEqual(width);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeLessThanOrEqual(layout.height);
      expect(text.length, text).toBeLessThanOrEqual(55);
    }
  });
});
