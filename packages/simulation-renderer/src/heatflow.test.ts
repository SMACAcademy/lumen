import { heatflowModel, type HeatflowParams, type HeatflowState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeHeatflowLayout, heatflowBodyColor, heatflowRenderer, heatflowStripPoints } from "./heatflow/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const P = heatflowModel.defaultParams;
const S = heatflowModel.initialize(P);
const results = (state: Partial<HeatflowState> = {}, params: Partial<HeatflowParams> = {}) =>
  heatflowModel.derive({ ...S, ...state }, { ...P, ...params });

interface Text {
  text: string;
  x: number;
  y: number;
  align: string;
}

/** Records every text drawn with the alignment in force, so its extent can be checked. */
function render(r: ReturnType<typeof results>, layers: string[], width = 800) {
  const rec = recordingContext();
  const placed: Text[] = [];
  const ctx = new Proxy(rec.ctx as unknown as Record<string, unknown>, {
    get(target, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          placed.push({ text: String(text), x, y, align: String(target.textAlign ?? "left") });
          return (target.fillText as (...a: unknown[]) => void)(text, x, y);
        };
      }
      return target[key];
    },
    set(target, key: string, value) {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeHeatflowLayout(width);
  heatflowRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  const texts = rec.texts();
  return { rec, placed, layout, texts, all: texts.join(" | ") };
}

/** Every text stays on the canvas (6 px a character, as the recorder measures). */
function expectOnCanvas(placed: Text[], width: number, height: number) {
  for (const t of placed) {
    const w = t.text.length * 6;
    const left = t.align === "center" ? t.x - w / 2 : t.align === "right" ? t.x - w : t.x;
    expect(left, t.text).toBeGreaterThanOrEqual(0);
    expect(left + w, t.text).toBeLessThanOrEqual(width);
    expect(t.y, t.text).toBeGreaterThanOrEqual(0);
    expect(t.y, t.text).toBeLessThanOrEqual(height);
  }
}

const MODES: [string, string[], Partial<HeatflowState>, Partial<HeatflowParams>][] = [
  ["scales", ["thermometers", "labels"], { celsius: -273 }, {}],
  ["scales hot", ["thermometers", "labels"], { celsius: 300 }, {}],
  ["expansion", ["bar", "bimetal", "labels"], { deltaT: 200, barLength: 100 }, { material: "aluminium" }],
  ["expansion cold", ["bar", "bimetal", "labels"], { deltaT: -100 }, { material: "aluminium" }],
  ["water", ["water", "labels"], { waterTemp: 20 }, {}],
  ["rod", ["rod", "labels"], { hotEnd: 300, coldEnd: 0 }, { rodMaterial: "aluminium" }],
  ["slabs", ["slabs", "labels"], { rodLength: 0.1, secondLength: 2 }, { rodMaterial: "aluminium", secondMaterial: "aluminium" }],
  ["breeze", ["breeze", "labels"], {}, { daytime: "night" }],
  ["radiation", ["body", "spectrum", "labels"], { bodyTemp: 9950 }, {}],
  ["radiation cold", ["body", "spectrum", "labels"], { bodyTemp: 300 }, {}],
  ["cooling", ["cooling", "labels"], { coolTime: 60, startTemp: 100 }, {}],
];

describe("heatflow layout", () => {
  it("fits a phone and a desk", () => {
    const phone = computeHeatflowLayout(325);
    expect(phone.compact).toBe(true);
    expect(phone.height).toBeGreaterThanOrEqual(330);
    expect(phone.height).toBeLessThanOrEqual(420);
    expect(phone.box.x + phone.box.width).toBeLessThanOrEqual(325);
    expect(phone.bottom.y).toBe(phone.top.y + phone.top.height);
    expect(computeHeatflowLayout(900).compact).toBe(false);
  });

  it.each(MODES)("keeps every word of the %s bench on a 325 px canvas", (_name, layers, state, params) => {
    const { placed, layout } = render(results(state, params), layers, 325);
    expect(placed.length).toBeGreaterThan(3);
    expectOnCanvas(placed, 325, layout.height);
  });
});

describe("the scales", () => {
  it("reads one hotness on three thermometers, only with words on", () => {
    const shown = render(results({ celsius: 37 }), ["thermometers", "labels"]).texts;
    expect(shown).toEqual(expect.arrayContaining(["Celsius", "Fahrenheit", "Kelvin", "37.0 °C", "98.6 °F", "310.15 K", "32", "212", "273", "373"]));
    const hidden = render(results({ celsius: 37 }), ["thermometers"]).all;
    expect(hidden).not.toContain("98.6");
    expect(hidden).not.toContain("310.15");
  });

  it("raises all three columns together", () => {
    const columnTop = (c: number) => render(results({ celsius: c }), ["thermometers"]).rec.of("fillRect").map((call) => call.args[1] as number);
    const cold = columnTop(0);
    const hot = columnTop(100);
    expect(new Set(cold).size).toBe(1);
    expect(hot[0]).toBeLessThan(cold[0]!);
  });
});

describe("expansion", () => {
  it("names the bar and gives the stretch only with words on", () => {
    const shown = render(results({ barLength: 10, deltaT: 40 }, { material: "steel" }), ["bar", "labels"]).all;
    expect(shown).toContain("Steel bar, ΔT = +40 K");
    expect(shown).toContain("L₀ = 10 m · ΔL = 4.80 mm");
    expect(render(results({ barLength: 10, deltaT: 40 }), ["bar"]).all).not.toContain("4.80");
  });

  it("draws a longer bar for more expansion", () => {
    const hotWidth = (deltaT: number) => render(results({ deltaT }, { material: "aluminium" }), ["bar"]).rec.of("fillRect")[0]!.args[2] as number;
    expect(hotWidth(200)).toBeGreaterThan(hotWidth(0));
    expect(hotWidth(-100)).toBeLessThan(hotWidth(0));
  });

  it("curls the strip down when heated, up when cooled", () => {
    const end = (turn: number) => heatflowStripPoints(0, 0, 100, turn).at(-1)!;
    expect(end(0)).toEqual([100, 0]);
    expect(end(0.5)[1]).toBeGreaterThan(0);
    expect(end(-0.5)[1]).toBeLessThan(0);
    expect(render(results({ deltaT: 50 }), ["bimetal"]).all).toContain("curls towards steel");
    expect(render(results({ deltaT: -50 }), ["bimetal"]).all).toContain("curls towards brass");
    expect(render(results({ deltaT: 0 }), ["bimetal"]).all).toContain("stays straight");
  });
});

describe("water", () => {
  it("marks 4 °C and the reading only with words on", () => {
    const shown = render(results({ waterTemp: 10 }), ["water", "labels"]).all;
    expect(shown).toContain("densest, 4 °C");
    expect(shown).toContain("10.0 °C: 999.70 kg/m³");
    expect(shown).toContain("Above 4 °C water expands as it warms");
    expect(render(results({ waterTemp: 2 }), ["water", "labels"]).all).toContain("Below 4 °C water expands as it cools");
    expect(render(results({ waterTemp: 10 }), ["water"]).all).not.toContain("4 °C");
  });
});

describe("conduction", () => {
  it("gives the rod's heat current and gradient only with words on", () => {
    const shown = render(results({ hotEnd: 100, coldEnd: 0, rodLength: 0.5, area: 4 }, { rodMaterial: "copper" }), ["rod", "labels"]).all;
    expect(shown).toContain("Copper rod, k = 385 W/(m·K)");
    expect(shown).toContain("H = 30.8 W");
    expect(shown).toContain("temperature gradient 200 K/m");
    const hidden = render(results(), ["rod"]).all;
    expect(hidden).not.toContain("30.8");
    expect(hidden).toContain("H = kA(T₁ − T₂)/L in the steady state");
  });

  it("finds the joint between two slabs and hides it without words", () => {
    const shown = render(results({}, { rodMaterial: "copper", secondMaterial: "steel" }), ["slabs", "labels"]).all;
    expect(shown).toContain("A: Copper 0.50 m · B: Steel 0.50 m");
    expect(shown).toContain("joint at 88.5 °C");
    expect(shown).toContain("R_A = 3.25, R_B = 24.9 K/W");
    expect(shown).toContain("H = 3.55 W in series, 34.8 W side by side");
    expect(render(results(), ["slabs"]).all).not.toContain("88.5");
  });
});

describe("convection", () => {
  it("turns the breeze round at night", () => {
    expect(render(results({}, { daytime: "day" }), ["breeze"]).all).toContain("By day: a sea breeze");
    expect(render(results({}, { daytime: "night" }), ["breeze"]).all).toContain("By night: a land breeze");
  });
});

describe("radiation", () => {
  it("gives the Sun's peak and power only with words on", () => {
    const shown = render(results({ bodyTemp: 5800 }), ["body", "spectrum", "labels"]).all;
    expect(shown).toContain("5800 K: a white glow");
    expect(shown).toContain("peak λ_max = 500 nm, visible");
    expect(shown).toContain("σeT⁴ = 6.42 × 10⁷ W/m²");
    const hidden = render(results({ bodyTemp: 5800 }), ["body", "spectrum"]).all;
    expect(hidden).not.toContain("500 nm");
  });

  it("colours a hot body by its temperature", () => {
    expect(heatflowBodyColor(500, fallbackTheme)).toBe(fallbackTheme.reference);
    expect(heatflowBodyColor(1000, fallbackTheme)).toMatch(/^rgb\(\d+, \d+, 0\)$/);
    expect(heatflowBodyColor(6600, fallbackTheme)).toBe("rgb(255, 255, 255)");
  });
});

describe("cooling", () => {
  it("reads the cup's temperature and rate only with words on", () => {
    const shown = render(results({ startTemp: 90, roomTemp: 25, coolingConstant: 0.1, coolTime: 10 }), ["cooling", "labels"]).all;
    expect(shown).toContain("t = 10 min: T = 48.9 °C, cooling at 2.39 °C/min");
    expect(shown).toContain("room 25 °C");
    expect(render(results({ coolTime: 10 }), ["cooling"]).all).not.toContain("48.9");
  });
});
