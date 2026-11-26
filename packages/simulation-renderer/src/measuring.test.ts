import { measuringModel, type MeasuringParams, type MeasuringState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeMeasuringLayout, measuringFmt, measuringRenderer } from "./measuring/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const S0 = measuringModel.initialize(measuringModel.defaultParams);
const results = (params: Partial<MeasuringParams> = {}, state: Partial<MeasuringState> = {}) =>
  measuringModel.derive({ ...S0, ...state }, { ...measuringModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  measuringRenderer.draw(rec.ctx, computeMeasuringLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

const UNITS = ["object", "units", "labels"];
const RULER = ["ruler", "eye", "labels"];
const MOTION = ["movers", "path", "labels"];
const PENDULUM = ["pendulum", "stopwatch", "labels"];
const SPEED = ["track", "stopwatch", "labels"];

describe("what the measuring renderer draws", () => {
  it("formats numbers without trailing zeros", () => {
    expect([measuringFmt(8), measuringFmt(2.5), measuringFmt(1.25, 2), measuringFmt(120)]).toEqual(["8", "2.5", "1.25", "120"]);
  });

  it("lays hand spans along the desk and says how many, only with labels", () => {
    const done = results({ item: "desk", unit: 0, measurer: 0 }, { t: 4 });
    expect(text(done, UNITS)).toContain("8 hand spans");
    expect(text(done, UNITS)).toContain("Child: 8, teacher: 6 hand spans");
    expect(text(done, UNITS)).toContain("The child's hand span: 15 cm");
    expect(text(done, ["object", "units"])).not.toContain("8 hand spans");
    expect(text(results({ item: "desk", unit: 3 }, { t: 2 }), UNITS)).toContain("Everyone gets 120 cm: a standard unit");
  });

  it("reads the ruler as far end minus near end, and flags a slanted eye", () => {
    expect(text(results({}, { size: 7.5, start: 2 }), RULER)).toContain("9.5 − 2 = 7.5 cm");
    expect(text(results({ eye: -1 }, { size: 7.5, start: 2 }), RULER)).toContain("Eye to the left: 9.3 − 2 = 7.3 cm, 2 mm out");
    expect(text(results({}, { size: 7.5, start: 2 }), ["ruler", "eye"])).not.toContain("7.5 cm");
    expect(text(results({ shape: "curved" }, { bend: 2 }), RULER)).toContain("Thread: 11.7 − 0 = 11.7 cm");
  });

  it("names the kind of motion only with labels", () => {
    expect(text(results({ mover: "merry" }, { t: 1 }), MOTION)).toContain("Circular motion");
    expect(text(results({ mover: "pendulum" }, { t: 1 }), MOTION)).toContain("To and fro");
    expect(text(results({ mover: "top" }, { t: 1 }), ["movers"])).not.toContain("Spinning");
  });

  it("counts oscillations, and gives the time for one only with labels", () => {
    const r = results({}, { pendulumLength: 100, t: 10.1 });
    expect(text(r, PENDULUM)).toContain("Oscillations: 5");
    expect(text(r, PENDULUM)).toContain("One oscillation: 2.01 s; ten: 20.1 s");
    expect(text(r, ["pendulum", "stopwatch"])).not.toContain("2.01");
  });

  it("works out speed in m/s and km/h", () => {
    expect(text(results({}, { distance: 100, tripTime: 20, t: 5 }), SPEED)).toContain("Speed = 100 ÷ 20 = 5 m/s = 18 km/h");
  });
});

describe("on a phone", () => {
  it("keeps every label on a 325 px canvas and every caption short", () => {
    const views: [Partial<MeasuringParams>, Partial<MeasuringState>, string[]][] = [
      [{ item: "blackboard", unit: 1, measurer: 1 }, { t: 20 }, UNITS],
      [{ item: "pencil", unit: 2, measurer: 0 }, { t: 2 }, UNITS],
      [{ item: "ribbon", unit: 3 }, { ribbon: 300, t: 10 }, UNITS],
      [{ eye: 1 }, { size: 12, start: 3 }, RULER],
      [{ eye: -1 }, { size: 2, start: 0 }, RULER],
      [{ shape: "curved", eye: 1 }, { bend: 2, start: 3 }, RULER],
      ...(["train", "apple", "merry", "clock", "swing", "needle", "wheel"] as const).map((mover): [Partial<MeasuringParams>, Partial<MeasuringState>, string[]] => [{ mover }, { t: 1.3 }, MOTION]),
      [{ bobMass: 200 }, { pendulumLength: 200, t: 30 }, PENDULUM],
      [{}, { pendulumLength: 10, t: 3 }, PENDULUM],
      [{}, { distance: 1000, tripTime: 300, t: 50 }, SPEED],
    ];
    for (const [params, state, layers] of views) {
      const rec = recordingContext();
      const placed: { t: string; left: number; right: number; y: number }[] = [];
      rec.ctx.fillText = (t: string, x: number, y: number) => {
        const w = t.length * 6;
        const align = rec.ctx.textAlign;
        const left = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
        placed.push({ t, left, right: left + w, y });
      };
      const layout = computeMeasuringLayout(325);
      measuringRenderer.draw(rec.ctx, layout, { results: results(params, state), trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
      expect(placed.length).toBeGreaterThan(0);
      for (const { t, left, right, y } of placed) {
        expect(left, `${t} left`).toBeGreaterThanOrEqual(0);
        expect(right, `${t} right`).toBeLessThanOrEqual(325);
        expect(y, `${t} y`).toBeGreaterThan(0);
        expect(y, `${t} y`).toBeLessThan(layout.height);
        expect(t.length, t).toBeLessThanOrEqual(55);
      }
    }
  });

  it("keeps the ruler, the pendulum and the stage inside the canvas", () => {
    const l = computeMeasuringLayout(325);
    expect(l.ruler.x0 - 6).toBeGreaterThanOrEqual(0);
    expect(l.ruler.x0 + 15 * l.ruler.perCm + 6).toBeLessThanOrEqual(325);
    expect(l.ruler.top + l.ruler.depth).toBeLessThan(l.height - 30);
    expect(l.pivot.y + 200 * l.pivot.perCm + 12).toBeLessThan(l.height - 80);
    expect(l.stage.x - l.stage.r).toBeGreaterThan(0);
    expect(l.height).toBeGreaterThanOrEqual(330);
    expect(l.height).toBeLessThanOrEqual(420);
    // The curved line's top and bottom stay between the words and the eye.
    expect(110 - 2 * l.ruler.perCm).toBeGreaterThan(44);
    expect(110 + 2 * l.ruler.perCm).toBeLessThan(l.ruler.top - 78 - 8);
  });
});
