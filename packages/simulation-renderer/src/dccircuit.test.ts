import { dcCircuitModel, type DcCircuitParams, type DcCircuitState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeDcCircuitLayout, dcCircuitRenderer, dcFixed, dcSci } from "./dccircuit/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = dcCircuitModel.initialize(dcCircuitModel.defaultParams);
const results = (state: Partial<DcCircuitState> = {}, params: Partial<DcCircuitParams> = {}) =>
  dcCircuitModel.derive({ ...base, ...state }, { ...dcCircuitModel.defaultParams, ...params });

/** Records each text with the alignment it was drawn with. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const ctx = new Proxy(rec.ctx as unknown as Record<string, unknown>, {
    get(target, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text, x, y, align: String(target.textAlign ?? "left") });
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
  const layout = computeDcCircuitLayout(width);
  dcCircuitRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, placed, layout, text: () => rec.texts().join(" | ") };
};

const SCENES: [string, Partial<DcCircuitState>, Partial<DcCircuitParams>][] = [
  ["drift", { clock: 7 }, {}],
  ["wire", { temp: 300, length: 5, area: 5 }, { material: "aluminium" }],
  ["network", {}, { network: "series" }],
  ["network", { r1: 100, r2: 100, r3: 100 }, { network: "parallel" }],
  ["network", {}, { network: "mixed" }],
  ["cells", {}, { cells: "one" }],
  ["cells", { emf: 20, emf2: 20 }, { cells: "series" }],
  ["cells", { load: 50 }, { cells: "opposing" }],
  ["cells", {}, { cells: "parallel" }],
  ["kirchhoff", { emf: 20, emf2: 0.5, r1: 1, r2: 100, r3: 100 }, {}],
  ["wheatstone", { r1: 100, r2: 100, r3: 100, box: 200 }, {}],
  ["meterbridge", { jockey: 1, length: 5 }, { material: "aluminium" }],
  ["meterbridge", { jockey: 99 }, {}],
  ["potentiometer", { potJockey: 0 }, { potCell: "shunted" }],
  ["potentiometer", { potJockey: 1000, emf: 15 }, { potCell: "first" }],
  ["potentiometer", {}, { potCell: "second" }],
  ["rc", { time: 600, rcR: 1, rcC: 10 }, {}],
  ["rc", { time: 2 }, { rcPhase: "discharge" }],
];

describe("number formats", () => {
  it("writes minus signs and powers of ten properly", () => {
    expect(dcFixed(-1.234, 2)).toBe("−1.23");
    expect(dcFixed(-0.0001, 2)).toBe("0.00");
    expect(dcSci(1.7e-8)).toBe("1.70 × 10⁻⁸");
    expect(dcSci(9.996e6)).toBe("1.00 × 10⁷");
    expect(dcSci(0)).toBe("0");
  });
});

describe("the drift view", () => {
  it("shows the electrons and, with words, the worked drift speed", () => {
    const shown = render(results({ current: 1.5, area: 0.1 }), ["drift", "labels"]);
    expect(shown.of("arc").length).toBeGreaterThan(40);
    expect(shown.text()).toContain("v_d = I / (neA) = 1.103 mm/s");
    expect(shown.text()).toContain("μ = v_d / E = 4.33 × 10⁻³ m²/(V s)");
    expect(shown.text()).toContain("An electron takes 15.1 min to drift 1 m");
    const hidden = render(results({ current: 1.5, area: 0.1 }), ["drift"]).text();
    expect(hidden).not.toMatch(/mm\/s|min to drift/);
  });

  it("moves the electrons on as time passes", () => {
    const at = (clock: number) => render(results({ clock }), ["drift"]).of("arc").map((c) => c.args[0]);
    expect(at(0)).not.toEqual(at(2));
  });
});

describe("the wire view", () => {
  it("works out ρ, R and I with words, and only states the method without", () => {
    const shown = render(results({ temp: 0 }), ["wire", "labels"]).text();
    expect(shown).toContain("R = ρL / A = 10.00 Ω");
    expect(shown).toContain("I = V / R = 0.600 A");
    expect(shown).toContain("ρ₀ = 1.0 × 10⁻⁶ Ω m, α = 0.0004 per °C");
    expect(shown).toContain("a nichrome wire at 0 °C");
    const hidden = render(results({ temp: 0 }), ["wire"]).text();
    expect(hidden).toContain("R = ρL / A");
    expect(hidden).not.toContain("10.00 Ω");
  });
});

describe("the network view", () => {
  it("fills the table with I, V and P only with words", () => {
    const shown = render(results({ emf: 6, r1: 10, r2: 20, r3: 30 }), ["network", "labels"], 325).texts();
    expect(shown).toEqual(expect.arrayContaining(["Three resistors in series", "60.00 Ω", "0.100 A", "3.00 V", "0.300 W"]));
    const hidden = render(results(), ["network"]).texts();
    expect(hidden).not.toContain("60.00 Ω");
    expect(hidden).toContain("R_eq?");
  });

  it("draws three zigzags and names the arrangement", () => {
    const mixed = render(results({ emf: 6, r1: 10, r2: 20, r3: 30 }, { network: "mixed" }), ["network", "labels"]);
    expect(mixed.text()).toContain("R₁ in series with R₂ and R₃ in parallel");
    expect(mixed.texts()).toContain("22.00 Ω");
  });
});

describe("the cells view", () => {
  it("gives the terminal voltage and the power split", () => {
    const one = render(results({ emf: 6, intR: 1, load: 5 }), ["cells", "labels"]).texts();
    expect(one).toEqual(expect.arrayContaining(["I = 1.000 A", "V = 5.00 V", "5.00 W in R, 1.00 W lost inside"]));
    const pair = render(results({ emf: 6, intR: 1, emf2: 3, intR2: 2, load: 4 }, { cells: "parallel" }), ["cells", "labels"]).text();
    expect(pair).toContain("E_eq = 5.00 V, r_eq = 0.67 Ω");
    expect(render(results(), ["cells"]).text()).not.toMatch(/I = |lost inside/);
  });
});

describe("the Kirchhoff view", () => {
  it("puts the solved currents into the junction and loop equations", () => {
    const shown = render(results({ emf: 12, emf2: 6, r1: 2, r2: 3, r3: 6 }), ["kirchhoff", "labels"], 325).texts();
    expect(shown).toEqual(
      expect.arrayContaining([
        "Junction: I₁ + I₂ = I₃",
        "2.00 + (−0.67) = 1.33 A",
        "12.0 = 2.00 × 2 + 1.33 × 6",
        "6.0 = (−0.67) × 3 + 1.33 × 6",
        "I₂ < 0: it flows against its arrow",
      ]),
    );
    const hidden = render(results({ emf: 12, emf2: 6, r1: 2, r2: 3, r3: 6 }), ["kirchhoff"]).text();
    expect(hidden).toContain("Loop 1: E₁ = I₁R₁ + I₃R₃");
    expect(hidden).not.toContain("1.33");
  });
});

describe("the bridges", () => {
  it("says when the Wheatstone bridge is balanced", () => {
    expect(render(results({ r1: 10, r2: 20, r3: 30, box: 60 }), ["wheatstone", "labels"]).text()).toContain("Balanced: P/Q = R/S, and no current in G");
    const off = render(results({ emf: 6, r1: 10, r2: 20, r3: 30, box: 40 }), ["wheatstone", "labels"]).text();
    expect(off).toContain("I_g = 13.04 mA through G");
    expect(off).toContain("S = 60.0 Ω would balance it");
    expect(render(results({ r1: 10, r2: 20, r3: 30, box: 40 }), ["wheatstone"]).text()).not.toMatch(/would balance|mA/);
  });

  it("reads the metre bridge from the jockey", () => {
    const shown = render(results({ temp: 0, box: 10, jockey: 50 }), ["meterbridge", "labels"]).text();
    expect(shown).toContain("G reads zero: the bridge is balanced");
    expect(shown).toContain("if G read 0 here: X = S·l/(100 − l) = 10.00 Ω");
    expect(shown).toContain("and then ρ = XA/L = 1.00 × 10⁻⁶ Ω m");
    const hidden = render(results({ temp: 0, box: 10, jockey: 30 }), ["meterbridge"]).text();
    expect(hidden).toContain("G deflects: slide the jockey");
    expect(hidden).not.toMatch(/balance point|Ω m/);
  });

  it("finds a cell's internal resistance on the potentiometer", () => {
    const shown = render(results({ emf: 6, intR: 1, load: 5, potJockey: 500 }, { potCell: "shunted" }), ["potentiometer", "labels"]).text();
    expect(shown).toContain("l₁ = 600.0 cm, l₂ = 500.0 cm");
    expect(shown).toContain("r = R(l₁/l₂ − 1) = 1.00 Ω");
    expect(shown).toContain("G reads zero: balanced");
    expect(render(results({ emf: 15 }), ["potentiometer"]).text()).toContain("More than 10 V: no balance on the wire");
    expect(render(results({ emf: 6 }), ["potentiometer"]).text()).not.toContain("600.0");
  });
});

describe("the RC view", () => {
  it("gives τ, q and I with words, and hides them (and the point) without", () => {
    const shown = render(results({ emf: 6, rcR: 10, rcC: 100, time: 1 }), ["rc", "labels"]);
    expect(shown.text()).toContain("τ = RC = 1.00 s · q = 379.3 µC (63.2 %)");
    expect(shown.text()).toContain("I = 0.221 mA · V across C = 3.79 V");
    const hidden = render(results({ emf: 6, rcR: 10, rcC: 100, time: 1 }), ["rc"]);
    expect(hidden.text()).not.toMatch(/τ = RC|µC \(/);
    expect(shown.of("arc").length).toBeGreaterThan(hidden.of("arc").length);
    expect(render(results({ time: 1 }, { rcPhase: "discharge" }), ["rc", "labels"]).text()).toContain("Discharging a capacitor through R");
  });
});

describe("on a phone", () => {
  it.each(SCENES.map(([layer, state, params], i) => [`${layer} ${i}`, layer, state, params] as const))(
    "keeps every word of %s inside a 325 px canvas",
    (_name, layer, state, params) => {
      const shown = render(results(state, params), [layer, "labels"], 325);
      expect(shown.layout.height).toBeGreaterThanOrEqual(330);
      expect(shown.layout.height).toBeLessThanOrEqual(420);
      expect(shown.placed.length).toBeGreaterThan(3);
      for (const { text, x, y, align } of shown.placed) {
        const width = text.length * 6;
        const left = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
        expect(left, `"${text}" starts off the canvas`).toBeGreaterThanOrEqual(0);
        expect(left + width, `"${text}" runs off the canvas`).toBeLessThanOrEqual(325);
        expect(y, `"${text}"`).toBeGreaterThan(0);
        expect(y, `"${text}"`).toBeLessThan(shown.layout.height);
        expect(text.length, `"${text}" is too long for a caption`).toBeLessThanOrEqual(55);
      }
      for (const call of [...shown.of("lineTo"), ...shown.of("moveTo")]) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(325);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(shown.layout.height);
      }
    },
  );
});
