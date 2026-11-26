import { seriesModel, type SeriesParams, type SeriesState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSeriesLayout, seriesRenderer } from "./series/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: SeriesState = { a: 2, d: 3, r: 0.5, n: 6, p: 2, q: 8, tick: 0 };
const results = (state: Partial<SeriesState> = {}, params: Partial<SeriesParams> = {}) =>
  seriesModel.derive({ ...base, ...state }, { ...seriesModel.defaultParams, ...params });

/** Records each piece of text with its alignment, so its extent on the canvas can be checked. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const spans: { text: string; x: number; y: number; align: string }[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get(_t, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          spans.push({ text, x, y, align: String((rec.ctx as unknown as Record<string, unknown>).textAlign ?? "left") });
          rec.ctx.fillText(text, x, y);
        };
      }
      return (rec.ctx as unknown as Record<string, unknown>)[key];
    },
    set(_t, key: string, value) {
      (rec.ctx as unknown as Record<string, unknown>)[key] = value;
      return true;
    },
  });
  const layout = computeSeriesLayout(width);
  seriesRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, spans, layout, text: () => rec.texts().join(" | ") };
};

describe("the AP views", () => {
  it("draws one bar per term and names the nth term only with the words", () => {
    const shown = render(results({ a: 3, d: 3, n: 10 }), ["ap", "labels"]);
    expect(shown.of("fillRect")).toHaveLength(10);
    expect(shown.text()).toContain("a₁₀ = a + 9d = 30");
    const hidden = render(results({ a: 7, d: -2, n: 15 }), ["ap"]).text();
    expect(hidden).toContain("a = 7, d = −2, n = 15");
    expect(hidden).not.toContain("21");
  });

  it("stacks the reversed terms so every column reaches a + l: 2S = n(a + l)", () => {
    const pairs = render(results({ a: 5, d: 3, n: 12 }), ["ap", "pairs", "labels"]);
    // Two pieces per column.
    expect(pairs.of("fillRect")).toHaveLength(24);
    expect(pairs.text()).toContain("2S = 12 × 43, so S₁₂ = 258");
    expect(pairs.text()).toContain("a + l");
    expect(render(results({ a: 5, d: 3, n: 12 }), ["ap", "pairs"]).text()).not.toMatch(/258|43/);
  });
});

describe("the GP view", () => {
  it("gives the sum and the sum to infinity with the words", () => {
    expect(render(results({ a: 0.5, r: 0.5, n: 7 }), ["gp", "limit", "labels"]).text()).toContain("S₇ = 0.9922 · S∞ = a/(1 − r) = 1");
    expect(render(results({ a: 3, r: 2, n: 5 }), ["gp", "labels"]).text()).toContain("S₅ = 93 · |r| ≥ 1: no sum to infinity");
    const hidden = render(results({ a: 3, r: 2, n: 5 }), ["gp", "limit"]).text();
    expect(hidden).not.toContain("93");
    expect(render(results({ a: 6, r: 0.25, n: 6 }), ["gp", "limit"]).text()).not.toMatch(/= 8\b/);
  });

  it("cuts a square into n pieces when 0 < r < 1, and hops along a line otherwise", () => {
    const square = render(results({ a: 0.5, r: 0.5, n: 7 }), ["gp", "limit"]);
    // Seven bars and seven pieces of the square.
    expect(square.of("fillRect")).toHaveLength(14);
    expect(square.texts()).toEqual(expect.arrayContaining(["whole: S∞", "shaded: Sₙ"]));
    const hops = render(results({ a: 1, r: -0.5, n: 6 }), ["gp", "limit"]);
    expect(hops.of("quadraticCurveTo")).toHaveLength(6);
    expect(hops.texts()).toContain("S∞");
    expect(render(results({ a: 1, r: 1.5, n: 6 }), ["gp", "limit"]).texts()).not.toContain("S∞");
  });
});

describe("the means view", () => {
  it("names the three lengths and orders them", () => {
    const view = render(results({ p: 2, q: 8 }), ["means", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["AM", "GM", "HM", "p = 2", "q = 8"]));
    expect(view.text()).toContain("AM 5 ≥ GM 4 ≥ HM 3.2");
    expect(render(results({ p: 8, q: 8 }), ["means", "labels"]).text()).toContain("AM 8 = GM 8 = HM 8");
    expect(render(results({ p: 4, q: 9 }), ["means"]).text()).not.toContain("6");
  });

  it("puts the half-chord's top on the semicircle", () => {
    const view = render(results({ p: 2, q: 8 }), ["means"]);
    const arc = view.of("arc")[0]!.args as number[];
    const [ox, base, radius] = arc;
    const strokes = view.of("lineTo").map((c) => c.args as number[]);
    // The GM segment ends at the highest point drawn that is not the vertical radius.
    const tops = strokes.filter(([x]) => Math.abs(x! - ox!) > 1).map(([x, y]) => Math.hypot(x! - ox!, y! - base!));
    expect(tops.some((dist) => Math.abs(dist - radius!) < 1e-6)).toBe(true);
  });
});

describe("the blocks view", () => {
  it("sums k, k² and k³ with the words", () => {
    expect(render(results({ n: 10 }, { power: 1 }), ["blocks", "labels"]).text()).toContain("n(n + 1)/2 = 10·11/2 = 55");
    expect(render(results({ n: 10 }, { power: 2 }), ["blocks", "labels"]).text()).toContain("n(n + 1)(2n + 1)/6 = 385");
    expect(render(results({ n: 5 }, { power: 3 }), ["blocks", "labels"]).text()).toContain("(n(n + 1)/2)² = 15² = 225");
    expect(render(results({ n: 10 }, { power: 2 }), ["blocks"]).text()).not.toContain("385");
    expect(render(results({ n: 5 }, { power: 3 }), ["blocks"]).text()).not.toContain("225");
  });

  it("draws the first ten squares and says so", () => {
    const view = render(results({ n: 14 }, { power: 2 }), ["blocks"]);
    expect(view.of("fillRect")).toHaveLength(10);
    expect(view.texts()).toContain("first 10 squares drawn");
    expect(render(results({ n: 5 }, { power: 2 }), ["blocks"]).texts()).not.toContain("first 10 squares drawn");
  });

  it("fills a square of side 1 + 2 + … + n with one band per cube", () => {
    const view = render(results({ n: 4 }, { power: 3 }), ["blocks"]);
    expect(view.of("fillRect")).toHaveLength(4);
    expect(view.texts()).toEqual(expect.arrayContaining(["2³", "3³", "4³"]));
  });
});

describe("the arithmetico-geometric view", () => {
  it("draws S, rS shifted one place, and their difference", () => {
    const view = render(results({ r: 0.5, n: 4 }), ["agp", "labels"]);
    // 4 + 4 + (4 + 1 leftover) bars.
    expect(view.of("fillRect")).toHaveLength(13);
    expect(view.texts()).toEqual(expect.arrayContaining(["S", "rS", "S − rS"]));
    expect(view.text()).toContain("S₄ = 1.625 · S∞ = r/(1 − r)² = 2");
    expect(render(results({ r: 0.5, n: 20 }), ["agp"]).text()).not.toMatch(/= 2\b/);
  });
});

describe("on a phone", () => {
  const cases: [string, Partial<SeriesState>, Partial<SeriesParams>, string[]][] = [
    ["ap", { a: -10, d: 5, n: 20 }, {}, ["ap", "labels"]],
    ["ap sum", { a: 20, d: -5, n: 20 }, {}, ["ap", "pairs", "labels"]],
    ["gp square", { a: 20, r: 0.95, n: 20 }, {}, ["gp", "limit", "labels"]],
    ["gp line", { a: -10, r: -2, n: 20 }, {}, ["gp", "limit", "labels"]],
    ["means wide", { p: 0.5, q: 18 }, {}, ["means", "labels"]],
    ["means narrow", { p: 18, q: 0.5 }, {}, ["means", "labels"]],
    ["means equal", { p: 0.5, q: 0.5 }, {}, ["means", "labels"]],
    ["blocks 1", { n: 20 }, { power: 1 }, ["blocks", "labels"]],
    ["blocks 2", { n: 20 }, { power: 2 }, ["blocks", "labels"]],
    ["blocks 3", { n: 20 }, { power: 3 }, ["blocks", "labels"]],
    ["agp", { r: -2, n: 20 }, {}, ["agp", "labels"]],
  ];

  it.each(cases)("keeps every word of the %s view on a 325 px canvas", (_name, state, params, layers) => {
    const view = render(results(state, params), layers, 325);
    expect(view.layout.height).toBeGreaterThanOrEqual(330);
    expect(view.layout.height).toBeLessThanOrEqual(420);
    for (const { text, x, y, align } of view.spans) {
      const w = text.length * 6;
      const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
      expect(left, `${text} starts off-canvas`).toBeGreaterThanOrEqual(0);
      expect(left + w, `${text} runs off-canvas`).toBeLessThanOrEqual(325);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(view.layout.height);
    }
  });

  it("keeps every shape inside the canvas", () => {
    for (const [name, state, params, layers] of cases) {
      const view = render(results(state, params), layers, 325);
      for (const call of view.of("fillRect")) {
        const [x, y, w, h] = call.args as number[];
        expect(x!, name).toBeGreaterThanOrEqual(-1e-6);
        expect(x! + w!, name).toBeLessThanOrEqual(325 + 1e-6);
        expect(y!, name).toBeGreaterThanOrEqual(0);
        expect(y! + h!, name).toBeLessThanOrEqual(view.layout.height);
      }
      for (const call of [...view.of("lineTo"), ...view.of("moveTo")]) {
        const [x, y] = call.args as number[];
        expect(x!, name).toBeGreaterThanOrEqual(-1e-6);
        expect(x!, name).toBeLessThanOrEqual(325 + 1e-6);
        expect(y!, name).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
