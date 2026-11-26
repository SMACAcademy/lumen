import { matrixModel, type MatrixParams, type MatrixState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeMatrixLayout, matrixEquationText, matrixExtent, matrixFractionText, matrixInlineText, matrixRenderer } from "./matrix/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = matrixModel.initialize(matrixModel.defaultParams);
const results = (state: Partial<MatrixState> = {}, params: Partial<MatrixParams> = {}) =>
  matrixModel.derive({ ...base, ...state }, { ...matrixModel.defaultParams, ...params });
const A = (a: number, b: number, c: number, d: number, more: Partial<MatrixState> = {}) => ({ a, b, c, d, ...more });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const set = new Set(layers);
  const layout = computeMatrixLayout(width, [], set);
  const rec = recordingContext();
  matrixRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, layout, words: () => rec.texts().join(" | ") };
};

describe("writing matrices", () => {
  it("writes fractions, matrices and equations as a textbook does", () => {
    expect(matrixFractionText(9, 5)).toBe("9/5");
    expect(matrixFractionText(1, -2)).toBe("−1/2");
    expect(matrixFractionText(6, 3)).toBe("2");
    expect(matrixFractionText(1, 0)).toBe("undefined");
    expect(matrixInlineText([1, -2, -3, 4])).toBe("[1 −2; −3 4]");
    expect(matrixEquationText(2, 1, 4)).toBe("2x + y = 4");
    expect(matrixEquationText(-1, -0.5, -3)).toBe("−x − 0.5y = −3");
    expect(matrixEquationText(0, 2, 3)).toBe("2y = 3");
    expect(matrixEquationText(0, 0, 3)).toBe("0 = 3");
  });
});

describe("the plane", () => {
  it("names where î and ĵ land, and gives the image of P with the words", () => {
    const words = render(results(A(1, 2, 3, -1, { px: 2, py: 1 })), ["plane", "shape", "basis", "point", "labels"]).words();
    expect(words).toContain("Where î and ĵ land");
    expect(words).toContain("Aî = (1, 3) · Aĵ = (2, −1)");
    expect(words).toContain("P = (2, 1) → AP = (4, 5)");
  });

  it("hides AP's coordinates without the words, but still names the arrows", () => {
    const texts = render(results(A(1, 2, 3, -1, { px: 2, py: 1 })), ["plane", "shape", "basis", "point"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Aî", "Aĵ", "P", "AP", "A ="]));
    expect(texts.join(" ")).not.toMatch(/→|\(4, 5\)/);
  });

  it("works out the determinant as an area scale, flipped or squashed", () => {
    expect(render(results(A(3, 1, 1, 2)), ["plane", "square", "shape", "basis", "labels"]).words()).toContain("|A| = 3·2 − 1·1 = 5");
    const flipped = render(results(A(1, 2, 2, 1)), ["plane", "square", "labels"]).words();
    expect(flipped).toContain("|A| = 1·1 − 2·2 = −3");
    expect(flipped).toContain("areas × 3, flipped");
    expect(render(results(A(2, 4, 1, 2)), ["plane", "square", "labels"]).words()).toContain("areas × 0: squashed flat");
    expect(render(results(A(-2, 1, 1, 2)), ["plane", "square", "labels"]).words()).toContain("|A| = (−2)·2 − 1·1 = −5");
  });

  it("hides the determinant without the words", () => {
    expect(render(results(A(3, 1, 1, 2)), ["plane", "square", "shape", "basis"]).words()).not.toMatch(/= 5|areas ×|3·2/);
  });

  it("fills the image of the unit square", () => {
    const fills = (r: ReturnType<typeof results>) => {
      const rec = render(r, ["plane", "square"]);
      return rec.calls.filter((c) => c.method === "fill").length;
    };
    expect(fills(results(A(2, 0, 0, 1)))).toBeGreaterThan(0);
  });

  it("does B first, then A, and says when the order matters", () => {
    const r = render(results(A(1, 2, 3, 4), { second: "shear" }), ["plane", "product", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["AB", "BA", "B ="]));
    expect(r.words()).toContain("AB = [1 3; 3 7] · BA = [4 6; 3 4]");
    expect(r.words()).toContain("AB ≠ BA: the order matters");
    const same = render(results(A(2, 0, 0, 2), { second: "rotate" }), ["plane", "product", "labels"]);
    expect(same.texts()).toContain("AB = BA");
    expect(same.words()).toContain("this time the order does not matter");
    expect(render(results(A(1, 2, 3, 4), { second: "shear" }), ["plane", "product"]).words()).not.toMatch(/\[1 3; 3 7\]/);
  });

  it("writes the adjoint and the inverse as an exact fraction", () => {
    const r = render(results(A(2, 1, 1, 3)), ["plane", "square", "shape", "inverse", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["A⁻¹ = (1/5)", "−1"]));
    expect(r.words()).toContain("adj A = [3 −1; −1 2] · A(adj A) = 5I");
    expect(r.words()).toContain("A⁻¹ = adj A / |A| = adj A / 5");
    expect(render(results(A(4, 2, 3, 1)), ["plane", "inverse", "labels"]).texts()).toContain("A⁻¹ = (−1/2)");
    expect(render(results(A(2, 4, 1, 2)), ["plane", "inverse", "labels"]).words()).toContain("|A| = 0: A squashes the plane, so no A⁻¹");
    expect(render(results(A(4, 2, 3, 1)), ["plane", "inverse"]).words()).not.toMatch(/A⁻¹ =|adj A =/);
  });

  it("splits A into symmetric and skew-symmetric parts", () => {
    const words = render(results(A(1, 3, -1, 2)), ["plane", "shape", "special", "labels"]).words();
    expect(words).toContain("Aᵀ =");
    expect(words).toContain("Aᵀ ≠ A and Aᵀ ≠ −A: neither");
    expect(words).toContain("A = [1 1; 1 2] + [0 2; −2 0]");
    expect(render(results(A(0, 3, -3, 0)), ["plane", "special", "labels"]).words()).toContain("Aᵀ = −A: skew-symmetric");
    expect(render(results(A(1, 3, -1, 2)), ["plane", "special"]).words()).not.toMatch(/\[1 1; 1 2\]/);
  });

  it("says whether lengths are kept", () => {
    const words = render(results({ theta: Math.PI / 3, px: 1, py: 2 }, { source: "rotation" }), ["plane", "shape", "orthogonal", "labels"]).words();
    expect(words).toContain("|P| = 2.24 · |AP| = 2.24");
    expect(words).toContain("AᵀA = I: orthogonal, |A| = 1");
    expect(render(results({ k: 1, px: 1, py: 2 }, { source: "shear" }), ["plane", "orthogonal", "labels"]).words()).toContain("AᵀA ≠ I: not orthogonal");
    expect(render(results({ theta: Math.PI / 3, px: 1, py: 2 }, { source: "rotation" }), ["plane", "orthogonal"]).words()).not.toMatch(/2\.24/);
  });

  it("grows the plane to fit what is drawn", () => {
    const fits = { point: false, product: false, inverse: false, orthogonal: false };
    expect(matrixExtent(results(A(1, 0, 0, 1)), fits)).toBe(2);
    expect(matrixExtent(results(A(4, 4, 4, 4)), fits)).toBe(10);
    expect(matrixExtent(results(A(4, 0, 0, 0.5)), { ...fits, inverse: true })).toBe(5);
  });

  it("drags the heads of Aî and Aĵ to set A's columns", () => {
    const r = results(A(2, 1, 1, 3));
    const layout = computeMatrixLayout(325, [], new Set(["plane", "basis"]));
    const plane = { e: matrixExtent(r, layout.fits) };
    const { square } = layout;
    const toPx = (x: number, y: number) => [square.x + ((x + plane.e) / (2 * plane.e)) * square.width, square.y + ((plane.e - y) / (2 * plane.e)) * square.height] as const;
    const [ix, iy] = toPx(2, 1);
    expect(matrixRenderer.pick!(layout, ix + 2, iy, undefined, r)?.writes).toEqual([
      { variable: "a", value: 2 },
      { variable: "c", value: 1 },
    ]);
    const [jx, jy] = toPx(1, 3);
    expect(matrixRenderer.pick!(layout, jx, jy + 1, undefined, r)?.region).toBe("j");
    expect(matrixRenderer.pick!(layout, square.x + 4, square.y + square.height - 4, undefined, r)).toBeNull();
    expect(matrixRenderer.pick!(layout, ix, iy, undefined, results({}, { source: "rotation" }))).toBeNull();
  });
});

describe("the system", () => {
  it("solves by Cramer's rule with exact fractions", () => {
    const r = render(results(A(2, 1, 1, 3, { e: 4, f: 3 })), ["system", "cramer", "labels"]);
    expect(r.texts()).toContain("2x + y = 4 and x + 3y = 3");
    expect(r.words()).toContain("D = |A| = 5 · D₁ = 9 · D₂ = 2");
    expect(r.words()).toContain("x = D₁/D = 9/5 · y = D₂/D = 2/5");
    expect(r.texts()).toContain("(1.8, 0.4)");
  });

  it("tells parallel lines from one line", () => {
    expect(render(results(A(1, 2, 2, 4, { e: 3, f: 5 })), ["system", "labels"]).words()).toContain("D = 0, (adj A)B = (2, −1): no solution");
    expect(render(results(A(1, 2, 2, 4, { e: 3, f: 6 })), ["system", "labels"]).words()).toContain("D = 0, (adj A)B = O: infinitely many solutions");
  });

  it("hides the solution without the words", () => {
    expect(render(results(A(2, 1, 1, 3, { e: 4, f: 3 })), ["system", "cramer"]).words()).not.toMatch(/1\.8|9\/5|D₁ =/);
  });
});

describe("the 3 × 3 determinant", () => {
  it("expands along row 1 with minors and cofactors", () => {
    const r = render(results({ x3: 0, line: 1 }, { grid3: "counting" }), ["det3", "labels"]);
    expect(r.texts()).toEqual(expect.arrayContaining(["Expanding along row 1", "M₁₁ = −48", "C₁₂ = 42", "C₁₃ = −3"]));
    expect(r.words()).toContain("Δ = a₁₁C₁₁ + a₁₂C₁₂ + a₁₃C₁₃");
    expect(r.words()).toContain("Δ = 1·(−48) + 2·42 + 3·(−3) = 27");
  });

  it("expands down a column too", () => {
    const words = render(results({ x3: 0, line: 3 }, { grid3: "ncert", expandBy: "column" }), ["det3", "labels"]).words();
    expect(words).toContain("Expanding along column 3");
    expect(words).toContain("Δ = 4·(−13) + 0·7 + 0·5 = −52");
  });

  it("hides the minors, the cofactors and Δ without the words", () => {
    expect(render(results({ x3: 0 }), ["det3"]).words()).not.toMatch(/= −48|= 42|= 27/);
  });
});

describe("a phone's canvas", () => {
  const cases: [string, Partial<MatrixState>, Partial<MatrixParams>, string[]][] = [
    ["transform", A(-4, 4, 4, -3.5, { px: -3, py: 3 }), {}, ["plane", "shape", "basis", "point", "labels"]],
    ["determinant", A(-3.5, -2.5, 1.5, -0.5), {}, ["plane", "square", "shape", "basis", "labels"]],
    ["product", A(-4, 3.5, 2.5, -4), { second: "stretch" }, ["plane", "product", "labels"]],
    ["inverse", A(-3.5, 1.5, 2.5, 0.5), {}, ["plane", "square", "shape", "inverse", "labels"]],
    ["special", A(-3.5, -2.5, 3.5, -0.5, { px: -3, py: -3 }), {}, ["plane", "shape", "special", "orthogonal", "labels"]],
    ["rotation", { theta: 2.4, px: -3, py: 2.5 }, { source: "rotation" }, ["plane", "shape", "orthogonal", "labels"]],
    ["system", A(-3.5, 0.5, 2.5, -3.5, { e: -5.5, f: 5.5 }), {}, ["system", "cramer", "labels"]],
    ["parallel", A(0.5, -2, -1, 4, { e: -5.5, f: 6 }), {}, ["system", "labels"]],
    ["det3", { x3: -9.5, line: 2 }, { grid3: "counting", expandBy: "column" }, ["det3", "labels"]],
  ];

  it.each(cases)("keeps the %s view inside 325 px, with short captions", (_name, state, params, layers) => {
    const r = render(results(state, params), layers, 325);
    expect(r.layout.height).toBeGreaterThanOrEqual(330);
    expect(r.layout.height).toBeLessThanOrEqual(420);
    for (const call of r.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(text.length, text).toBeLessThanOrEqual(55);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(325);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeLessThanOrEqual(r.layout.height);
    }
    // Centred captions must fit in half the width either side (≈ 6 px a character).
    for (const call of r.of("fillText")) {
      const [text, x] = call.args as [string, number];
      if (x === 325 / 2) expect(text.length * 5.5, text).toBeLessThanOrEqual(325);
    }
    for (const call of r.of("arc")) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(325);
      expect(y).toBeLessThanOrEqual(r.layout.height);
    }
  });
});
