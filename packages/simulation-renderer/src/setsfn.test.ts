import { setsFnModel, type SetsFnParams, type SetsFnState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSetsFnLayout, setsFnRenderer } from "./setsfn/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: SetsFnState = setsFnModel.initialize(setsFnModel.defaultParams);
const results = (params: Partial<SetsFnParams> = {}, state: Partial<SetsFnState> = {}) =>
  setsFnModel.derive({ ...base, ...state }, { ...setsFnModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  setsFnRenderer.draw(rec.ctx, computeSetsFnLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

/** Every piece of text is anchored on the canvas, and the centred lines (titles, captions) fit across it at 6 px a character. */
function expectOnCanvas(rec: ReturnType<typeof render>, width: number, height: number) {
  for (const call of rec.of("fillText")) {
    const [t, x, y] = call.args as [string, number, number];
    expect(x, t).toBeGreaterThanOrEqual(0);
    expect(x, t).toBeLessThanOrEqual(width);
    expect(y, t).toBeGreaterThanOrEqual(0);
    expect(y, t).toBeLessThanOrEqual(height);
    expect(t.length, t).toBeLessThanOrEqual(55);
    if (x === width / 2) expect(t.length * 6, t).toBeLessThanOrEqual(width - 16);
  }
}

describe("the Venn view", () => {
  it("writes every element of U and the count under the words", () => {
    const rec = render(results({ op: "aMinusB" }, { a: 5, b: 4, common: 2 }), ["venn", "labels"]);
    const texts = rec.texts();
    for (let e = 1; e <= 10; e++) expect(texts).toContain(String(e));
    expect(texts).toEqual(expect.arrayContaining(["A", "B", "U"]));
    expect(text(rec)).toContain("n(A ∪ B) = 5 + 4 − 2 = 7");
    expect(text(rec)).toContain("shaded A − B = {1, 2, 3}");
    expect(text(rec)).toContain("A has 2⁵ = 32 subsets");
  });

  it("hides the counts and the number of subsets with the words", () => {
    const t = text(render(results({}, { a: 4 }), ["venn"]));
    expect(t).not.toMatch(/subsets|n\(A/);
  });

  it("draws three sets and counts their union", () => {
    const rec = render(results({ sets: "three", op: "intersection" }), ["venn", "labels"]);
    expect(rec.texts()).toContain("C");
    expect(text(rec)).toContain("n(A ∪ B ∪ C) = 5 + 3 + 6 − 1 − 3 − 2 + 1 = 9");
    expect(text(rec)).toContain("shaded A ∩ B ∩ C = {6}");
  });

  it("shades a complement as the box less the circle", () => {
    const rec = render(results({ op: "complementA" }), ["venn"]);
    expect(rec.of("fill").some((c) => c.args[0] === "evenodd")).toBe(true);
  });

  it("puts each element inside its own region on a phone", () => {
    const layout = computeSetsFnLayout(325);
    for (const sets of ["two", "three"] as const) {
      const rec = render(results({ sets }, { a: 6, b: 6, common: 2 }), ["venn", "labels"], 325);
      expectOnCanvas(rec, 325, layout.height);
    }
  });
});

describe("the relation view", () => {
  it("fills one cell per pair and names the properties", () => {
    const rec = render(results({ relation: "le" }, { addR: 0, addS: 0, addT: 0 }), ["relation", "labels"]);
    // 15 pairs in the grid, plus the two squares of the key.
    expect(rec.of("fillRect")).toHaveLength(17);
    expect(text(rec)).toContain("reflexive ✓ · symmetric ✗ · transitive ✓");
    expect(text(rec)).toContain("15 pairs · not an equivalence relation");
  });

  it("lists the classes of an equivalence relation", () => {
    expect(text(render(results({ relation: "parity" }), ["relation", "labels"]))).toContain("equivalence: classes {1, 3, 5}, {2, 4}");
    expect(text(render(results({ relation: "chain" }, { addR: 1, addS: 1, addT: 1 }), ["relation", "labels"]))).toContain("classes {1, 2, 3}, {4, 5}");
  });

  it("colours the pairs a closure adds", () => {
    const rec = render(results({ relation: "chain" }, { addR: 0, addS: 0, addT: 1 }), ["relation"]);
    const fills = rec.calls.filter((c) => c.method === "fillRect");
    expect(fills).toHaveLength(4 + 2);
    expect(text(rec)).not.toContain("transitive");
  });

  it("keeps the grid and the arrow diagram apart on a phone", () => {
    const layout = computeSetsFnLayout(325);
    const rec = render(results({ relation: "chain" }, { addR: 1, addS: 1, addT: 1 }), ["relation", "labels"], 325);
    expectOnCanvas(rec, 325, layout.height);
    const arcs = rec.of("arc").map((c) => c.args as number[]);
    for (const [x, , r] of arcs) {
      expect(x! - r!).toBeGreaterThanOrEqual(0);
      expect(x! + r!).toBeLessThanOrEqual(325);
    }
  });
});

describe("the arrow view", () => {
  const arrows = (f: [number, number, number, number], nCod = 5, extra = 0) => results({}, { f1: f[0], f2: f[1], f3: f[2], f4: f[3], nCod, extra });

  it("says why a relation is not a function", () => {
    expect(text(render(arrows([2, 3, 3, 0]), ["arrows", "labels"]))).toContain("not a function: 4 has no image");
    expect(text(render(arrows([2, 3, 3, 4], 5, 5), ["arrows", "labels"]))).toContain("not a function: 1 has two images");
  });

  it("names a function's type and counts the functions", () => {
    const t = text(render(arrows([1, 2, 3, 3], 3), ["arrows", "labels"]));
    expect(t).toContain("a function: not one-one, onto");
    expect(t).toContain("domain {1, 2, 3, 4} · range {1, 2, 3}");
    expect(t).toContain("3⁴ = 81 functions A → B · 0 one-one · 36 onto");
    expect(text(render(arrows([4, 1, 3, 2], 4), ["arrows", "labels"]))).toContain("one-one and onto — a bijection");
  });

  it("hides the counts with the words", () => {
    expect(text(render(arrows([1, 2, 3, 3], 3), ["arrows"]))).not.toContain("81");
  });

  it("turns the arrows round and says whether f⁻¹ exists", () => {
    expect(text(render(arrows([4, 1, 3, 2], 4), ["arrows", "reverse", "labels"]))).toContain("one arrow back from each element of B: f⁻¹ exists");
    expect(text(render(arrows([2, 3, 4, 4], 4), ["arrows", "reverse", "labels"]))).toContain("no f⁻¹: nothing in A goes to 1");
    expect(text(render(arrows([1, 2, 3, 3], 3), ["arrows", "reverse", "labels"]))).toContain("no f⁻¹: 3 would go back to 3 and 4");
  });

  it("stays on a phone's canvas", () => {
    const layout = computeSetsFnLayout(325);
    const rec = render(arrows([1, 2, 3, 3], 5, 5), ["arrows", "reverse", "labels"], 325);
    expectOnCanvas(rec, 325, layout.height);
  });
});

describe("the graph view", () => {
  const graph = (curve: SetsFnParams["curve"], domain: SetsFnParams["domain"], codomain: SetsFnParams["codomain"], k = 1) => results({ curve, domain, codomain }, { k });

  it("counts the crossings of y = k and names the function's type", () => {
    const t = text(render(graph("square", "all", "all", 1), ["graph", "labels"]));
    expect(t).toContain("f(x) = x² : ℝ → ℝ");
    expect(t).toContain("y = 1.0 meets the graph twice");
    expect(t).toContain("not one-one, not onto");
    expect(t).toContain("range R = [0.00, ∞) · codomain C = ℝ");
    expect(text(render(graph("sine", "all", "unit", 0.5), ["graph", "labels"]))).toContain("meets the graph infinitely often");
    expect(text(render(graph("square", "all", "unit"), ["graph", "labels"]))).toContain("not a function: the range is not inside the codomain");
  });

  it("marks each crossing", () => {
    const dots = (r: ReturnType<typeof results>) => render(r, ["graph"]).of("arc").filter((c) => c.args[2] === 5).length;
    expect(dots(graph("square", "all", "all", 1))).toBe(2);
    expect(dots(graph("square", "nonneg", "all", 1))).toBe(1);
    expect(dots(graph("cube", "all", "all", 2))).toBe(1);
    // sin x = 0.5 on ℝ at π/6 + 2nπ and 5π/6 + 2nπ: −3.67, 0.52 and 2.62 lie in a phone's window, −4 to 4.
    expect(render(graph("sine", "all", "unit", 0.5), ["graph"], 325).of("arc").filter((c) => c.args[2] === 5)).toHaveLength(3);
  });

  it("reflects a bijection in y = x and names its inverse", () => {
    expect(text(render(graph("exp", "all", "positive"), ["graph", "mirror", "labels"]))).toContain("a bijection: the mirror image is f⁻¹(x) = ln x");
    expect(text(render(graph("square", "all", "nonneg"), ["graph", "mirror", "labels"]))).toContain("not one-one: the mirror image is not a function");
    expect(text(render(graph("exp", "all", "all"), ["graph", "mirror", "labels"]))).toContain("not onto: f⁻¹ would miss part of the codomain");
  });

  it("stays on a phone's canvas", () => {
    const layout = computeSetsFnLayout(325);
    for (const curve of ["square", "exp", "sine"] as const) expectOnCanvas(render(graph(curve, "all", "all", -2.5), ["graph", "labels"], 325), 325, layout.height);
  });
});

describe("the chain view", () => {
  it("follows x through f, then g", () => {
    const t = text(render(results({ fRule: "square", gRule: "plus1" }, { x: 2 }), ["chain", "labels"]));
    expect(t).toContain("(g∘f)(2) = g(4) = 5");
    expect(t).toContain("(f∘g)(2) = f(3) = 9: different");
    expect(t).toContain("g∘f ≠ f∘g · f is not one-one on A");
    expect(text(render(results({ fRule: "double", gRule: "negate" }, { x: -1 }), ["chain", "labels"]))).toContain("g∘f = f∘g at every x in A");
  });

  it("writes g(f(A)) only with the words", () => {
    const shown = render(results({ fRule: "plus1", gRule: "double" }, { x: 2 }), ["chain", "labels"]).texts();
    const hidden = render(results({ fRule: "plus1", gRule: "double" }, { x: 2 }), ["chain"]).texts();
    // g(f(A)) = {−2, 0, 2, 4, 6}: 6 appears only in the last column.
    expect(shown).toContain("6");
    expect(hidden).not.toContain("6");
    expect(hidden).toContain("3");
  });

  it("stays on a phone's canvas", () => {
    const layout = computeSetsFnLayout(325);
    expectOnCanvas(render(results({ fRule: "square", gRule: "square" }, { x: -2 }), ["chain", "labels"], 325), 325, layout.height);
  });
});
