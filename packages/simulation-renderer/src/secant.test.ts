import { secantModel } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSecantLayout, secantRenderer } from "./secant/renderer";
import { createPlane } from "./shared/plane";
import type { GraphDescriptor } from "./types";

const graph: GraphDescriptor = {
  id: "slope-vs-h",
  role: "plot",
  orientation: "right",
  xLabel: "h",
  yLabel: "slope",
  xDomain: [-2, 2],
  xAxis: "linear",
  yDomain: [-3, 3],
  traceOffset: -2,
  connector: false,
  series: [{ channel: "secantSlope", label: "m", color: "#fb923c", dash: "solid" }],
};
const results = secantModel.derive({ x0: 1, h: 1.5, time: 0 }, secantModel.defaultParams);

describe("secant layout", () => {
  it("puts the slope graph beside the curve on wide screens and below on narrow ones", () => {
    const wide = computeSecantLayout(1000, [graph]);
    expect(wide.graphRect!.x).toBeGreaterThan(wide.planeRect.x + wide.planeRect.width);
    const narrow = computeSecantLayout(375, [graph]);
    expect(narrow.graphRect!.y).toBeGreaterThan(narrow.planeRect.y + narrow.planeRect.height);
    for (const l of [wide, narrow]) expect(l.graphRect!.x + l.graphRect!.width).toBeLessThanOrEqual(l.width);
  });
});

describe("secant picking", () => {
  const layout = computeSecantLayout(1000, [graph]);
  const plane = createPlane(layout.planeRect, [-3, 3], [-2, 9]); // quadratic view

  it("dragging near Q changes h; elsewhere on the plane moves P", () => {
    const [qx, qy] = plane.toPx(2.5, 6.25);
    const q = secantRenderer.pick!(layout, qx + 3, qy, undefined, results);
    expect(q?.region).toBe("Q");
    expect(q?.writes[0]?.variable).toBe("h");
    const [ex, ey] = plane.toPx(-1, 4);
    const p = secantRenderer.pick!(layout, ex, ey, undefined, results);
    expect(p?.region).toBe("P");
    expect(p?.writes[0]).toEqual({ variable: "x0", value: expect.closeTo(-1, 6) });
  });

  it("clicking the slope graph jumps h", () => {
    const g = layout.graphRect!;
    const hit = secantRenderer.pick!(layout, g.x + g.width * 0.75, g.y + 20, undefined, results);
    expect(hit?.region).toBe("graph");
    expect(hit?.press).toBe("jump");
    expect(hit?.writes[0]?.value).toBeCloseTo(1, 6);
  });
});
