import { chanceModel, type ChanceParams, type ChanceState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { chanceFraction, chanceRenderer, computeChanceLayout } from "./chance/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: ChanceState = { counted: 0, row: 1, key: 1, trials: 0, red: 3, blue: 5, green: 2 };
const results = (params: Partial<ChanceParams> = {}, state: Partial<ChanceState> = {}) =>
  chanceModel.derive({ ...base, ...state }, { ...chanceModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  chanceRenderer.draw(rec.ctx, computeChanceLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

/** Every text drawn stays inside the canvas, using the recorder's 6 px a character. */
function expectInside(rec: ReturnType<typeof render>, width: number, height: number) {
  for (const call of rec.of("fillText")) {
    const [words, x, y] = call.args as [string, number, number];
    const w = words.length * 6;
    // The alignment is not recorded, so allow for whichever way the text runs from x.
    const fitsSomeWay = (x >= 0 && x + w <= width) || (x - w >= 0 && x <= width) || (x - w / 2 >= 0 && x + w / 2 <= width);
    expect(fitsSomeWay, `"${words}" at ${x}`).toBe(true);
    expect(y, `"${words}" y`).toBeGreaterThanOrEqual(0);
    expect(y, `"${words}" y`).toBeLessThanOrEqual(height);
  }
}

describe("fractions in captions", () => {
  it("writes a fraction and its lowest terms", () => {
    expect(chanceFraction(4, 52)).toBe("4/52 = 1/13");
    expect(chanceFraction(1, 6)).toBe("1/6");
    expect(chanceFraction(0, 6)).toBe("0/6 = 0");
    expect(chanceFraction(6, 6)).toBe("6/6 = 1");
  });
});

describe("the tally view", () => {
  it("draws the table, and the numbers only with the words", () => {
    const shown = text(results({ survey: "fruits" }, { counted: 40, row: 1 }), ["tally", "labels"]);
    expect(shown).toContain("Favourite fruits of 40 students");
    expect(shown).toContain("Mango: 5 + 5 + 2 = 12 · 40 of 40 counted");
    const hidden = render(results({ survey: "fruits" }, { counted: 40, row: 1 }), ["tally"]).texts();
    expect(hidden).toEqual(expect.arrayContaining(["Mango", "Grapes", "Tally marks"]));
    expect(hidden).not.toContain("12");
  });

  it("draws one stroke per answer, and a crossing stroke per group of five", () => {
    // Fruits, all 40 counted: 12, 8, 6, 10, 4 → 2 + 1 + 1 + 2 + 0 = 6 crossing strokes and 34 upright ones.
    const rec = render(results({ survey: "fruits" }, { counted: 40 }), ["tally"]);
    // Every stroke is a moveTo; the 40 crossed-off answers in the list each add one too.
    expect(rec.of("moveTo")).toHaveLength(34 + 6 + 40);
  });

  it("boxes the next answer to count", () => {
    expect(render(results({ survey: "shoes" }, { counted: 7 }), ["tally"]).of("strokeRect")).toHaveLength(1);
    expect(render(results({ survey: "shoes" }, { counted: 30 }), ["tally"]).of("strokeRect")).toHaveLength(0);
  });
});

describe("the pictograph", () => {
  it("draws a picture for each key's worth, and part of one for the rest", () => {
    // Fruits with a key of 4: 3 + 2 + 1.5 + 2.5 + 1 → 3 + 2 + 2 + 3 + 1 pictures (two of them parts), plus the key's own.
    const rec = render(results({ survey: "fruits" }, { counted: 40, key: 4, row: 3 }), ["pictograph", "labels"]);
    expect(rec.of("ellipse")).toHaveLength(11 + 1);
    expect(rec.of("clip")).toHaveLength(2);
    expect(rec.texts()).toContain("Key: 1 picture = 4 students");
    expect(rec.texts().join(" ")).toContain("Apple: 1.5 × 4 = 6 · some part pictures");
  });

  it("says when every row is whole", () => {
    expect(text(results({ survey: "travel" }, { counted: 75, key: 5, row: 2 }), ["pictograph", "labels"])).toContain("Bus: 5 × 5 = 25 · every row whole");
    expect(text(results({ survey: "travel" }, { counted: 75, key: 5 }), ["pictograph"])).not.toContain("×");
  });
});

describe("the bar graph", () => {
  it("draws five bars with the scale, and their heights only with the words", () => {
    const r = results({ survey: "fruits" }, { counted: 40, key: 2, row: 4 });
    const rec = render(r, ["bars", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(5);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Scale: 1 step = 2 students", "Mango", "12", "4"]));
    expect(rec.texts().join(" ")).toContain("Orange 10 · most: Mango · least: Grapes");
    expect(render(r, ["bars"]).texts()).not.toContain("Orange 10 · most: Mango · least: Grapes");
  });

  it("thins the scale's numbers so they never crowd", () => {
    const rec = render(results({ survey: "travel" }, { counted: 75, key: 1 }), ["bars"], 325);
    const ys = rec.of("fillText").filter((c) => /^\d+$/.test(String(c.args[0]))).map((c) => c.args[2] as number);
    for (let i = 1; i < ys.length; i++) expect(Math.abs(ys[i]! - ys[i - 1]!)).toBeGreaterThanOrEqual(15.9);
  });
});

describe("the chance line", () => {
  it("names the event and, with the words, its chance", () => {
    expect(text(results({ event: "six" }), ["line", "labels"])).toContain("1/6: unlikely");
    expect(text(results({ event: "seven" }), ["line", "labels"])).toContain("0/6 = 0: impossible");
    expect(text(results({ event: "sun-east" }), ["line", "labels"])).toContain("1/1 = 1: certain");
    const plain = render(results({ event: "ace" }), ["line"]).texts();
    expect(plain).toEqual(expect.arrayContaining(["A card from a deck is an ace", "impossible", "even chance", "certain", "unlikely", "likely"]));
    expect(plain.join(" ")).not.toContain("1/13");
  });
});

describe("the experiment", () => {
  it("traces the share of heads and reports it with the words", () => {
    const rec = render(results({ experiment: "coin" }, { trials: 1000 }), ["experiment", "labels"]);
    expect(rec.texts().join(" ")).toContain("499 heads in 1000 = 0.499 · theory 1/2 = 0.5");
    expect(rec.of("lineTo").length).toBeGreaterThanOrEqual(999);
    expect(render(results({ experiment: "die" }, { trials: 1000 }), ["experiment", "labels"]).texts().join(" ")).toContain("167 sixes in 1000 = 0.167 · theory 1/6 ≈ 0.167");
  });

  it("draws a bar for each face, and hides the counts without the words", () => {
    const die = render(results({ experiment: "die" }, { trials: 60 }), ["experiment"]);
    expect(die.of("fillRect")).toHaveLength(6);
    expect(die.texts()).toEqual(expect.arrayContaining(["1", "6", "theory"]));
    expect(die.texts().join(" ")).not.toContain("sixes in");
    expect(text(results({ experiment: "coin" }, { trials: 0 }), ["experiment", "labels"])).toContain("No trials yet");
  });
});

describe("the theory view", () => {
  it("fills the bag and gives P(E) and P(not E)", () => {
    const rec = render(results({ theory: "bag-red" }), ["theory", "labels"]);
    expect(rec.texts()).toContain("3 red · 5 blue · 2 green");
    expect(rec.texts().join(" ")).toContain("P(E) = 3/10 = 0.3 · P(not E) = 7/10");
    // Ten balls, and a ring round each of the three red ones.
    expect(rec.of("arc")).toHaveLength(13);
    expect(text(results({ theory: "bag-red" }, { red: 0, blue: 0, green: 0 }), ["theory", "labels"])).toContain("The bag is empty");
  });

  it("lights up the favourable cards of the deck", () => {
    const rec = render(results({ theory: "card-face" }), ["theory", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(52);
    expect(rec.texts()).toEqual(expect.arrayContaining(["52 cards: 4 suits of 13", "♠", "♥", "K", "10"]));
    expect(rec.texts().join(" ")).toContain("P(E) = 12/52 = 3/13 ≈ 0.23 · P(not E) = 40/52");
    expect(render(results({ theory: "card-king" }), ["theory"]).texts().join(" ")).not.toContain("P(E)");
  });

  it("shows the die's six faces", () => {
    const rec = render(results({ theory: "die-prime" }), ["theory", "labels"]);
    expect(rec.of("roundRect")).toHaveLength(6);
    expect(rec.texts().join(" ")).toContain("P(E) = 3/6 = 1/2 = 0.5 · P(not E) = 3/6");
  });
});

describe("on a phone", () => {
  it("keeps every view inside a 325 px canvas", () => {
    const layout = computeChanceLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const cases: [Partial<ChanceParams>, Partial<ChanceState>, string][] = [
      [{ survey: "travel" }, { counted: 75, row: 2 }, "tally"],
      [{ survey: "fruits" }, { counted: 40, row: 1 }, "tally"],
      [{ survey: "travel" }, { counted: 75, key: 1 }, "pictograph"],
      [{ survey: "fruits" }, { counted: 40, key: 3, row: 5 }, "pictograph"],
      [{ survey: "travel" }, { counted: 75, key: 1 }, "bars"],
      [{ survey: "shoes" }, { counted: 30, key: 2 }, "bars"],
      [{ event: "not-sunday" }, {}, "line"],
      [{ event: "seven" }, {}, "line"],
      [{ experiment: "die" }, { trials: 1000 }, "experiment"],
      [{ experiment: "coin" }, { trials: 37 }, "experiment"],
      [{ theory: "bag-green" }, { red: 10, blue: 10, green: 10 }, "theory"],
      [{ theory: "card-face" }, {}, "theory"],
      [{ theory: "die-over-4" }, {}, "theory"],
    ];
    for (const [params, state, layer] of cases) {
      const rec = render(results(params, state), [layer, "labels"], 325);
      expectInside(rec, 325, layout.height);
      for (const call of rec.of("fillText")) expect(String(call.args[0]).length, String(call.args[0])).toBeLessThanOrEqual(55);
      for (const call of [...rec.of("fillRect"), ...rec.of("roundRect")]) {
        const [x, y, w, h] = call.args as number[];
        expect(x!, `${layer} rect x`).toBeGreaterThanOrEqual(0);
        expect(x! + w!, `${layer} rect right`).toBeLessThanOrEqual(325);
        expect(y! + h!, `${layer} rect bottom`).toBeLessThanOrEqual(layout.height);
      }
      for (const call of rec.of("arc")) {
        const [x, y, r] = call.args as number[];
        expect(x! - r!, `${layer} arc`).toBeGreaterThanOrEqual(0);
        expect(x! + r!, `${layer} arc`).toBeLessThanOrEqual(325);
        expect(y! + r!, `${layer} arc`).toBeLessThanOrEqual(layout.height);
      }
    }
  });

  it("keeps the tally's longest row clear of the number column", () => {
    const rec = render(results({ survey: "travel" }, { counted: 75 }), ["tally"], 325);
    const xs = rec.of("moveTo").filter((c) => (c.args[1] as number) > 140).map((c) => c.args[0] as number);
    expect(Math.max(...xs)).toBeLessThan(325 - 16 - 6 * 2);
  });
});
