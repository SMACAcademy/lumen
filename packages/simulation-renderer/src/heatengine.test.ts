import { heatEngineModel, type HeatEngineParams, type HeatEngineState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeHeatEngineLayout, heatEngineRenderer, niceCeil } from "./heatengine/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = heatEngineModel.initialize(heatEngineModel.defaultParams);
const results = (params: Partial<HeatEngineParams> = {}, state: Partial<HeatEngineState> = {}) =>
  heatEngineModel.derive({ ...base, ...state }, { ...heatEngineModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  heatEngineRenderer.draw(rec.ctx, computeHeatEngineLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

const EQUILIBRIUM = ["bodies", "labels"];
const PROCESS = ["pv", "compare", "labels"];
const CYCLE = ["cycle", "labels"];
const FRIDGE = ["cycle", "fridge", "labels"];

describe("two bodies in contact", () => {
  it("shows the heat crossing, then the common temperature once settled", () => {
    const early = text(render(results({}, { TA: 400, TB: 300, CB: 1000, t: 1 }), EQUILIBRIUM));
    expect(early).toContain("heat");
    expect(early).toMatch(/A 372\.\d K · B 327\.\d K · \d+ J A→B/);
    const late = text(render(results({}, { TA: 400, TB: 300, CB: 1000, t: 20 }), EQUILIBRIUM));
    expect(late).toContain("Both at 350.0 K: in equilibrium");
    expect(late).not.toContain("heat |");
  });

  it("hides every temperature with the words, and draws no curve before contact", () => {
    const rec = render(results({}, { TA: 400, TB: 300, CB: 3000, t: 0 }), ["bodies"]);
    expect(text(rec)).not.toMatch(/325|K ·|equilibrium/);
    expect(text(rec)).toContain("A | B");
  });
});

describe("one process", () => {
  it("balances the first law in the caption", () => {
    const isobaric = text(render(results({ process: "isobaric" }, { T1: 300, V: 20 }), PROCESS));
    expect(isobaric).toContain("Isobaric expansion · monatomic gas");
    expect(isobaric).toContain("T₂ 600 K · Q 6236 J = ΔU 3741 J + W 2494 J");
    expect(isobaric).toEqual(expect.stringContaining("free piston"));
    const adiabatic = text(render(results({ process: "adiabatic", gas: "di" }, { T1: 300, V: 5 }), PROCESS));
    expect(adiabatic).toContain("Adiabatic compression · diatomic gas");
    expect(adiabatic).toContain("T₂ 396 K · Q 0 J = ΔU 1992 J + W −1992 J");
    expect(adiabatic).toContain("insulated");
  });

  it("names the isotherm and the adiabat when they are compared", () => {
    expect(render(results(), PROCESS).texts()).toEqual(expect.arrayContaining(["isotherm", "adiabat", "Q", "W", "ΔU", "1", "2"]));
    expect(render(results(), ["pv"]).texts()).not.toContain("adiabat");
  });

  it("shades the work under the path, and none at constant volume", () => {
    const expanding = render(results({ process: "isothermal" }, { V: 20 }), ["pv"]);
    expect(expanding.texts()).toContain("W");
    expect(expanding.of("closePath").length).toBeGreaterThan(0);
    const locked = render(results({ process: "isochoric" }, { Tend: 600 }), ["pv", "labels"]);
    expect(text(locked)).toContain("Isochoric heating");
    expect(text(locked)).toContain("piston locked");
    expect(text(locked)).toContain("+ W 0 J");
  });

  it("hides the numbers with the words", () => {
    const hidden = text(render(results({ process: "adiabatic", gas: "di" }, { V: 5 }), ["pv"]));
    expect(hidden).not.toMatch(/396|1992| J/);
  });
});

describe("cycles", () => {
  it("gives the rectangle's efficiency and its Carnot limit", () => {
    const r = text(render(results({ cycle: "rectangle" }, { Vb: 20, Ph: 200 }), CYCLE));
    expect(r).toContain("Rectangle cycle engine · monatomic");
    expect(r).toContain("W 1000 J · Q₁ 6500 J · η 0.15 (limit 0.75)");
    expect(r).toContain("Q₁ 6500 J");
    expect(render(results({ cycle: "rectangle" }), CYCLE).texts()).toEqual(expect.arrayContaining(["A", "B", "C", "D", "Q₁", "Q₂", "W"]));
  });

  it("gives Carnot's 1 − T₂/T₁ and a refrigerator's COP", () => {
    expect(text(render(results({ cycle: "carnot" }, { Th: 500, Tc: 300 }), CYCLE))).toContain("η = 1 − 300/500 = 0.40");
    const fridge = text(render(results({ cycle: "carnot" }, { Th: 300, Tc: 250 }), FRIDGE));
    expect(fridge).toContain("Carnot refrigerator");
    expect(fridge).toContain("COP = Q₂/W = 1441 J / 288 J = 5.00");
  });

  it("hides the efficiency and the COP with the words", () => {
    const hidden = text(render(results({ cycle: "carnot" }, { Th: 500, Tc: 300 }), ["cycle"]));
    expect(hidden).not.toMatch(/η|0\.40|500 K/);
    expect(hidden).toContain("hot, T₁");
    expect(text(render(results({ cycle: "carnot" }, { Th: 300, Tc: 250 }), ["cycle", "fridge"]))).not.toMatch(/COP|5\.00/);
  });
});

describe("on a phone", () => {
  const scenes: [string, ReturnType<typeof results>, string[]][] = [
    ["equilibrium", results({}, { TA: 200, TB: 500, CB: 250, t: 3 }), EQUILIBRIUM],
    ["isobaric, largest", results({ process: "isobaric", gas: "di" }, { T1: 600, V: 30 }), PROCESS],
    ["isochoric, coldest", results({ process: "isochoric" }, { T1: 600, Tend: 100 }), PROCESS],
    ["adiabatic squeeze", results({ process: "adiabatic" }, { T1: 600, V: 5 }), PROCESS],
    ["rectangle, largest", results({ cycle: "rectangle", gas: "di" }, { Vb: 30, Ph: 400 }), CYCLE],
    ["carnot, widest", results({ cycle: "carnot", gas: "di" }, { Th: 800, Tc: 200, ratio: 3, phase: 2.5 }), CYCLE],
    ["fridge", results({ cycle: "carnot" }, { Th: 300, Tc: 290 }), FRIDGE],
  ];

  it.each(scenes)("keeps every word of %s on a 325 px canvas", (_name, r, layers) => {
    const layout = computeHeatEngineLayout(325);
    const rec = recordingContext();
    // Note the alignment in force at each fillText, so each word's extent is known.
    const placed: { words: string; x: number; y: number; align: string }[] = [];
    const ctx = new Proxy(rec.ctx, {
      get(target, key: string) {
        if (key === "fillText") {
          return (words: string, x: number, y: number) => {
            placed.push({ words, x, y, align: String((target as unknown as { textAlign?: string }).textAlign ?? "left") });
            target.fillText(words, x, y);
          };
        }
        return (target as unknown as Record<string, unknown>)[key];
      },
      set(target, key: string, value) {
        (target as unknown as Record<string, unknown>)[key] = value;
        return true;
      },
    });
    heatEngineRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
    expect(placed.length).toBeGreaterThan(5);
    for (const { words, x, y, align } of placed) {
      const w = words.length * 6;
      const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      expect(left, words).toBeGreaterThanOrEqual(0);
      expect(left + w, words).toBeLessThanOrEqual(325);
      expect(y, words).toBeGreaterThanOrEqual(0);
      expect(y, words).toBeLessThanOrEqual(layout.height);
      expect(words.length, words).toBeLessThanOrEqual(48);
    }
    for (const call of rec.of("arc")) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(325);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(layout.height);
    }
  });

  it("rounds axes up to a round number", () => {
    expect([niceCeil(287), niceCeil(1000), niceCeil(1001), niceCeil(0)]).toEqual([300, 1000, 1200, 1]);
  });
});
