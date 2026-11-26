import { polySchoolModel, type PolySchoolState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import {
  POLYSCHOOL_TILE_X,
  computePolySchoolLayout,
  factorForm,
  polySchoolDifferencePieces,
  polySchoolFormat,
  polySchoolMinusPieces,
  polySchoolPairPieces,
  polySchoolPlusPieces,
  polySchoolRenderer,
  polySchoolSum,
  polySchoolTilePieces,
  polySchoolValueSum,
} from "./polyschool/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = polySchoolModel.initialize(polySchoolModel.defaultParams);
const results = (state: Partial<PolySchoolState> = {}) => polySchoolModel.derive({ ...base, ...state }, polySchoolModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  polySchoolRenderer.draw(rec.ctx, computePolySchoolLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
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
  const layout = computePolySchoolLayout(width);
  polySchoolRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  expect(placed.length).toBeGreaterThan(0);
  for (const { t, left, y } of placed) {
    expect(left, `"${t}" starts off the left edge`).toBeGreaterThanOrEqual(0);
    expect(left + t.length * 6, `"${t}" runs off the right edge`).toBeLessThanOrEqual(width);
    expect(y, `"${t}"`).toBeGreaterThanOrEqual(0);
    expect(y, `"${t}"`).toBeLessThanOrEqual(layout.height);
    expect(t.length, t).toBeLessThanOrEqual(55);
  }
  // Every filled shape too.
  for (const call of rec.of("fillRect")) {
    const [x, y, w, h] = call.args as number[];
    expect(x!).toBeGreaterThanOrEqual(0);
    expect(y!).toBeGreaterThanOrEqual(0);
    expect(x! + w!).toBeLessThanOrEqual(width + 1e-9);
    expect(y! + h!).toBeLessThanOrEqual(layout.height + 1e-9);
  }
}

const VIEWS = ["plus-square", "minus-square", "difference", "pair", "multiply", "factorise", "polynomial", "division"];

describe("formatting", () => {
  it("writes numbers and sums with true minus signs", () => {
    expect(polySchoolFormat(-6)).toBe("−6");
    expect(polySchoolFormat(-0)).toBe("0");
    expect(polySchoolSum([64, -96, 44, -6])).toBe("64 − 96 + 44 − 6");
    expect(polySchoolSum([-8, 12, -10, 6])).toBe("−8 + 12 − 10 + 6");
    expect(polySchoolSum([])).toBe("0");
    expect(polySchoolValueSum([1, -6, 11, -6], 4)).toBe("64 − 96 + 44 − 6");
    expect(polySchoolValueSum([1, -6, 11, -6], 0)).toBe("−6");
  });

  it("writes factor forms", () => {
    expect(factorForm(2, 3)).toBe("(x + 3)(x + 2)");
    expect(factorForm(3, 3)).toBe("(x + 3)²");
    expect(factorForm(0, 5)).toBe("x(x + 5)");
    expect(factorForm(3, -3)).toBe("(x + 3)(x − 3)");
    expect(factorForm(0, 0)).toBe("x²");
  });
});

describe("the identity pictures", () => {
  const layout = computePolySchoolLayout(325);

  it("cuts (a + b)² into a², ab, ab, b² whose areas add up", () => {
    const pieces = polySchoolPlusPieces(layout, 5, 3);
    expect(pieces.map((p) => p.area)).toEqual([25, 15, 15, 9]);
    const u = pieces[0]!.w / 5;
    for (const p of pieces) expect((p.w * p.h) / (u * u)).toBeCloseTo(p.area, 9);
    // They tile an 8 by 8 square exactly.
    const right = Math.max(...pieces.map((p) => p.x + p.w));
    const bottom = Math.max(...pieces.map((p) => p.y + p.h));
    expect(right - pieces[0]!.x).toBeCloseTo(8 * u, 9);
    expect(bottom - pieces[0]!.y).toBeCloseTo(8 * u, 9);
  });

  it("names the pieces, and adds up the areas only with the words", () => {
    const hidden = render(results({ a: 7, b: 2 }), ["plus-square"], 325).texts();
    expect(hidden).toEqual(expect.arrayContaining(["a²", "ab", "b²", "(7 + 2)² = a² + 2ab + b² = ?"]));
    expect(hidden.join(" ")).not.toContain("81");
    expect(text(render(results({ a: 7, b: 2 }), ["plus-square", "labels"]))).toContain("(7 + 2)² = 49 + 2 × 14 + 4 = 81");
  });

  it("shows (a − b)² as a² less two strips plus the corner", () => {
    const pieces = polySchoolMinusPieces(layout, 7, 2);
    expect(pieces.map((p) => [p.name, p.area])).toEqual([["a²", 49], ["(a − b)²", 25], ["ab", 14], ["ab", 14], ["b²", 4]]);
    // 49 − 14 − 14 + 4 = 25.
    expect(49 - 2 * 14 + 4).toBe(25);
    expect(text(render(results({ a: 7, b: 2 }), ["minus-square", "labels"]))).toContain("(7 − 2)² = 49 − 2 × 14 + 4 = 25");
    expect(text(render(results({ a: 2, b: 7 }), ["minus-square"]))).toContain("Make a bigger than b");
  });

  it("rearranges a² − b² into an (a + b) by (a − b) rectangle of the same pieces", () => {
    const [top, side, hole, top2, side2] = polySchoolDifferencePieces(layout, 7, 3);
    expect(top!.area + side!.area).toBe(49 - 9);
    expect(hole!.area).toBe(9);
    // Same two pieces, same areas, now side by side with the same height a − b.
    expect([top2!.area, side2!.area]).toEqual([top!.area, side!.area]);
    expect(top2!.h).toBeCloseTo(side2!.h, 9);
    expect(side2!.x).toBeCloseTo(top2!.x + top2!.w, 9);
    const u = top!.w / 7;
    expect((top2!.w + side2!.w) / u).toBeCloseTo(10, 9);
    expect(top2!.h / u).toBeCloseTo(4, 9);
    expect(text(render(results({ a: 7, b: 3 }), ["difference", "labels"]))).toContain("49 − 9 = 10 × 4 = 40");
  });

  it("draws (x + a)(x + b) as x², ax, bx and ab", () => {
    const pieces = polySchoolPairPieces(layout, 4, 3, 7);
    expect(pieces.map((p) => [p.name, p.area])).toEqual([["x²", 16], ["ax", 12], ["bx", 28], ["ab", 21]]);
    expect(text(render(results({ x: 4, a: 3, b: 7 }), ["pair", "labels"]))).toContain("7 × 11 = 16 + 40 + 21 = 77");
  });
});

describe("the multiply view", () => {
  it("fills a cell for every pair of terms, and collects like terms with the words", () => {
    const rec = render(results({ mp: 2, mq: 3, mr: 3, ms: 5 }), ["multiply"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["(2x + 3)(3x + 5)", "2x", "3", "3x", "5", "6x²", "10x", "9x", "15", "= 6x² + 10x + 9x + 15"]));
    expect(rec.of("fillRect")).toHaveLength(4);
    expect(text(rec)).not.toContain("19x");
    const shown = text(render(results({ mp: 2, mq: 3, mr: 3, ms: 5 }), ["multiply", "labels"]));
    expect(shown).toContain("= 6x² + 19x + 15");
    expect(shown).toContain("check at x = 2: 7 × 11 = 77");
  });

  it("uses two cells for a monomial times a binomial, and marks negative cells", () => {
    expect(render(results({ mp: 3, mq: 0, mr: 2, ms: 5 }), ["multiply"]).of("fillRect")).toHaveLength(2);
    const rec = render(results({ mp: 1, mq: -4, mr: 1, ms: 4 }), ["multiply", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["4x", "−4x", "−16", "= x² − 16"]));
  });
});

describe("the factorise view", () => {
  it("lays out one x² tile, m and n x tiles and m × n unit tiles", () => {
    const layout = computePolySchoolLayout(325);
    const pieces = polySchoolTilePieces(layout, 2, 3);
    expect(pieces.filter((p) => p.name === "x²")).toHaveLength(1);
    expect(pieces.filter((p) => p.name === "x")).toHaveLength(5);
    expect(pieces.filter((p) => p.name === "1")).toHaveLength(6);
    const u = pieces[0]!.w / POLYSCHOOL_TILE_X;
    // The unit tiles fill the corner exactly.
    const units = pieces.filter((p) => p.name === "1");
    expect(Math.min(...units.map((p) => p.x))).toBeCloseTo(pieces[0]!.x + POLYSCHOOL_TILE_X * u, 9);
    expect(Math.max(...units.map((p) => p.y + p.h))).toBeCloseTo(pieces[0]!.y + (POLYSCHOOL_TILE_X + 3) * u, 9);
    // (x + 3)(x − 2): negative x tiles below and negative units.
    const mixed = polySchoolTilePieces(layout, 3, -2);
    expect(mixed.filter((p) => p.name === "x" && p.area < 0)).toHaveLength(2);
    expect(mixed.filter((p) => p.name === "1" && p.area < 0)).toHaveLength(6);
  });

  it("says when the tiles close, and gives the factors only with the words", () => {
    expect(text(render(results({ fb: 5, fc: 6, fm: 1 }), ["factorise", "labels"]))).toContain("the corner needs 6, not 4: try another split");
    const closed = render(results({ fb: 5, fc: 6, fm: 2 }), ["factorise"]);
    expect(text(closed)).toContain("the tiles close into a rectangle");
    expect(text(closed)).toContain("Factorise x² + 5x + 6 with tiles");
    expect(text(render(results({ fb: 5, fc: 6, fm: 2 }), ["factorise", "labels"]))).toContain("x² + 5x + 6 = (x + 3)(x + 2)");
    expect(text(render(results({ fb: 0, fc: -9, fm: 3 }), ["factorise", "labels"]))).toContain("x² − 9 = (x + 3)(x − 3)");
    // Dashed strokes for negative tiles: 3 negative x tiles and 9 negative units.
    const neg = render(results({ fb: 0, fc: -9, fm: 3 }), ["factorise"]);
    expect(neg.of("setLineDash").filter((c) => (c.args[0] as number[]).length > 0)).toHaveLength(12);
  });
});

describe("the polynomial and division views", () => {
  const cubic = { c3: 1, c2: -6, c1: 11, c0: -6 };

  it("writes p(x) and its degree, marks the zeroes, and keeps p(a) back without the words", () => {
    const rec = render(results({ ...cubic, pa: 4 }), ["polynomial"], 325);
    expect(rec.texts()).toEqual(expect.arrayContaining(["p(x) = x³ − 6x² + 11x − 6", "degree 3: a cubic", "p(4)", "p(4) = 64 − 96 + 44 − 6 = ?"]));
    // Three zeroes and the point.
    expect(rec.of("arc")).toHaveLength(4);
    expect(text(render(results({ ...cubic, pa: 4 }), ["polynomial", "labels"]))).toContain("p(4) = 64 − 96 + 44 − 6 = 6");
    expect(text(render(results({ ...cubic, pa: 2 }), ["polynomial", "labels"]))).toContain("p(2) = 0: 2 is a zero, on the x-axis");
    expect(text(render(results({ c3: 2, c2: 1, c1: -2, c0: -1, pa: 0 }), ["polynomial"]))).toContain("degree 3: a cubic");
    // Zeroes at 1, −1 and −½.
    expect(render(results({ c3: 2, c2: 1, c1: -2, c0: -1, pa: 0 }), ["polynomial"]).of("arc")).toHaveLength(4);
    expect(text(render(results({ c3: 0, c2: 0, c1: 0, c0: 0 }), ["polynomial", "labels"]))).toContain("every number is a zero of the zero polynomial");
  });

  it("does the synthetic division, and gives the remainder with the words", () => {
    const hidden = render(results({ ...cubic, pa: 4 }), ["division"]).texts();
    expect(hidden).toEqual(expect.arrayContaining(["Divide p(x) by (x − 4)", "a = 4", "1", "−6", "11", "4", "−8", "12", "−2", "3", "?", "q(x) = x² − 2x + 3"]));
    expect(hidden).not.toContain("6");
    const shown = text(render(results({ ...cubic, pa: 4 }), ["division", "labels"]));
    expect(shown).toContain("p(x) = (x − 4)(x² − 2x + 3) + 6");
    expect(shown).toContain("remainder = p(4) = 6: not a factor");
    expect(text(render(results({ c3: 1, c2: 3, c1: 5, c0: 6, pa: -2 }), ["division", "labels"]))).toContain("remainder 0, so (x + 2) is a factor");
  });
});

describe("fits a 325 px phone", () => {
  const states: Partial<PolySchoolState>[] = [
    {},
    { a: 9, b: 9, x: 9 },
    { a: 9, b: 1, x: 1 },
    { a: 1, b: 9, x: 9 },
    { mp: 4, mq: -6, mr: 4, ms: -6 },
    { mp: 0, mq: 0, mr: 3, ms: 2 },
    { fb: -10, fc: -24, fm: 10 },
    { fb: 10, fc: 24, fm: -10 },
    { fb: -1, fc: -12, fm: -4 },
    { c3: -2, c2: -9, c1: -12, c0: -12, pa: -5 },
    { c3: 2, c2: 9, c1: 12, c0: 12, pa: 5 },
    { c3: -2, c2: -9, c1: -12, c0: -12, pa: 5 },
    { c3: 0, c2: 0, c1: 0, c0: 0, pa: 0 },
  ];
  it.each(VIEWS)("the %s view stays on the canvas", (view) => {
    for (const s of states) {
      insideCanvas(results(s), [view, "labels"], 325);
      insideCanvas(results(s), [view], 325);
    }
  });

  it("keeps the area pictures inside the stage", () => {
    const layout = computePolySchoolLayout(325);
    const all = [
      ...polySchoolPlusPieces(layout, 9, 9),
      ...polySchoolMinusPieces(layout, 9, 1),
      ...polySchoolDifferencePieces(layout, 9, 8),
      ...polySchoolDifferencePieces(layout, 9, 1),
      ...polySchoolPairPieces(layout, 9, 9, 9),
      ...polySchoolTilePieces(layout, 10, 20),
      ...polySchoolTilePieces(layout, -10, -20),
    ];
    for (const p of all) {
      expect(p.x).toBeGreaterThanOrEqual(layout.stage.x - 1e-9);
      expect(p.y).toBeGreaterThanOrEqual(layout.stage.y - 1e-9);
      expect(p.x + p.w).toBeLessThanOrEqual(layout.stage.x + layout.stage.width + 1e-9);
      expect(p.y + p.h).toBeLessThanOrEqual(layout.stage.y + layout.stage.height + 1e-9);
    }
  });
});
