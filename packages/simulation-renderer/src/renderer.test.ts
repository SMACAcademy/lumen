import { describe, expect, it } from "vitest";
import { angleAtPixel, frameFor, pickTheta, toPixel } from "./unit-circle/geometry";
import { computeConstructionLayout } from "./unit-circle/layout";
import type { GraphDescriptor } from "./types";

const series = [{ channel: "sin", label: "sin θ", color: "#0af", dash: "solid" as const }];
const sine: GraphDescriptor = {
  id: "sine",
  role: "generated",
  orientation: "right",
  xLabel: "θ",
  yLabel: "sin θ",
  xDomain: [0, Math.PI * 2],
  xAxis: "angle",
  yDomain: [-1, 1],
  connector: true,
  series,
};
const cosine: GraphDescriptor = { ...sine, id: "cosine", orientation: "down", yLabel: "cos θ" };
const compare: GraphDescriptor = { ...sine, id: "compare", role: "compare", connector: false };

describe("construction layout", () => {
  it("keeps the circle fixed across modes", () => {
    const a = computeConstructionLayout(900, [sine]);
    const b = computeConstructionLayout(900, [cosine]);
    const c = computeConstructionLayout(900, [sine, cosine, compare]);
    expect(a.circle).toEqual(b.circle);
    expect(b.circle).toEqual(c.circle);
  });

  it("aligns the sine graph with the circle's vertical extent", () => {
    const l = computeConstructionLayout(900, [sine]);
    const rect = l.graphs.sine!;
    expect(rect.y).toBeCloseTo(l.circle.cy - l.circle.r, 9);
    expect(rect.height).toBeCloseTo(2 * l.circle.r, 9);
    expect(rect.x).toBeGreaterThan(l.circle.cx + l.circle.r);
    expect(rect.x + rect.width).toBeLessThanOrEqual(900);
  });

  it("aligns the cosine graph with the circle's horizontal extent", () => {
    const l = computeConstructionLayout(900, [cosine]);
    const rect = l.graphs.cosine!;
    expect(rect.x).toBeCloseTo(l.circle.cx - l.circle.r, 9);
    expect(rect.width).toBeCloseTo(2 * l.circle.r, 9);
    expect(rect.y).toBeGreaterThan(l.circle.cy + l.circle.r);
    expect(l.height).toBeGreaterThan(rect.y + rect.height);
  });

  it("fits a phone-width screen without overflow", () => {
    const l = computeConstructionLayout(343, [sine, cosine, compare]);
    expect(l.compact).toBe(true);
    for (const rect of Object.values(l.graphs)) {
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(343);
    }
  });

  it("gives the sine graph the circle's scale, so connectors are horizontal", () => {
    const l = computeConstructionLayout(900, [sine]);
    const frame = frameFor(l, "sine")!;
    for (const v of [-1, -0.5, 0, 0.7071, 1]) {
      expect(frame.valueToPixel(v)).toBeCloseTo(toPixel(l.circle, 0, v)[1], 9);
    }
  });

  it("gives the cosine graph the circle's scale, so connectors are vertical", () => {
    const l = computeConstructionLayout(900, [cosine]);
    const frame = frameFor(l, "cosine")!;
    for (const v of [-1, 0, 0.5, 1]) {
      expect(frame.valueToPixel(v)).toBeCloseTo(toPixel(l.circle, v, 0)[0], 9);
    }
  });
});

describe("geometry and picking", () => {
  const l = computeConstructionLayout(900, [sine, cosine]);
  const { circle } = l;

  it("maps maths coordinates to pixels with y pointing up", () => {
    expect(toPixel(circle, 0, 0)).toEqual([circle.cx, circle.cy]);
    expect(toPixel(circle, 1, 0)).toEqual([circle.cx + circle.r, circle.cy]);
    expect(toPixel(circle, 0, 1)).toEqual([circle.cx, circle.cy - circle.r]);
  });

  it("reads angles from pixels", () => {
    expect(angleAtPixel(circle, circle.cx + 10, circle.cy)).toBe(0);
    expect(angleAtPixel(circle, circle.cx, circle.cy - 10)).toBeCloseTo(Math.PI / 2, 12);
    expect(angleAtPixel(circle, circle.cx, circle.cy + 10)).toBeCloseTo((3 * Math.PI) / 2, 12);
  });

  it("picks θ by dragging the point or scrubbing a graph", () => {
    const onCircle = pickTheta(l, circle.cx - circle.r, circle.cy);
    expect(onCircle?.region).toBe("circle");
    expect(onCircle?.writes[0]?.value).toBeCloseTo(Math.PI, 9);

    const rect = l.graphs.sine!;
    const onGraph = pickTheta(l, rect.x + rect.width / 4, rect.y + 10);
    expect(onGraph?.region).toBe("sine");
    expect(onGraph?.writes[0]?.value).toBeCloseTo(Math.PI / 2, 9);

    const down = l.graphs.cosine!;
    const onCos = pickTheta(l, down.x + 5, down.y + down.height / 2);
    expect(onCos?.region).toBe("cosine");
    expect(onCos?.writes[0]?.value).toBeCloseTo(Math.PI, 9);

    expect(pickTheta(l, 899, 5)).toBeNull();
  });

  it("keeps following the pointer in the locked region while dragging", () => {
    // Far outside the circle, but the drag started on it.
    const far = pickTheta(l, circle.cx, circle.cy - 2000, "circle");
    expect(far?.writes[0]?.value).toBeCloseTo(Math.PI / 2, 9);
    const rect = l.graphs.sine!;
    const beyond = pickTheta(l, rect.x + rect.width + 500, 0, "sine");
    expect(beyond?.writes[0]?.value).toBeLessThan(Math.PI * 2);
    expect(beyond?.writes[0]?.value).toBeGreaterThan(Math.PI * 2 - 1e-6);
  });
});
