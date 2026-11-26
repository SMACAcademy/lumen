import { rotationModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeRotationLayout, rotationRenderer } from "./rotation/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const layout = computeRotationLayout(900);
const results = (state: { theta?: number; omega: number }, over: Partial<typeof rotationModel.defaultParams> = {}) =>
  rotationModel.derive({ theta: state.theta ?? 0, omega: state.omega, time: 0 }, { ...rotationModel.defaultParams, ...over });

const ALL = ["body", "axle", "marker", "force", "spin", "compare", "labels"];

const render = (state: Parameters<typeof results>[0], over = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  rotationRenderer.draw(rec.ctx, layout, {
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

describe("rotation layout", () => {
  it("gives the wheel the whole box when the comparison is not shown", () => {
    const without = computeRotationLayout(900, false);
    expect(without.bars.height).toBe(0);
    expect(without.scene.width).toBeGreaterThan(computeRotationLayout(900, true).scene.width);
    // On a phone, where the comparison would sit below, the saving is the whole strip.
    expect(computeRotationLayout(400, false).height).toBeLessThan(computeRotationLayout(400, true).height - 100);
  });

  it("puts the comparison beside the wheel when there is room, below it when there is not", () => {
    expect(layout.bars.x).toBeGreaterThan(layout.scene.x + layout.scene.width);
    const narrow = computeRotationLayout(400);
    expect(narrow.compact).toBe(true);
    expect(narrow.bars.y).toBeGreaterThan(narrow.scene.y + narrow.scene.height);
  });
});

describe("what the rotation renderer draws", () => {
  it("reports the model's own torque, inertia and acceleration", () => {
    const texts = render({ omega: 0 }, { shape: "disc", mass: 2, radius: 0.5, force: 4 }).texts();
    expect(texts).toContain("I = 0.250 kg m²");
    expect(texts).toContain("τ = 2.00 N m");
    expect(texts).toContain("α = 8.00 rad/s²");
    expect(texts).toContain("F = 4.0 N");
    expect(texts).toContain("r = 0.50 m");
  });

  it("draws a hollow ring and a solid disc differently", () => {
    // A ring is stroked as an arc with no fill; a disc is filled.
    const ring = render({ omega: 0 }, { shape: "ring" }, ["body"]);
    const disc = render({ omega: 0 }, { shape: "disc" }, ["body"]);
    expect(disc.of("fill").length).toBeGreaterThan(ring.of("fill").length);
    expect(ring.of("stroke").length).toBeGreaterThan(0);
  });

  it("a rod is drawn as a bar rather than a circle", () => {
    expect(render({ omega: 0 }, { shape: "rod" }, ["body"]).of("roundRect").length).toBe(1);
    expect(render({ omega: 0 }, { shape: "disc" }, ["body"]).of("roundRect")).toEqual([]);
  });

  it("shows the spin only when it is turning", () => {
    expect(render({ omega: 6 }).texts().join(" ")).toContain("ω = 6.00 rad/s");
    expect(render({ omega: 0 }).texts().join(" ")).not.toContain("ω =");
  });

  it("compares all five shapes, highlighting the current one", () => {
    const texts = render({ omega: 0 }, { shape: "ring" }, ["compare", "labels"]).texts();
    for (const name of ["rod", "sphere", "disc", "shell", "ring"]) expect(texts).toContain(name);
    expect(texts).toContain("moment of inertia, same mass and radius");
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render({ omega: 4 }, {}, ["axle"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("dragging the wheel turns it and stops the spin", () => {
    const { scene } = layout;
    const cx = scene.x + scene.width / 2;
    const cy = scene.y + scene.height * 0.5;
    const hit = rotationRenderer.pick!(layout, cx + 40, cy + 40, undefined, results({ omega: 5 }));
    expect(hit?.region).toBe("wheel");
    expect(hit?.writes.map((w) => w.variable)).toEqual(["theta", "omega"]);
    expect(hit?.writes[1]!.value).toBe(0);
    // Down and to the right of the axle is a quarter turn clockwise on screen.
    expect(hit?.writes[0]!.value).toBeCloseTo(Math.PI / 4, 2);
  });

  it("finds nothing away from the wheel", () => {
    expect(rotationRenderer.pick!(layout, layout.bars.x + 30, layout.bars.y + 30, undefined, results({ omega: 0 }))).toBeNull();
  });
});
