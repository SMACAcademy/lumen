import { probabilityModel, type ProbabilityParams, type ProbabilityState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeProbabilityLayout, probabilityRenderer } from "./probability/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = probabilityModel.initialize(probabilityModel.defaultParams);
const results = (params: Partial<ProbabilityParams> = {}, state: Partial<ProbabilityState> = {}) =>
  probabilityModel.derive({ ...base, ...state }, { ...probabilityModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  // Note each text's alignment as it is drawn, so its extent can be checked.
  const aligns: string[] = [];
  const fillText = rec.ctx.fillText.bind(rec.ctx);
  rec.ctx.fillText = (...args: Parameters<CanvasRenderingContext2D["fillText"]>) => {
    aligns.push(String(rec.ctx.textAlign ?? "left"));
    fillText(...args);
  };
  probabilityRenderer.draw(rec.ctx, computeProbabilityLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return Object.assign(rec, { aligns });
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

/** Every piece of text drawn stays on a canvas this wide, judged at 6 px a character. */
function expectInside(rec: ReturnType<typeof render>, width: number, height: number) {
  rec.of("fillText").forEach((call, i) => {
    const [words, x, y] = call.args as [string, number, number];
    const w = words.length * 6;
    const align = rec.aligns[i];
    const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    expect(left, `"${words}" left`).toBeGreaterThanOrEqual(0);
    expect(left + w, `"${words}" right`).toBeLessThanOrEqual(width);
    expect(y, `"${words}" y`).toBeGreaterThan(0);
    expect(y, `"${words}" y`).toBeLessThan(height);
  });
  for (const call of rec.of("fillRect")) {
    const [x, y, w, h] = call.args as [number, number, number, number];
    expect(x).toBeGreaterThanOrEqual(0);
    expect(x + w).toBeLessThanOrEqual(width);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(y + h).toBeLessThanOrEqual(height);
  }
}

describe("the dice view", () => {
  it("writes every sum on the grid and colours the event's cells", () => {
    const rec = render(results({ eventA: "sum" }, { s: 7 }), ["grid", "labels"]);
    const sums = rec.texts().filter((t) => /^\d+$/.test(t)).map(Number);
    // The axis numbers stop at 6, so every 7 is a cell.
    expect(sums.filter((v) => v === 7)).toHaveLength(6);
    expect(sums.filter((v) => v === 12)).toHaveLength(1);
    expect(text(rec)).toContain("A: sum = 7");
    expect(text(rec)).toContain("P(A) = 6/36 = 0.167");
    // Six cells of A, plus the legend swatch.
    expect(rec.of("fillRect")).toHaveLength(7);
  });

  it("counts the regions of the Venn diagram, and adds with the overlap taken off", () => {
    const rec = render(results({ eventA: "doubles", eventB: "atLeast" }, { t: 10 }), ["grid", "venn", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["A: a double", "B: sum ≥ 10", "A", "B", "S", "4", "2", "26"]));
    expect(text(rec)).toContain("P(A ∪ B) = (6 + 6 − 2)/36 = 0.278");
  });

  it("hides the counts and the answer without the words", () => {
    const rec = render(results({ eventA: "doubles", eventB: "atLeast" }, { t: 10 }), ["grid", "venn"]);
    expect(text(rec)).not.toContain("P(");
    expect(rec.texts()).not.toContain("26");
  });

  it("shrinks the sample space to B and says when knowing B changes nothing", () => {
    const six = render(results({ eventA: "six", eventB: "atLeast" }, { t: 10 }), ["grid", "venn", "shrink", "labels"]);
    expect(text(six)).toContain("P(A|B) = 5/6 = 0.833 ≠ P(A)");
    const even = render(results({ eventA: "firstEven", eventB: "sum" }, { t: 7 }), ["grid", "venn", "shrink", "labels"]);
    expect(text(even)).toContain("P(A|B) = 3/6 = 0.500 = P(A): independent");
  });
});

describe("the Bayes view", () => {
  it("splits 1000 people into 18 caught, 2 missed, 49 false alarms and 931 clear", () => {
    const rec = render(results(), ["tree", "people", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["1000", "ill 20", "well 980", "+ 18", "− 2", "+ 49", "− 931", "0.02", "0.98", "0.9", "0.1", "0.05", "0.95"]));
    expect(text(rec)).toContain("P(ill | +) = 18/67 = 0.269");
    // 1000 people, three legend swatches.
    expect(rec.of("fillRect")).toHaveLength(1003);
  });

  it("shows only the branch probabilities without the words", () => {
    const rec = render(results(), ["tree", "people"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["ill", "well", "+", "−", "0.02"]));
    expect(text(rec)).not.toMatch(/67|18|49|P\(/);
  });

  it("writes fractional expected counts to one decimal", () => {
    const rec = render(results({}, { prevalence: 0.015, falsePositive: 0.035 }), ["tree", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["ill 15", "+ 13.5", "+ 34.5"]));
  });
});

describe("the distribution view", () => {
  it("draws a bar for each value, the chosen one picked out, and the mean and spread", () => {
    const rec = render(results({ dist: "binomial" }, { n: 4, p: 0.5, r: 2 }), ["bars", "simulation", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["X ~ B(4, 0.50): successes in 4 trials", "0", "1", "2", "3", "4", "μ", "σ", "Press play to repeat the experiment"]));
    expect(text(rec)).toContain("μ = 2.00 · σ² = 1.00 · P(X = 2) = 0.375");
    expect(rec.of("fillRect")).toHaveLength(5);
  });

  it("adds a narrow bar for each simulated frequency once trials have run", () => {
    const rec = render(results({ dist: "diceMax" }, { r: 6, trials: 1000 }), ["bars", "simulation", "labels"]);
    expect(rec.of("fillRect")).toHaveLength(12);
    expect(text(rec)).toContain("X = the larger of two dice");
    expect(text(rec)).toMatch(/1000 trials: average X = 4\.\d\d/);
    expect(text(rec)).toContain("P(X = 6) = 0.306");
  });

  it("hides the mean and the probabilities without the words", () => {
    const rec = render(results({ dist: "diceMax" }, { r: 6, trials: 1000 }), ["bars", "simulation"]);
    expect(rec.texts()).not.toContain("μ");
    expect(text(rec)).not.toMatch(/average|0\.306|4\.47/);
    expect(text(rec)).toContain("1000 trials");
  });
});

describe("on a phone", () => {
  it("keeps every view inside a 325 px canvas", () => {
    const layout = computeProbabilityLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    for (const [params, state, layers] of [
      [{ eventA: "firstEven", eventB: "firstEven" }, { s: 12, t: 12 }, ["grid", "venn", "shrink", "labels"]],
      [{ eventA: "atLeast", eventB: "doubles" }, { s: 10 }, ["grid", "venn", "labels"]],
      [{}, { prevalence: 0.5, sensitivity: 1, falsePositive: 0.3 }, ["tree", "people", "labels"]],
      [{}, { prevalence: 0.015, sensitivity: 0.55, falsePositive: 0.035 }, ["tree", "people", "labels"]],
      [{ dist: "binomial" }, { n: 10, p: 0.05, r: 0, trials: 2000 }, ["bars", "simulation", "labels"]],
      [{ dist: "binomial" }, { n: 10, p: 1, r: 10, trials: 30 }, ["bars", "simulation", "labels"]],
      [{ dist: "diceSum" }, { r: 12, trials: 1500 }, ["bars", "simulation", "labels"]],
    ] as const) {
      const rec = render(results(params as Partial<ProbabilityParams>, state as Partial<ProbabilityState>), [...layers], 325);
      expectInside(rec, 325, layout.height);
    }
  });

  it("puts the grid, the legend and the Venn diagram one under another", () => {
    const { grid, legend, venn, tree, people } = computeProbabilityLayout(325);
    expect(grid.x + 6 * grid.cell).toBeLessThanOrEqual(325 - 16);
    expect(legend.y).toBeGreaterThan(grid.y + 6 * grid.cell);
    expect(venn.y).toBeGreaterThan(legend.y + 16);
    expect(venn.height).toBeGreaterThan(60);
    expect(people.y).toBeGreaterThan(tree.y + tree.height);
  });
});
