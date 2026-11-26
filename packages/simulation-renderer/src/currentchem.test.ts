import { currentChemModel, type CurrentChemParams } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeCurrentChemLayout, currentChemMilliamps, currentChemRenderer } from "./currentchem/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (params: Partial<CurrentChemParams> = {}, minutes = 0) =>
  currentChemModel.derive({ minutes }, { ...currentChemModel.defaultParams, ...params });

interface Extent {
  text: string;
  left: number;
  right: number;
  y: number;
}

/** Render, and record where every piece of text lands (the recorder measures 6 px a character). */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const extents: Extent[] = [];
  let align = "left";
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    set(t, key: string, value) {
      if (key === "textAlign") align = String(value);
      t[key] = value;
      return true;
    },
    get(t, key: string) {
      const value = t[key] as (...args: unknown[]) => unknown;
      if (key !== "fillText") return value;
      return (s: string, x: number, y: number) => {
        const w = String(s).length * 6;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        extents.push({ text: String(s), left, right: left + w, y });
        return value(s, x, y);
      };
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeCurrentChemLayout(width);
  currentChemRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, extents, layout, text: () => rec.texts().join(" | ") };
};

describe("the tester", () => {
  it("says whether the liquid conducts, and how the tester shows it", () => {
    expect(render(results({ tester: "led", liquid: "lemon", cells: 2 }), ["tester", "labels"]).text()).toContain("It conducts: the LED glows.");
    expect(render(results({ tester: "bulb", liquid: "lemon", cells: 2 }), ["tester", "labels"]).text()).toContain("Too little current to light the bulb.");
    expect(render(results({ tester: "compass", liquid: "tap", cells: 2 }), ["tester", "labels"]).text()).toContain("the needle turns");
    expect(render(results({ tester: "bulb", liquid: "oil" }), ["tester", "labels"]).text()).toContain("It does not conduct");
    expect(render(results({ tester: "led", liquid: "distilled", salt: 0 }), ["tester", "labels"]).text()).toContain("It hardly conducts");
    expect(render(results({ tester: "led", liquid: "joined", cells: 1 }), ["tester", "labels"]).text()).toContain("One cell is too little push");
  });

  it("names the liquid and its salt, and writes the current only with the numbers on", () => {
    const words = render(results({ tester: "led", liquid: "lemon", cells: 2 }), ["tester", "labels"]).texts();
    expect(words).toEqual(expect.arrayContaining(["Lemon juice", "3.0 V", "4.80 mA"]));
    expect(render(results({ liquid: "distilled", salt: 3 }), ["tester"]).texts()).toContain("Distilled water + 3 pinches of salt");
    expect(render(results({ liquid: "lemon" }), ["tester"]).text()).not.toContain("mA");
  });

  it("glows a bulb only when it shows a current", () => {
    const arcs = (p: Partial<CurrentChemParams>) => render(results({ tester: "bulb", cells: 2, ...p }), ["tester"]).of("arc").length;
    expect(arcs({ liquid: "copperSulphate" })).toBeGreaterThan(arcs({ liquid: "lemon" }));
  });

  it("turns the compass needle by the deflection", () => {
    const needle = (liquid: CurrentChemParams["liquid"]) => {
      const rec = render(results({ tester: "compass", liquid, cells: 2 }), ["tester"]);
      // The first stroke from the compass centre is the needle's north half.
      const lines = rec.of("lineTo").map((c) => c.args as number[]);
      return lines;
    };
    expect(needle("tap")).not.toEqual(needle("oil"));
  });

  it("formats tiny currents without rounding them to zero", () => {
    expect(currentChemMilliamps(0.003)).toBe("0.00300 mA");
    expect(currentChemMilliamps(65.2196)).toBe("65.2 mA");
    expect(currentChemMilliamps(0)).toBe("0 mA");
  });
});

describe("electrolysis", () => {
  it("coats the − rod with copper and fades the blue", () => {
    const rec = render(results({ bath: "copperSulphate", current: 0.5 }, 10), ["electrolysis", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["copper 98.7 mg", "oxygen 18.7 mL", "Copper sulphate solution · carbon rods"]));
    expect(rec.text()).toContain("92% of the blue is left");
  });

  it("bubbles hydrogen at − and oxygen at + from water, and hides the amounts without the numbers", () => {
    const water = render(results({ bath: "water", current: 0.5 }, 10), ["electrolysis", "labels"]);
    expect(water.texts()).toEqual(expect.arrayContaining(["hydrogen 37.3 mL", "oxygen 18.7 mL"]));
    const hidden = render(results({ bath: "water", current: 0.5 }, 10), ["electrolysis"]);
    expect(hidden.text()).not.toMatch(/mL|hydrogen|oxygen/);
    // Twice as much hydrogen: twice the bubbles at the − rod (capped at 16 a rod).
    const off = render(results({ bath: "water", current: 0.5 }, 0), ["electrolysis"]);
    expect(hidden.of("arc").length).toBeGreaterThan(off.of("arc").length);
  });
});

describe("electroplating", () => {
  it("coats the key on − and thins the plate", () => {
    const rec = render(results({ current: 1, keyOn: "negative" }, 10), ["plating", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["coat 22.0 µm", "plate −197.4 mg", "iron key", "copper plate"]));
    expect(rec.text()).toContain("Copper leaves the plate and coats the key.");
    expect(render(results({ current: 1 }, 10), ["plating"]).text()).not.toContain("µm");
  });

  it("eats the key away when it is on +", () => {
    const rec = render(results({ current: 1, keyOn: "positive" }, 10), ["plating", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["key −174.1 mg", "plate +197.4 mg"]));
    expect(rec.text()).toContain("Wrong way round");
  });
});

const VIEWS: [string, Partial<CurrentChemParams>, number, string[]][] = [
  ["tester bulb", { tester: "bulb", liquid: "copperSulphate", cells: 4, salt: 5 }, 0, ["tester", "labels"]],
  ["tester LED", { tester: "led", liquid: "sugar", cells: 4, salt: 5 }, 0, ["tester", "labels"]],
  ["tester compass", { tester: "compass", liquid: "joined", cells: 4 }, 0, ["tester", "labels"]],
  ["electrolysis copper", { bath: "copperSulphate", current: 2 }, 30, ["electrolysis", "labels"]],
  ["electrolysis water", { bath: "water", current: 2 }, 30, ["electrolysis", "labels"]],
  ["plating", { current: 2, keyOn: "negative" }, 30, ["plating", "labels"]],
  ["plating reversed", { current: 2, keyOn: "positive" }, 30, ["plating", "labels"]],
];

describe("on a phone", () => {
  it.each(VIEWS)("keeps the %s view inside a 325 px canvas", (name, params, minutes, layers) => {
    const r = render(results(params, minutes), layers, 325);
    expect(r.extents.length).toBeGreaterThan(0);
    for (const e of r.extents) {
      expect(e.left, e.text).toBeGreaterThanOrEqual(0);
      expect(e.right, e.text).toBeLessThanOrEqual(325);
      expect(e.y, e.text).toBeGreaterThanOrEqual(8);
      expect(e.y, e.text).toBeLessThanOrEqual(r.layout.height - 8);
      expect(e.text.length, e.text).toBeLessThanOrEqual(55);
    }
    for (const c of r.of("arc")) {
      const [x, y, rad] = c.args as number[];
      expect(x! - rad!, name).toBeGreaterThanOrEqual(0);
      expect(x! + rad!, name).toBeLessThanOrEqual(325);
      expect(y! - rad!, name).toBeGreaterThanOrEqual(0);
      expect(y! + rad!, name).toBeLessThanOrEqual(r.layout.height);
    }
    for (const c of [...r.of("lineTo"), ...r.of("moveTo")]) {
      const [x, y] = c.args as number[];
      expect(x!, name).toBeGreaterThanOrEqual(0);
      expect(x!, name).toBeLessThanOrEqual(325);
      expect(y!, name).toBeGreaterThanOrEqual(0);
      expect(y!, name).toBeLessThanOrEqual(r.layout.height);
    }
  });

  it("does not let the lines of words overlap", () => {
    const l = computeCurrentChemLayout(325);
    expect(l.numbersY - l.nameY).toBeGreaterThanOrEqual(16);
    expect(l.captionY - l.numbersY).toBeGreaterThanOrEqual(16);
    expect(l.height).toBeGreaterThanOrEqual(330);
    expect(l.height).toBeLessThanOrEqual(420);
    // The two electrodes' numbers sit side by side without touching.
    const plating = render(results({ current: 2, keyOn: "negative" }, 30), ["plating", "labels"], 325).extents.filter((e) => e.y === l.numbersY);
    expect(plating).toHaveLength(2);
    expect(plating[0]!.right).toBeLessThan(plating[1]!.left);
  });
});
