import { LP_PROBLEM_ORDER, linprogModel, lpIntersect, lpIntervalOf, lpSolveOne, type LinprogParams, type LinprogState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeLinprogLayout, intervalText, linprogRenderer, solvedText } from "./linprog/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = linprogModel.initialize(linprogModel.defaultParams);
const results = (params: Partial<LinprogParams> = {}, state: Partial<LinprogState> = {}) =>
  linprogModel.derive({ ...base, ...state }, { ...linprogModel.defaultParams, ...params });

/** Records every text with the alignment it was drawn with, so its extent can be checked. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: { text: string; x: number; y: number; align: string }[] = [];
  const ctx = new Proxy(rec.ctx, {
    get(target, key: string) {
      if (key === "fillText")
        return (text: string, x: number, y: number) => {
          placed.push({ text, x, y, align: String((target as unknown as { textAlign?: string }).textAlign ?? "left") });
          return target.fillText(text, x, y);
        };
      return (target as unknown as Record<string, unknown>)[key];
    },
    set(target, key: string, value) {
      (target as unknown as Record<string, unknown>)[key] = value;
      return true;
    },
  });
  const layout = computeLinprogLayout(width);
  linprogRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, placed, layout, texts: () => rec.texts(), joined: () => rec.texts().join(" | ") };
};

/** Every text's extent, at about 6.5 px a character, lies on the canvas. */
function expectOnCanvas(placed: { text: string; x: number; y: number; align: string }[], width: number, height: number) {
  for (const { text, x, y, align } of placed) {
    const w = text.length * 6.5;
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    expect(left, `"${text}" left edge`).toBeGreaterThanOrEqual(0);
    expect(left + w, `"${text}" right edge`).toBeLessThanOrEqual(width);
    expect(y, `"${text}" y`).toBeGreaterThanOrEqual(0);
    expect(y, `"${text}" y`).toBeLessThanOrEqual(height);
    expect(text.length, `"${text}" is a short caption`).toBeLessThanOrEqual(55);
  }
  // Texts on the same row do not run into each other.
  const extent = ({ text, x, align }: { text: string; x: number; align: string }) => {
    const w = text.length * 6.5;
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    return [left, left + w] as const;
  };
  for (let i = 0; i < placed.length; i++)
    for (let j = i + 1; j < placed.length; j++) {
      const p = placed[i]!;
      const q = placed[j]!;
      if (Math.abs(p.y - q.y) > 8 || p.text.length < 4 || q.text.length < 4) continue;
      const [a0, a1] = extent(p);
      const [b0, b1] = extent(q);
      expect(a1 <= b0 || b1 <= a0, `"${p.text}" overlaps "${q.text}"`).toBe(true);
    }
}

describe("text helpers", () => {
  it("write solved forms and answer sets", () => {
    expect(solvedText(lpSolveOne(3, -4, "lt", 8), "lt")).toBe("x < 4");
    expect(solvedText(lpSolveOne(-3, 0, "gt", 9), "gt")).toBe("x < −3");
    expect(solvedText(lpSolveOne(2, 0, "ge", 3), "ge")).toBe("x ≥ 3/2");
    expect(solvedText(lpSolveOne(0, 1, "lt", 0), "lt")).toBe("no x");
    const both = lpIntersect(lpIntervalOf(lpSolveOne(5, -3, "ge", -8)), lpIntervalOf(lpSolveOne(5, -3, "lt", 7)));
    expect(intervalText(both)).toBe("−1 ≤ x < 2");
    expect(intervalText(lpIntervalOf(lpSolveOne(1, 0, "gt", 5)))).toBe("x > 5");
    expect(intervalText(lpIntersect(lpIntervalOf(lpSolveOne(1, 0, "le", 2)), lpIntervalOf(lpSolveOne(1, 0, "ge", 2))))).toBe("x = 2");
  });
});

describe("the number line", () => {
  it("writes the inequality, and its solution only with the words", () => {
    const r = results({ rel1: "lt" }, { a: 3, b: -4, c: 8, t: 2 });
    const shown = render(r, ["numberline", "labels"]).joined();
    expect(shown).toContain("3x − 4 < 8");
    expect(shown).toContain("x < 4");
    expect(shown).toContain("at x = 2: 3x − 4 = 2, and 2 < 8 is true");
    const hidden = render(r, ["numberline"]).joined();
    expect(hidden).toContain("3x − 4 < 8");
    expect(hidden).not.toContain("x < 4");
  });

  it("says when dividing by a negative number turns the sign", () => {
    expect(render(results({ rel1: "gt" }, { a: -3, b: 0, c: 9 }), ["numberline", "labels"]).joined()).toContain("÷ (−3) flips: x < −3");
  });

  it("draws an open dot for < and a closed one for ≤", () => {
    const open = render(results({ rel1: "lt" }, { a: 1, b: 0, c: 4 }), ["numberline"]).rec;
    const closed = render(results({ rel1: "le" }, { a: 1, b: 0, c: 4 }), ["numberline"]).rec;
    // An open dot is a filled background disc with a stroked ring; a closed one is just filled.
    expect(open.of("arc").length).toBe(2);
    expect(closed.of("arc").length).toBe(1);
  });

  it("combines two inequalities and counts the whole numbers only with the words", () => {
    const r = results({ rel1: "ge", rel2: "lt" }, { a: 5, b: -3, c: -8, a2: 5, b2: -3, c2: 7, t: 0 });
    const shown = render(r, ["numberline", "second", "labels"]);
    expect(shown.joined()).toContain("both at once");
    expect(shown.joined()).toContain("both: −1 ≤ x < 2 · 3 whole numbers");
    expect(shown.joined()).toContain("x = 0 satisfies both");
    const hidden = render(r, ["numberline", "second"]);
    expect(hidden.joined()).not.toMatch(/whole number|≤ x </);
    // Three whole-number dots, only with the words.
    expect(shown.rec.of("arc").length - hidden.rec.of("arc").length).toBe(3);
  });
});

describe("the half-plane", () => {
  it("draws a dashed boundary for > and a solid one for ≥", () => {
    const dashed = render(results({ rel: "gt" }, { p: 3, q: 2, r: 6 }), ["plane", "shade"]).rec;
    const solid = render(results({ rel: "ge" }, { p: 3, q: 2, r: 6 }), ["plane", "shade"]).rec;
    expect(dashed.of("setLineDash").some((c) => (c.args[0] as number[]).length > 0)).toBe(true);
    expect(solid.of("setLineDash").some((c) => (c.args[0] as number[]).length > 0)).toBe(false);
  });

  it("shades only with the shade layer, and tests the point and the origin with the words", () => {
    const r = results({ rel: "gt" }, { p: 3, q: 2, r: 6, u: 2, v: 1 });
    const shown = render(r, ["plane", "shade", "labels"]);
    expect(shown.texts()).toContain("3x + 2y > 6");
    expect(shown.joined()).toContain("(2, 1): 3x + 2y = 8, a solution");
    expect(shown.joined()).toContain("(0, 0) gives 0 > 6: false, shade the other side");
    const unshaded = render(r, ["plane"]).rec;
    expect(shown.rec.of("fill").length).toBeGreaterThan(unshaded.of("fill").length);
    expect(render(r, ["plane", "shade"]).joined()).not.toContain("a solution");
  });
});

describe("the feasible region", () => {
  it("letters the corners and gives the best only with the words", () => {
    const r = results({ problem: "furniture" }, { corner: 3 });
    const shown = render(r, ["region", "corners", "labels"]);
    expect(shown.texts()).toEqual(expect.arrayContaining(["O", "A", "B", "C", "Furniture dealer · max Z = 250x + 75y", "5x + y ≤ 100 · x + y ≤ 60"]));
    expect(shown.joined()).toContain("B (10, 50): Z = 6250");
    expect(shown.joined()).toContain("maximum Z = 6250 at B (10, 50)");
    const hidden = render(r, ["region", "corners"]).joined();
    expect(hidden).not.toMatch(/6250|: Z = /);
  });

  it("names a tie, a missing minimum and an empty region", () => {
    expect(render(results({ problem: "tie" }), ["region", "corners", "labels"]).joined()).toContain("maximum Z = 180 all along CD");
    expect(render(results({ problem: "nomin" }), ["region", "corners", "labels"]).joined()).toContain("no minimum: Z < −300 still meets the region");
    expect(render(results({ problem: "empty" }), ["region", "corners", "labels"]).joined()).toContain("no point satisfies every constraint");
    expect(render(results({ problem: "diet" }), ["region", "point", "labels"]).joined()).toContain("an unbounded region: it runs on for ever");
  });

  it("slides the iso-profit line and says when it touches the best corner", () => {
    expect(render(results({ problem: "simple" }, { s: 0.6 }), ["region", "corners", "iso", "labels"]).joined()).toContain("Z = 120: the line touches the region at its best");
    expect(render(results({ problem: "simple" }, { s: 0.3 }), ["region", "corners", "iso", "labels"]).joined()).toContain("Z = 60: the line crosses the region");
    expect(render(results({ problem: "simple" }, { s: 0.9 }), ["region", "iso"]).joined()).not.toContain("Z = 180");
  });

  it("tests a trial plan", () => {
    expect(render(results({ problem: "furniture" }, { rx: 10, ry: 40 }), ["region", "point", "labels"]).joined()).toContain("(10, 40): Z = 5500, inside the region");
    expect(render(results({ problem: "furniture" }, { rx: 30, ry: 40 }), ["region", "point", "labels"]).joined()).toContain("breaks 2 constraints");
  });
});

describe("on a phone", () => {
  it("keeps every text on a 325 px canvas", () => {
    const cases: [Partial<LinprogParams>, Partial<LinprogState>, string[]][] = [
      [{ rel1: "gt" }, { a: -3, b: -10, c: 9, t: -10 }, ["numberline", "labels"]],
      [{ rel1: "le" }, { a: -5, b: 10, c: -10, t: 10 }, ["numberline", "labels"]],
      [{ rel1: "le" }, { a: -5, b: 10, c: -3, t: 10 }, ["numberline", "labels"]],
      [{ rel1: "ge", rel2: "lt" }, { a: 5, b: -3, c: -8, a2: -5, b2: -10, c2: -7, t: -9.5 }, ["numberline", "second", "labels"]],
      [{ rel: "ge" }, { p: -5, q: -5, r: -12, u: -7.5, v: -7.5 }, ["plane", "shade", "labels"]],
      [{ rel: "lt" }, { p: 0, q: 0, r: -12 }, ["plane", "shade", "labels"]],
      ...LP_PROBLEM_ORDER.flatMap((problem): [Partial<LinprogParams>, Partial<LinprogState>, string[]][] => [
        [{ problem }, { corner: 4, rx: 110, ry: 110 }, ["region", "point", "labels"]],
        [{ problem }, { corner: 6 }, ["region", "corners", "labels"]],
        [{ problem }, { s: 0.995 }, ["region", "corners", "iso", "labels"]],
      ]),
    ];
    for (const [params, state, layers] of cases) {
      const { placed, layout } = render(results(params, state), layers, 325);
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      expectOnCanvas(placed, 325, layout.height);
    }
  });

  it("keeps the number line, the square and the plot inside the canvas", () => {
    const layout = computeLinprogLayout(325);
    expect(layout.numberLeft).toBeGreaterThanOrEqual(8);
    expect(layout.numberRight).toBeLessThanOrEqual(325 - 8);
    for (const box of [layout.square, layout.plot]) {
      expect(box.x).toBeGreaterThanOrEqual(30);
      expect(box.x + box.width).toBeLessThanOrEqual(325);
      expect(box.y + box.height).toBeLessThanOrEqual(layout.height - 40);
    }
    // The corners of the furniture region land inside the plot.
    const { rec } = render(results({ problem: "furniture" }), ["region", "corners"], 325);
    for (const call of rec.of("arc")) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(layout.plot.x - 1);
      expect(x).toBeLessThanOrEqual(layout.plot.x + layout.plot.width + 1);
      expect(y).toBeGreaterThanOrEqual(layout.plot.y - 1);
      expect(y).toBeLessThanOrEqual(layout.plot.y + layout.plot.height + 1);
    }
  });
});
