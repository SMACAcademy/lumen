import { bigNumbersModel, type BigNumbersParams, type BigNumbersState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { bigNumbersDaysText, bigNumbersDec, bigNumbersRenderer, bigNumbersWrap, computeBigNumbersLayout } from "./bignumbers/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const P = bigNumbersModel.defaultParams;
const S = bigNumbersModel.initialize(P);
const results = (params: Partial<BigNumbersParams> = {}, state: Partial<BigNumbersState> = {}) =>
  bigNumbersModel.derive({ ...S, ...state }, { ...P, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  bigNumbersRenderer.draw(rec.ctx, computeBigNumbersLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const periods = (crores: number, lakhs: number, thousands: number, ones: number) => ({ crores, lakhs, thousands, ones });

describe("text helpers", () => {
  it("wraps words, writes decimals and days", () => {
    expect(bigNumbersWrap("one crore twenty-three lakh forty-five thousand six hundred seventy-eight", 30)).toEqual([
      "one crore twenty-three lakh",
      "forty-five thousand six",
      "hundred seventy-eight",
    ]);
    expect(bigNumbersDec(7.5)).toBe("7.5");
    expect(bigNumbersDec(60 / 7)).toBe("8.57");
    expect(bigNumbersDec(10)).toBe("10");
    expect(bigNumbersDaysText(10, 1)).toBe("10");
    expect(bigNumbersDaysText(60, 7)).toBe("60/7 ≈ 8.57");
  });
});

describe("place value", () => {
  it("writes the same digits with Indian and international commas", () => {
    const rec = render(results(periods(4, 56, 78, 912)), ["place", "labels"]);
    const texts = rec.texts();
    expect(texts).toEqual(expect.arrayContaining(["4,56,78,912: an 8-digit number", "Indian: 4,56,78,912", "International: 45,678,912", "Crores", "Lakhs", "Millions", "TC", "HM"]));
    // Each chart shows the eight digits.
    for (const d of ["4", "5", "6", "7", "8", "9", "1", "2"]) expect(texts.filter((t) => t === d).length, d).toBeGreaterThanOrEqual(2);
    expect(texts.join(" ")).toContain("four crore fifty-six lakh");
    expect(texts.join(" ")).toContain("forty-five million six hundred");
    expect(texts).toEqual(expect.arrayContaining(["10 lakh = 1 million", "1 crore = 10 million"]));
  });

  it("hides the words without the labels", () => {
    expect(render(results(periods(4, 56, 78, 912)), ["place"]).texts().join(" ")).not.toContain("crore");
  });
});

describe("rounding and estimating", () => {
  it("shows which multiple is nearer, and rounds only with the labels", () => {
    const r = results({ ...periods(0, 4, 78, 632), place: 5 });
    const texts = render(r, ["round", "labels"]).texts();
    expect(texts).toEqual(
      expect.arrayContaining(["Round 4,78,632 to the nearest lakh", "4,00,000", "5,00,000", "halfway", "The ten thousands digit is 7, so round up", "Nearest lakh: 5,00,000", "Off by 21,368"]),
    );
    expect(render(r, ["round"]).texts().join(" ")).not.toContain("Nearest");
    expect(render(results({ ...periods(0, 0, 7, 849), place: 2 }), ["round", "labels"]).texts()).toEqual(
      expect.arrayContaining(["The tens digit is 4, so round down", "Nearest hundred: 7,800"]),
    );
  });

  it("estimates a sum and a product, and hides the estimates without the labels", () => {
    const sum = render(results({ p: 5290, q: 17_986, place: 3 }), ["estimate", "labels"]).texts();
    expect(sum).toEqual(expect.arrayContaining(["Estimate 5,290 + 17,986", "Round both to the nearest thousand", "≈ 5,000 + 18,000 = 23,000", "Exact: 23,276, off by 276"]));
    const product = render(results({ p: 63, q: 182 }), ["estimate", "labels"]).texts();
    expect(product).toEqual(expect.arrayContaining(["Estimate 63 × 182", "≈ 60 × 200 = 12,000", "Exact: 11,466"]));
    expect(render(results({ p: 5290, q: 17_986, place: 3 }), ["estimate"]).texts().join(" ")).not.toContain("23,000");
    expect(render(results({ p: 578, q: 161 }), ["estimate"]).texts().join(" ")).not.toMatch(/1,20,000|93,058/);
  });
});

describe("Roman numerals", () => {
  it("writes each place, then the whole numeral", () => {
    const texts = render(results({ rThousands: 1, rHundreds: 9, rTens: 9, rOnes: 4 }), ["roman", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["1994 in Roman numerals", "M", "CM", "XC", "IV", "1994 = M + CM + XC + IV", "= MCMXCIV", "MCMXCIV uses 3 taken-away pairs"]));
    expect(texts).toEqual(expect.arrayContaining(["I", "V", "X", "L", "C", "D", "1000"]));
  });

  it("says there is no numeral for 0", () => {
    const texts = render(results({ rThousands: 0, rHundreds: 0, rTens: 0, rOnes: 0 }), ["roman", "labels"]).texts();
    expect(texts).toContain("The Romans had no numeral for 0");
    expect(texts.filter((t) => t === "–")).toHaveLength(4);
  });
});

describe("proportion", () => {
  it("keeps cost ÷ pens the same, and hides the costs without the labels", () => {
    const r = results({ penPrice: 12 }, { pens: 8 });
    const texts = render(r, ["direct", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["Pens at ₹12 each", "8 pens", "12", "24", "60", "96", "120", "cost ÷ pens = 96 ÷ 8 = ₹12", "8 pens, ₹96"]));
    // Eight pens drawn.
    expect(render(r, ["direct"]).texts().join(" ")).not.toMatch(/96|cost ÷/);
  });

  it("keeps workers × days the same, with exact fractions", () => {
    const r = results({ work: 60 }, { workers: 7 });
    const texts = render(r, ["inverse", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["1 worker alone takes 60 days", "7 workers", "60", "30", "20", "15", "8.57", "workers × days = 7 × 60/7 ≈ 8.57 = 60", "7 workers, 8.57 days"]));
    expect(render(r, ["inverse"]).texts().join(" ")).not.toMatch(/8\.57|workers × days/);
  });

  it("draws the inverse curve above the axis all the way along", () => {
    const rec = render(results({ work: 360 }, { workers: 30 }), ["graphs", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Direct: a straight line through 0", "Inverse: a curve that never meets the axes"]));
    // The curve is the path drawn inside the clip; its lowest point (30 workers, 12 days) is still above the axis at y = 364.
    const start = rec.calls.findIndex((c) => c.method === "clip");
    const end = rec.calls.findIndex((c, i) => i > start && c.method === "stroke");
    const ys = rec.calls.slice(start, end).filter((c) => c.method === "lineTo" || c.method === "moveTo").map((c) => (c.args as number[])[1]!);
    expect(ys.length).toBeGreaterThan(100);
    expect(Math.max(...ys)).toBeLessThan(364);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(224);
  });
});

describe("on a phone", () => {
  const W = 325;
  const cases: [string, ReturnType<typeof results>][] = [
    ["place", results(periods(99, 99, 99, 999))],
    ["place", results(periods(77, 77, 77, 777))],
    ["place", results(periods(0, 0, 0, 0))],
    ["round", results({ ...periods(99, 99, 99, 999), place: 4 })],
    ["round", results({ ...periods(99, 99, 99, 999), place: 7 })],
    ["round", results({ ...periods(0, 0, 0, 5), place: 1 })],
    ["estimate", results({ p: 99_999, q: 99_999, place: 7 })],
    ["estimate", results({ p: 1, q: 99_999, place: 1 })],
    ["roman", results({ rThousands: 3, rHundreds: 8, rTens: 8, rOnes: 8 })],
    ["roman", results({ rThousands: 0, rHundreds: 0, rTens: 0, rOnes: 0 })],
    ["direct", results({ penPrice: 100 }, { pens: 20 })],
    ["direct", results({ penPrice: 1 }, { pens: 0 })],
    ["inverse", results({ work: 359 }, { workers: 29 })],
    ["inverse", results({ work: 1 }, { workers: 1 })],
    ["graphs", results({ penPrice: 100, work: 360 }, { pens: 20, workers: 1 })],
    ["graphs", results({ penPrice: 7, work: 1 }, { pens: 0, workers: 30 })],
  ];

  it.each(cases.map(([layer, r], i) => [`${layer} ${i}`, layer, r] as const))("keeps %s on a 325 px canvas", (_name, layer, r) => {
    const layout = computeBigNumbersLayout(W);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const rec = render(r, [layer, "labels"], W);
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(text.length, text).toBeLessThanOrEqual(55);
      expect(y, text).toBeGreaterThan(0);
      expect(y, text).toBeLessThan(layout.height);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(W);
    }
    for (const call of [...rec.of("fillRect"), ...rec.of("strokeRect")]) {
      const [x, y, w, h] = call.args as number[];
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x! + w!).toBeLessThanOrEqual(W + 0.001);
      expect(y!).toBeGreaterThanOrEqual(0);
      expect(y! + h!).toBeLessThanOrEqual(layout.height);
    }
    for (const call of rec.of("arc")) {
      const [x, y] = call.args as number[];
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x!).toBeLessThanOrEqual(W);
      expect(y!).toBeGreaterThanOrEqual(0);
      expect(y!).toBeLessThanOrEqual(layout.height);
    }
  });

  it("keeps left-aligned lines inside the right edge", () => {
    const layout = computeBigNumbersLayout(W);
    for (const [layer, r] of cases) {
      const rec = render(r, [layer, "labels"], W);
      for (const call of rec.of("fillText")) {
        const [text, x] = call.args as [string, number];
        // Lines that start at the left edge must end before the right edge, about 6.5 px a character.
        if (x === layout.x0) expect(x + text.length * 6.5, `${layer}: ${text}`).toBeLessThanOrEqual(W);
      }
    }
  });
});
