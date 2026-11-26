import { orbitModel } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeOrbitLayout, orbitRenderer, orbitView } from "./orbit/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const layout = computeOrbitLayout(900);
const results = (t: number, over: Partial<typeof orbitModel.defaultParams> = {}) =>
  orbitModel.derive({ t }, { ...orbitModel.defaultParams, ...over });

const ALL = ["sky", "reference", "orbit", "planet", "apses", "satellite", "velocity", "gauge", "labels"];

const render = (t: number, over = {}, layers: string[] = ALL) => {
  const rec = recordingContext();
  orbitRenderer.draw(rec.ctx, layout, {
    results: results(t, over),
    trace: null,
    layers: new Set(layers),
    highlight: null,
    theme: fallbackTheme,
    angleUnit: "rad",
    graphs: [],
  });
  return rec;
};

describe("orbit layout", () => {
  it("drops the gauge strip when the gauge is hidden", () => {
    const without = computeOrbitLayout(900, false);
    expect(without.gauge.height).toBe(0);
    expect(without.height).toBeLessThan(layout.height);
    expect(without.scene.height).toBe(layout.scene.height);
  });

  it("stacks taller on a phone, where the sky is squarer", () => {
    const narrow = computeOrbitLayout(380);
    expect(narrow.compact).toBe(true);
    expect(narrow.scene.width).toBeLessThan(narrow.height);
  });
});

describe("framing the orbit", () => {
  it("fits a wide ellipse without letting it spill out of the box", () => {
    const r = results(0, { speedFactor: 1.3 });
    const view = orbitView(r, layout.scene);
    const apogeeX = view.originX - r.apogee * view.scale; // apogee sits opposite the launch
    const perigeeX = view.originX + r.perigee * view.scale;
    expect(apogeeX).toBeGreaterThanOrEqual(layout.scene.x);
    expect(perigeeX).toBeLessThanOrEqual(layout.scene.x + layout.scene.width);
  });

  it("zooms in on a tight orbit and out on a wide one", () => {
    const tight = orbitView(results(0, { launchHeight: 0 }), layout.scene);
    const wide = orbitView(results(0, { launchHeight: 4 }), layout.scene);
    expect(tight.scale).toBeGreaterThan(wide.scale);
  });

  it("still frames an escape, where there is no apogee to fit", () => {
    const view = orbitView(results(2, { speedFactor: 1.5 }), layout.scene);
    expect(Number.isFinite(view.scale)).toBe(true);
    expect(view.scale).toBeGreaterThan(0);
  });
});

describe("what the orbit renderer draws", () => {
  it("reports the model's own shape, period and energy", () => {
    const texts = render(0, { speedFactor: 1 }).texts().join(" ");
    expect(texts).toContain("a circle");
    expect(texts).toContain("e = 0.000");
    expect(texts).toContain("T = ");
    expect(texts).toContain("J/kg");
  });

  it("names the two apses of an ellipse with their distances", () => {
    const texts = render(0, { speedFactor: 1.3 }).texts();
    expect(texts.some((t) => t.startsWith("perigee 2.00"))).toBe(true);
    expect(texts.some((t) => t.startsWith("apogee"))).toBe(true);
  });

  it("says an escape has no period and no apses to mark", () => {
    const texts = render(0, { speedFactor: 1.5 }).texts();
    expect(texts.join(" ")).toContain("T = ∞");
    expect(texts.join(" ")).toContain("escapes");
    expect(texts.some((t) => t.startsWith("apogee"))).toBe(false);
  });

  it("calls out an orbit that dips into the planet", () => {
    expect(render(0, { speedFactor: 0.5 }).texts().join(" ")).toContain("crashes into the planet");
  });

  it("marks circular and escape speed on the gauge, and the launch against them", () => {
    const texts = render(0, { speedFactor: 1.25 }).texts();
    expect(texts).toContain("circular");
    expect(texts).toContain("escape");
    expect(texts).toContain("launch speed = 1.25 × circular");
  });

  it("keeps every label inside the sky, even on a phone", () => {
    const narrow = computeOrbitLayout(375);
    const rec = recordingContext();
    orbitRenderer.draw(rec.ctx, narrow, {
      results: results(0, { speedFactor: 1.15 }),
      trace: null,
      layers: new Set(ALL),
      highlight: null,
      theme: fallbackTheme,
      angleUnit: "rad",
      graphs: [],
    });
    for (const call of rec.of("fillText")) {
      const x = call.args[1] as number;
      expect(x).toBeGreaterThanOrEqual(narrow.scene.x);
      expect(x).toBeLessThanOrEqual(narrow.scene.x + narrow.scene.width);
    }
  });

  it("moves the satellite's readout inboard when it sits at the right-hand edge", () => {
    const narrow = computeOrbitLayout(375);
    const r = results(0, { speedFactor: 1.15 });
    const rec = recordingContext();
    orbitRenderer.draw(rec.ctx, narrow, {
      results: r,
      trace: null,
      layers: new Set(["satellite", "labels"]),
      highlight: null,
      theme: fallbackTheme,
      angleUnit: "rad",
      graphs: [],
    });
    const view = orbitView(r, narrow.scene);
    const satelliteX = view.originX + r.x * view.scale;
    const written = rec.of("fillText").find((c) => String(c.args[0]).startsWith("r = "))!;
    // The launch sits against the right edge, so the readout flips to its left.
    expect(written.args[1] as number).toBeLessThan(satelliteX);
  });

  it("draws nothing of a layer that is switched off", () => {
    expect(render(0, {}, ["sky"]).texts()).toEqual([]);
  });
});

describe("picking", () => {
  it("dragging round the ellipse scrubs the time", () => {
    const r = results(0, { speedFactor: 1.3 });
    const view = orbitView(r, layout.scene);
    // Opposite the launch point is the apogee: half a period in.
    const hit = orbitRenderer.pick!(layout, view.originX - r.apogee * view.scale * 0.9, view.originY, undefined, r);
    expect(hit?.region).toBe("orbit");
    expect(hit?.writes[0]!.variable).toBe("t");
    expect(hit?.writes[0]!.value).toBeCloseTo(r.period / 2, 2);
  });

  it("finds nothing on an escape, which has no time to come back to", () => {
    const r = results(0, { speedFactor: 1.5 });
    const view = orbitView(r, layout.scene);
    expect(orbitRenderer.pick!(layout, view.originX + 100, view.originY, undefined, r)).toBeNull();
  });

  it("leaves the planet itself alone", () => {
    const r = results(0);
    const view = orbitView(r, layout.scene);
    expect(orbitRenderer.pick!(layout, view.originX, view.originY, undefined, r)).toBeNull();
  });
});
