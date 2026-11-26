import { COUNTING_RULE_ORDER, COUNTING_WORD_ORDER, countingModel, type CountingParams, type CountingState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeCountingLayout, countingBinomial, countingFormat, countingMonomial, countingRenderer } from "./counting/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = countingModel.initialize(countingModel.defaultParams);
const results = (params: Partial<CountingParams> = {}, state: Partial<CountingState> = {}) =>
  countingModel.derive({ ...base, ...state }, { ...countingModel.defaultParams, ...params });

/** Renders, and notes where each text lands, using the alignment in force when it was drawn. */
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const placed: { text: string; left: number; right: number; y: number }[] = [];
  const ctx = new Proxy(rec.ctx as unknown as Record<string, unknown>, {
    get(target, key: string) {
      if (key === "fillText") {
        return (text: string, x: number, y: number) => {
          const w = String(text).length * 6;
          const align = target.textAlign;
          const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
          placed.push({ text: String(text), left, right: left + w, y });
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
  const layout = computeCountingLayout(width);
  countingRenderer.draw(ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, placed, layout, all: () => rec.texts().join(" | ") };
};

describe("formatting", () => {
  it("groups digits the Indian way and writes terms as a textbook would", () => {
    expect(["7", "60", "34650", "3628800", "10000000000"].map((v) => countingFormat(Number(v)))).toEqual(["7", "60", "34,650", "36,28,800", "10,00,00,00,000"]);
    expect(countingFormat(-1080)).toBe("−1,080");
    expect(countingBinomial(5, 2, 3, false)).toBe("(2x + 3)⁵");
    expect(countingBinomial(6, 1, -2, true)).toBe("(x − 2/x)⁶");
    expect(countingBinomial(10, -1, 1, false)).toBe("(−x + 1)¹⁰");
    expect([countingMonomial(1080, 2), countingMonomial(160, 0), countingMonomial(-1, 1), countingMonomial(5, -4), countingMonomial(0, 3)]).toEqual(["1,080x²","160", "−x", "5x⁻⁴", "0"]);
  });
});

describe("the tree", () => {
  it("draws a leaf for every outfit and multiplies with the words on", () => {
    const view = render(results({}, { shirts: 3, trousers: 2, shoes: 3 }), ["tree", "labels"]);
    // Root, 3 shirts, 6 trousers, 18 shoes.
    expect(view.of("arc")).toHaveLength(1 + 3 + 6 + 18);
    expect(view.texts()).toEqual(expect.arrayContaining(["3 shirts", "2 pairs of trousers for each", "3 pairs of shoes for each", "3 × 2 × 3 = 18 outfits"]));
    expect(render(results({}, { shirts: 3, trousers: 2, shoes: 3 }), ["tree"]).all()).not.toContain("outfits");
  });
});

describe("arranging and choosing", () => {
  it("writes the choices under the slots, and the count only with the words", () => {
    const view = render(results({}, { n: 5, r: 3 }), ["slots", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["Fill 3 slots from 5 letters", "choices: 5 × 4 × 3", "⁵P₃ = 5! ÷ 2! = 60 arrangements"]));
    expect(render(results({}, { n: 5, r: 3 }), ["slots"]).all()).not.toContain("60");
    expect(render(results({ repeat: "yes" }, { n: 5, r: 3 }), ["slots", "labels"]).texts()).toEqual(
      expect.arrayContaining(["Fill 3 slots from 5 letters, repeats allowed", "choices: 5 × 5 × 5", "5³ = 125 arrangements"]),
    );
  });

  it("shows one team and its orders, dividing them out with the words on", () => {
    const view = render(results({}, { n: 5, r: 2 }), ["slots", "teams", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["Choose 2 of 5: a team, not an order", "One team {A, B}: 2! = 2 orders", "AB  BA", "⁵C₂ = 20 ÷ 2! = 10 teams"]));
    const hidden = render(results({}, { n: 5, r: 2 }), ["slots", "teams"]).all();
    expect(hidden).not.toContain("10 teams");
    expect(render(results({}, { n: 10, r: 10 }), ["slots", "teams", "labels"]).texts()).toEqual(expect.arrayContaining(["One team {A, B, …, J}: 10! = 36,28,800 orders", "¹⁰C₁₀ = 36,28,800 ÷ 10! = 1 team"]));
  });
});

describe("restrictions", () => {
  it("gives each rule its picture and its count", () => {
    const words = (rule: CountingParams["rule"]) => render(results({ rule }, { people: 5 }), ["seats", "labels"]).all();
    expect(words("line")).toContain("5! = 120 ways");
    expect(words("together")).toContain("2 × 4! = 48 ways");
    expect(words("together")).toContain("glued: 1 block, 2 orders (AB or BA)");
    expect(words("apart")).toContain("5! − 2 × 4! = 72 ways");
    expect(words("apart")).toContain("3! orders of the others, 4 gaps for A and B");
    expect(words("circle")).toContain("(5 − 1)! = 24 ways");
    expect(words("necklace")).toContain("(5 − 1)! ÷ 2 = 12 ways");
    expect(render(results({ rule: "circle" }, { people: 5 }), ["seats"]).all()).not.toContain("24");
  });

  it("colours a word by letter and divides out the repeats", () => {
    const view = render(results({ rule: "word", word: "mississippi" }), ["seats", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["Arrange the letters of MISSISSIPPI", "M × 1 · I × 4 · S × 4 · P × 2", "11! ÷ (4! 4! 2!) = 34,650 ways"]));
    expect(view.of("fillRect")).toHaveLength(11);
    expect(render(results({ rule: "word", word: "mississippi" }), ["seats"]).all()).not.toContain("34,650");
  });
});

describe("distributions", () => {
  it("lays the sweets and bars out, and counts the ways with the words", () => {
    const view = render(results({ empty: "allowed" }, { objects: 5, groups: 3 }), ["stars", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["5 sweets, 3 children", "5 sweets + 2 bars = 7 places", "C(7, 2) = 21 ways"]));
    expect(view.of("arc")).toHaveLength(5);
    expect(view.texts().filter((t) => /^\d$/.test(t))).toEqual(["2", "2", "1"]);
    expect(render(results({ empty: "none" }, { objects: 5, groups: 3 }), ["stars", "labels"]).all()).toContain("C(4, 2) = 6 ways");
    expect(render(results({ empty: "allowed" }, { objects: 5, groups: 3 }), ["stars"]).all()).not.toContain("21");
  });
});

describe("Pascal's triangle", () => {
  it("adds the two above, and hides the last row without the words", () => {
    const view = render(results({}, { power: 6, term: 2 }), ["triangle", "labels"]);
    expect(view.all()).toContain("C(6, 2) = 5 + 10 = 15 · row sum 2⁶ = 64");
    expect(view.texts().filter((t) => t === "20")).toHaveLength(1);
    const hidden = render(results({}, { power: 6, term: 2 }), ["triangle"]).texts();
    expect(hidden).toContain("?");
    expect(hidden).not.toContain("15");
    expect(hidden).not.toContain("20");
    // The two parents and the entry are ringed.
    expect(view.of("stroke").length).toBeGreaterThanOrEqual(5);
  });
});

describe("the expansion", () => {
  it("writes the chosen term by the general term", () => {
    const view = render(results({}, { power: 5, term: 3, p: 2, q: 3 }), ["expansion", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["Expanding (2x + 3)⁵", "T₄ = C(5, 3) · (2x)² · 3³", "= 1,080x²", "6 terms · middle terms: T₃ and T₄", "at x = 1 they add to (2 + 3)⁵ = 3,125"]));
    expect(render(results({}, { power: 5, term: 3, p: 2, q: 3 }), ["expansion"]).all()).not.toContain("1,080");
  });

  it("finds the constant term of (x + 2/x)⁶", () => {
    const view = render(results({ form: "reciprocal" }, { power: 6, term: 3, p: 1, q: 2 }), ["expansion", "labels"]);
    expect(view.texts()).toEqual(expect.arrayContaining(["Expanding (x + 2/x)⁶", "T₄ = C(6, 3) · x³ · (2/x)³", "= 160", "7 terms · middle term: T₄"]));
  });
});

describe("on a phone", () => {
  const W = 325;
  const scenes: [string, Partial<CountingParams>, Partial<CountingState>, string[]][] = [
    ["tree", {}, { shirts: 4, trousers: 4, shoes: 4 }, ["tree", "labels"]],
    ["slots", {}, { n: 10, r: 10 }, ["slots", "labels"]],
    ["slots with repeats", { repeat: "yes" }, { n: 10, r: 10 }, ["slots", "labels"]],
    ["teams", {}, { n: 10, r: 10 }, ["slots", "teams", "labels"]],
    ["teams of four", {}, { n: 9, r: 4 }, ["slots", "teams", "labels"]],
    ...COUNTING_RULE_ORDER.map((rule) => [`seats ${rule}`, { rule, word: "mississippi" }, { people: 8 }, ["seats", "labels"]] as [string, Partial<CountingParams>, Partial<CountingState>, string[]]),
    ...COUNTING_WORD_ORDER.map((word) => [`word ${word}`, { rule: "word", word }, {}, ["seats", "labels"]] as [string, Partial<CountingParams>, Partial<CountingState>, string[]]),
    ["stars", { empty: "none" }, { objects: 12, groups: 6 }, ["stars", "labels"]],
    ["stars allowed", {}, { objects: 12, groups: 6 }, ["stars", "labels"]],
    ["triangle", {}, { power: 10, term: 5 }, ["triangle", "labels"]],
    ["expansion", { form: "reciprocal" }, { power: 10, term: 5, p: -3, q: -3 }, ["expansion", "labels"]],
  ];

  it.each(scenes)("keeps %s on a 325 px canvas", (_name, params, state, layers) => {
    const view = render(results(params, state), layers, W);
    for (const t of view.placed) {
      expect(t.left, `"${t.text}" starts off the left`).toBeGreaterThanOrEqual(0);
      expect(t.right, `"${t.text}" runs off the right`).toBeLessThanOrEqual(W);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeLessThanOrEqual(view.layout.height);
      expect(t.text.length, `"${t.text}" is too long a caption`).toBeLessThanOrEqual(55);
    }
    for (const call of view.of("arc")) {
      const [x, y, r] = call.args as number[];
      expect(x! - r!).toBeGreaterThanOrEqual(0);
      expect(x! + r!).toBeLessThanOrEqual(W);
      expect(y! + r!).toBeLessThanOrEqual(view.layout.height);
    }
    for (const call of [...view.of("strokeRect"), ...view.of("fillRect")]) {
      const [x, , w] = call.args as number[];
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x! + w!).toBeLessThanOrEqual(W);
    }
  });

  it("does not let the numbers of the last triangle row overlap", () => {
    const view = render(results({}, { power: 10, term: 5 }), ["triangle", "labels"], W);
    const row = view.placed.filter((t) => Math.abs(t.y - Math.max(...view.placed.filter((p) => /^\d+$/.test(p.text)).map((p) => p.y))) < 0.5 && /^\d+$/.test(t.text));
    expect(row).toHaveLength(11);
    for (let i = 1; i < row.length; i++) expect(row[i]!.left).toBeGreaterThanOrEqual(row[i - 1]!.right);
  });
});
