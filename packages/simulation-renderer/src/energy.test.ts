import { energyModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeEnergyLayout, energyRenderer } from "./energy/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const deg = (d: number) => (d * Math.PI) / 180;
const layout = computeEnergyLayout(900);
const params = (over: Partial<typeof energyModel.defaultParams> = {}) => ({ ...energyModel.defaultParams, ...over });
const results = (state: { s: number; v: number; path?: number; startEnergy?: number }, over = {}) =>
  energyModel.derive(
    { s: state.s, v: state.v, path: state.path ?? 0, startEnergy: state.startEnergy ?? 36, time: 0 },
    params(over),
  );

const ALL = ["track", "block", "velocity", "height", "bars", "labels"];

const render = (state: Parameters<typeof results>[0], over = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  energyRenderer.draw(rec.ctx, layout, {
    results: results(state, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "deg",
    graphs: [],
  });
  return rec;
};

describe("energy layout", () => {
  it("puts the bars beside the slope on a wide screen, and below it on a narrow one", () => {
    expect(layout.compact).toBe(false);
    expect(layout.bars.x).toBeGreaterThan(layout.scene.x + layout.scene.width);
    const narrow = computeEnergyLayout(380);
    expect(narrow.compact).toBe(true);
    expect(narrow.bars.y).toBeGreaterThan(narrow.scene.y + narrow.scene.height);
  });
});

describe("what the energy renderer draws", () => {
  it("labels each bar with the model's own energy", () => {
    // 2 kg at 6 m/s: 36 J, all kinetic, at the bottom of the slope.
    const texts = render({ s: 0, v: 6 }).texts();
    expect(texts).toContain("kinetic");
    expect(texts).toContain("36.0 J");
    expect(texts).toContain("started with 36.0 J"); // named beside the slope, not over the bars
  });

  it("shows the trade: less kinetic, more potential, same total", () => {
    const climbed = results({ s: 3, v: 3.4 }, { incline: deg(20) });
    const texts = render({ s: 3, v: 3.4 }, { incline: deg(20) }).texts();
    expect(climbed.potential).toBeGreaterThan(5);
    expect(texts).toContain(`${climbed.potential.toFixed(1)} J`);
    expect(texts).toContain(`${climbed.kinetic.toFixed(1)} J`);
  });

  it("marks the height gained only once there is some", () => {
    expect(render({ s: 3, v: 2 }).texts().join(" ")).toContain("h = ");
    expect(render({ s: 0, v: 6 }).texts().join(" ")).not.toContain("h = ");
  });

  it("mentions heat only when friction has taken some", () => {
    expect(render({ s: 3, v: 2, path: 3 }, { muKinetic: 0.3 }).texts().join(" ")).toContain("lost to heat");
    expect(render({ s: 3, v: 2 }, { muKinetic: 0 }).texts().join(" ")).not.toContain("lost to heat");
  });

  it("mentions the push only when there is one", () => {
    expect(render({ s: 2, v: 3 }, { applied: 10 }).texts().join(" ")).toContain("work by push");
    expect(render({ s: 2, v: 3 }, { applied: 0 }).texts().join(" ")).not.toContain("work by push");
  });

  it("draws nothing of a layer that is switched off", () => {
    // Track only, and labels off: the drawing says nothing at all.
    expect(render({ s: 2, v: 3 }, {}, ["track"]).texts()).toEqual([]);
    expect(render({ s: 2, v: 3 }, {}, ["track", "labels"]).texts()).toContain("start");
  });
});

describe("picking", () => {
  it("dragging the slope places the block along it", () => {
    const hit = energyRenderer.pick!(
      layout,
      layout.scene.x + layout.scene.width * 0.6,
      layout.scene.y + layout.scene.height * 0.6,
      undefined,
      results({ s: 0, v: 6 }),
    );
    expect(hit?.region).toBe("block");
    expect(hit?.writes[0]!.variable).toBe("s");
    expect(hit?.writes[0]!.value).toBeGreaterThan(0);
  });

  it("leaves the bars alone", () => {
    expect(energyRenderer.pick!(layout, layout.bars.x + 20, layout.bars.y + 40, undefined, results({ s: 0, v: 6 }))).toBeNull();
  });
});
