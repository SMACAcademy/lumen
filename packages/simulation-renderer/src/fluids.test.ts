import { fluidsModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeFluidsLayout, fluidsRenderer, tankGeometry } from "./fluids/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const layout = computeFluidsLayout(900);
const results = (depth: number, over: Partial<typeof fluidsModel.defaultParams> = {}) =>
  fluidsModel.derive({ depth }, { ...fluidsModel.defaultParams, ...over });

const ALL = ["fluid", "block", "forces", "probe", "push", "chart", "labels"];

const render = (depth: number, over = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  fluidsRenderer.draw(rec.ctx, layout, {
    results: results(depth, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("fluids layout", () => {
  it("gives the tank the whole box when the graph is hidden", () => {
    const without = computeFluidsLayout(900, false);
    expect(without.chart.height).toBe(0);
    expect(without.scene.width).toBeGreaterThan(layout.scene.width);
  });

  it("puts the graph beside the tank on a desk, below it on a phone", () => {
    expect(layout.chart.x).toBeGreaterThan(layout.scene.x + layout.scene.width);
    const narrow = computeFluidsLayout(380);
    expect(narrow.compact).toBe(true);
    expect(narrow.chart.y).toBeGreaterThan(narrow.scene.y + narrow.scene.height);
  });

  it("maps the surface to the top of the tank and the floor to the bottom", () => {
    const tank = tankGeometry(layout, 1.5);
    expect(tank.yAt(0)).toBe(tank.surface);
    expect(tank.yAt(1.5)).toBeCloseTo(tank.floor, 9);
    expect(tank.yAt(0.75)).toBeCloseTo((tank.surface + tank.floor) / 2, 9);
  });
});

describe("what the fluids renderer draws", () => {
  it("reports the model's own pressure and depth", () => {
    const texts = render(1).texts().join(" ");
    expect(texts).toContain("9.81 kPa"); // 1000 × 9.81 × 1 m
    expect(texts).toContain("h = 1.00 m");
    expect(texts).toContain("ρ = 1000 kg/m³");
  });

  it("says whether the block floats, and how much of it is under", () => {
    expect(render(0, { blockDensity: 600 }).texts().join(" ")).toContain("floats, 60 % under");
    expect(render(0, { blockDensity: 2500 }).texts().join(" ")).toContain("sinks");
  });

  it("draws the two forces on the block at their own sizes", () => {
    const texts = render(0, { blockDensity: 600 }).texts().join(" ");
    const r = results(0, { blockDensity: 600 });
    expect(texts).toContain(`W = ${r.weight.toFixed(1)} N`);
    expect(texts).toContain(`F = ${r.buoyantForce.toFixed(1)} N`);
  });

  it("puts a floating block at the surface and a sunken one on the floor", () => {
    const tank = tankGeometry(layout, 1.5);
    const topOf = (blockDensity: number) => {
      const r = results(0, { blockDensity });
      return tank.yAt(r.blockTopDepth);
    };
    expect(topOf(600)).toBeLessThan(tank.surface); // standing proud of the water
    expect(topOf(2500)).toBeGreaterThan(tank.surface);
    expect(topOf(2500)).toBeLessThan(tank.floor);
  });

  it("graphs pressure against depth, and names the law", () => {
    const texts = render(0.5).texts();
    expect(texts).toContain("depth m");
    expect(texts).toContain("pressure kPa");
    expect(texts).toContain("p = ρgh");
  });

  it("keeps every label inside the box, even on a phone", () => {
    const narrow = computeFluidsLayout(375);
    const rec = recordingContext();
    fluidsRenderer.draw(rec.ctx, narrow, {
      results: results(0, { blockDensity: 600 }),
      trace: null,
      layers: new Set(ALL),
      highlight: null,
      theme: fallbackTheme,
      angleUnit: "deg",
      graphs: [],
    });
    for (const call of rec.of("fillText")) {
      expect(call.args[1] as number).toBeGreaterThanOrEqual(0);
      expect(call.args[1] as number).toBeLessThanOrEqual(narrow.width);
    }
    // The depth label hangs off the left of the tank, so it needs room there.
    const depthLabel = rec.of("fillText").find((c) => String(c.args[0]).startsWith("h ="))!;
    expect(depthLabel.args[1] as number).toBeGreaterThanOrEqual(String(depthLabel.args[0]).length * 6);
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render(1, {}, ["fluid"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("dragging in the tank moves the probe to that depth", () => {
    const tank = tankGeometry(layout, 1.5);
    const hit = fluidsRenderer.pick!(layout, tank.left + 40, tank.yAt(0.9), undefined, results(0));
    expect(hit?.region).toBe("probe");
    expect(hit?.writes[0]!.variable).toBe("depth");
    expect(hit?.writes[0]!.value).toBeCloseTo(0.9, 6);
  });

  it("keeps the probe inside the fluid, however far the drag goes", () => {
    const tank = tankGeometry(layout, 1.5);
    expect(fluidsRenderer.pick!(layout, tank.left + 40, tank.surface - 10, undefined, results(0))!.writes[0]!.value).toBe(0);
    expect(fluidsRenderer.pick!(layout, tank.left + 40, tank.floor + 10, undefined, results(0))!.writes[0]!.value).toBeCloseTo(1.5, 9);
  });

  it("finds nothing outside the tank", () => {
    expect(fluidsRenderer.pick!(layout, layout.chart.x + 20, layout.chart.y + 20, undefined, results(0))).toBeNull();
  });
});
