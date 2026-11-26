import { accumulateModel, type AccumulateParams } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { accumulateRenderer, computeAccumulateLayout } from "./accumulate/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (fn: AccumulateParams["function"], a: number, x: number) => accumulateModel.derive({ x, a }, { function: fn });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const set = new Set(layers);
  accumulateRenderer.draw(rec.ctx, computeAccumulateLayout(width, set), { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const SWEEP = ["function", "area", "accumulated", "tangent", "labels"];
const FAMILY = [...SWEEP, "family"];
const MOTION = [...SWEEP, "track"];

describe("what the accumulate renderer draws", () => {
  it("names f and the area graph, and reads off the area beside a numerical sum", () => {
    const texts = render(results("linear", 0, 2), SWEEP).texts();
    expect(texts).toEqual(expect.arrayContaining(["f(x) = 2x", "A(x) = area from a to x", "f(x) = 4.00", "slope of A = 4.00"]));
    expect(texts.join(" ")).toContain("A(2.00) = 4.00  (200-strip sum 4.00)");
  });

  it("shows the slope of A equal to f(x), negative where f is below the axis", () => {
    const texts = render(results("cosine", 0, 3), SWEEP).texts();
    const f = texts.find((t) => t.startsWith("f(x) = −"));
    expect(f).toBe("f(x) = −0.99");
    expect(texts).toContain("slope of A = −0.99");
  });

  it("draws a longer A graph the further the line has swept", () => {
    const points = (x: number) => render(results("square", -1, x), SWEEP).of("lineTo").length;
    expect(points(1.5)).toBeGreaterThan(points(0));
  });

  it("shades the area twice — above and below the axis — only once the line has moved off a", () => {
    expect(render(results("linear", -2, 1), SWEEP).of("fill").length).toBeGreaterThan(render(results("linear", -2, -2), SWEEP).of("fill").length);
  });

  it("hides the A graph, its tangent and every number when the words are hidden", () => {
    const shown = render(results("square", 1, 2), SWEEP);
    const hidden = render(results("square", 1, 2), ["function", "area", "accumulated", "tangent"]);
    expect(hidden.texts().join(" ")).not.toMatch(/\d\.\d\d|slope of|strip/);
    expect(hidden.of("lineTo").length).toBeLessThan(shown.of("lineTo").length);
  });

  it("draws the family of antiderivatives and names the constant", () => {
    const family = render(results("linear", -2, 1), FAMILY);
    expect(family.texts()).toContain("x² + C");
    expect(family.texts().join(" ")).toContain("A = x² + C, with C = −4.00");
    expect(family.of("lineTo").length).toBeGreaterThan(render(results("linear", -2, 1), SWEEP).of("lineTo").length);
    expect(render(results("linear", 0, 1), FAMILY).texts().join(" ")).toContain("with C = 0.00");
  });

  it("puts the object on the track at the displacement, and reads distance and acceleration", () => {
    const texts = render(results("velocity", 0, 8), MOTION).texts();
    expect(texts).toEqual(expect.arrayContaining(["v (m/s) against t (s)", "s = area so far (m)", "v = −2.00 m/s", "start", "20"]));
    expect(texts.join(" ")).toContain("s = 19.0 m · distance 21.0 m · a = −2.0 m/s²");
    expect(render(results("velocity", 0, 3), MOTION).texts().join(" ")).toContain("s = 8.0 m · distance 8.0 m · a = 0.0 m/s²");
    // Without the words, no object and no numbers on the track.
    const hidden = render(results("velocity", 0, 5), ["function", "area", "accumulated", "track"]);
    expect(hidden.of("roundRect")).toHaveLength(0);
    expect(hidden.texts().join(" ")).not.toMatch(/16|\d m/);
  });

  it("fits a phone: plots stacked without overlap, everything inside 325 px", () => {
    for (const layers of [SWEEP, MOTION]) {
      const set = new Set(layers);
      const layout = computeAccumulateLayout(325, set);
      expect(layout.bottom.y).toBeGreaterThan(layout.top.y + layout.top.height + 20);
      expect(layout.top.x + layout.top.width).toBeLessThanOrEqual(325);
      expect(layout.height).toBeGreaterThanOrEqual(330);
      expect(layout.height).toBeLessThanOrEqual(420);
      if (layout.track) {
        expect(layout.track.y).toBeGreaterThan(layout.bottom.y + layout.bottom.height + 20);
        expect(layout.track.y + layout.track.height).toBeLessThan(layout.height - 20);
      }
      for (const fn of ["linear", "velocity", "reciprocal"] as const) {
        const rec = recordingContext();
        const lo = { linear: -2, velocity: 0, reciprocal: 0.25 }[fn];
        accumulateRenderer.draw(rec.ctx, layout, { results: results(fn, lo, 99), trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
        for (const call of rec.of("fillText")) {
          const [text, x, y] = call.args as [string, number, number];
          expect(text.length, text).toBeLessThanOrEqual(55);
          expect(x, text).toBeGreaterThanOrEqual(0);
          expect(x, text).toBeLessThanOrEqual(325);
          expect(y, text).toBeGreaterThanOrEqual(0);
          expect(y, text).toBeLessThanOrEqual(layout.height);
        }
        for (const call of rec.of("arc")) {
          const [x, y] = call.args as [number, number];
          expect(x).toBeLessThanOrEqual(325);
          expect(y).toBeLessThanOrEqual(layout.height);
        }
      }
    }
    expect(computeAccumulateLayout(800, new Set(MOTION)).height).toBeLessThanOrEqual(420);
  });
});
