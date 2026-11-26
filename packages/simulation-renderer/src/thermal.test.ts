import { milestones, thermalModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeThermalLayout, thermalRenderer, vesselGeometry } from "./thermal/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const layout = computeThermalLayout(900);
const P = thermalModel.defaultParams;
const results = (heat: number, over: Partial<typeof P> = {}) => thermalModel.derive({ heat }, { ...P, ...over });
const marks = milestones(P);

const ALL = ["vessel", "contents", "heater", "thermometer", "curve", "plateaus", "labels"];

const render = (heat: number, over = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  thermalRenderer.draw(rec.ctx, layout, {
    results: results(heat, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("thermal layout", () => {
  it("gives the vessel the whole box when the curve is hidden", () => {
    const without = computeThermalLayout(900, false);
    expect(without.chart.height).toBe(0);
    expect(without.scene.width).toBeGreaterThan(layout.scene.width);
  });

  it("puts the curve beside the vessel on a desk, below it on a phone", () => {
    expect(layout.chart.x).toBeGreaterThan(layout.scene.x + layout.scene.width);
    const narrow = computeThermalLayout(380);
    expect(narrow.compact).toBe(true);
    expect(narrow.chart.y).toBeGreaterThan(narrow.scene.y + narrow.scene.height);
  });

  it("leaves room under the vessel for the heater", () => {
    const vessel = vesselGeometry(layout);
    expect(vessel.bottom).toBeLessThan(layout.scene.y + layout.scene.height);
    expect(vessel.tube.x).toBeGreaterThan(vessel.right);
  });
});

describe("what the thermal renderer draws", () => {
  it("reports the model's own temperature and heat", () => {
    const texts = render(2100).texts().join(" ");
    expect(texts).toContain("−10.0 °C");
    expect(texts).toContain("2.1 kJ in");
    expect(texts).toContain("10.0 kW");
  });

  it("names the phase, and counts the change while it is happening", () => {
    expect(render(0).texts().join(" ")).toContain("solid");
    const halfMelted = (marks.toMelting + marks.melted) / 2;
    expect(render(halfMelted).texts().join(" ")).toContain("melting — 50 % of it has turned to liquid");
    expect(render(marks.melted + 5000).texts().join(" ")).toContain("liquid");
    const halfBoiled = (marks.toBoiling + marks.boiled) / 2;
    expect(render(halfBoiled).texts().join(" ")).toContain("boiling — 50 % of it has boiled away");
  });

  it("marks both plateaus with the energy they swallow", () => {
    const texts = render(0).texts();
    // 0.1 kg of ice: 33 kJ to melt, 226 kJ to boil away.
    expect(texts).toContain("melting: 33 kJ");
    expect(texts).toContain("boiling: 226 kJ");
  });

  it("shows the thermometer's two marked temperatures", () => {
    const texts = render(0).texts();
    expect(texts).toContain("melts 0");
    expect(texts).toContain("boils 100");
    expect(render(0, { substance: "lead" }).texts()).toContain("melts 327");
  });

  it("empties the vessel as the liquid boils away", () => {
    // The solid block is stroked; once it has all melted, nothing is.
    const cold = render(0, {}, ["contents"]);
    const liquid = render(marks.melted + 5000, {}, ["contents"]);
    expect(cold.of("stroke").length).toBeGreaterThan(liquid.of("stroke").length);
    // Vapour is drawn as a handful of dots once boiling has begun.
    const boiling = render((marks.toBoiling + marks.boiled) / 2, {}, ["contents"]);
    expect(boiling.of("arc").length).toBeGreaterThan(liquid.of("arc").length);
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render(5000, {}, ["vessel"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("clicking along the curve puts that much heat in", () => {
    const r = results(0);
    const hit = thermalRenderer.pick!(layout, layout.chart.x + layout.chart.width / 2, layout.chart.y + 40, undefined, r);
    expect(hit?.region).toBe("curve");
    expect(hit?.writes[0]!.variable).toBe("heat");
    expect(hit?.writes[0]!.value).toBeCloseTo(r.totalHeat / 2, 3);
  });

  it("never asks for negative heat, or more than the run holds", () => {
    const r = results(0);
    const before = thermalRenderer.pick!(layout, layout.chart.x - 6, layout.chart.y + 40, undefined, r);
    expect(before!.writes[0]!.value).toBeGreaterThanOrEqual(0);
    const after = thermalRenderer.pick!(layout, layout.chart.x + layout.chart.width + 6, layout.chart.y + 40, undefined, r);
    expect(after!.writes[0]!.value).toBeLessThanOrEqual(r.totalHeat);
  });

  it("finds nothing over by the vessel", () => {
    expect(thermalRenderer.pick!(layout, layout.scene.x + 10, layout.scene.y + 10, undefined, results(0))).toBeNull();
  });
});
