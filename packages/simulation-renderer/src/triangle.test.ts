import { triangleModel } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeTriangleLayout, labelRoom, triangleFrame, triangleRenderer } from "./triangle/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (a: number, b: number) => triangleModel.derive({ a, b }, triangleModel.defaultParams);
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  triangleRenderer.draw(rec.ctx, computeTriangleLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the triangle renderer draws", () => {
  it("adds up the squares on the sides", () => {
    const texts = render(results(3, 4), ["triangle", "squares", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["9", "16", "25"]));
    expect(texts.join(" ")).toContain("9 + 16 = 25");
  });

  it("names the sides from θ", () => {
    const texts = render(results(4, 3), ["triangle", "ratios", "labels"]).texts().join(" ");
    expect(texts).toContain("opposite 3");
    expect(texts).toContain("adjacent 4");
    expect(texts).toContain("hypotenuse 5");
    expect(texts).toContain("sin θ = 0.600");
  });

  it("calls out a special angle", () => {
    expect(render(results(5, 5), ["triangle", "ratios", "labels"]).texts().join(" ")).toContain("A 45° triangle");
  });

  it("fits the triangle and all its squares on a phone, however long the legs", () => {
    const layout = computeTriangleLayout(375);
    for (const [a, b] of [[1, 12], [12, 1], [20, 20], [0.5, 0.5]] as const) {
      const { at } = triangleFrame(layout, a, b, true);
      for (const [x, y] of [at(-b, a), at(a + b, 0), at(a, -a), at(a - b, a + b), at(a + b, b)]) {
        expect(x).toBeGreaterThanOrEqual(layout.pad - 0.001);
        expect(x).toBeLessThanOrEqual(375 - layout.pad + 0.001);
        expect(y).toBeGreaterThanOrEqual(layout.pad - 0.001);
        expect(y).toBeLessThanOrEqual(layout.height - 34 + 0.001);
      }
    }
  });

  it("leaves room on a phone for the side names, flat or tall", () => {
    const layout = computeTriangleLayout(375);
    for (const [a, b] of [[4, 3], [20, 0.5], [0.5, 20], [12, 12]] as const) {
      const { at } = triangleFrame(layout, a, b, false, labelRoom(layout));
      // "opposite 20.00" beside the height, "adjacent" under the base.
      expect(at(a, 0)[0] + 8 + "opposite 20.00".length * 6, `${a}, ${b}`).toBeLessThanOrEqual(375);
      expect(at(0, 0)[1] + 14 + 6, `${a}, ${b}`).toBeLessThanOrEqual(layout.height - 14 - 6);
    }
  });
});
