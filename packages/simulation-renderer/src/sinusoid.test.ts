import { sinusoidModel } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { MAX_AMPLITUDE, computeSinusoidLayout, sinusoidFrame, sinusoidRenderer } from "./sinusoid/renderer";
import type { GraphDescriptor } from "./types";

const TAU = Math.PI * 2;
const plot: GraphDescriptor = {
  id: "plot",
  role: "plot",
  orientation: "right",
  xLabel: "x",
  yLabel: "y",
  xDomain: [-TAU, TAU],
  xAxis: "angle",
  yDomain: [-4, 4],
  traceOffset: -TAU,
  connector: true,
  series: [{ channel: "y", label: "y", color: "#a78bfa", dash: "solid" }],
};

const results = (params: Partial<typeof sinusoidModel.defaultParams> = {}, x = 0) =>
  sinusoidModel.derive({ x, time: 0 }, { ...sinusoidModel.defaultParams, ...params });

describe("sinusoid layout", () => {
  it("fits the largest generating circle left of the plot", () => {
    for (const width of [343, 700, 1000]) {
      const l = computeSinusoidLayout(width, [plot]);
      expect(l.circleCx - MAX_AMPLITUDE * l.ppu).toBeGreaterThanOrEqual(0);
      expect(l.circleCx + MAX_AMPLITUDE * l.ppu).toBeLessThan(l.plot.x);
      expect(l.plot.x + l.plot.width).toBeLessThanOrEqual(width);
    }
  });

  it("shares the vertical scale between the circle and the plot", () => {
    const l = computeSinusoidLayout(900, [plot]);
    const f = sinusoidFrame(l);
    expect(f.valueToPixel(0) - f.valueToPixel(1)).toBeCloseTo(l.ppu, 9);
  });
});

describe("sinusoid picking", () => {
  const l = computeSinusoidLayout(900, [plot]);
  const f = sinusoidFrame(l);

  it("clicking the plot jumps the probe to that x", () => {
    const hit = sinusoidRenderer.pick!(l, f.coordinateToPixel(Math.PI), f.valueToPixel(0), undefined, results());
    expect(hit?.region).toBe("plot");
    expect(hit?.press).toBe("jump");
    expect(hit?.writes[0]?.value).toBeCloseTo(Math.PI, 6);
  });

  it("turning the circle moves x so that ωx + φ matches the pointer angle", () => {
    const r = results({ omega: 2 });
    const cy = f.valueToPixel(0);
    // Pointer straight above the centre: angle π/2 → x = π/4 when ω = 2, φ = 0.
    const hit = sinusoidRenderer.pick!(l, l.circleCx, cy - 30, undefined, r);
    expect(hit?.region).toBe("circle");
    expect(hit?.writes[0]?.value).toBeCloseTo(Math.PI / 4, 9);
  });
});
