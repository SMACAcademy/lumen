import { collisionModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeCollisionsLayout, collisionsRenderer } from "./collisions/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const layout = computeCollisionsLayout(900);
const results = (t: number, over: Partial<typeof collisionModel.defaultParams> = {}) =>
  collisionModel.derive({ t }, { ...collisionModel.defaultParams, ...over });

const ALL = ["track", "carts", "velocities", "bars", "labels"];

const render = (t: number, over: Partial<typeof collisionModel.defaultParams> = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  collisionsRenderer.draw(rec.ctx, layout, {
    results: results(t, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("collisions layout", () => {
  it("puts the bars below the track, at any width", () => {
    expect(layout.bars.y).toBeGreaterThan(layout.track.y + layout.track.height);
    const narrow = computeCollisionsLayout(360);
    expect(narrow.compact).toBe(true);
    expect(narrow.bars.y).toBeGreaterThan(narrow.track.y + narrow.track.height);
  });
});

describe("what the collisions renderer draws", () => {
  it("labels both carts with their masses and velocities", () => {
    const texts = render(0, { m1: 2, m2: 1, u1: 3, u2: 0 }).texts();
    expect(texts).toContain("2.0 kg");
    expect(texts).toContain("1.0 kg");
    expect(texts).toContain("3.00 m/s");
  });

  it("says when the collision happens, and again once it has", () => {
    // 4 m apart, closing at 3 m/s.
    expect(render(0).texts().join(" ")).toContain("they meet at t = 1.33 s");
    expect(render(2).texts().join(" ")).toContain("they met at t = 1.33 s");
    expect(render(1, { u1: 0, u2: 2 }).texts().join(" ")).toContain("never meet");
  });

  it("shows momentum and energy before and after", () => {
    const texts = render(3, { m1: 2, m2: 1, u1: 3, u2: 0, restitution: 1 }).texts();
    expect(texts).toContain("momentum");
    expect(texts).toContain("kinetic energy");
    expect(texts).toContain("before");
    expect(texts).toContain("after");
    // Momentum is 6 kg m/s both sides of an elastic collision.
    expect(texts.filter((t) => t === "6.0 kg m/s").length).toBe(2);
  });

  it("mentions the lost energy only when some was lost", () => {
    expect(render(3, { restitution: 0 }).texts().join(" ")).toContain("lost as heat");
    expect(render(3, { restitution: 1 }).texts().join(" ")).not.toContain("lost as heat");
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render(1, {}, ["track"]).texts()).toEqual([]);
    expect(render(1, {}, ["track"]).of("roundRect")).toEqual([]);
  });
});

describe("picking", () => {
  it("dragging across the track scrubs through the run", () => {
    const early = collisionsRenderer.pick!(layout, layout.track.x + 50, layout.track.y + 40, undefined, results(0));
    const late = collisionsRenderer.pick!(layout, layout.track.x + layout.track.width - 50, layout.track.y + 40, undefined, results(0));
    expect(early?.region).toBe("track");
    expect(early!.writes[0]!.variable).toBe("t");
    expect(late!.writes[0]!.value).toBeGreaterThan(early!.writes[0]!.value);
  });

  it("scrubs far enough to see the collision and its aftermath", () => {
    const end = collisionsRenderer.pick!(layout, layout.track.x + layout.track.width, layout.track.y + 40, undefined, results(0));
    expect(end!.writes[0]!.value).toBeGreaterThan(results(0).collisionTime);
  });

  it("leaves the bars alone", () => {
    expect(collisionsRenderer.pick!(layout, layout.bars.x + 30, layout.bars.y + 40, undefined, results(0))).toBeNull();
  });
});
