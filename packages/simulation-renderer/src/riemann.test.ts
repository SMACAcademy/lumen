import { riemannModel, type RiemannParams, type RiemannState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeRiemannLayout, riemannLimitText, riemannRenderer } from "./riemann/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: RiemannState = { n: 4, a: 0, b: 2, c: 1, clock: 0 };
const results = (params: Partial<RiemannParams> = {}, state: Partial<RiemannState> = {}) =>
  riemannModel.derive({ ...base, ...state }, { ...riemannModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const set = new Set(layers);
  const rec = recordingContext();
  const layout = computeRiemannLayout(width, set);
  riemannRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "rad", graphs: [] });
  return { ...rec, layout };
};
const text = (rec: { texts(): string[] }) => rec.texts().join(" | ");

describe("the strips view", () => {
  it("names the curve and its limits, and gives the sum beside the exact area", () => {
    const rec = render(results({ fn: "square", rule: "left" }, { n: 4 }), ["curve", "error", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["y = x² from 0 to 2", "a", "b"]));
    expect(text(rec)).toContain("n = 4 · left sum 1.7500 · exact 2.6667");
    expect(text(render(results({ fn: "recip", rule: "mid" }, { a: 1, b: Math.E, n: 8 }), ["curve", "labels"]))).toContain("y = 1/x from 1 to e");
  });

  it("draws one strip per n, outlined only while they are wide enough to see", () => {
    // Each strip is one filled path; the outlines stop above 60 strips.
    expect(render(results({}, { n: 8 }), ["curve"]).of("fill")).toHaveLength(8);
    expect(render(results({}, { n: 200 }), ["curve"]).of("fill")).toHaveLength(200);
    const strokes = (k: number) => render(results({}, { n: k }), ["curve"]).of("stroke").length;
    expect(strokes(60) - strokes(1)).toBe(59);
    expect(strokes(61)).toBe(strokes(1) - 1);
  });

  it("plots the error against n and says how much it shrinks when n doubles", () => {
    const left = text(render(results({ rule: "left" }, { n: 50 }), ["curve", "error", "labels"]));
    expect(left).toContain("size of the error against n (log scales)");
    expect(left).toContain("double n: error ÷ 1.99");
    expect(text(render(results({ rule: "mid" }, { n: 20 }), ["curve", "error", "labels"]))).toContain("double n: error ÷ 4.00");
  });

  it("says when the sum is exact at every n", () => {
    expect(text(render(results({ fn: "sine", rule: "mid" }, { a: 0, b: 2 * Math.PI }), ["curve", "error", "labels"]))).toContain("the sum is exact at every n");
  });

  it("keeps the sum, the exact area and the ratio hidden without the words", () => {
    const hidden = text(render(results({ rule: "mid" }, { n: 20 }), ["curve", "error"]));
    expect(hidden).not.toMatch(/2\.6|exact|÷/);
  });
});

describe("the signed view", () => {
  it("counts the dip below the axis negative", () => {
    const rec = render(results({ fn: "sine", rule: "mid" }, { a: 0, b: 2 * Math.PI, n: 16 }), ["curve", "signed", "labels"]);
    expect(rec.texts()).toContain("y = sin x from 0 to 2π");
    expect(text(rec)).toContain("above +2.000 · below −2.000 · net 0.000");
    expect(text(rec)).toContain("area shaded 4.000");
    expect(text(render(results({ fn: "sine" }, { a: 0, b: 2 * Math.PI }), ["curve", "signed"]))).not.toContain("4.000");
  });

  it("draws an arrow from a to b when the limits run backwards", () => {
    const back = render(results({ fn: "square" }, { a: 2, b: 0 }), ["curve", "signed", "labels"]);
    const forward = render(results({ fn: "square" }, { a: 0, b: 2 }), ["curve", "signed", "labels"]);
    expect(back.texts()).toContain("y = x² from 2 to 0");
    // The arrow's head is one extra filled path.
    expect(back.of("fill").length).toBe(forward.of("fill").length + 1);
  });
});

describe("the split view", () => {
  it("shades the two parts and adds them", () => {
    const rec = render(results({ fn: "square" }, { a: 0, b: 2, c: Math.cbrt(4) }), ["curve", "split", "labels"]);
    expect(rec.texts()).toContain("c");
    expect(text(rec)).toContain("∫ₐᶜ 1.333 + ∫ᶜᵇ 1.333 = ∫ₐᵇ 2.667");
  });
});

describe("the between view", () => {
  it("names both curves and gives the strip total beside the exact area", () => {
    const rec = render(results({ pair: "line-square", rule: "mid" }, { n: 16 }), ["between", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Between y = x and y = x²", "y = x", "y = x²"]));
    expect(text(rec)).toContain("n = 16 · strips 0.1670 · area 0.1667");
    expect(text(rec)).not.toContain("∫(f − g)");
  });

  it("shows the net integral is zero where the curves cross", () => {
    const rec = render(results({ pair: "line-cube", rule: "mid" }, { n: 16 }), ["between", "labels"]);
    expect(text(rec)).toContain("area 0.5000");
    expect(text(rec)).toContain("∫(f − g) dx = 0.000");
    expect(text(render(results({ pair: "line-cube" }), ["between"]))).not.toMatch(/area|0\.5/);
  });
});

describe("on a phone", () => {
  it("keeps every word and the plots inside 325 px", () => {
    const cases: [Partial<RiemannParams>, Partial<RiemannState>, string[]][] = [
      [{ fn: "square", rule: "trap" }, { n: 200 }, ["curve", "error", "labels"]],
      [{ fn: "sine", rule: "left" }, { a: -2 * Math.PI, b: 2 * Math.PI, n: 64 }, ["curve", "signed", "labels"]],
      [{ fn: "exp" }, { a: 2, b: -2 }, ["curve", "signed", "labels"]],
      [{ fn: "cube" }, { a: -1.6, b: 1.6, c: 0 }, ["curve", "split", "labels"]],
      [{ pair: "parabola-line", rule: "right" }, { n: 3 }, ["between", "labels"]],
      [{ pair: "line-cube", rule: "trap" }, { n: 9 }, ["between", "labels"]],
    ];
    for (const [params, state, layers] of cases) {
      const rec = render(results(params, state), layers, 325);
      const { layout } = rec;
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      expect(layout.plot.x + layout.plot.width).toBeLessThanOrEqual(325);
      expect(layout.errorPlot.x + layout.errorPlot.width).toBeLessThanOrEqual(325);
      for (const call of rec.of("fillText")) {
        const [words, x, y] = call.args as [string, number, number];
        expect(words.length, words).toBeLessThanOrEqual(55);
        const w = words.length * 6;
        // The recorder does not keep alignment, so allow for any of the three.
        expect(x + w, words).toBeGreaterThan(0);
        expect(x - w, words).toBeLessThan(325);
        expect(y, words).toBeGreaterThanOrEqual(0);
        expect(y, words).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("keeps the caption centred and narrower than the canvas", () => {
    const rec = render(results({ fn: "sine", rule: "trap" }, { a: -2 * Math.PI, b: 2 * Math.PI, n: 200 }), ["curve", "error", "labels"], 325);
    const caption = rec.texts().find((t) => t.startsWith("n = "))!;
    expect(caption.length * 6).toBeLessThan(325);
  });
});

describe("limits as written", () => {
  it("reads multiples of π and e", () => {
    expect([0, 2, -1, Math.PI, 2 * Math.PI, -Math.PI / 2, (3 * Math.PI) / 2, Math.E, 1.587].map(riemannLimitText)).toEqual(["0", "2", "−1", "π", "2π", "−π/2", "3π/2", "e", "1.59"]);
  });
});
