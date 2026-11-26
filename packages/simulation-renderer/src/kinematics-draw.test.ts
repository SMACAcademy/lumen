import { kinematicsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeKinematicsLayout, kinematicsRenderer } from "./kinematics/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";
import type { GraphDescriptor } from "./types";

const graph = (id: string, channel: string, yLabel: string): GraphDescriptor => ({
  id,
  role: "generated",
  orientation: "right",
  xLabel: "t (s)",
  yLabel,
  xDomain: [0, 6],
  xAxis: "linear",
  yDomain: [-10, 10],
  connector: false,
  series: [{ channel, label: channel, color: "#abc", dash: "solid" }],
});

const params = { ...kinematicsModel.defaultParams, u: 4, a: -1, strobe: 0.5 };
const results = (t: number) => kinematicsModel.derive({ t }, params);

const render = (t: number, layers: string[], graphs: GraphDescriptor[]) => {
  const layout = computeKinematicsLayout(900, graphs);
  const rec = recordingContext();
  kinematicsRenderer.draw(rec.ctx, layout, {
    results: results(t),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs,
  });
  return { layout, rec };
};

const positionGraph = graph("position-time", "x", "x (m)");
const velocityGraph = graph("velocity-time", "v", "v (m/s)");

describe("what the kinematics renderer draws", () => {
  it("puts the body where the model says it is", () => {
    const { layout, rec } = render(2, ["track", "body", "labels"], [positionGraph]);
    // The body is the only large filled circle on the track lane.
    const laneY = layout.track.y + layout.track.height * 0.62;
    const body = rec.of("arc").find((c) => c.args[2] === 9 && Math.abs(Number(c.args[1]) - laneY) < 1);
    expect(body).toBeDefined();

    // At t = 2 s the body is at 6 m of a run spanning −6 m to 8 m, so it sits
    // three quarters of the way along the track.
    const r = results(2);
    expect(r.x).toBeCloseTo(6, 9);
    const span = r.xMax - r.xMin;
    const lo = r.xMin - span * 0.12;
    const hi = r.xMax + span * 0.12;
    const expected = layout.track.x + ((r.x - lo) / (hi - lo)) * layout.track.width;
    expect(Number(body!.args[0])).toBeCloseTo(expected, 6);
    expect(rec.texts()).toContain("t = 2.00 s");
  });

  it("leaves one ghost per strobe interval, and none ahead of the body", () => {
    // Circles on the track lane only: the graphs put a marker of their own on the curve.
    const at = (t: number) => {
      const { layout, rec } = render(t, ["track", "ghosts"], [positionGraph]);
      const laneY = layout.track.y + layout.track.height * 0.62;
      return rec.of("arc").filter((c) => Math.abs(Number(c.args[1]) - laneY) < 1).length;
    };
    expect(at(0)).toBe(1); // just the start
    expect(at(2)).toBe(5); // 0, 0.5, 1, 1.5, 2
    expect(at(2.4)).toBe(5); // no ghost until 2.5 s
  });

  it("draws the displacement arrow with the model's own number", () => {
    const { rec } = render(3, ["track", "body", "displacement", "labels"], [positionGraph]);
    expect(rec.texts()).toContain("s = 7.50 m");
  });

  it("shades the area under the velocity graph only when that layer is on", () => {
    const withArea = render(3, ["track", "area"], [velocityGraph]);
    const withoutArea = render(3, ["track"], [velocityGraph]);
    expect(withArea.rec.of("fill").length).toBeGreaterThan(withoutArea.rec.of("fill").length);
    // The shading is a closed path along the velocity curve.
    expect(withArea.rec.of("closePath").length).toBeGreaterThan(0);
  });

  it("scales each graph to its own quantity, and marks the current value", () => {
    const { rec } = render(2, ["track", "labels"], [positionGraph, velocityGraph]);
    const texts = rec.texts();
    expect(texts).toContain("x (m) = 6.00");
    expect(texts).toContain("v (m/s) = 2.00");
    expect(texts).toContain("position (m)");
  });

  it("draws nothing of a layer that is switched off", () => {
    const { layout, rec } = render(2, ["track"], [positionGraph]);
    const laneY = layout.track.y + layout.track.height * 0.62;
    expect(rec.texts()).not.toContain("t = 2.00 s");
    // No body and no ghosts on the lane; the graph's own marker is still there.
    expect(rec.of("arc").filter((c) => Math.abs(Number(c.args[1]) - laneY) < 1)).toEqual([]);
  });
});
