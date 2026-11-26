import { unitCircleModel } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";
import { computeConstructionLayout } from "./unit-circle/layout";
import { unitCircleRenderer } from "./unit-circle/renderer";

const results = (theta: number) => unitCircleModel.derive({ theta, time: 0 }, unitCircleModel.defaultParams);
const RADIANS = ["axes", "circle", "radius", "angleArc", "arc", "point", "specialAngles"];

const render = (theta: number, layers: string[], width = 325) => {
  const rec = recordingContext();
  const layout = computeConstructionLayout(width, []);
  unitCircleRenderer.draw(rec.ctx, layout, {
    results: results(theta),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return { rec, layout };
};

describe("unit-circle arc layer (radians)", () => {
  it("draws the arc the point has travelled and names it s", () => {
    const { rec, layout } = render(Math.PI, RADIANS);
    const arcs = rec.of("arc").filter((c) => c.args[2] === layout.circle.r && c.args[4] !== 0);
    // The arc along the circle itself, from 0 to −θ (canvas angles run clockwise).
    expect(arcs.some((c) => Math.abs((c.args[4] as number) + Math.PI) < 1e-9)).toBe(true);
    expect(rec.texts()).toContain("s");
  });

  it("shows the arc length only when labels are on", () => {
    expect(render(Math.PI, RADIANS).rec.texts().some((t) => t.startsWith("s ="))).toBe(false);
    const labelled = render(Math.PI, [...RADIANS, "labels"]).rec.texts();
    expect(labelled).toContain("s = 3.142");
    expect(labelled).toContain("θ = 180°");
    expect(render(1, [...RADIANS, "labels"]).rec.texts()).toContain("s = 1.000");
  });

  it("draws no arc at θ = 0 and none outside the radians layer", () => {
    expect(render(0, RADIANS).rec.texts()).not.toContain("s");
    expect(render(Math.PI, ["axes", "circle", "point", "labels"]).rec.texts().some((t) => t.startsWith("s"))).toBe(false);
  });

  it("keeps every label inside a 325 px canvas", () => {
    for (const theta of [0.3, 1, Math.PI / 2, 2.5, Math.PI, 4.5, 5.8]) {
      const { rec, layout } = render(theta, [...RADIANS, "labels"]);
      for (const call of rec.of("fillText")) {
        const [text, x, y] = call.args as [string, number, number];
        // Right-aligned and left-aligned labels: allow for their measured width (6 px per char in the recorder).
        expect(x, text).toBeGreaterThanOrEqual(0);
        expect(x, text).toBeLessThanOrEqual(layout.width);
        expect(y, text).toBeGreaterThanOrEqual(0);
        expect(y, text).toBeLessThanOrEqual(layout.height);
      }
      const s = rec.of("fillText").find((c) => String(c.args[0]).startsWith("s ="))!;
      expect((s.args[1] as number) - 6 * String(s.args[0]).length).toBeGreaterThan(0);
    }
  });
});
