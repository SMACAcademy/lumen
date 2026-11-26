import { CIRCLE_SCHOOL_DEFAULT_STATE, circleSchoolModel, type CircleSchoolParams, type CircleSchoolState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import {
  circleSchoolRenderer,
  circleSchoolShort,
  circleSchoolSpokeFrame,
  circleSchoolSweepFrame,
  computeCircleSchoolLayout,
} from "./circleschool/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (state: Partial<CircleSchoolState> = {}, params: Partial<CircleSchoolParams> = {}) =>
  circleSchoolModel.derive({ ...CIRCLE_SCHOOL_DEFAULT_STATE, ...state }, { ...circleSchoolModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const set = new Set(layers);
  circleSchoolRenderer.draw(rec.ctx, computeCircleSchoolLayout(width, set), { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

describe("the sliding line", () => {
  it("names a line that misses, touches or cuts", () => {
    expect(text(results({ radius: 5, gap: 8 }), ["sweep", "labels"])).toContain("d > r: no common point — the line misses");
    expect(text(results({ radius: 5, gap: 5 }), ["sweep", "labels"])).toContain("d = r: one common point — a tangent");
    const cut = text(results({ radius: 5, gap: 3 }), ["sweep", "labels"]);
    expect(cut).toContain("d < r: two common points — a secant");
    expect(cut).toContain("It cuts off a chord 8.00 cm long");
    expect(cut).toContain("r = 5 cm");
    expect(cut).toContain("d = 3 cm");
  });

  it("hides the verdict with the words, and marks a far line as farther", () => {
    const hidden = text(results({ radius: 5, gap: 5 }), ["sweep"]);
    expect(hidden).not.toMatch(/tangent|secant|misses/);
    expect(text(results({ radius: 5, gap: 20 }), ["sweep"])).toContain("d = 20 cm (farther)");
  });

  it("drags the line to a new distance", () => {
    const layout = computeCircleSchoolLayout(800, new Set(["sweep"]));
    const r = results({ radius: 5 });
    const { O, k } = circleSchoolSweepFrame(layout, 5);
    expect(circleSchoolRenderer.pick!(layout, O[0] + 40, O[1] + 4 * k, undefined, r)).toEqual({ writes: [{ variable: "gap", value: 4 }], region: "gap" });
  });
});

describe("the line through P", () => {
  it("marks a right angle and calls it the tangent only at 90°", () => {
    const right = render(results({ radius: 5, tilt: 90, touch: 40 }), ["spoke", "labels"]);
    expect(right.texts()).toEqual(expect.arrayContaining(["90°", "O", "P", "At 90° to the radius it touches only at P:", "the tangent at P"]));
    expect(right.texts()).not.toContain("Q");
    const slant = text(results({ radius: 5, tilt: 60, touch: 40 }), ["spoke", "labels"]);
    expect(slant).toContain("At 60° to the radius it cuts again at Q:");
    expect(slant).toContain("a secant, chord PQ 5.00 cm");
    expect(slant).toContain("Q");
  });

  it("moves P round the circle by dragging", () => {
    const layout = computeCircleSchoolLayout(800, new Set(["spoke"]));
    const { O, R } = circleSchoolSpokeFrame(layout);
    expect(circleSchoolRenderer.pick!(layout, O[0], O[1] - R, undefined, results())).toEqual({ writes: [{ variable: "touch", value: 90 }], region: "touch" });
    expect(circleSchoolRenderer.pick!(layout, O[0], O[1], undefined, results())).toBeNull();
  });
});

describe("two tangents from a point", () => {
  it("gives both tangent lengths only with the words on", () => {
    const shown = render(results({ radius: 7, dist: 25 }), ["outside", "labels"]).texts();
    expect(shown).toEqual(expect.arrayContaining(["PA = 24.00", "PB = 24.00", "A", "B", "P", "O"]));
    expect(shown.join(" ")).toContain("Two tangents, each √(d² − r²) = 24.00 cm");
    const hidden = text(results({ radius: 7, dist: 25 }), ["outside"]);
    expect(hidden).not.toContain("24");
  });

  it("says when there is one tangent, or none", () => {
    expect(text(results({ radius: 5, dist: 5 }), ["outside", "labels"])).toContain("P is on the circle: exactly one tangent");
    expect(text(results({ radius: 5, dist: 2 }), ["outside", "labels"])).toContain("P is inside the circle: no tangent at all");
  });
});

describe("the sector", () => {
  it("gives the arc, sector and segment, and which π", () => {
    const sixty = text(results({ radius: 21, theta: 60 }, { pi: "22/7" }), ["sector", "labels"]);
    expect(sixty).toContain("A sector of a circle (π = 22/7)");
    expect(sixty).toContain("arc 22.00 cm · sector 231.00 cm²");
    expect(sixty).toContain("θ = 60°");
    const big = text(results({ radius: 21, theta: 120 }, { pi: "22/7" }), ["sector", "labels"]);
    expect(big).toContain("segment = sector − △OAB = 271.04 cm²");
    // Past 180° the triangle is added: 462 + 98 for r = 14 cm, θ = 270°.
    expect(text(results({ radius: 14, theta: 270 }, { pi: "22/7" }), ["sector", "labels"])).toContain("segment = sector + △OAB = 560.00 cm²");
    expect(text(results({ radius: 4, theta: 30 }, { pi: "3.14" }), ["sector", "labels"])).toContain("(π = 3.14)");
  });

  it("hides every area with the words", () => {
    const hidden = text(results({ radius: 21, theta: 60 }), ["sector"]);
    expect(hidden).not.toMatch(/231|22\.00|segment/);
    expect(hidden).toContain("r = 21 cm");
  });
});

describe("the section formula", () => {
  it("works out P's coordinates with the words on", () => {
    const shown = text(results({ ax: -1, ay: 7, bx: 4, by: -3, m: 2, n: 3 }), ["section", "labels"]);
    expect(shown).toContain("P divides AB in the ratio 2 : 3");
    expect(shown).toContain("A(−1, 7)");
    expect(shown).toContain("B(4, −3)");
    expect(shown).toContain("P(1, 3)");
    expect(shown).toContain("x = (2×4 + 3×(−1)) ÷ 5 = 1");
    expect(shown).toContain("y = (2×(−3) + 3×7) ÷ 5 = 3");
  });

  it("hides P's coordinates with the words", () => {
    const hidden = render(results({ ax: -1, ay: 7, bx: 4, by: -3, m: 2, n: 3 }), ["section"]).texts();
    expect(hidden).toContain("P");
    expect(hidden.join(" ")).not.toContain("P(1, 3)");
  });
});

describe("Heron's formula", () => {
  it("shows s and the area for 3, 4, 5 and for the park", () => {
    const small = text(results({ sideA: 3, sideB: 4, sideC: 5 }), ["heron", "labels"]);
    expect(small).toContain("s = (3 + 4 + 5) ÷ 2 = 6");
    expect(small).toContain("area = √(6 × 3 × 2 × 1) = 6.00");
    expect(text(results({ sideA: 40, sideB: 24, sideC: 32 }), ["heron", "labels"])).toContain("area = √(48 × 8 × 24 × 16) = 384.00");
  });

  it("hides the area with the words, and says when the sticks cannot close", () => {
    expect(text(results({ sideA: 40, sideB: 24, sideC: 32 }), ["heron"])).not.toContain("384");
    expect(text(results({ sideA: 2, sideB: 3, sideC: 6 }), ["heron", "labels"])).toContain("these sticks make no triangle");
  });

  it("formats numbers briefly, with a real minus sign", () => {
    expect([circleSchoolShort(1.5), circleSchoolShort(-3), circleSchoolShort(2 / 3), circleSchoolShort(-0)]).toEqual(["1.5", "−3", "0.67", "0"]);
  });
});

describe("on a phone", () => {
  const cases: [string[], Partial<CircleSchoolState>][] = [
    [["sweep", "labels"], { radius: 28, gap: 30 }],
    [["sweep", "labels"], { radius: 1, gap: 0.5 }],
    [["spoke", "labels"], { radius: 5, touch: 0, tilt: 30 }],
    [["spoke", "labels"], { radius: 5, touch: 180, tilt: 90 }],
    [["outside", "labels"], { radius: 7, dist: 25 }],
    [["outside", "labels"], { radius: 1, dist: 30 }],
    [["outside", "labels"], { radius: 28, dist: 29 }],
    [["sector", "labels"], { radius: 21, theta: 300 }],
    [["section", "labels"], { ax: -10, ay: 10, bx: 10, by: -10, m: 1, n: 10 }],
    [["heron", "labels"], { sideA: 130, sideB: 129, sideC: 2 }],
    [["heron", "labels"], { sideA: 40, sideB: 24, sideC: 32 }],
    [["heron", "labels"], { sideA: 1, sideB: 2, sideC: 130 }],
  ];

  it.each(cases)("keeps %j inside a 325 px canvas", (layers, state) => {
    const layout = computeCircleSchoolLayout(325, new Set(layers));
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    const rec = render(results(state), layers, 325);
    for (const call of rec.of("fillText")) {
      const [words, x, y] = call.args as [string, number, number];
      expect(words.length, words).toBeLessThanOrEqual(55);
      // Every tag is centred, measured at 6 px a character by the recorder.
      expect(x - (words.length * 6) / 2, words).toBeGreaterThanOrEqual(0);
      expect(x + (words.length * 6) / 2, words).toBeLessThanOrEqual(325);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(layout.height);
    }
    for (const call of rec.of("arc")) {
      const [x, y, r] = call.args as [number, number, number];
      expect(x - r).toBeGreaterThanOrEqual(0);
      expect(x + r).toBeLessThanOrEqual(325);
      expect(y - r).toBeGreaterThanOrEqual(0);
      expect(y + r).toBeLessThanOrEqual(layout.height);
    }
  });
});
