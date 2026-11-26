import { complexModel, type ComplexParams, type ComplexState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { complexExtent, complexRenderer, complexText, computeComplexLayout, polynomialText } from "./complex/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = complexModel.initialize(complexModel.defaultParams);
const results = (state: Partial<ComplexState> = {}, params: Partial<ComplexParams> = {}) =>
  complexModel.derive({ ...base, ...state }, { ...complexModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const set = new Set(layers);
  const layout = computeComplexLayout(width, [], set);
  const rec = recordingContext();
  complexRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, layout, words: () => rec.texts().join(" | ") };
};

describe("writing numbers", () => {
  it("writes complex numbers and polynomials as a textbook does", () => {
    expect(complexText(3, -2)).toBe("3 − 2i");
    expect(complexText(0, -1)).toBe("−i");
    expect(complexText(-0.5, 0)).toBe("−0.5");
    expect(complexText(0, 0)).toBe("0");
    expect(complexText(1 / 3, 2 / 3)).toBe("0.33 + 0.67i");
    expect(polynomialText(1, -2, -3)).toBe("x² − 2x − 3");
    expect(polynomialText(-1, 0, 4)).toBe("−x² + 4");
    expect(polynomialText(0.5, 1, 0)).toBe("0.5x² + x");
  });
});

describe("the Argand plane", () => {
  it("names z and gives its modulus and principal argument with the words", () => {
    const words = render(results({ a: -1, b: -1 }), ["plane", "conjugate", "times-i", "labels"]).words();
    expect(words).toContain("The Argand plane");
    expect(words).toContain("z = −1 − i · |z| = 1.41 · arg z = −135°");
    expect(words).toContain("z̄ = −1 + i · zz̄ = 2 · iz = 1 − i");
  });

  it("hides every number without the words, but still names the arrows", () => {
    const texts = render(results({ a: 3, b: 4 }), ["plane", "conjugate", "times-i"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["z", "z̄", "iz"]));
    expect(texts.join(" ")).not.toMatch(/arg|\|z\||53|zz̄ =/);
  });

  it("adds tip to tail and reports the sum", () => {
    const r = render(results({ a: 3, b: 4, c: 1, d: 2 }, { op: "add" }), ["plane", "pair", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["z", "w", "z + w"]));
    expect(r.words()).toContain("(3 + 4i) + (1 + 2i) = 4 + 6i");
    expect(render(results({ a: 3, b: 4, c: 1, d: 2 }, { op: "multiply" }), ["plane", "pair", "labels"]).words()).toContain("(3 + 4i) × (1 + 2i) = −5 + 10i");
    expect(render(results({ c: 0, d: 0 }, { op: "divide" }), ["plane", "pair", "labels"]).words()).toContain("dividing by 0 is not defined");
  });

  it("multiplies the lengths and adds the angles, taking off a turn when needed", () => {
    const words = render(results({ a: -1, b: 1, c: -1, d: 1 }), ["plane", "product", "labels"]).words();
    expect(words).toContain("|zw| = 1.41 × 1.41 = 2");
    expect(words).toContain("arg zw = 135° + 135° − 360° = −90°");
  });

  it("writes the polar and Euler forms", () => {
    const words = render(results({ a: 0, b: 2 }), ["plane", "polar", "labels"]).words();
    expect(words).toContain("z = 2(cos 90° + i sin 90°)");
    expect(words).toContain("= 2e^(1.57i), with θ = 1.57 rad");
  });

  it("grows the plane to fit the product", () => {
    expect(complexExtent(results({ a: 1, b: 1 }), { pair: false, product: false })).toBe(5);
    expect(complexExtent(results({ a: 4, b: 4, c: 4, d: 0 }), { pair: false, product: true })).toBe(20);
  });

  it("drags z on the plane, snapped to halves", () => {
    const r = results();
    const layout = computeComplexLayout(325, [], new Set(["plane"]));
    const { square } = layout;
    const pick = complexRenderer.pick!(layout, square.x + square.width / 2 + square.width / 10, square.y + square.height / 2, undefined, r);
    expect(pick?.writes).toEqual([
      { variable: "a", value: 1 },
      { variable: "b", value: 0 },
    ]);
    expect(complexRenderer.pick!(computeComplexLayout(325, [], new Set(["unity"])), 100, 100, undefined, r)).toBeNull();
  });
});

describe("roots of unity", () => {
  it("draws an n-gon and says the roots add to 0", () => {
    const r = render(results({ n: 3, m: 1 }), ["unity", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["1", "ω", "ω²", "The 3 roots of z³ = 1"]));
    expect(r.words()).toContain("n = 3: corners 120° apart · ω = −0.5 + 0.87i");
    expect(r.words()).toContain("ω¹ = −0.5 + 0.87i · sum = 0 · product = 1");
  });

  it("hides the sum and the angle without the words", () => {
    expect(render(results({ n: 6 }), ["unity"]).words()).not.toMatch(/sum|apart|60°/);
  });
});

describe("the parabola", () => {
  it("gives the discriminant, the roots and Vieta's relations", () => {
    const words = render(results({ qa: 1, qb: -2, qc: -3 }), ["parabola", "roots", "labels"]).words();
    expect(words).toContain("y = x² − 2x − 3");
    expect(words).toContain("D = 16 > 0: two real roots, −1 and 3");
    expect(words).toContain("α + β = 2 = −b/a · αβ = −3 = c/a");
  });

  it("shows the complex pair on an inset when D < 0", () => {
    const r = render(results({ qa: 1, qb: 3, qc: 5 }), ["parabola", "roots", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["Argand", "α", "β"]));
    expect(r.words()).toContain("D = −11 < 0: roots −1.5 ± 1.66i");
    expect(render(results({ qa: 1, qb: -4, qc: 4 }), ["parabola", "roots", "labels"]).words()).toContain("D = 0: one repeated root, x = 2");
  });

  it("hides D and the roots without the words", () => {
    expect(render(results({ qa: 1, qb: -2, qc: -3 }), ["parabola", "roots", "location", "inequality"]).words()).not.toMatch(/D =|f\(k\)|f\(x\)|α \+ β/);
  });

  it("places k and reads the inequality", () => {
    const words = render(results({ qa: 1, qb: -2, qc: -3, k: 0 }), ["parabola", "location", "inequality", "labels"]).words();
    expect(words).toContain("f(k) = −3, a·f(k) < 0: k is between the roots");
    expect(words).toContain("f(x) > 0 for x < −1 or x > 3");
    expect(render(results({ qa: -1, qb: 2, qc: 3, k: -3 }), ["parabola", "location", "inequality", "labels"]).words()).toContain("f(x) > 0 for −1 < x < 3");
    expect(render(results({ qa: 1, qb: -2, qc: -3, k: -2 }), ["parabola", "location", "labels"]).words()).toContain("both roots above k");
  });

  it("drags k along the axis", () => {
    const layout = computeComplexLayout(325, [], new Set(["parabola", "location"]));
    const pick = complexRenderer.pick!(layout, layout.plot.x + layout.plot.width / 2, layout.plot.y + 20, undefined, results());
    expect(pick?.writes).toEqual([{ variable: "k", value: 0 }]);
  });
});

describe("a phone's canvas", () => {
  const cases: [string, Partial<ComplexState>, string[]][] = [
    ["argand", { a: -4, b: -4 }, ["plane", "conjugate", "times-i", "labels"]],
    ["sum", { a: 4, b: 4, c: 4, d: 4 }, ["plane", "pair", "labels"]],
    ["product", { a: -3.5, b: 2.5, c: -3.5, d: -2.5 }, ["plane", "product", "labels"]],
    ["polar", { a: -3.5, b: -0.5 }, ["plane", "polar", "labels"]],
    ["unity", { n: 12, m: 7 }, ["unity", "labels"]],
    ["quadratic", { qa: 0.5, qb: 6, qc: -6, k: -5 }, ["parabola", "roots", "location", "inequality", "labels"]],
    ["complex pair", { qa: -0.5, qb: 0, qc: -6 }, ["parabola", "roots", "labels"]],
  ];

  it.each(cases)("keeps the %s view inside 325 px, with short captions", (_name, state, layers) => {
    const r = render(results(state), layers, 325);
    expect(r.layout.height).toBeGreaterThanOrEqual(330);
    expect(r.layout.height).toBeLessThanOrEqual(430);
    for (const call of r.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(text.length, text).toBeLessThanOrEqual(52);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(325);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeLessThanOrEqual(r.layout.height);
    }
    for (const call of r.of("arc")) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(325);
      expect(y).toBeLessThanOrEqual(r.layout.height);
    }
  });
});
