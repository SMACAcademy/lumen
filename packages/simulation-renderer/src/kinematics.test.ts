import { kinematicsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeKinematicsLayout, kinematicsRenderer } from "./kinematics/renderer";
import type { GraphDescriptor } from "./types";

const graph = (id: string, channel: string): GraphDescriptor => ({
  id,
  role: "generated",
  orientation: "right",
  xLabel: "t",
  yLabel: channel,
  xDomain: [0, 6],
  xAxis: "linear",
  yDomain: [-10, 10],
  connector: false,
  series: [{ channel, label: channel, color: "#fff", dash: "solid" }],
});

const graphs = [graph("position-time", "x"), graph("velocity-time", "v")];
const layout = computeKinematicsLayout(900, graphs);
const results = (t: number, over: Partial<typeof kinematicsModel.defaultParams> = {}) =>
  kinematicsModel.derive({ t }, { ...kinematicsModel.defaultParams, ...over });

describe("kinematics layout", () => {
  it("stacks the track above one box per graph", () => {
    expect(layout.track.y).toBeLessThan(layout.graphs[0]!.rect.y);
    expect(layout.graphs).toHaveLength(2);
    expect(layout.graphs[0]!.rect.y).toBeLessThan(layout.graphs[1]!.rect.y);
    expect(layout.height).toBeGreaterThan(layout.graphs[1]!.rect.y + layout.graphs[1]!.rect.height);
  });

  it("fits a phone without collapsing the track", () => {
    const narrow = computeKinematicsLayout(360, graphs);
    expect(narrow.compact).toBe(true);
    expect(narrow.track.width).toBeGreaterThan(200);
    expect(narrow.graphs[0]!.rect.width).toBe(narrow.track.width);
  });
});

describe("picking", () => {
  const r = results(2);

  it("scrubbing a graph jumps to that time", () => {
    const rect = layout.graphs[1]!.rect;
    const hit = kinematicsRenderer.pick!(layout, rect.x + rect.width / 2, rect.y + rect.height / 2, undefined, r);
    expect(hit?.region).toBe("graph:velocity-time");
    expect(hit?.press).toBe("jump");
    expect(hit?.writes[0]!.variable).toBe("t");
    expect(hit?.writes[0]!.value).toBeCloseTo(3, 1);
  });

  it("dragging the body finds the moment it was at that spot", () => {
    const laneY = layout.track.y + layout.track.height * 0.62;
    // Half-way along the track in pixels is somewhere in the middle of the journey.
    const hit = kinematicsRenderer.pick!(layout, layout.track.x + layout.track.width * 0.5, laneY, undefined, r);
    expect(hit?.region).toBe("track");
    const t = hit!.writes[0]!.value;
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(6);
  });

  it("finds nothing in the empty space beside the drawing", () => {
    expect(kinematicsRenderer.pick!(layout, 5, layout.height - 2, undefined, r)).toBeNull();
  });

  it("a drag that began on a graph keeps scrubbing that graph", () => {
    const rect = layout.graphs[0]!.rect;
    const hit = kinematicsRenderer.pick!(layout, rect.x - 40, rect.y - 60, "graph:position-time", r);
    expect(hit?.region).toBe("graph:position-time");
  });
});
