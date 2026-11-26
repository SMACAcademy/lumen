import { patternsModel, type PatternsParams, type PatternsState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computePatternsLayout, patternsFormat, patternsRenderer, patternsSpiralGeometry, patternsStickSegments } from "./patterns/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = patternsModel.initialize(patternsModel.defaultParams);
const results = (state: Partial<PatternsState> = {}, params: Partial<PatternsParams> = {}) =>
  patternsModel.derive({ ...base, ...state }, { ...patternsModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  patternsRenderer.draw(rec.ctx, computePatternsLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

/** Every label stays inside the canvas, measuring text as the recorder does (6 px a character) with its alignment at the time. */
function insideCanvas(r: ReturnType<typeof results>, layers: string[], width: number) {
  const rec = recordingContext();
  const ctx = rec.ctx as unknown as { textAlign: CanvasTextAlign; fillText: (t: string, x: number, y: number) => void };
  const placed: { t: string; left: number; y: number }[] = [];
  ctx.fillText = (t, x, y) => {
    const w = t.length * 6;
    placed.push({ t, y, left: ctx.textAlign === "center" ? x - w / 2 : ctx.textAlign === "right" ? x - w : x });
  };
  const layout = computePatternsLayout(width);
  patternsRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  expect(placed.length).toBeGreaterThan(0);
  for (const { t, left, y } of placed) {
    expect(left, `"${t}" starts off the left edge`).toBeGreaterThanOrEqual(0);
    expect(left + t.length * 6, `"${t}" runs off the right edge`).toBeLessThanOrEqual(width);
    expect(y, `"${t}"`).toBeGreaterThanOrEqual(0);
    expect(y, `"${t}"`).toBeLessThanOrEqual(layout.height);
    expect(t.length, t).toBeLessThanOrEqual(55);
  }
}

describe("the factors view", () => {
  it("draws both trees down to the primes, with their prime powers", () => {
    const rec = render(results({ num1: 60, num2: 84 }), ["factors"]);
    const t = rec.texts();
    expect(t).toEqual(expect.arrayContaining(["60", "30", "15", "5", "84", "42", "21", "7", "60 = 2² × 3 × 5", "84 = 2² × 3 × 7"]));
    // Four primes in 60's tree and four in 84's, each circled.
    expect(rec.of("arc")).toHaveLength(8);
  });

  it("gives HCF and LCM only with the words, and checks HCF × LCM", () => {
    const hidden = text(render(results({ num1: 12, num2: 18 }), ["factors"]));
    expect(hidden).not.toMatch(/HCF|LCM/);
    const shown = render(results({ num1: 12, num2: 18 }), ["factors", "labels"]).texts();
    expect(shown).toEqual(expect.arrayContaining(["HCF = 2 × 3 = 6", "LCM = 2² × 3² = 36", "6 × 36 = 216 = 12 × 18"]));
    expect(text(render(results({ num1: 15, num2: 28 }), ["factors", "labels"]))).toContain("HCF = 1: no prime in common");
  });

  it("circles a prime on its own", () => {
    const rec = render(results({ num1: 97, num2: 2 }), ["factors"]);
    expect(rec.of("arc")).toHaveLength(2);
    expect(rec.texts()).toEqual(expect.arrayContaining(["97 = 97", "2 = 2"]));
  });
});

describe("the roots view", () => {
  it("builds k − 1 triangles and drops √k onto the line", () => {
    const rec = render(results({ k: 5 }), ["roots"]);
    // Four triangles, each filled once.
    expect(rec.of("fill").length).toBeGreaterThanOrEqual(4);
    expect(rec.texts()).toEqual(expect.arrayContaining(["√5", "0", "1", "2", "3", "4"]));
    expect(text(rec)).not.toContain("2.236");
  });

  it("puts the √k point where √k is", () => {
    const layout = computePatternsLayout(325);
    const { u, cx } = patternsSpiralGeometry(layout);
    const rec = render(results({ k: 2 }), ["roots"], 325);
    const point = rec.of("arc").find((c) => Math.abs((c.args[0] as number) - (cx + Math.SQRT2 * u)) < 1e-9);
    expect(point).toBeDefined();
  });

  it("says whether √k is rational with the words", () => {
    expect(text(render(results({ k: 5 }), ["roots", "labels"]))).toContain("√5 ≈ 2.23607… never ends, never repeats");
    expect(text(render(results({ k: 10 }), ["roots", "labels"]))).toContain("3 < √10 < 4");
    expect(text(render(results({ k: 9 }), ["roots", "labels"]))).toContain("√9 = 3: 9 is a perfect square, so √9 is rational");
  });
});

describe("the matchsticks view", () => {
  it("draws exactly as many sticks as the rule counts", () => {
    for (const sticks of ["triangles", "squares", "houses"] as const) {
      for (const n of [1, 4, 10, 20]) {
        const r = results({ n }, { sticks });
        expect(patternsStickSegments(sticks, n, 0, 100, 10), `${sticks} ${n}`).toHaveLength(r.term);
        // One match head per stick.
        expect(render(r, ["sticks"]).of("arc"), `${sticks} ${n}`).toHaveLength(r.term);
      }
    }
  });

  it("lists the first five terms, and the rule only with the words", () => {
    const hidden = render(results({ n: 10 }, { sticks: "squares" }), ["sticks"]).texts();
    expect(hidden).toEqual(expect.arrayContaining(["4", "7", "10", "13", "16"]));
    expect(hidden).not.toContain("31");
    expect(text(render(results({ n: 10 }, { sticks: "squares" }), ["sticks", "labels"]))).toContain("rule 3n + 1: 3 × 10 + 1 = 31");
    expect(text(render(results({ n: 1 }, { sticks: "houses" }), ["sticks", "labels"]))).toContain("1 house: 6 sticks");
  });
});

describe("the dots view", () => {
  it("draws n² and n(n + 1)/2 dots, and the next ones hollow", () => {
    const rec = render(results({ n: 4 }), ["dots"]);
    // 16 + 9 hollow, and 10 + 5 hollow.
    expect(rec.of("arc")).toHaveLength(16 + 9 + 10 + 5);
    expect(rec.of("fill")).toHaveLength(26);
    expect(text(render(results({ n: 4 }), ["dots", "labels"]))).toContain("next: +9 dots (2n + 1) and +5 dots (n + 1)");
  });
});

describe("the tiles view", () => {
  const p = { x2a: 1, xa: 2, ua: 3, x2b: 1, xb: -1, ub: -2 };
  it("draws a tile for every term and writes the two expressions", () => {
    const rec = render(results(p), ["tiles"]);
    // 6 + 4 tiles in the expressions, 4 in the sum, and the 4 key swatches.
    expect(rec.of("fillRect")).toHaveLength(6 + 4 + 4 + 4);
    expect(rec.texts()).toEqual(expect.arrayContaining(["x² + 2x + 3", "x² − x − 2", "first", "second", "sum", "+"]));
    expect(rec.texts()).not.toContain("2x² + x + 1");
  });

  it("gives the result, the zero pairs and a check at x = 2 with the words", () => {
    const add = text(render(results(p), ["tiles", "labels"]));
    expect(add).toContain("2x² + x + 1");
    expect(add).toContain("3 zero pairs cancel");
    expect(add).toContain("check at x = 2: 11 + 0 = 11");
    const sub = text(render(results(p, { op: "subtract" }), ["tiles", "labels"]));
    expect(sub).toContain("3x + 5");
    expect(sub).toContain("difference");
  });
});

describe("the parabola view", () => {
  it("marks the zeroes, and names them only with the words", () => {
    const rec = render(results({ qa: 1, qb: -3, qc: -4 }), ["parabola"]);
    expect(rec.texts()).toContain("y = x² − 3x − 4");
    // With the words: the two zeroes' values and two lines below.
    const words = render(results({ qa: 1, qb: -3, qc: -4 }), ["parabola", "labels"]);
    expect(words.texts().length - rec.texts().length).toBe(4);
    expect(rec.of("roundRect")).toHaveLength(0);
    expect(words.of("roundRect")).toHaveLength(2);
    const shown = text(words);
    expect(shown).toContain("b² − 4ac = 25 > 0: two zeroes, −1 and 4");
    expect(shown).toContain("sum 3 = −b/a · product −4 = c/a");
  });

  it("says when it touches, misses, or is not a quadratic", () => {
    expect(text(render(results({ qa: 1, qb: -2, qc: 1 }), ["parabola", "labels"]))).toContain("b² − 4ac = 0: one zero, 1 (it touches)");
    expect(text(render(results({ qa: 1, qb: 0, qc: 1 }), ["parabola", "labels"]))).toContain("b² − 4ac = −4 < 0: no zeroes");
    expect(text(render(results({ qa: 0, qb: 2, qc: -4 }), ["parabola", "labels"]))).toContain("a = 0: not a quadratic");
  });
});

describe("the progression view", () => {
  it("draws one bar per term and the doubled staircase", () => {
    const rec = render(results({ apA: 1, apD: 1, n: 20 }), ["ap"]);
    expect(rec.of("fillRect")).toHaveLength(20);
    expect(rec.of("strokeRect")).toHaveLength(20);
    expect(rec.texts()).toEqual(expect.arrayContaining(["An AP: a = 1, d = 1", "1, 2, 3, 4, 5, …"]));
    expect(text(rec)).not.toContain("210");
  });

  it("gives the nth term and the sum with the words", () => {
    const t = text(render(results({ apA: 1, apD: 1, n: 20 }), ["ap", "labels"]));
    expect(t).toContain("a₂₀ = 1 + 19 × 1 = 20");
    expect(t).toContain("S₂₀ = 20/2 × (1 + 20) = 210");
    const neg = text(render(results({ apA: 10, apD: -3, n: 5 }), ["ap", "labels"]));
    expect(neg).toContain("a₅ = 10 + 4 × (−3) = −2");
    expect(neg).toContain("S₅ = 5/2 × (10 + (−2)) = 20");
  });

  it("skips the doubled staircase when a term is negative", () => {
    expect(render(results({ apA: 10, apD: -3, n: 5 }), ["ap"]).of("strokeRect")).toHaveLength(0);
  });
});

describe("a phone's canvas", () => {
  const width = 325;
  const layout = computePatternsLayout(width);
  it("is a sensible size", () => {
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
  });

  it("keeps every label inside, in every view, at the extremes", () => {
    const cases: [Partial<PatternsState>, Partial<PatternsParams>, string][] = [
      [{ num1: 96, num2: 120 }, {}, "factors"],
      [{ num1: 64, num2: 97 }, {}, "factors"],
      [{ num1: 113, num2: 119 }, {}, "factors"],
      [{ k: 16 }, {}, "roots"],
      [{ k: 15 }, {}, "roots"],
      [{ k: 1 }, {}, "roots"],
      [{ n: 20 }, { sticks: "houses" }, "sticks"],
      [{ n: 20 }, { sticks: "triangles" }, "sticks"],
      [{ n: 20 }, {}, "dots"],
      [{ x2a: 4, xa: 4, ua: 4, x2b: 4, xb: 4, ub: 4 }, {}, "tiles"],
      [{ x2a: -4, xa: -4, ua: -4, x2b: 4, xb: 4, ub: 4 }, { op: "subtract" }, "tiles"],
      [{ qa: 0.5, qb: -7, qc: -8 }, {}, "parabola"],
      [{ qa: -2.5, qb: 8, qc: -3 }, {}, "parabola"],
      [{ apA: -10, apD: -5, n: 20 }, {}, "ap"],
      [{ apA: 20, apD: 5, n: 20 }, {}, "ap"],
    ];
    for (const [state, params, layer] of cases) insideCanvas(results(state, params), [layer, "labels"], width);
  });

  it("keeps the spiral, the sticks and the tiles on the canvas", () => {
    const { u, cx, cy } = patternsSpiralGeometry(layout);
    expect(cx - 4 * u).toBeGreaterThanOrEqual(0);
    expect(cx + 4 * u).toBeLessThanOrEqual(width);
    expect(cy - 4 * u).toBeGreaterThanOrEqual(20);
    expect(cy + 4 * u).toBeLessThanOrEqual(layout.height - 50);
    for (const sticks of ["triangles", "squares", "houses"] as const) {
      for (const call of render(results({ n: 20 }, { sticks }), ["sticks"], width).of("lineTo")) {
        const [x, y] = call.args as [number, number];
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(width);
        expect(y).toBeGreaterThan(20);
      }
    }
    for (const call of render(results({ x2a: 4, xa: 4, ua: 4, x2b: 4, xb: 4, ub: 4 }), ["tiles"], width).of("fillRect")) {
      const [x, , w] = call.args as [number, number, number];
      expect(x + w).toBeLessThanOrEqual(width);
    }
  });
});

describe("number formatting", () => {
  it("uses a true minus and at most two decimals", () => {
    expect(patternsFormat(-4)).toBe("−4");
    expect(patternsFormat(1.5)).toBe("1.5");
    expect(patternsFormat(2 / 3)).toBe("0.67");
    expect(patternsFormat(-0)).toBe("0");
  });
});
