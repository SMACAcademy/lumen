import { projectileModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeProjectileLayout, projectileRenderer } from "./projectile/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const deg = (d: number) => (d * Math.PI) / 180;
const layout = computeProjectileLayout(900);
const results = (t: number, over: Partial<typeof projectileModel.defaultParams> = {}) =>
  projectileModel.derive({ t }, { ...projectileModel.defaultParams, ...over });

const ALL = ["ground", "path", "projectile", "ghosts", "shadows", "velocity", "components", "apex", "range", "labels"];

const render = (t: number, layers: string[] = ALL, over: Partial<typeof projectileModel.defaultParams> = {}) => {
  const rec = recordingContext();
  projectileRenderer.draw(rec.ctx, layout, {
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

describe("projectile layout", () => {
  it("gives the field a sensible shape at any width", () => {
    expect(layout.field.width).toBeGreaterThan(700);
    expect(layout.height).toBeGreaterThan(layout.field.y + layout.field.height);
    const narrow = computeProjectileLayout(360);
    expect(narrow.compact).toBe(true);
    expect(narrow.field.height).toBeGreaterThan(150);
  });
});

describe("what the projectile renderer draws", () => {
  it("reports the flight from the model's own numbers", () => {
    const texts = render(0.6, ALL, { u: 20, angle: deg(45), g: 10 }).texts();
    expect(texts).toContain("u = 20.0 m/s at 45°");
    expect(texts).toContain("t = 0.60 s");
    expect(texts).toContain("range = 40.0 m"); // u² sin2θ / g
    expect(texts).toContain("max height = 10.0 m");
  });

  it("leaves one ghost per strobe interval, and none ahead of the projectile", () => {
    const ghosts = (t: number) => render(t, ["ghosts"], { strobe: 0.2 }).of("arc").length;
    expect(ghosts(0)).toBe(1);
    expect(ghosts(0.85)).toBe(5); // 0, 0.2, 0.4, 0.6, 0.8
  });

  it("draws the flown part of the path solid and the rest dashed", () => {
    const dashes = render(0.8, ["path"]).of("setLineDash").map((c) => c.args[0]);
    expect(dashes).toContainEqual([5, 5]); // the flight still to come
    expect(dashes).toContainEqual([]); // the part already flown
    // Before launch there is nothing flown yet, so only the dashed preview.
    expect(render(0, ["path"]).of("setLineDash").map((c) => c.args[0])).toEqual([[5, 5]]);
  });

  it("shows the velocity split into components only when asked", () => {
    const withComponents = render(0.5, ["projectile", "velocity", "components"]).of("moveTo").length;
    const whole = render(0.5, ["projectile", "velocity"]).of("moveTo").length;
    expect(withComponents).toBeGreaterThan(whole);
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render(0.5, ["ground"]).of("arc")).toEqual([]);
    expect(render(0.5, ["ground"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("dragging the field finds the moment the projectile was there", () => {
    const r = results(0);
    const mid = { x: layout.field.x + layout.field.width * 0.5, y: layout.field.y + layout.field.height * 0.5 };
    const hit = projectileRenderer.pick!(layout, mid.x, mid.y, undefined, r);
    expect(hit?.region).toBe("field");
    expect(hit?.writes[0]!.variable).toBe("t");
    const t = hit!.writes[0]!.value;
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThanOrEqual(results(0).timeOfFlight + 1e-9);
  });

  it("finds nothing outside the field", () => {
    expect(projectileRenderer.pick!(layout, 4, layout.height - 2, undefined, results(0))).toBeNull();
  });
});
