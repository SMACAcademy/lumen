import { CIRCLE_LINE_DEFAULT_STATE, circleLineModel, type CircleLineParams, type CircleLineState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import {
  circleLineCentreEquation,
  circleLineGeneralEquation,
  circleLineLineEquation,
  circleLineRenderer,
  computeCircleLineLayout,
} from "./circleline/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (state: Partial<CircleLineState> = {}, params: Partial<CircleLineParams> = {}) =>
  circleLineModel.derive({ ...CIRCLE_LINE_DEFAULT_STATE, ...state }, { ...circleLineModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const layout = computeCircleLineLayout(width);
  circleLineRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, layout, text: rec.texts().join(" | ") };
};
const lineState = (l1: [number, number, number], l2: [number, number, number] = [1, 2, -8], extra: Partial<CircleLineState> = {}) =>
  ({ a1: l1[0], b1: l1[1], c1: l1[2], a2: l2[0], b2: l2[1], c2: l2[2], ...extra });

describe("equations as a textbook writes them", () => {
  it("writes lines with tidy signs", () => {
    expect(circleLineLineEquation(3, 4, -25)).toBe("3x + 4y − 25 = 0");
    expect(circleLineLineEquation(1, 0, -2)).toBe("x − 2 = 0");
    expect(circleLineLineEquation(0, 2, -4)).toBe("2y − 4 = 0");
    expect(circleLineLineEquation(-1, -1, 0)).toBe("−x − y = 0");
    expect(circleLineLineEquation(1.25, -0.5, 0)).toBe("1.25x − 0.5y = 0");
  });

  it("writes circles in both forms", () => {
    expect(circleLineGeneralEquation(-2, 3, -12)).toBe("x² + y² − 4x + 6y − 12 = 0");
    expect(circleLineGeneralEquation(0, 0, -25)).toBe("x² + y² − 25 = 0");
    expect(circleLineCentreEquation(2, -1, 9)).toBe("(x − 2)² + (y + 1)² = 9");
    expect(circleLineCentreEquation(0, 0, 25)).toBe("x² + y² = 25");
  });
});

describe("the lines views", () => {
  it("names both lines and gives the angle only with the words", () => {
    const r = results(lineState([2, -1, 1], [3, 1, -4]));
    const on = render(r, ["lines", "angle", "labels"]).text;
    expect(on).toContain("L₁: 2x − y + 1 = 0");
    expect(on).toContain("L₂: 3x + y − 4 = 0");
    expect(on).toContain("θ = 45.0°");
    expect(on).toContain("m₁ = 2, m₂ = −3 · tan θ = 1.00 · θ = 45.0°");
    expect(on).toContain("they meet at (0.6, 2.2)");
    const off = render(r, ["lines", "angle"]).text;
    expect(off).not.toContain("45");
    expect(off).toContain("L₁");
  });

  it("says perpendicular, parallel, and handles a vertical line", () => {
    expect(render(results(lineState([1, -2, 4], [2, 1, -3])), ["lines", "angle", "labels"]).text).toContain("perpendicular: m₁m₂ = −1");
    expect(render(results(lineState([3, -4, 7], [6, -8, -6])), ["lines", "angle", "labels"]).text).toContain("parallel");
    expect(render(results(lineState([1, 0, -2], [-3, 1, 0])), ["lines", "angle", "labels"]).text).toContain("L₁ vertical · tan θ = 0.33 · θ = 18.4°");
  });

  it("draws the perpendicular and gives the distance only with the words", () => {
    const r = results(lineState([3, -4, -26], [6, -8, -6], { px: 3, py: -5 }));
    const on = render(r, ["lines", "distance", "labels"]).text;
    expect(on).toContain("P to L₁: 0.60 · foot M (2.64, −4.52)");
    expect(on).toContain("L₁ ∥ L₂: they are 4.60 apart");
    const off = render(r, ["lines", "distance"]).text;
    expect(off).not.toMatch(/0\.60|4\.60/);
    expect(off).toContain("P");
  });

  it("writes the family member and the point it turns about", () => {
    const text = render(results(lineState([1, 1, -4], [1, -1, 0], { lam: -1 })), ["lines", "family", "labels"]).text;
    expect(text).toContain("λ = −1: 2y − 4 = 0");
    expect(text).toContain("every member passes through (2, 2)");
  });
});

describe("the circle views", () => {
  it("reads the centre and radius, or says there is no real circle", () => {
    const real = render(results({ g: -2, f: 3, c: -12 }, { form: "general" }), ["circle", "labels"]);
    expect(real.text).toContain("x² + y² − 4x + 6y − 12 = 0");
    expect(real.text).toContain("centre (2, −3) · radius 5.00");
    expect(real.rec.of("arc").length).toBeGreaterThanOrEqual(2);
    const none = render(results({ g: 2, f: 2, c: 10 }, { form: "general" }), ["circle", "labels"]);
    expect(none.text).toContain("g² + f² − c = −2 < 0: not a real circle");
    expect(render(results({ g: 1, f: -2, c: 5 }, { form: "general" }), ["circle", "labels"]).text).toContain("a point circle at (−1, 2)");
    expect(render(results({ h: 2, k: -1, r: 3 }), ["circle", "labels"]).text).toContain("general form: x² + y² − 4x + 2y − 4 = 0");
  });

  it("says whether the line cuts, touches or misses, hiding the chord without the words", () => {
    const circle = { h: 0, k: 0, r: 5 };
    const cut = results(lineState([3, 4, -15], [1, 2, -8], circle));
    expect(render(cut, ["circle", "meet", "labels"]).text).toContain("d = 3.00 < r = 5.00: cuts, chord 8.00");
    expect(render(cut, ["circle", "meet", "labels"]).text).toContain("L: 3x + 4y − 15 = 0");
    expect(render(cut, ["circle", "meet"]).text).not.toContain("8.00");
    expect(render(results(lineState([3, 4, -25], [1, 2, -8], circle)), ["circle", "meet", "labels"]).text).toContain("d = r = 5.00: touches at (3, 4)");
    expect(render(results(lineState([1, 1, -10], [1, 2, -8], circle)), ["circle", "meet", "labels"]).text).toContain("misses");
  });

  it("gives the tangent, normal and tangent length only with the words", () => {
    const r = results({ g: -2, f: 3, c: -12, phi: Math.atan2(4, 3), px: 7, py: 2 }, { form: "general" });
    const on = render(r, ["circle", "tangent", "labels"]).text;
    expect(on).toContain("at T (5, 1): tangent slope −0.75 · normal slope 1.33");
    expect(on).toContain("P outside: S₁ = 25.00, tangent √S₁ = 5.00");
    const off = render(r, ["circle", "tangent"]).text;
    expect(off).not.toMatch(/0\.75|5\.00/);
  });

  it("draws the radical axis only with the words, and counts the common tangents", () => {
    const r = results({ h: 0, k: 0, r: 2, h2: 6, k2: 0, r2: 1 });
    const on = render(r, ["circle", "second", "labels"]).text;
    expect(on).toContain("S₁: x² + y² = 4");
    expect(on).toContain("S₂: (x − 6)² + y² = 1");
    expect(on).toContain("radical axis 12x − 39 = 0 · 4 common tangents");
    expect(on).toContain("gap 6.00, r₁ + r₂ = 3.00: apart");
    expect(render(r, ["circle", "second"]).text).not.toContain("S₁ − S₂");
  });

  it("writes the member of S + λL = 0", () => {
    const text = render(results(lineState([1, 1, -5], [1, 2, -8], { h: 0, k: 0, r: 5, lam: -5 })), ["circle", "meet", "circle-family", "labels"]).text;
    expect(text).toContain("λ = −5: x² + y² − 5x − 5y = 0");
    expect(text).toContain("centre (2.5, 2.5), radius 3.54");
  });
});

describe("the forms view", () => {
  const ab = (a: [number, number], b: [number, number], extra: Partial<CircleLineState> = {}) => results({ ax: a[0], ay: a[1], bx: b[0], by: b[1], ...extra });

  it("writes the general form, slope, intercepts and normal only with the words", () => {
    const r = ab([-2, 1], [2, 4]);
    const on = render(r, ["forms", "labels"]);
    expect(on.text).toContain("A (−2, 1) · B (2, 4)");
    expect(on.text).toContain("3x − 4y + 10 = 0");
    expect(on.text).toContain("slope m = 0.75 · inclination θ = 36.9°");
    expect(on.text).toContain("x-int −3.33 · y-int 2.5 · p = 2.00, ω = 126.9°");
    const off = render(r, ["forms"]);
    expect(off.text).toContain("A (−2, 1) · B (2, 4)");
    expect(off.text).not.toMatch(/3\.33|0\.75|10 = 0|2\.5/);
    // The line, the normal from O, and A and B, either way.
    expect(off.rec.of("lineTo").length).toBeGreaterThanOrEqual(2);
  });

  it("calls x₁ = x₂ vertical with the slope undefined, and refuses A = B", () => {
    const vertical = render(ab([3, -2], [3, 4]), ["forms", "labels"]).text;
    expect(vertical).toContain("x₂ = x₁: vertical, θ = 90°, slope undefined");
    expect(vertical).toContain("x − 3 = 0");
    expect(vertical).toContain("x-int 3 · no y-int · p = 3.00, ω = 0.0°");
    expect(render(ab([2, 2], [2, 2]), ["forms", "labels"]).text).toContain("A and B are one point: they fix no line");
  });

  it("says whether P is on AB", () => {
    expect(render(ab([2, 1], [4, 5], { px: 1, py: -1 }), ["forms", "collinear", "labels"]).text).toContain("P (1, −1) is on AB: slope AP = slope AB");
    const off = render(ab([2, 1], [4, 5], { px: 3, py: -1 }), ["forms", "collinear", "labels"]).text;
    expect(off).toContain("P (3, −1) is off AB: triangle ABP has area 4");
    expect(off).not.toContain("x-int");
  });

  it("drags A, B and P, snapped to halves, only in the forms view", () => {
    const r = ab([-2, 1], [2, 4], { px: 5, py: 5 });
    const layout = computeCircleLineLayout(800, new Set(["forms", "labels"]));
    const [bx, by] = layout.plane.toPx(2, 4);
    const grab = circleLineRenderer.pick!(layout, bx + 3, by - 2, undefined, r);
    expect(grab?.region).toBe("B");
    expect(grab?.writes).toEqual([
      { variable: "bx", value: 2 },
      { variable: "by", value: 4 },
    ]);
    const [tx, ty] = layout.plane.toPx(-3.3, 7.8);
    expect(circleLineRenderer.pick!(layout, tx, ty, "A", r)?.writes).toEqual([
      { variable: "ax", value: -3.5 },
      { variable: "ay", value: 8 },
    ]);
    const [px, py] = layout.plane.toPx(5, 5);
    expect(circleLineRenderer.pick!(layout, px, py, undefined, r)).toBeNull();
    const withP = computeCircleLineLayout(800, new Set(["forms", "collinear"]));
    expect(circleLineRenderer.pick!(withP, px, py, undefined, r)?.region).toBe("P");
    expect(circleLineRenderer.pick!(computeCircleLineLayout(800, new Set(["lines", "angle"])), bx, by, undefined, r)).toBeNull();
  });
});

describe("on a phone", () => {
  it("fits a 325 px canvas: plane, titles and captions inside", () => {
    const layout = computeCircleLineLayout(325);
    expect(layout.plane.rect.x).toBeGreaterThanOrEqual(16);
    expect(layout.plane.rect.x + layout.plane.rect.width).toBeLessThanOrEqual(325 - 16);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    expect(computeCircleLineLayout(800).height).toBeLessThanOrEqual(420);
    const cases: [Partial<CircleLineState>, Partial<CircleLineParams>, string[]][] = [
      [lineState([2, -1, 1], [3, 1, -4]), {}, ["lines", "angle", "labels"]],
      [lineState([3, -4, -26], [6, -8, -6], { px: 3, py: -5 }), {}, ["lines", "distance", "labels"]],
      [lineState([10, -10, 30], [-10, 10, -30], { lam: 0.25 }), {}, ["lines", "family", "labels"]],
      [{ g: -8, f: -8, c: -50 }, { form: "general" }, ["circle", "labels"]],
      [lineState([-10, -10, -30], [1, 2, -8], { g: -8, f: -8, c: -50 }), { form: "general" }, ["circle", "meet", "labels"]],
      [{ h: 8, k: 8, r: 10, phi: 1, px: -10, py: -10 }, {}, ["circle", "tangent", "labels"]],
      [{ h: 0, k: 0, r: 2, h2: 6, k2: 0, r2: 1 }, {}, ["circle", "second", "labels"]],
      [{ ax: -10, ay: -10, bx: 10, by: 9.5 }, {}, ["forms", "labels"]],
      [{ ax: -2, ay: 1, bx: 2, by: 4 }, {}, ["forms", "labels"]],
      [{ ax: 10, ay: 10, bx: 10, by: -10 }, {}, ["forms", "labels"]],
      [{ ax: -10, ay: -10, bx: 10, by: -9.5, px: -10, py: 10 }, {}, ["forms", "collinear", "labels"]],
    ];
    for (const [state, params, layers] of cases) {
      const { rec } = render(results(state, params), layers, 325);
      for (const call of rec.of("fillText")) {
        const [text, x, y] = call.args as [string, number, number];
        expect(text.length, text).toBeLessThanOrEqual(55);
        expect(y, text).toBeGreaterThanOrEqual(0);
        expect(y, text).toBeLessThanOrEqual(layout.height);
        // Centred text: half its width either side of x (about 6 px a character).
        const half = (text.length * 6) / 2;
        if (Math.abs(x - 325 / 2) < 1) {
          expect(x - half, text).toBeGreaterThanOrEqual(0);
          expect(x + half, text).toBeLessThanOrEqual(325);
        } else {
          expect(x, text).toBeGreaterThanOrEqual(0);
          expect(x + text.length * 6, text).toBeLessThanOrEqual(325 + 6);
        }
      }
    }
  });
});
