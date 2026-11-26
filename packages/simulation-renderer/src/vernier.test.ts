import { vernierModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";
import { computeVernierLayout, vernierRenderer } from "./vernier/renderer";

const layout = computeVernierLayout(900);
const results = (width: number, over: Partial<typeof vernierModel.defaultParams> = {}) =>
  vernierModel.derive({ width }, { ...vernierModel.defaultParams, ...over });

const ALL = ["instrument", "object", "mainScale", "vernierScale", "detail", "coincidence", "scaleNumbers", "readout"];
/** What the "no help" mode shows: the scales and the magnifier, nothing worked out. */
const BLIND = ["instrument", "object", "mainScale", "vernierScale", "detail", "scaleNumbers"];

const render = (width: number, layers: string[] = ALL, over: Partial<typeof vernierModel.defaultParams> = {}) => {
  const rec = recordingContext();
  vernierRenderer.draw(rec.ctx, layout, {
    results: results(width, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("vernier layout", () => {
  it("stacks the instrument, the scales and the magnifier", () => {
    expect(layout.tool.y + layout.tool.height).toBeLessThan(layout.zoom.y);
    expect(layout.zoom.y + layout.zoom.height).toBeLessThan(layout.detail.y);
    expect(layout.height).toBeGreaterThan(layout.detail.y + layout.detail.height);
  });

  it("stays usable on a phone", () => {
    const narrow = computeVernierLayout(360);
    expect(narrow.compact).toBe(true);
    expect(narrow.zoom.width).toBeGreaterThan(300);
  });
});

describe("what the calliper renderer draws", () => {
  it("reports the reading the model computed", () => {
    const texts = render(12.4).texts();
    expect(texts).toContain("least count = 0.100 mm");
    expect(texts).toContain("main scale = 12.0 mm");
    expect(texts).toContain("division 4 lines up");
    expect(texts).toContain("reading = 12.4 mm");
  });

  it("uses the decimals the least count justifies", () => {
    expect(render(24.86, ALL, { divisions: 50 }).texts()).toContain("reading = 24.86 mm");
  });

  it("magnifies the coincidence enough to see it: one least count is several pixels wide", () => {
    // A 50-division vernier resolves 0.02 mm, which is invisible at the scales view.
    const wide = computeVernierLayout(900);
    const spanOfDetail = 2.2; // mm, set by the renderer
    const pixelsPerLeastCount = (wide.detail.width / spanOfDetail) * 0.02;
    expect(pixelsPerLeastCount).toBeGreaterThan(4);
  });

  it("marks the coinciding division, and says nothing in the no-help mode", () => {
    // The callout up to the main scale is the only dashed line in the drawing.
    expect(render(12.4).of("setLineDash").length).toBeGreaterThan(0);
    expect(render(12.4, BLIND).of("setLineDash")).toEqual([]);
    expect(render(12.4, BLIND).texts().join(" ")).not.toContain("reading =");
  });

  it("never shows the true width while a reading is being asked for", () => {
    expect(render(24.85, BLIND, { divisions: 20 }).texts().join(" ")).not.toContain("object:");
    expect(render(24.85, ALL, { divisions: 20 }).texts().join(" ")).toContain("object: 24.850 mm");
  });

  it("keeps the numbers printed on the scales even when nothing is worked out", () => {
    const texts = render(24.85, BLIND, { divisions: 20 }).texts();
    expect(texts).toContain("24"); // the main scale is still numbered
    expect(texts).toContain("25");
    expect(texts).toContain("10"); // and so are the vernier divisions
  });

  it("shows the whole vernier scale, however many divisions it has", () => {
    // Every division gets a tick, in the scales view and again in the magnifier.
    const ticks = (divisions: number) => render(12.4, ["vernierScale", "mainScale"], { divisions }).of("moveTo").length;
    expect(ticks(50)).toBeGreaterThan(ticks(10));
  });

  it("shows the object between the jaws only when there is one", () => {
    expect(render(12.4).of("roundRect").length).toBeGreaterThan(render(0).of("roundRect").length);
  });
});

describe("picking", () => {
  it("dragging the instrument opens the jaws to that width", () => {
    const beamY = layout.tool.y + layout.tool.height * 0.42;
    const hit = vernierRenderer.pick!(layout, layout.tool.x + 30 + 200, beamY, undefined, results(12.4));
    expect(hit?.region).toBe("tool");
    expect(hit?.writes[0]!.variable).toBe("width");
    expect(hit?.writes[0]!.value).toBeGreaterThan(10);
  });

  it("the magnified scales are the fine adjustment", () => {
    const y = layout.zoom.y + 20;
    const at = (x: number) => vernierRenderer.pick!(layout, layout.zoom.x + x, y, undefined, results(12.4))!.writes[0]!.value;
    expect(vernierRenderer.pick!(layout, layout.zoom.x + 300, y, undefined, results(12.4))?.region).toBe("zoom");
    // The window spans 12 mm across ~870 px, so it resolves far better than a least count.
    const perPixel = at(301) - at(300);
    expect(perPixel).toBeGreaterThan(0);
    expect(perPixel).toBeLessThan(0.1);
  });

  it("the window follows the vernier zero, so a zero error does not shift the drag", () => {
    const y = layout.zoom.y + 20;
    const clean = vernierRenderer.pick!(layout, layout.zoom.x + 300, y, undefined, results(12.4));
    const biased = vernierRenderer.pick!(layout, layout.zoom.x + 300, y, undefined, results(12.4, { zeroError: 0.2 }));
    expect(biased!.writes[0]!.value).toBeCloseTo(clean!.writes[0]!.value, 9);
  });

  it("finds nothing below the scales", () => {
    expect(vernierRenderer.pick!(layout, 400, layout.height - 2, undefined, results(12.4))).toBeNull();
  });
});
