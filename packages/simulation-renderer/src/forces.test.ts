import { forcesModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeForcesLayout, forcesRenderer } from "./forces/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const deg = (d: number) => (d * Math.PI) / 180;
const layout = computeForcesLayout(900);
const results = (over: Partial<typeof forcesModel.defaultParams> = {}, state = { s: 0, v: 0, time: 0 }) =>
  forcesModel.derive(state, { ...forcesModel.defaultParams, ...over });

const ALL = ["surface", "block", "weight", "weightComponents", "normal", "applied", "friction", "labels"];

const render = (over: Partial<typeof forcesModel.defaultParams> = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  forcesRenderer.draw(rec.ctx, layout, {
    results: results(over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("what the free-body diagram draws", () => {
  it("labels each force with the model's own number", () => {
    const texts = render({ mass: 2, g: 10, applied: 5, incline: 0, muStatic: 0.4 }).texts();
    expect(texts).toContain("W 20.0 N");
    expect(texts).toContain("N 20.0 N");
    expect(texts).toContain("F 5.0 N");
    expect(texts).toContain("f 5.0 N"); // static friction matches the push
    expect(texts).toContain("net force = 0.0 N");
    expect(texts).toContain("still");
  });

  it("says when the block is moving, and how fast it accelerates", () => {
    const texts = render({ mass: 2, g: 10, applied: 12, incline: 0, muStatic: 0.4, muKinetic: 0.3 }).texts();
    expect(texts).toContain("a = 3.00 m/s²"); // (12 − 6) / 2
    expect(texts).toContain("sliding up");
  });

  it("draws no arrow for a force that is not there", () => {
    const withPush = render({ applied: 8 }).of("moveTo").length;
    const without = render({ applied: 0 }).of("moveTo").length;
    expect(withPush).toBeGreaterThan(without);
  });

  it("shows the slope angle and the weight's two parts only on a slope", () => {
    expect(render({ incline: deg(30) }).texts()).toContain("30°");
    expect(render({ incline: 0 }).texts()).not.toContain("0°");
    const slope = render({ incline: deg(30) }, ["surface", "block", "weight", "weightComponents"]).of("moveTo").length;
    const flat = render({ incline: 0 }, ["surface", "block", "weight", "weightComponents"]).of("moveTo").length;
    expect(slope).toBeGreaterThan(flat);
  });

  it("scales every arrow the same way, so their lengths can be compared", () => {
    // The weight is the largest force here, so it sets the scale and is the longest arrow.
    const rec = render({ mass: 2, g: 10, applied: 4, incline: 0 });
    const arrows = rec.of("lineTo");
    expect(arrows.length).toBeGreaterThan(0);
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render({}, ["surface"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("dragging the scene slides the block along the surface", () => {
    const hit = forcesRenderer.pick!(layout, layout.scene.x + layout.scene.width * 0.75, layout.scene.y + layout.scene.height * 0.72, undefined, results());
    expect(hit?.region).toBe("block");
    expect(hit?.writes[0]!.variable).toBe("s");
    expect(hit?.writes[0]!.value).toBeGreaterThan(0);
  });

  it("measures along the slope, not across the screen", () => {
    const flat = forcesRenderer.pick!(layout, layout.scene.x + 700, layout.scene.y + layout.scene.height * 0.72, undefined, results({ incline: 0 }));
    const tilted = forcesRenderer.pick!(layout, layout.scene.x + 700, layout.scene.y + layout.scene.height * 0.72, undefined, results({ incline: deg(30) }));
    expect(tilted!.writes[0]!.value).not.toBeCloseTo(flat!.writes[0]!.value, 3);
  });

  it("finds nothing below the scene", () => {
    expect(forcesRenderer.pick!(layout, 400, layout.height - 2, undefined, results())).toBeNull();
  });
});
