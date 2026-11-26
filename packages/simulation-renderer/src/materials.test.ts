import { materialsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeMaterialsLayout, magnificationFor, materialsRenderer } from "./materials/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const layout = computeMaterialsLayout(900);
const results = (load: number, over: Partial<typeof materialsModel.defaultParams> = {}) =>
  materialsModel.derive({ load }, { ...materialsModel.defaultParams, ...over });

const ALL = ["wire", "weight", "ruler", "curve", "points", "compare", "labels"];

const render = (load: number, over = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  materialsRenderer.draw(rec.ctx, layout, {
    results: results(load, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("materials layout", () => {
  it("gives the wire the whole box when the curve is hidden", () => {
    const without = computeMaterialsLayout(900, false);
    expect(without.chart.height).toBe(0);
    expect(without.scene.width).toBeGreaterThan(layout.scene.width);
  });

  it("puts the curve beside the wire on a desk, below it on a phone", () => {
    expect(layout.chart.x).toBeGreaterThan(layout.scene.x + layout.scene.width);
    const narrow = computeMaterialsLayout(380);
    expect(narrow.compact).toBe(true);
    expect(narrow.chart.y).toBeGreaterThan(narrow.scene.y + narrow.scene.height);
  });
});

describe("magnifying a stretch too small to see", () => {
  it("picks a round factor that keeps the stretch inside the space there is", () => {
    expect(magnificationFor(0.4, 60)).toBe(100); // 0.4 px × 100 = 40 px
    expect(magnificationFor(30, 60)).toBe(2);
    expect(magnificationFor(80, 60)).toBe(1); // already too big to magnify
    expect(magnificationFor(0, 60)).toBe(1);
  });

  it("says so on the drawing whenever it has magnified", () => {
    // A steel wire barely stretches, so the factor has to be stated.
    expect(render(100).texts().join(" ")).toContain("stretch shown ×");
  });
});

describe("what the materials renderer draws", () => {
  it("reports the model's own stress and strain", () => {
    const texts = render(120).texts().join(" ");
    const r = results(120);
    expect(texts).toContain(`σ = ${(r.stress / 1e6).toFixed(1)} MPa`);
    expect(texts).toContain("ε = ");
    expect(texts).toContain("120 N");
  });

  it("says whether the wire will spring back", () => {
    expect(render(50).texts().join(" ")).toContain("elastic — it springs back");
    const yieldLoad = results(0).yieldLoad;
    expect(render(yieldLoad * 1.2).texts().join(" ")).toContain("past its elastic limit");
    expect(render(results(0).breakingLoad * 1.1).texts().join(" ")).toContain("broken");
  });

  it("draws the wire in two pieces once it has gone", () => {
    const whole = render(100, {}, ["wire"]);
    const snapped = render(results(0).breakingLoad * 1.1, {}, ["wire"]);
    // The clamp plus one wire, against the clamp plus two halves.
    expect(snapped.of("lineTo").length).toBeGreaterThan(whole.of("lineTo").length);
  });

  it("marks the elastic limit and the breaking point on the curve", () => {
    const texts = render(100).texts();
    expect(texts).toContain("elastic limit");
    expect(texts).toContain("breaks");
    expect(texts).toContain("strain %");
    expect(texts).toContain("stress MPa");
  });

  it("brittle glass has no separate elastic limit to mark", () => {
    const texts = render(10, { material: "glass" }).texts();
    expect(texts).toContain("breaks");
    expect(texts).not.toContain("elastic limit");
  });

  it("shows the other materials faintly when asked, but not a ghost of this one", () => {
    const texts = render(100, {}, ["curve", "compare", "labels"]).texts();
    for (const name of ["copper", "nylon", "glass", "aluminium"]) expect(texts).toContain(name);
    expect(texts).not.toContain("steel"); // the wire itself is the solid curve
    expect(render(100, {}, ["curve", "labels"]).texts()).not.toContain("nylon");
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render(100, {}, ["wire"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("clicking the curve hangs the load that reaches that stress", () => {
    const r = results(0);
    const ultimate = r.ultimateStress / 1e6;
    // Half way up the chart is half of the top of the scale, in MPa.
    const y = layout.chart.y + layout.chart.height / 2;
    const hit = materialsRenderer.pick!(layout, layout.chart.x + 40, y, undefined, r);
    expect(hit?.region).toBe("curve");
    expect(hit?.writes[0]!.variable).toBe("load");
    const expected = ((ultimate * 1.25) / 2) * 1e6 * r.area;
    expect(hit?.writes[0]!.value).toBeCloseTo(expected, 6);
  });

  it("never asks for a negative load", () => {
    const r = results(0);
    const below = materialsRenderer.pick!(layout, layout.chart.x + 40, layout.chart.y + layout.chart.height + 6, undefined, r);
    expect(below!.writes[0]!.value).toBeGreaterThanOrEqual(0);
  });

  it("finds nothing away from the curve", () => {
    expect(materialsRenderer.pick!(layout, layout.scene.x + 10, layout.scene.y + 10, undefined, results(0))).toBeNull();
  });
});
