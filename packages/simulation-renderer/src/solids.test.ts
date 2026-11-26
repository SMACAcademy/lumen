import { SIMILAR_FIGURE_ORDER, SOLID_ORDER, solidsModel, type SolidsParams, type SolidsState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { circleSectors, computeSolidsLayout, solidsNumber, solidsRenderer } from "./solids/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: SolidsState = solidsModel.initialize(solidsModel.defaultParams);
const results = (params: Partial<SolidsParams> = {}, state: Partial<SolidsState> = {}) =>
  solidsModel.derive({ ...base, ...state }, { ...solidsModel.defaultParams, ...params });

/** Renders and also notes where each piece of text sits and how it is aligned. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const inner = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(inner, {
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
  const layout = computeSolidsLayout(width);
  solidsRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, placed, layout, text: () => rec.texts().join(" | ") };
};

describe("numbers", () => {
  it("writes numbers as a student would", () => {
    expect(solidsNumber(44)).toBe("44");
    expect(solidsNumber(1437.3333)).toBe("1437.33");
    expect(solidsNumber(12.5)).toBe("12.5");
    expect(solidsNumber(-2)).toBe("−2");
  });
});

describe("the wheel", () => {
  it("lays its rim along the ground and gives C ÷ d with the words", () => {
    const shown = render(results({ solid: "wheel" }, { r: 7, turns: 1 }), ["solid", "labels"]).text();
    expect(shown).toContain("A wheel of radius 7 cm");
    expect(shown).toContain("π taken as 22/7");
    expect(shown).toContain("1 turn → rolled 44 cm · C ÷ d = 3.143");
    expect(render(results({ solid: "wheel", pi: "3.14" }, { r: 5, turns: 2 }), ["solid", "labels"]).text()).toContain("2 turns → rolled 62.8 cm · C ÷ d = 3.140");
  });

  it("hides the distance, the ratio and the π used without the words", () => {
    const hidden = render(results({ solid: "wheel", pi: "3.14" }, { r: 5, turns: 1 }), ["solid"]).text();
    expect(hidden).not.toMatch(/31\.4|3\.14|rolled/);
  });
});

describe("the cylinder", () => {
  it("unrolls the label into a 2πr by h sheet", () => {
    const rec = render(results({ solid: "cylinder" }, { r: 7, h: 10, open: 0.5 }), ["solid", "labels"]);
    expect(rec.text()).toContain("2πr = 44 cm");
    expect(rec.text()).toContain("curved 440 cm² · total 748 cm² · V 1540 cm³");
    // The sheet fills in proportion to how far it is unrolled.
    const sheet = rec.of("fillRect")[0]!.args as number[];
    const outline = rec.of("strokeRect")[0]!.args as number[];
    expect(sheet[2]).toBeCloseTo(outline[2]! / 2, 6);
    expect(sheet[3]).toBeCloseTo(outline[3]!, 6);
    // 2πr wide and h tall, to the same scale.
    expect(outline[2]! / outline[3]!).toBeCloseTo(44 / 10, 6);
  });

  it("keeps the areas hidden without the words", () => {
    expect(render(results({ solid: "cylinder" }, { r: 7, h: 10 }), ["solid"]).text()).not.toMatch(/440|748|1540/);
  });
});

describe("the cone", () => {
  it("counts the cones poured and fills the cylinder a third at a time", () => {
    const rec = render(results({ solid: "cone" }, { r: 3.5, h: 12, pours: 2 }), ["solid", "labels"]);
    expect(rec.text()).toContain("2 of 3 cones poured");
    expect(rec.text()).toContain("l = 12.5");
    expect(rec.text()).toContain("cone 154 cm³ = ⅓ × cylinder 462 cm³");
    const water = rec.of("fillRect")[0]!.args as number[];
    const full = render(results({ solid: "cone" }, { r: 3.5, h: 12, pours: 3 }), ["solid"]).of("fillRect")[0]!.args as number[];
    expect(water[3]! / full[3]!).toBeCloseTo(2 / 3, 6);
  });

  it("names the slant but hides its length and the volume without the words", () => {
    const hidden = render(results({ solid: "cone" }, { r: 3.5, h: 12 }), ["solid"]).texts();
    expect(hidden).toContain("l");
    expect(hidden.join(" ")).not.toMatch(/12\.5|154/);
  });
});

describe("spheres and combined solids", () => {
  it("gives the sphere's surface and volume, and the hemisphere's three measures", () => {
    expect(render(results({ solid: "sphere" }, { r: 7 }), ["solid", "labels"]).text()).toContain("surface 616 cm² · volume 1437.3 cm³");
    expect(render(results({ solid: "hemisphere" }, { r: 7 }), ["solid", "labels"]).text()).toContain("curved 308 · total 462 cm² · V 718.7 cm³");
  });

  it("names the parts of each combined solid and adds their volumes", () => {
    const toy = render(results({ solid: "icecream" }, { r: 3.5, h: 12 }), ["solid", "labels"]).text();
    expect(toy).toContain("An ice-cream cone: cone + hemisphere");
    expect(toy).toContain("outer surface 214.5 cm²");
    expect(toy).toContain("cone 154 + hemisphere 89.8 = 243.8 cm³");
    expect(render(results({ solid: "capsule" }, { r: 2.5, h: 9 }), ["solid", "labels"]).text()).toContain("outer surface 220 cm²");
    expect(render(results({ solid: "tent" }, { r: 2, h: 2.1, top: Math.sqrt(3.84) }), ["solid", "labels"]).text()).toContain("outer surface 44 cm²");
    expect(render(results({ solid: "icecream" }, { r: 3.5, h: 12 }), ["solid"]).text()).not.toContain("214.5");
  });
});

describe("similar shapes", () => {
  it("shows equal angles and equal ratios for a true copy", () => {
    const shown = render(results({ figure: "copy" }, { k: 2, stretch: 1 }), ["figure", "labels"]).text();
    expect(shown).toContain("∠A, ∠B, ∠C = 82.8°, 55.8°, 41.4°");
    expect(shown).toContain("∠P, ∠Q, ∠R = 82.8°, 55.8°, 41.4°");
    expect(shown).toContain("PQ 8, QR 12, RP 10 (AB 4, BC 6, CA 5)");
    expect(shown).toContain("sides × 2.00, × 2.00, × 2.00: similar");
    expect(render(results({ figure: "copy" }, { k: 2, stretch: 1.2 }), ["figure", "labels"]).text()).toContain("sides × 2.00, × 2.40, × 2.00: not similar");
  });

  it("says when DE is parallel to BC", () => {
    const shown = render(results({ figure: "bpt" }, { ad: 2, ae: 3 }), ["figure", "labels"]).texts();
    expect(shown).toEqual(expect.arrayContaining(["A", "B", "C", "D", "E", "2", "4", "3", "6"]));
    expect(shown.join(" ")).toContain("AD/DB = 0.50 · AE/EC = 0.50: DE ∥ BC");
    expect(render(results({ figure: "bpt" }, { ad: 2, ae: 5 }), ["figure", "labels"]).text()).toContain("AE/EC = 1.25: not parallel");
    expect(render(results({ figure: "bpt" }, { ad: 4, ae: 6 }), ["figure"]).texts()).not.toContain("3");
  });

  it("finds the tower from the shadows, and hides it without the words", () => {
    const shown = render(results({ figure: "shadow" }, { pole: 6, poleShadow: 4, towerShadow: 28 }), ["figure", "labels"]).text();
    expect(shown).toContain("tower ÷ 28 = 6 ÷ 4, so the tower is 42 m");
    const hidden = render(results({ figure: "shadow" }, { pole: 6, poleShadow: 4, towerShadow: 28 }), ["figure"]).texts();
    expect(hidden).toContain("?");
    expect(hidden.join(" ")).not.toContain("42");
  });

  it("measures across the grid with Pythagoras", () => {
    const shown = render(results({ figure: "distance" }, { x1: 1, y1: 2, x2: 4, y2: 6 }), ["figure", "labels"]).text();
    expect(shown).toContain("P(1, 2)");
    expect(shown).toContain("Q(4, 6)");
    expect(shown).toContain("PQ = √(3² + 4²) = 5");
    expect(render(results({ figure: "distance" }, { x1: -3, y1: -2, x2: 3, y2: 6 }), ["figure"]).text()).not.toContain("= 10");
  });
});

describe("on a phone", () => {
  const wild: Partial<SolidsState>[] = [
    {},
    { r: 0.5, h: 30, top: 30, turns: 2, open: 1, pours: 3 },
    { r: 21, h: 0.5, top: 0.5, turns: 0 },
    { r: 3.5, h: 12, turns: 1.3, pours: 1.5, open: 0.4 },
    { r: 20.5, h: 30, sectors: 32, cut: 1 },
    { r: 10.5, sectors: 4, cut: 1 },
    { r: 0.5, sectors: 6, cut: 0.5 },
    { k: 2.5, stretch: 1.4, ad: 5.5, ae: 0.5, pole: 10, poleShadow: 1, towerShadow: 60, x1: -8, y1: -8, x2: 8, y2: 8 },
    { k: 0.5, stretch: 0.5, ad: 0.5, ae: 8.5, pole: 1, poleShadow: 10, towerShadow: 5, x1: 8, y1: 8, x2: -8, y2: -8 },
  ];

  it("keeps every word of every scene on a 325 px canvas", () => {
    for (const state of wild) {
      for (const solid of SOLID_ORDER) {
        for (const layers of [["solid", "labels"], ["solid"]]) {
          const rec = render(results({ solid }, state), layers, 325);
          checkInside(rec, `${solid} ${JSON.stringify(state)}`);
        }
      }
      for (const figure of SIMILAR_FIGURE_ORDER) {
        for (const layers of [["figure", "labels"], ["figure"]]) {
          const rec = render(results({ figure }, state), layers, 325);
          checkInside(rec, `${figure} ${JSON.stringify(state)}`);
        }
      }
    }
  });

  it("keeps the wheel on the canvas after two full turns", () => {
    const rec = render(results({ solid: "wheel" }, { r: 7, turns: 2 }), ["solid"], 325);
    for (const call of rec.of("ellipse")) {
      const [cx, , rx] = call.args as number[];
      expect(cx! + rx!).toBeLessThanOrEqual(325);
      expect(cx! - rx!).toBeGreaterThanOrEqual(0);
    }
  });
});

function checkInside(rec: ReturnType<typeof render>, what: string) {
  const { width, height } = rec.layout;
  for (const { text, x, y, align } of rec.placed) {
    const w = text.length * 6;
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    expect(left, `${what}: "${text}" starts off the canvas`).toBeGreaterThanOrEqual(0);
    expect(left + w, `${what}: "${text}" runs off the canvas`).toBeLessThanOrEqual(width);
    expect(y, `${what}: "${text}" is above or below the canvas`).toBeGreaterThanOrEqual(0);
    expect(y, `${what}: "${text}" is below the canvas`).toBeLessThanOrEqual(height);
    expect(text.length, `${what}: "${text}" is too long`).toBeLessThanOrEqual(55);
  }
}

describe("the circle cut into sectors", () => {
  it("lays the sectors into a row, point up and point down, and finds πr × r", () => {
    const rec = render(results({ solid: "circle" }, { r: 7, sectors: 8, cut: 1 }), ["solid", "labels"]);
    expect(rec.text()).toContain("A circle of radius 7 cm in 8 sectors");
    expect(rec.text()).toContain("πr = 22 cm");
    expect(rec.text()).toContain("area = πr × r = 22 × 7 = 154 cm²");
    expect(rec.text()).toContain("circumference 2πr = 44 cm");
    // Eight sectors drawn, besides the dashed circle they came from.
    expect(rec.of("arc")).toHaveLength(8);
  });

  it("moves each sector from the circle to the row as the cut goes from 0 to 1", () => {
    const layout = computeSolidsLayout(325);
    const start = circleSectors(layout.picture, 325, 8, 0);
    for (const p of start.places) expect([p.x, p.y]).toEqual([start.cx, start.cy]);
    const done = circleSectors(layout.picture, 325, 8, 1);
    const ups = done.places.filter((p) => p.up);
    const downs = done.places.filter((p) => !p.up);
    expect(new Set(ups.map((p) => p.y))).toEqual(new Set([done.yBottom]));
    expect(new Set(downs.map((p) => p.y))).toEqual(new Set([done.yTop]));
    for (const p of ups) expect(Math.sin(p.angle)).toBeCloseTo(-1, 9);
    for (const p of downs) expect(Math.sin(p.angle)).toBeCloseTo(1, 9);
    // The row is close to πR long, and closer with more sectors.
    const many = circleSectors(layout.picture, 325, 32, 1);
    expect(Math.abs(many.span - Math.PI * many.R)).toBeLessThan(Math.abs(done.span - Math.PI * done.R));
    // It stays on the canvas, bumps and all.
    for (const c of [done, many]) {
      expect(c.left - c.R * Math.sin(c.theta / 2)).toBeGreaterThanOrEqual(0);
      expect(c.left + c.span).toBeLessThanOrEqual(325);
      expect(c.yTop + c.R).toBeLessThanOrEqual(layout.picture.y + layout.picture.height);
    }
  });

  it("hides the lengths and the area without the words", () => {
    const hidden = render(results({ solid: "circle" }, { r: 7, sectors: 8, cut: 1 }), ["solid"]).texts();
    expect(hidden).toContain("πr");
    expect(hidden.join(" ")).not.toMatch(/154|22 cm|44/);
  });
});
