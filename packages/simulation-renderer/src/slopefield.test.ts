import { SLOPE_FIELD_EQUATION_ORDER, slopeFieldModel, type SlopeFieldParams, type SlopeFieldState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSlopeFieldLayout, slopeFieldRenderer } from "./slopefield/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = slopeFieldModel.initialize(slopeFieldModel.defaultParams);
const results = (params: Partial<SlopeFieldParams> = {}, state: Partial<SlopeFieldState> = {}) =>
  slopeFieldModel.derive({ ...base, ...state }, { ...slopeFieldModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  slopeFieldRenderer.draw(rec.ctx, computeSlopeFieldLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const FIELD = ["field", "family", "solution", "labels"];
const EULER = ["field", "solution", "euler", "labels"];
const CLOCK = ["clock", "steps", "labels"];

describe("the slope field", () => {
  it("names the equation and its general solution, and gives the slope and C at the point", () => {
    const texts = render(results({ equation: "sum" }, { x0: 1, y0: 2 }), FIELD).texts();
    expect(texts).toContain("dy/dx = x + y:  y = −x − 1 + Ceˣ");
    expect(texts.join(" ")).toContain("slope at the point 3.00 · C = 1.47");
    expect(texts).toContain("not separable · linear");
  });

  it("draws one short line per grid point, more across a wide canvas than a phone", () => {
    const strokes = (width: number) => render(results(), ["field"], width).of("moveTo").length;
    expect(strokes(800)).toBeGreaterThanOrEqual(19 * 6);
    expect(strokes(325)).toBeGreaterThanOrEqual(13 * 6);
  });

  it("draws the circles as half-ellipses on screen", () => {
    const rec = render(results({ equation: "circles" }, { x0: 0, y0: 2 }), FIELD);
    // Six family members and the solution itself.
    expect(rec.of("ellipse")).toHaveLength(7);
    expect(rec.texts().join(" ")).toContain("C = 4.00");
  });

  it("says when the equation gives no slope at the point", () => {
    const texts = render(results({ equation: "circles" }, { x0: 2, y0: 0 }), FIELD).texts().join(" ");
    expect(texts).toContain("no slope at (2, 0): dy/dx = −x/y is undefined");
    expect(texts).not.toContain("C =");
  });

  it("hides the numbers with the words", () => {
    const texts = render(results({ equation: "linear" }, { x0: 0, y0: 0, xEnd: 2 }), ["field", "solution", "euler"]).texts().join(" ");
    expect(texts).not.toMatch(/exact|Euler|error|slope|C =/);
  });
});

describe("Euler's method", () => {
  it("compares the stepped estimate with the exact value at X", () => {
    const texts = render(results({ equation: "growth" }, { x0: 0, y0: 1, xEnd: 1, h: 0.5 }), EULER).texts().join(" ");
    expect(texts).toContain("at X = 1: exact 2.718 · Euler 2.250");
    expect(texts).toContain("2 steps of 0.5 · error 0.468");
  });

  it("draws a dot at the end of every step", () => {
    const few = render(results({ equation: "growth" }, { x0: 0, y0: 1, xEnd: 1, h: 0.25 }), ["euler"]);
    const many = render(results({ equation: "growth" }, { x0: 0, y0: 1, xEnd: 1, h: 0.1 }), ["euler"]);
    // One arc for the starting point, one for each step's end.
    expect(few.of("arc")).toHaveLength(1 + 4);
    expect(many.of("arc")).toHaveLength(1 + 10);
  });

  it("says when the exact solution stops short of X", () => {
    expect(render(results({ equation: "circles" }, { x0: 0, y0: 2, xEnd: 3 }), EULER).texts().join(" ")).toContain("does not reach X");
  });
});

describe("growth, decay and cooling", () => {
  it("follows a cup of tea cooling", () => {
    const texts = render(results({ process: "cooling" }, { start: 90, room: 25, k: 0.05, t: 10, tStep: 5 }), CLOCK).texts();
    expect(texts).toEqual(expect.arrayContaining(["A cup of tea: dT/dt = −k(T − Tₛ)", "room 25 °C", "T"]));
    expect(texts.join(" ")).toContain("t = 10.0 min · T = 64.4 °C · cooling at 1.97 °C/min");
    expect(texts.join(" ")).toContain("difference halves every 13.9 min · Euler");
  });

  it("gives the doubling time and the half-life", () => {
    expect(render(results({ process: "growth" }, { start: 10, k: 0.07, t: 20 }), CLOCK).texts().join(" ")).toContain("doubling time 9.9 min");
    expect(render(results({ process: "decay" }, { start: 80, k: 0.07, t: 20 }), CLOCK).texts().join(" ")).toContain("half-life 9.9 min");
  });

  it("hides the temperature and the half-life with the words", () => {
    const texts = render(results({ process: "cooling" }, { t: 10 }), ["clock", "steps"]).texts().join(" ");
    expect(texts).not.toMatch(/64|halves|Euler/);
  });
});

describe("order and degree", () => {
  it("writes the equation and, with the words, its order and degree", () => {
    const texts = render(results({ example: "cos-of-slope" }), ["order", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["(y″)² + cos(y′) = 0", "order 2 · degree not defined", "not a polynomial in its derivatives"]));
    expect(render(results({ example: "powers" }), ["order"]).texts().join(" ")).not.toContain("order 3");
  });
});

describe("on a phone", () => {
  const inside = (rec: ReturnType<typeof render>, width: number, height: number) => {
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(x, text).toBeGreaterThanOrEqual(0);
      expect(x, text).toBeLessThanOrEqual(width);
      // Titles and captions are centred: the whole line must fit.
      if (y === 14 || y > height - 40) {
        expect(x - (text.length * 6) / 2, text).toBeGreaterThanOrEqual(0);
        expect(x + (text.length * 6) / 2, text).toBeLessThanOrEqual(width);
      }
      expect(y, text).toBeGreaterThan(0);
      expect(y, text).toBeLessThan(height);
      expect(text.length, text).toBeLessThanOrEqual(55);
    }
  };

  it("keeps every caption, title and label on a 325 px canvas", () => {
    const layout = computeSlopeFieldLayout(325);
    expect(layout.plot.x + layout.plot.width).toBeLessThanOrEqual(325);
    expect(layout.bar.x + layout.bar.width).toBeLessThanOrEqual(325);
    expect(layout.graph.x + layout.graph.width).toBeLessThan(layout.bar.x);
    for (const equation of SLOPE_FIELD_EQUATION_ORDER) {
      inside(render(results({ equation }, { x0: 0.5, y0: 0.5 }), FIELD, 325), 325, layout.height);
      inside(render(results({ equation }, { x0: -1, y0: 0.4, xEnd: 1.5, h: 0.05 }), EULER, 325), 325, layout.height);
    }
    for (const process of ["growth", "decay", "cooling"] as const) {
      inside(render(results({ process }, { start: 100, room: 40, k: 0.1, t: 60, tStep: 20 }), CLOCK, 325), 325, layout.height);
    }
    inside(render(results({ example: "powers" }), ["order", "labels"], 325), 325, layout.height);
  });

  it("drops the starting point where the field is tapped", () => {
    const layout = computeSlopeFieldLayout(325);
    const r = results({ equation: "parabolas" });
    const centre = slopeFieldRenderer.pick!(layout, layout.plot.x + layout.plot.width / 2, layout.plot.y + layout.plot.height / 2, undefined, r);
    expect(centre?.writes.map((w) => w.variable)).toEqual(["x0", "y0"]);
    expect(centre?.writes[0]!.value).toBeCloseTo(0, 10);
    expect(slopeFieldRenderer.pick!(layout, 5, 5, undefined, r)).toBeNull();
  });
});
