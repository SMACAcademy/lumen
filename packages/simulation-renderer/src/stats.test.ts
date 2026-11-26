import { statsModel, type StatsState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeStatsLayout, statsDots, statsRenderer, statsTransformDomain, statsTransformText } from "./stats/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const start = statsModel.initialize(statsModel.defaultParams);
const state = (writes: [string, number][] = []) => writes.reduce<StatsState>((s, [id, v]) => statsModel.setVariable(s, id, v, statsModel.defaultParams), start);
const results = (writes: [string, number][] = []) => statsModel.derive(state(writes), statsModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const set = new Set(layers);
  const layout = computeStatsLayout(width, [], set);
  const rec = recordingContext();
  statsRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { ...rec, layout, words: () => rec.texts().join(" | ") };
};

/** Every piece of text is anchored on the canvas, and every dot lies on it. Centred captions are checked for width separately. */
function expectOnCanvas(rec: ReturnType<typeof render>, width: number) {
  for (const call of rec.of("fillText")) {
    const [text, x, y] = call.args as [string, number, number];
    expect(x, `${text} x`).toBeGreaterThanOrEqual(0);
    expect(x, `${text} x`).toBeLessThanOrEqual(width);
    expect(y, `${text} y`).toBeGreaterThanOrEqual(0);
    expect(y, `${text} y`).toBeLessThanOrEqual(rec.layout.height);
  }
  for (const call of rec.of("arc")) {
    const [x, y] = call.args as [number, number];
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThanOrEqual(width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(rec.layout.height);
  }
}

describe("writing numbers", () => {
  it("writes y = kx + c as a textbook does", () => {
    expect(statsTransformText(2, 5)).toBe("y = 2x + 5");
    expect(statsTransformText(1, 0)).toBe("y = x");
    expect(statsTransformText(-1, -3)).toBe("y = −x − 3");
    expect(statsTransformText(0.5, 0)).toBe("y = 0.5x");
    expect(statsTransformText(0, 4)).toBe("y = 4");
  });

  it("widens the second line to fit every y", () => {
    expect(statsTransformDomain(1, 0)).toEqual([0, 20]);
    expect(statsTransformDomain(3, 10)).toEqual([0, 70]);
    expect(statsTransformDomain(-2, -10)).toEqual([-50, 20]);
  });
});

describe("the dot plot", () => {
  it("stacks equal marks, one dot above another", () => {
    const strip = computeStatsLayout(325).strip;
    const placed = statsDots([11, 6, 11, 11], strip, [0, 20]);
    expect(placed[0]!.x).toBe(placed[2]!.x);
    expect(placed[0]!.y - placed[2]!.y).toBe(strip.pitch);
    expect(placed[2]!.y - placed[3]!.y).toBe(strip.pitch);
    expect(placed[1]!.y).toBe(placed[0]!.y);
  });

  it("gives the mean, median and mode with the words, and the pivot under the mean", () => {
    const rec = render(results(), ["dots", "centre", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Where is the middle?", "x̄ = 11", "median 11", "mode 11"]));
    expect(rec.words()).toContain("10 marks, total 110: x̄ = 11");
    expect(rec.words()).toContain("median 11: the 5th and 6th averaged");
    // Ten dots, and the mode's stack ringed.
    expect(rec.of("arc")).toHaveLength(10);
    expect(rec.of("strokeRect")).toHaveLength(1);
  });

  it("names the middle mark of an odd count, and says when there is no mode", () => {
    expect(render(results([["set", 2]]), ["dots", "centre", "labels"]).words()).toContain("median 7: the middle (5th) mark");
    expect(render(results([["set", 1], ["count", 5]]), ["dots", "centre", "labels"]).texts()).toContain("no mode");
  });

  it("writes the ordinals of small counts properly", () => {
    expect(render(results([["set", 1], ["count", 5]]), ["dots", "centre", "labels"]).words()).toContain("the middle (3rd) mark");
    expect(render(results([["set", 1], ["count", 6]]), ["dots", "centre", "labels"]).words()).toContain("the 3rd and 4th averaged");
  });

  it("hides every centre and spread number and marker without the words", () => {
    for (const layers of [["dots", "centre"], ["dots", "spread"]]) {
      const rec = render(results(), layers);
      expect(rec.words()).not.toMatch(/x̄|median|mode|σ|range|MD/);
      expect(rec.of("strokeRect")).toHaveLength(0);
      expect(rec.of("fillRect")).toHaveLength(0);
    }
  });

  it("gives the spread: range, mean deviations, variance and σ", () => {
    const rec = render(results([["set", 1]]), ["dots", "spread", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["range 9", "x̄ − σ", "x̄ + σ"]));
    expect(rec.words()).toContain("MD about x̄ 2.75 · about median 2.75");
    expect(rec.words()).toContain("σ² = 9.25 · σ = 3.04");
    // The σ band.
    expect(rec.of("fillRect")).toHaveLength(1);
  });

  it("drags the dot under the pointer, and keeps dragging it", () => {
    const r = results();
    const layout = computeStatsLayout(325, [], new Set(["dots", "centre"]));
    const [ravi] = statsDots([11, 6, 8, 9, 10, 11, 11, 13, 14, 17], layout.strip, [0, 20]);
    const hit = statsRenderer.pick!(layout, ravi!.x, ravi!.y, undefined, r);
    expect(hit).toEqual({ writes: [{ variable: "m1", value: 11 }], region: "m1" });
    const x20 = layout.strip.x1;
    expect(statsRenderer.pick!(layout, x20, 10, "m1", r)?.writes).toEqual([{ variable: "m1", value: 20 }]);
    expect(statsRenderer.pick!(layout, 5, 10, undefined, r)).toBeNull();
  });
});

describe("the change of scale", () => {
  it("draws both lines and gives σ times |k|", () => {
    const rec = render(results([["set", 1], ["scale", -2], ["shift", 10]]), ["transform", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["x: the marks", "y = −2x + 10"]));
    expect(rec.words()).toContain("x̄ = 9.00, σ = 3.04 → ȳ = −8.00");
    expect(rec.words()).toContain("σ of y = |−2| × 3.04 = 6.08");
    expect(rec.of("arc")).toHaveLength(16);
  });

  it("hides the answers without the words", () => {
    const words = render(results([["scale", 2]]), ["transform"]).words();
    expect(words).toContain("Every mark x becomes y = 2x.");
    expect(words).not.toMatch(/σ|ȳ|x̄/);
  });
});

describe("the histogram", () => {
  it("draws one bar per class with its frequency, and the polygon through the class marks", () => {
    const rec = render(results(), ["histogram", "polygon", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Histogram and frequency polygon", "10", "25", "100", "2", "7", "marks (class width 15)"]));
    expect(rec.of("fillRect")).toHaveLength(6);
    // Six class marks and the two zero ends.
    expect(rec.of("arc")).toHaveLength(8);
    expect(rec.words()).toContain("N = 30 · class marks 17.5, 32.5, …");
  });

  it("finds the mode with the crossing lines, only with the words", () => {
    const shown = render(results(), ["histogram", "modal", "labels"]);
    expect(shown.words()).toContain("modal class 40–55: f₀ = 3, f₁ = 7, f₂ = 6");
    expect(shown.words()).toContain("mode = 40 + (f₁ − f₀)/(2f₁ − f₀ − f₂) × 15 = 52");
    const hidden = render(results(), ["histogram", "modal"]).words();
    expect(hidden).not.toMatch(/mode|modal|52/);
  });

  it("drags a bar's top to a new frequency", () => {
    const r = results();
    const layout = computeStatsLayout(325, [], new Set(["histogram"]));
    const { plot } = layout;
    // The first class, 10–25, is the second ninth of the frame; half way up a frame of 10.
    const x = plot.x + (plot.width / 9) * 1.5;
    const hit = statsRenderer.pick!(layout, x, plot.y + plot.height / 2, undefined, r);
    expect(hit?.writes).toEqual([{ variable: "f1", value: 5 }]);
    expect(statsRenderer.pick!(layout, plot.x + 2, plot.y + 10, undefined, r)).toBeNull();
  });
});

describe("the step-deviation table", () => {
  it("works the table and shows the same mean both ways", () => {
    const rec = render(results(), ["steps", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["class", "fu²", "40–55", "47.5", "−2", "29", "95"]));
    expect(rec.words()).toContain("x̄ = a + h·Σfu/Σf = 47.5 + 15 × 29/30");
    expect(rec.words()).toContain("= 62, the same as Σfx/Σf = 1860/30");
    expect(rec.words()).toContain("σ² = h²[Σfu²/N − (Σfu/N)²] = 502.25");
  });

  it("gives the class 11 table its variance of 201", () => {
    expect(render(results([["table", 2]]), ["steps", "labels"]).words()).toContain("= 201.00");
  });

  it("hides the sums and the mean without the words", () => {
    const rec = render(results(), ["steps"]);
    expect(rec.words()).toContain("a = 47.5, h = 15, u = (x − a)/h");
    expect(rec.words()).not.toMatch(/Σfu\/|σ²|1860|= 62/);
    // Σfu (29) and Σfu² (95) stay blank.
    expect(rec.texts()).not.toContain("29");
    expect(rec.texts()).not.toContain("95");
  });

  it("takes a tapped row's class mark as the assumed mean", () => {
    const layout = computeStatsLayout(325, [], new Set(["steps"]));
    expect(statsRenderer.pick!(layout, 100, layout.tableTop + layout.rowHeight * 5, undefined, results())?.writes).toEqual([{ variable: "assumed", value: 5 }]);
    expect(statsRenderer.pick!(layout, 100, layout.tableTop, undefined, results())).toBeNull();
  });
});

describe("the ogive", () => {
  it("reads the median across at n/2, with the words", () => {
    const rec = render(results(), ["ogive", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Less-than ogive", "n/2 = 15", "30", "12"]));
    expect(rec.words()).toContain("median class 55–70: cf = 12, f = 6");
    expect(rec.words()).toContain("median = 55 + (15 − 12)/6 × 15 = 62.5");
    expect(render(results(), ["ogive"]).words()).not.toMatch(/median|n\/2 =|62\.5/);
  });
});

describe("a phone's canvas", () => {
  it("keeps every label and dot on a 325 px canvas in every view", () => {
    const cases: [[string, number][], string[]][] = [
      [[], ["dots", "centre", "labels"]],
      [[["m1", 20], ["m2", 0]], ["dots", "centre", "labels"]],
      [[["set", 3]], ["dots", "spread", "labels"]],
      [[["set", 4]], ["dots", "spread", "labels"]],
      [[["scale", 3], ["shift", 10]], ["transform", "labels"]],
      [[["scale", -2], ["shift", -10]], ["transform", "labels"]],
      [[["table", 2]], ["histogram", "polygon", "modal", "labels"]],
      [[["f1", 12]], ["histogram", "polygon", "modal", "labels"]],
      [[["table", 2]], ["steps", "labels"]],
      [[["table", 2]], ["ogive", "labels"]],
    ];
    for (const [writes, layers] of cases) {
      const rec = render(results(writes), layers, 325);
      expectOnCanvas(rec, 325);
      for (const text of rec.texts()) expect(text.length, text).toBeLessThanOrEqual(55);
      // The centred captions fit across the canvas.
      for (const call of rec.of("fillText")) {
        const [text, x, y] = call.args as [string, number, number];
        if (rec.layout.lines.includes(y)) {
          expect(x, text).toBe(325 / 2);
          expect(text.length * 6, text).toBeLessThanOrEqual(325 - 16);
        }
      }
    }
  });

  it("keeps the marker labels inside the edges when the mean sits near one", () => {
    const rec = render(results([["set", 3], ["m2", 0], ["m3", 0], ["m4", 0], ["m5", 0], ["m6", 0], ["m7", 0], ["m8", 0], ["m1", 0]]), ["dots", "centre", "labels"], 325);
    for (const call of rec.of("fillText")) {
      const [text, x] = call.args as [string, number];
      if (/^x̄ =|^median|^mode/.test(text)) expect(x - (text.length * 6.5) / 2).toBeGreaterThanOrEqual(3);
    }
  });
});
