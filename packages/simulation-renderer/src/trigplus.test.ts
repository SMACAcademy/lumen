import { trigPlusModel, type TrigPlusParams, type TrigPlusState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeTrigPlusLayout, trigPlusRenderer } from "./trigplus/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const d = (degrees: number) => (degrees * Math.PI) / 180;
const base: TrigPlusState = trigPlusModel.initialize(trigPlusModel.defaultParams);
const results = (state: Partial<TrigPlusState> = {}, params: Partial<TrigPlusParams> = {}) =>
  trigPlusModel.derive({ ...base, ...state }, { ...trigPlusModel.defaultParams, ...params });

interface Span {
  text: string;
  left: number;
  right: number;
  y: number;
}

/** Renders, and notes where each piece of text lands (the recorder measures 6 px a character). */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const spans: Span[] = [];
  const target = rec.ctx as unknown as Record<string, unknown>;
  const ctx = new Proxy(target, {
    get(t, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          const w = text.length * 6;
          const align = t.textAlign;
          const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
          spans.push({ text, left, right: left + w, y });
          (t.fillText as (...a: unknown[]) => void)(text, x, y);
        };
      }
      return t[key];
    },
    set(t, key: string, value) {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  const layout = computeTrigPlusLayout(width);
  trigPlusRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, spans, layout, text: rec.texts().join(" | ") };
};

describe("compound angles", () => {
  it("builds cos 75° from its two pieces", () => {
    const { rec, text } = render(results({ A: d(45), B: d(30) }), ["circle", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["A = 45°, B = 30°, A + B = 75°", "A", "B", "A + B", "cos A cos B", "− sin A sin B"]));
    expect(text).toContain("cos(A + B) = 0.612 − 0.354 = 0.259");
  });

  it("turns a negative piece into a plus", () => {
    // A = 45°, B = 300°: sin A sin B < 0.
    expect(render(results({ A: d(45), B: d(300) }), ["circle", "labels"]).text).toContain("cos(A + B) = 0.354 + 0.612 = 0.966");
  });

  it("hides the value of cos(A + B) without the words", () => {
    const { text } = render(results({ A: d(45), B: d(30) }), ["circle"]);
    expect(text).not.toMatch(/0\.259|0\.612/);
  });

  it("draws NCERT's two equal chords", () => {
    const { rec, text } = render(results({ A: d(45), B: d(30) }), ["circle", "proof", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["P₁", "P₂", "P₃", "P₄"]));
    // 2 − 2 cos 75° = 1.4824, so each chord is 1.218.
    expect(text).toContain("P₁P₃ = P₂P₄ = 1.218");
  });

  it("doubles the angle", () => {
    const { rec, text } = render(results({ A: d(15) }), ["double", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["A = 15°, 2A = 30°", "2A"]));
    expect(text).toContain("sin 2A = 2 sin A cos A = 0.500");
    expect(text).toContain("cos 2A = 1 − 2 sin²A = 0.866");
    expect(render(results({ A: d(15) }), ["double"]).text).not.toContain("0.500");
  });
});

describe("equations", () => {
  it("marks every solution of sin x = √3/2 in view and names the general solution", () => {
    const { rec, text } = render(results({ k: Math.sqrt(3) / 2, n: -1 }, { func: "sin" }), ["equation", "labels"]);
    expect(text).toContain("α = sin⁻¹(0.87) = 60°; 2 solutions in [0, 2π)");
    expect(text).toContain("x = nπ + (−1)ⁿα; n = −1 gives −240°");
    expect(rec.texts()).toEqual(expect.arrayContaining(["n = −1", "π", "2π", "−2π", "0 ≤ x < 2π"]));
    // Five solutions as dots, one picked out.
    const big = rec.of("arc").filter((c) => c.args[2] === 6.5);
    const small = rec.of("arc").filter((c) => c.args[2] === 3.5);
    expect(small).toHaveLength(5);
    expect(big).toHaveLength(1);
  });

  it("gives both branches for cos and says when there is no solution", () => {
    expect(render(results({ k: 0.5, n: 1 }, { func: "cos" }), ["equation", "labels"]).text).toContain("x = 2nπ ± α; n = 1 gives 420°, 300°");
    expect(render(results({ k: 1.2 }, { func: "cos" }), ["equation", "labels"]).text).toContain("cos x = 1.20 has no solution");
  });

  it("hides the solution's value without the words, and says when n is off the graph", () => {
    expect(render(results({ k: Math.sqrt(3) / 2, n: -1 }, { func: "sin" }), ["equation"]).text).not.toContain("240");
    expect(render(results({ k: -0.5, n: 2 }, { func: "cos" }), ["equation"]).text).toContain("n = 2 is off the graph");
  });

  it("draws the asymptotes of tan", () => {
    const tan = render(results({ k: 1 }, { func: "tan" }), ["equation"]);
    const sin = render(results({ k: 1 }, { func: "sin" }), ["equation"]);
    expect(tan.rec.of("setLineDash").length).toBeGreaterThan(sin.rec.of("setLineDash").length);
  });
});

describe("inverse functions", () => {
  it("reads sin⁻¹(½) and cos⁻¹(−½) off the mirrored branch", () => {
    expect(render(results({ u: 0.5 }, { func: "sin" }), ["inverse", "labels"]).text).toContain("sin⁻¹(0.50) = 30° = 0.52 rad");
    const cos = render(results({ u: -0.5 }, { func: "cos" }), ["inverse", "labels"]);
    expect(cos.text).toContain("cos⁻¹(−0.50) = 120° = 2.09 rad");
    expect(cos.text).toContain("principal values: 0° to 180°");
    expect(cos.rec.texts()).toEqual(expect.arrayContaining(["y = x", "cos x", "cos⁻¹x"]));
    expect(render(results({ u: -0.5 }, { func: "cos" }), ["inverse"]).text).not.toContain("120");
    expect(render(results({ u: 1 }, { func: "tan" }), ["inverse"]).text).toContain("y = tan x on (−π/2, π/2) and y = tan⁻¹x");
  });

  it("says sin⁻¹ 2 is not defined", () => {
    expect(render(results({ u: 2 }, { func: "sin" }), ["inverse", "labels"]).text).toContain("sin⁻¹(2.00) is not defined");
  });

  it("folds sin 150° back to 30°", () => {
    const { text } = render(results({ theta: d(150) }, { func: "sin" }), ["fold", "labels"]);
    expect(text).toContain("sin⁻¹(sin 150°) = 30°");
    expect(text).toContain("outside −90° to 90°");
    expect(render(results({ theta: d(40) }, { func: "sin" }), ["fold", "labels"]).text).toContain("θ comes back");
    expect(render(results({ theta: d(150) }, { func: "sin" }), ["fold"]).text).not.toContain("30°");
  });

  it("stacks sin⁻¹x and cos⁻¹x up to 90°", () => {
    expect(render(results({ u: 0.5 }), ["complement", "labels"]).text).toContain("sin⁻¹x + cos⁻¹x = 30° + 60° = 90°");
    expect(render(results({ u: -1 }), ["complement", "labels"]).text).toContain("= −90° + 180° = 90°");
  });

  it("adds π for tan⁻¹2 + tan⁻¹3 and nothing for tan⁻¹½ + tan⁻¹⅓", () => {
    const big = render(results({ u: 2, v: 3 }), ["tansum", "labels"]).text;
    expect(big).toContain("tan⁻¹2.00 + tan⁻¹3.00 = 135°");
    expect(big).toContain("uv = 6.00 > 1: formula −45°, add 180°");
    expect(render(results({ u: 0.5, v: 1 / 3 }), ["tansum", "labels"]).text).toContain("uv = 0.17 < 1: the formula gives it directly");
    expect(render(results({ u: -2, v: -3 }), ["tansum", "labels"]).text).toContain("take away 180°");
    expect(render(results({ u: 2, v: 0.5 }), ["tansum", "labels"]).text).toContain("uv = 1");
    expect(render(results({ u: 2, v: 3 }), ["tansum"]).text).not.toContain("135");
  });
});

describe("on a phone", () => {
  const views: [string[], Partial<TrigPlusState>, Partial<TrigPlusParams>][] = [
    [["circle", "proof", "labels"], { A: d(45), B: d(30) }, {}],
    [["circle", "labels"], { A: d(170), B: d(200) }, {}],
    [["circle", "labels"], { A: d(350), B: d(5) }, {}],
    [["double", "labels"], { A: d(100) }, {}],
    [["equation", "labels"], { k: -0.5, n: 2 }, { func: "sin" }],
    [["equation", "labels"], { k: 0.5, n: -2 }, { func: "cos" }],
    [["equation", "labels"], { k: -2, n: 1 }, { func: "tan" }],
    [["inverse", "labels"], { u: 1 }, { func: "sin" }],
    [["inverse", "labels"], { u: -1 }, { func: "cos" }],
    [["inverse", "labels"], { u: 3 }, { func: "tan" }],
    [["fold", "labels"], { theta: d(-300) }, { func: "cos" }],
    [["complement", "labels"], { u: 1 }, {}],
    [["tansum", "labels"], { u: -3, v: -3 }, {}],
    [["tansum", "labels"], { u: 3, v: 3 }, {}],
  ];

  it.each(views.map((v, i) => [i, ...v] as const))("keeps view %i inside 325 px", (_i, layers, state, params) => {
    const { spans, layout } = render(results(state, params), layers, 325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    for (const s of spans) {
      expect(s.text.length, s.text).toBeLessThanOrEqual(55);
      expect(s.left, s.text).toBeGreaterThanOrEqual(0);
      expect(s.right, s.text).toBeLessThanOrEqual(325);
      expect(s.y, s.text).toBeGreaterThanOrEqual(0);
      expect(s.y, s.text).toBeLessThanOrEqual(layout.height);
    }
  });

  it("fits the circle and the square plot on the canvas", () => {
    const l = computeTrigPlusLayout(325);
    expect(l.circle.cx - l.circle.r).toBeGreaterThan(20);
    expect(l.circle.cx + l.circle.r).toBeLessThan(305);
    expect(l.circle.cy + l.circle.r).toBeLessThan(l.line1 - 8);
    expect(l.square.x).toBeGreaterThanOrEqual(0);
    expect(l.square.x + l.square.width).toBeLessThanOrEqual(325);
    expect(l.square.width).toBe(l.square.height);
    expect(l.square.y + l.square.height).toBeLessThan(l.line1 - 8);
    expect(l.plot.x + l.plot.width).toBeLessThanOrEqual(325);
  });
});

describe("small angles", () => {
  it("sets sin θ against θ and gives the error only with the words", () => {
    const { rec, text } = render(results({ small: d(14) }, { func: "sin" }), ["small", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["sin θ and θ, θ = 14°", "sin θ", "θ", "15°", "60°"]));
    expect(text).toContain("θ = 0.2443 rad, sin θ = 0.2419");
    expect(text).toContain("θ = 0.2443: off by 1.00%");
    const hidden = render(results({ small: d(5) }, { func: "sin" }), ["small"]).text;
    expect(hidden).not.toMatch(/0\.0872|0\.127|%/);
  });

  it("uses 1 − θ²/2 for cosine", () => {
    const { text } = render(results({ small: d(20) }, { func: "cos" }), ["small", "labels"]);
    expect(text).toContain("cos θ and 1 − θ²/2, θ = 20°");
    expect(text).toContain("1 − θ²/2 = 0.9391: off by 0.066%");
    expect(render(results({ small: d(20) }, { func: "cos" }), ["small"]).text).not.toContain("0.9391");
  });

  it.each([
    ["sin", 0],
    ["sin", 60],
    ["tan", 60],
    ["cos", 60],
    ["cos", 1],
  ] as const)("keeps %s at %i° inside 325 px", (func, degrees) => {
    const { spans, layout } = render(results({ small: d(degrees) }, { func }), ["small", "labels"], 325);
    for (const s of spans) {
      expect(s.text.length, s.text).toBeLessThanOrEqual(55);
      expect(s.left, s.text).toBeGreaterThanOrEqual(0);
      expect(s.right, s.text).toBeLessThanOrEqual(325);
      expect(s.y, s.text).toBeGreaterThanOrEqual(0);
      expect(s.y, s.text).toBeLessThanOrEqual(layout.height);
    }
  });
});
