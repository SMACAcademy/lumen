import { ratioPowerModel, type RatioPowerParams, type RatioPowerState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import {
  computeRatioPowerLayout,
  dec,
  groupIndian,
  powerText,
  ratioPowerRenderer,
  rupees,
  sup,
  writeOut,
} from "./ratiopower/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const P = ratioPowerModel.defaultParams;
const S = ratioPowerModel.initialize(P);
const results = (params: Partial<RatioPowerParams> = {}, state: Partial<RatioPowerState> = {}) =>
  ratioPowerModel.derive({ ...S, ...state }, { ...P, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  ratioPowerRenderer.draw(rec.ctx, computeRatioPowerLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("writing numbers", () => {
  it("writes superscripts, decimals and rupees", () => {
    expect(sup(11)).toBe("¹¹");
    expect(sup(-6)).toBe("⁻⁶");
    expect(dec(-16.6667)).toBe("−16.67");
    expect(dec(1.5)).toBe("1.5");
    expect(dec(-0.001)).toBe("0");
    expect(groupIndian("123834")).toBe("1,23,834");
    expect(rupees(600)).toBe("₹600");
    expect(rupees(1610.51)).toBe("₹1,610.51");
    expect(rupees(-200)).toBe("−₹200");
    expect(rupees(12100)).toBe("₹12,100");
  });

  it("writes a number in standard form out in full, digit for digit", () => {
    expect(writeOut("1496", 11)).toBe("149,600,000,000");
    expect(writeOut("7", -6)).toBe("0.000007");
    expect(writeOut("1275", -5)).toBe("0.00001275");
    expect(writeOut("12756", 7)).toBe("12,756,000");
    expect(writeOut("1496", 0)).toBe("1.496");
    expect(writeOut("1496", 2)).toBe("149.6");
  });

  it("writes powers out until they are too long", () => {
    expect(powerText(2, 5)).toBe("32");
    expect(powerText(10, 6)).toBe("1,000,000");
    expect(powerText(2, -3)).toBe("1/8");
    expect(powerText(7, 0)).toBe("1");
    expect(powerText(10, 64)).toBe("10⁶⁴");
  });
});

describe("sharing and proportion", () => {
  it("draws a + b equal parts and names the shares", () => {
    const rec = render(results({ a: 2, b: 3, total: 20 }), ["share", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(5);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Share 20 sweets in the ratio 2 : 3", "8 sweets", "12 sweets", "1 part = 20 ÷ 5 = 4 sweets", "2 : 3 is already in simplest form"]));
    expect(render(results({ a: 4, b: 6, total: 30 }), ["share", "labels"]).texts()).toContain("4 : 6 = 2 : 3 in simplest form");
    expect(render(results({ a: 2, b: 3, total: 21 }), ["share", "labels"]).texts()).toContain("21 does not split into 5 whole parts");
  });

  it("hides the shares without the labels", () => {
    expect(render(results({ a: 2, b: 3, total: 20 }), ["share"]).texts()).toEqual(["Share 20 sweets in the ratio 2 : 3", "Riya", "Kabir"]);
  });

  it("compares extremes and means, and finds the missing term only with labels", () => {
    const yes = render(results({ a: 2, b: 3, c: 8, d: 12 }), ["proportion", "labels"]).texts();
    expect(yes).toEqual(expect.arrayContaining(["extremes: 2 × 12 = 24", "means: 3 × 8 = 24", "Equal, so the ratios are in proportion"]));
    const unit = render(results({ a: 4, b: 6, c: 10, d: 6 }), ["proportion", "labels"]).texts();
    expect(unit).toContain("Unitary: 1 goes with 1.5, so 10 goes with 15");
    expect(unit).toContain("Not equal: not in proportion");
    expect(render(results({ a: 4, b: 6, c: 10, d: 6 }), ["proportion"]).texts().join(" ")).not.toMatch(/15|1\.5/);
  });
});

describe("percentages and money", () => {
  it("shades pct squares of 100", () => {
    const rec = render(results({ price: 500 }, { pct: 35 }), ["grid", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(35);
    expect(rec.texts()).toEqual(expect.arrayContaining(["35% = 0.35 = 7/20", "35% of ₹500 = ₹175"]));
  });

  it("works out a discount and a loss, and hides the price paid without labels", () => {
    const shop = results({ price: 800, change: -25, sell: 900 });
    expect(render(shop, ["money", "labels"]).texts()).toEqual(expect.arrayContaining(["₹800 − 25% = ₹800 − ₹200 = ₹600", "Profit ₹100 = 12.5% of the cost price"]));
    expect(render(shop, ["money"]).texts().join(" ")).not.toContain("₹600");
    expect(render(results({ price: 1200, sell: 1000 }), ["money", "labels"]).texts()).toContain("Loss ₹200 = 16.67% of the cost price");
  });

  it("draws simple and compound interest year by year", () => {
    const r = results({ price: 10000, rate: 10 }, { years: 2 });
    const rec = render(r, ["interest", "labels"]);
    // Two legend swatches, then a pair of bars for each year so far.
    expect(rec.of("fillRect")).toHaveLength(2 + 2 * 2);
    expect(rec.texts()).toEqual(expect.arrayContaining(["SI = ₹2,000, amount ₹12,000", "CI = ₹2,100, amount ₹12,100", "Compound earns ₹100 more"]));
    expect(render(r, ["interest"]).texts().join(" ")).not.toContain("12,100");
  });
});

describe("powers, standard form and squares", () => {
  it("draws a power as tiles and joins them when multiplying", () => {
    const rec = render(results({ base: 2, m: 3, n: 4 }), ["powers", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(3 + 4 + 7);
    expect(rec.texts()).toEqual(expect.arrayContaining(["2³", "2⁴", "2⁷", "= 8", "= 16", "= 128", "2³ × 2⁴ = 2³⁺⁴ = 2⁷", "2³ ÷ 2⁴ = 2⁻¹ = 1/2", "(2³)⁴ = 2¹² = 4,096"]));
    const negative = render(results({ base: 2, m: -3, n: 2 }), ["powers", "labels"]).texts();
    expect(negative).toEqual(expect.arrayContaining(["1 ÷", "= 1/8", "2⁻³ × 2² = 2⁻³⁺² = 2⁻¹"]));
    expect(render(results({ base: 2, m: 3, n: -2 }), ["powers", "labels"]).texts()).toContain("2³ × 2⁻² = 2³⁺⁽⁻²⁾ = 2¹");
    expect(render(results({ base: 2, m: 3, n: 4 }), ["powers"]).texts()).not.toContain("= 128");
  });

  it("writes the learner's number out and says when it matches", () => {
    const sun = render(results({ thing: "sun" }, { se: 11 }), ["standard", "labels"]).texts();
    expect(sun.filter((t) => t.includes("149,600,000,000"))).toHaveLength(2);
    expect(sun).toEqual(expect.arrayContaining(["1.496 × 10¹¹", "Match! 1.496 × 10¹¹ m", "the point moves 11 places right"]));
    expect(render(results({ thing: "sun" }, { se: 9 }), ["standard", "labels"]).texts()).toContain("Too small: move the point further right");
    const cell = render(results({ thing: "blood-cell" }, { se: -6 }), ["standard", "labels"]).texts();
    expect(cell).toEqual(expect.arrayContaining(["0.000007", "7 × 10⁻⁶", "= 0.000007"]));
    expect(render(results({ thing: "sun" }, { se: 11 }), ["standard"]).texts().join(" ")).not.toContain("Match");
  });

  it("arranges tiles into a square, with the left-overs round the edge", () => {
    const forty = render(results({}, { tiles: 40 }), ["squares", "labels"]);
    expect(forty.of("fillRect")).toHaveLength(40);
    expect(forty.texts()).toEqual(expect.arrayContaining(["40 = 6 × 6 + 4 left over: not a square", "40 = 2 × 2 × 2 × 5", "× 10 makes 400 = 20 × 20"]));
    const square = render(results({}, { tiles: 324 }), ["squares", "labels"]).texts();
    expect(square).toEqual(expect.arrayContaining(["324 = 18 × 18: a perfect square, √324 = 18", "One from each pair: √324 = 2 × 3 × 3 = 18"]));
    expect(render(results({}, { tiles: 324 }), ["squares"]).texts().join(" ")).not.toContain("18");
  });
});

describe("on a phone", () => {
  const W = 325;
  const cases: [string, ReturnType<typeof results>][] = [
    ["share", results({ a: 20, b: 20, total: 100 })],
    ["share", results({ a: 13, b: 7, total: 97 })],
    ["proportion", results({ a: 20, b: 19, c: 100, d: 200 })],
    ["grid", results({ price: 20000 }, { pct: 100 })],
    ["money", results({ price: 20000, change: -90, sell: 25000 })],
    ["money", results({ price: 19950, change: 100, sell: 0 })],
    ["interest", results({ price: 20000, rate: 20 }, { years: 10 })],
    ["powers", results({ base: 10, m: 8, n: 8 })],
    ["powers", results({ base: 10, m: -5, n: -5 })],
    ["powers", results({ base: 10, m: 8, n: -5 })],
    ["standard", results({ thing: "earth" }, { se: 12 })],
    ["standard", results({ thing: "plant-cell" }, { se: -8 })],
    ["squares", results({}, { tiles: 399 })],
    ["squares", results({}, { tiles: 384 })],
  ];

  it.each(cases.map(([layer, r], i) => [`${layer} ${i}`, layer, r] as const))("keeps %s on a 325 px canvas", (_name, layer, r) => {
    const layout = computeRatioPowerLayout(W);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const rec = render(r, [layer, "labels"], W);
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(text.length, text).toBeLessThanOrEqual(55);
      expect(y, text).toBeGreaterThan(0);
      expect(y, text).toBeLessThan(layout.height);
      // About 6.5 px a character; text is drawn left-aligned unless centred or right-aligned.
      const width = text.length * 6.5;
      expect(x - width, text).toBeLessThan(W);
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(W);
    }
    for (const call of [...rec.of("fillRect"), ...rec.of("strokeRect")]) {
      const [x, y, w, h] = call.args as number[];
      expect(x!).toBeGreaterThanOrEqual(0);
      expect(x! + w!).toBeLessThanOrEqual(W);
      expect(y!).toBeGreaterThanOrEqual(0);
      expect(y! + h!).toBeLessThanOrEqual(layout.height);
    }
  });

  it("keeps left-aligned lines inside the right edge", () => {
    const layout = computeRatioPowerLayout(W);
    for (const [layer, r] of cases) {
      for (const text of render(r, [layer, "labels"], W).texts()) {
        // Every long line starts at the left edge.
        if (text.length > 20) expect(layout.x0 + text.length * 6.5, `${layer}: ${text}`).toBeLessThanOrEqual(W);
      }
    }
  });
});
