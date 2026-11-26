import { limitModel, type LimitParams, type LimitState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeLimitLayout, limitRenderer, plotFunction, zoomPlane } from "./limit/renderer";
import { createPlane } from "./shared/plane";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: LimitState = { h: 1, epsilon: 0.5, zoom: 0 };
const results = (params: Partial<LimitParams> = {}, state: Partial<LimitState> = {}) =>
  limitModel.derive({ ...base, ...state }, { ...limitModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  limitRenderer.draw(rec.ctx, computeLimitLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const APPROACH = ["graph", "approach", "labels"];
const TRAP = ["graph", "band", "labels"];

describe("the approach view", () => {
  it("names the function and reads off both sides", () => {
    const texts = render(results({ function: "hole" }, { h: 0.01 }), APPROACH).texts();
    expect(texts).toContain("f(x) = (x² − 1) / (x − 1)");
    expect(texts.join(" ")).toContain("0.010 from x = 1: left 1.9900 · right 2.0100");
    expect(render(results({ function: "jump" }, { h: 0.01 }), APPROACH).texts().join(" ")).toContain("left −1.0000 · right 1.0000");
  });

  it("keeps the numbers off the drawing when the words are hidden", () => {
    expect(render(results({ function: "sinc" }, { h: 0.01 }), ["graph", "approach"]).texts().join(" ")).not.toMatch(/left|right/);
  });

  it("lifts the pen at a jump and at a missing value, so no false line is drawn", () => {
    const plane = createPlane({ x: 0, y: 0, width: 300, height: 200 }, [-3, 3], [-2, 2]);
    const pieces = (f: (x: number) => number) => {
      const rec = recordingContext();
      plotFunction(rec.ctx, plane, f, -3, 3, 60);
      return rec.of("moveTo").length;
    };
    expect(pieces((x) => x)).toBe(1);
    expect(pieces((x) => (x === 0 ? NaN : Math.sign(x)))).toBe(2);
    // Near a pole the curve also leaps between samples, off the top and bottom: more pieces, never fewer.
    expect(pieces((x) => (x === 0 ? NaN : 1 / x))).toBeGreaterThanOrEqual(2);
  });
});

describe("the trap view", () => {
  it("marks ε and δ and says whether the graph stays in the band", () => {
    const inside = render(results({ function: "hole" }, { h: 0.2, epsilon: 0.5 }), TRAP).texts();
    expect(inside).toEqual(expect.arrayContaining(["ε", "δ"]));
    expect(inside.join(" ")).toContain("δ = 0.200, ε = 0.50: the graph stays in the band");
    expect(render(results({ function: "hole" }, { h: 1, epsilon: 0.5 }), TRAP).texts().join(" ")).toContain("the graph escapes the band");
    expect(render(results({ function: "jump" }, { h: 0.001, epsilon: 0.5 }), TRAP).texts().join(" ")).toContain("escapes");
  });
});

describe("the zoom view", () => {
  it("says what the magnified curve looks like", () => {
    const words = (curve: LimitParams["curve"], zoom: number) => render(results({ curve }, { zoom }), ["zoom", "labels"]).texts().join(" ");
    expect(words("parabola", 3)).toContain("× 1000");
    expect(words("parabola", 3)).toContain("Slopes: left 2.00, right 2.00 — one straight line");
    expect(words("abs", 3)).toContain("Slopes: left −1.00, right 1.00 — still a corner");
    expect(words("cuberoot", 3)).toContain("ever steeper");
    expect(words("cusp", 2)).toContain("still a cusp");
    expect(words("parabola", 0)).not.toContain("—");
  });

  it("uses the same scale on both axes, so a slope looks like what it is", () => {
    const layout = computeLimitLayout(375);
    for (const zoom of [0, 1, 3]) {
      const plane = zoomPlane(layout, 1, 1, zoom);
      expect(plane.sx).toBeCloseTo(plane.sy, 8);
      expect(plane.toPx(1, 1)[0]).toBeCloseTo(layout.rect.x + layout.rect.width / 2, 8);
    }
  });

  it("hides the slopes with the words", () => {
    expect(render(results({ curve: "parabola" }, { zoom: 3 }), ["zoom"]).texts().join(" ")).not.toContain("Slopes");
  });
});
