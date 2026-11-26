import { optimiseModel, type OptimiseParams, type OptimiseState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeOptimiseLayout, optimiseRenderer } from "./optimise/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: OptimiseState = { x: 1, px: -2, a: 0, b: 2, size: 1 };
const results = (params: Partial<OptimiseParams> = {}, state: Partial<OptimiseState> = {}) =>
  optimiseModel.derive({ ...base, ...state }, { ...optimiseModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  optimiseRenderer.draw(rec.ctx, computeOptimiseLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("the design view", () => {
  it("draws the object and says which way to go", () => {
    const low = render(results({ problem: "box" }, { x: 1 }), ["design", "labels"]).texts();
    expect(low).toEqual(expect.arrayContaining(["Open box from a 12 cm square", "x", "12 − 2x", "volume / cm³, against cut x"]));
    expect(low.join(" ")).toContain("volume 100.0 cm³ · slope +60.0: a bigger x does better");
    expect(render(results({ problem: "box" }, { x: 4 }), ["design", "labels"]).texts().join(" ")).toContain("a smaller x does better");
    expect(render(results({ problem: "box" }, { x: 2 }), ["design", "labels"]).texts().join(" ")).toContain("volume 128.0 cm³ · flat: this is the best");
  });

  it("turns the advice round for a minimum", () => {
    expect(render(results({ problem: "can" }, { x: 3 }), ["design", "labels"]).texts().join(" ")).toContain("a bigger x does better");
    expect(render(results({ problem: "can" }, { x: 9 }), ["design", "labels"]).texts().join(" ")).toContain("a smaller x does better");
    expect(render(results({ problem: "fence" }, { x: 10 }), ["design", "labels"]).texts()).toEqual(expect.arrayContaining(["wall", "40 − 2x"]));
  });

  it("never marks the best on the graph, and hides the verdict with the words", () => {
    const hidden = render(results({ problem: "fence" }, { x: 5 }), ["design"]).texts().join(" ");
    expect(hidden).not.toMatch(/slope|best|area 1/);
  });

  it("cuts four corners out of the sheet", () => {
    // The sheet, its four corners, and nothing else filled.
    expect(render(results({ problem: "box" }, { x: 2 }), ["design"]).of("fillRect")).toHaveLength(5);
  });
});

describe("the rising view", () => {
  it("colours a strip by the sign of f′, one piece between each pair of turning points", () => {
    const cubic = render(results({ curve: "cubic" }, { px: 2 }), ["curve", "strip", "labels"]);
    expect(cubic.of("fillRect")).toHaveLength(3);
    expect(cubic.texts().filter((t) => t === "+")).toHaveLength(2);
    expect(cubic.texts().filter((t) => t === "−")).toHaveLength(1);
    expect(cubic.texts().join(" ")).toContain("slope 9.00: rising · normal slope −0.11");
    expect(render(results({ curve: "quartic" }, { px: 0 }), ["curve", "strip", "labels"]).of("fillRect")).toHaveLength(4);
  });

  it("names a turning point", () => {
    expect(render(results({ curve: "cubic" }, { px: -1 }), ["curve", "strip", "labels"]).texts().join(" ")).toContain("flat: a maximum · normal vertical");
    expect(render(results({ curve: "cubic" }, { px: 1 }), ["curve", "strip", "labels"]).texts().join(" ")).toContain("flat: a minimum");
  });
});

describe("the mean-value view", () => {
  it("draws the chord and says when the tangent is parallel to it", () => {
    const near = render(results({ curve: "cubic" }, { a: 0, b: 2, px: 1.15 }), ["curve", "chord", "labels"]).texts();
    expect(near).toEqual(expect.arrayContaining(["a", "b"]));
    expect(near.join(" ")).toContain("chord slope 1.00 · tangent slope 0.97: parallel");
    expect(render(results({ curve: "cubic" }, { a: 0, b: 2, px: 0.4 }), ["curve", "chord", "labels"]).texts().join(" ")).toContain("not parallel yet");
  });
});

describe("the rates view", () => {
  it("gives the linked rate for each scene", () => {
    const ladder = render(results({ scene: "ladder" }, { size: 3 }), ["scene", "labels"]).texts();
    expect(ladder).toEqual(expect.arrayContaining(["x = 3.00 m", "y = 4.00 m"]));
    expect(ladder.join(" ")).toContain("foot out at 1 m/s → top falls at 0.75 m/s");
    expect(render(results({ scene: "balloon" }, { size: 5 }), ["scene", "labels"]).texts().join(" ")).toContain("radius grows at 0.32 cm/s");
    expect(render(results({ scene: "ripple" }, { size: 4 }), ["scene", "labels"]).texts().join(" ")).toContain("area grows at 12.6 m²/s");
  });

  it("hides the linked rate with the words", () => {
    expect(render(results({ scene: "ladder" }, { size: 3 }), ["scene"]).texts().join(" ")).not.toContain("falls at");
  });

  it("keeps the ladder and its labels on a phone's canvas", () => {
    for (const size of [0.5, 3, 4.8]) {
      const rec = render(results({ scene: "ladder" }, { size }), ["scene", "labels"], 325);
      for (const call of rec.of("fillText")) {
        const [text, x] = call.args as [string, number];
        if (text.startsWith("y =")) expect(x + text.length * 6).toBeLessThanOrEqual(325);
        if (text.startsWith("x =")) expect(x - (text.length * 6) / 2).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
