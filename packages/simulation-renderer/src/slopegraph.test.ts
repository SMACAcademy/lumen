import { slopeGraphModel, type SlopeGraphParams, type SlopeGraphState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSlopeGraphLayout, slopeGraphRenderer } from "./slopegraph/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (fn: SlopeGraphParams["function"], state: Partial<SlopeGraphState> = {}) => {
  const s: SlopeGraphState = { x: 1, n: 2, trailLo: 1, trailHi: 1, owner: fn, ...state };
  return slopeGraphModel.derive(s, { function: fn });
};
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  slopeGraphRenderer.draw(rec.ctx, computeSlopeGraphLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const SLOPE = ["curve", "tangent", "slope", "labels"];

describe("what the slope-graph renderer draws", () => {
  it("names the curve and reads off the slope at the point", () => {
    const texts = render(results("square", { x: 1 }), SLOPE).texts();
    expect(texts).toEqual(expect.arrayContaining(["y = x²", "slope of the tangent"]));
    expect(texts.join(" ")).toContain("At x = 1.00 the slope is 2.00");
    expect(render(results("power", { x: 1, n: 3 }), SLOPE).texts()).toContain("y = x³");
  });

  it("names the trail's formula only once the whole window has been covered", () => {
    const part = render(results("sine", { x: 0, trailLo: -2 * Math.PI, trailHi: 0 }), SLOPE).texts().join(" ");
    const whole = render(results("sine", { x: 2 * Math.PI, trailLo: -2 * Math.PI, trailHi: 2 * Math.PI }), SLOPE).texts().join(" ");
    expect(part).not.toContain("the trail is");
    expect(whole).toContain("the trail is y = cos x");
    expect(render(results("power", { x: 2, n: 3, trailLo: -2, trailHi: 2 }), SLOPE).texts()).toContain("the trail is y = 3x²");
  });

  it("draws a longer trail the further the point has been", () => {
    const points = (hi: number) => render(results("square", { x: hi, trailLo: -3, trailHi: hi }), SLOPE).of("lineTo").length;
    expect(points(2)).toBeGreaterThan(points(-2));
  });

  it("hides the trail, the slope and its formula when the words are hidden", () => {
    const shown = render(results("square", { x: 3, trailLo: -3, trailHi: 3 }), SLOPE);
    const hidden = render(results("square", { x: 3, trailLo: -3, trailHi: 3 }), ["curve", "tangent", "slope"]);
    expect(hidden.texts().join(" ")).not.toMatch(/the slope is|the trail is/);
    expect(hidden.of("lineTo").length).toBeLessThan(shown.of("lineTo").length);
  });

  it("says which way the curve bends in the bending view", () => {
    const words = (x: number) => render(results("cubic", { x }), ["curve", "tangent", "slope", "bend", "labels"]).texts().join(" ");
    expect(words(2)).toContain("f″ = 4.00: bending up, the slope is rising");
    expect(words(-2)).toContain("f″ = −4.00: bending down, the slope is falling");
    expect(words(0)).toContain("not bending here");
  });

  it("stacks the two plots without overlap on a phone", () => {
    const layout = computeSlopeGraphLayout(325);
    expect(layout.bottom.y).toBeGreaterThan(layout.top.y + layout.top.height + 20);
    expect(layout.bottom.y + layout.bottom.height).toBeLessThan(layout.height - 30);
    expect(layout.top.x + layout.top.width).toBeLessThanOrEqual(325);
    expect(layout.top.width).toBe(layout.bottom.width);
  });
});
