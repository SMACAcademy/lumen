import { conicModel, type ConicParams, type ConicState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeConicLayout, conicRenderer } from "./conic/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: ConicState = conicModel.initialize(conicModel.defaultParams);
const results = (params: Partial<ConicParams> = {}, state: Partial<ConicState> = {}) =>
  conicModel.derive({ ...base, ...state }, { ...conicModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  conicRenderer.draw(rec.ctx, computeConicLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const text = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

const CURVES = ["curve", "focus", "string", "labels"];
const TANGENTS = ["curve", "tangent", "rays", "labels"];

describe("the cone view", () => {
  it("names the cut and gives e = cos β / cos α", () => {
    expect(text(render(results({}, { tilt: 60 }), ["cone", "labels"]))).toContain("β = 60° > α: ellipse");
    expect(text(render(results({}, { tilt: 60 }), ["cone", "labels"]))).toContain("e = cos β / cos α = 0.58");
    expect(text(render(results({}, { tilt: 30 }), ["cone", "labels"]))).toContain("β = 30° = α: parabola");
    expect(text(render(results({}, { tilt: 10 }), ["cone", "labels"]))).toContain("β = 10° < α: hyperbola");
    expect(text(render(results({}, { tilt: 90 }), ["cone", "labels"]))).toContain("β = 90° = 90°: circle");
  });

  it("shows the shape but hides e without the words", () => {
    const quiet = text(render(results({}, { tilt: 60 }), ["cone"]));
    expect(quiet).toContain("the cut: ellipse");
    expect(quiet).not.toContain("e =");
  });

  it("draws the hyperbola's cut as two pieces, one in each nappe", () => {
    // Every piece of path starts with a moveTo: two nappes, two generators, the axis and the
    // dashed plane (6), then the plane's thick runs inside the cone, then the cut's own
    // branches beside it — two and two for a hyperbola, one and one for an ellipse.
    const moves = (tilt: number) => render(results({}, { tilt }), ["cone"]).of("moveTo").length;
    expect(moves(10)).toBe(6 + 2 + 2);
    expect(moves(60)).toBe(6 + 1 + 1);
    expect(moves(30)).toBe(6 + 1 + 1);
  });
});

describe("the locus view", () => {
  it("compares PF with PM and names the curve", () => {
    const r = results({}, { e: 0.5, phi: 90 });
    // r = 2e/(1 − e cos 90°) = 1, so PF = 1 and PM = 2.
    const words = text(render(r, ["locus", "labels"]));
    expect(words).toContain("PF 1.00 = 0.50 × PM 2.00");
    expect(words).toContain("e < 1: an ellipse");
    expect(text(render(results({}, { e: 1, phi: 90 }), ["locus", "labels"]))).toContain("e = 1: a parabola");
    expect(text(render(results({}, { e: 1.5, phi: 150 }), ["locus", "labels"]))).toContain("e > 1: a hyperbola");
  });

  it("names F, P, M and the directrix, and hides the numbers without words", () => {
    const quiet = render(results({}, { e: 0.5, phi: 90 }), ["locus"]).texts();
    expect(quiet).toEqual(expect.arrayContaining(["F", "P", "M", "directrix"]));
    expect(quiet.join(" ")).not.toContain("PF 1.00");
  });
});

describe("the standard forms", () => {
  it("writes y² = 8x with its focus, PF = PM and latus rectum 8", () => {
    const words = text(render(results({ kind: "parabola", opens: "right" }, { a: 2, t: 1 }), CURVES));
    expect(words).toContain("y² = 8x");
    expect(words).toContain("F(2, 0)");
    expect(words).toContain("PF = PM = 4.00 · e = 1");
    expect(words).toContain("latus rectum 4a = 8");
  });

  it("writes the other three parabolas", () => {
    expect(render(results({ kind: "parabola", opens: "down" }, { a: 4 }), CURVES).texts()).toEqual(expect.arrayContaining(["x² = −16y", "F(0, −4)"]));
    expect(render(results({ kind: "parabola", opens: "left" }, { a: 1.5 }), CURVES).texts()).toContain("y² = −6x");
    expect(render(results({ kind: "parabola", opens: "up" }, { a: 0.5 }), CURVES).texts()).toContain("x² = 2y");
  });

  it("gives the ellipse's sum of distances and eccentricity", () => {
    const words = text(render(results({ kind: "ellipse" }, { a: 5, b: 3, theta: 60 }), CURVES));
    expect(words).toContain("x²/25 + y²/9 = 1");
    expect(words).toContain("PF₁ + PF₂ = 10.00 = 2a");
    expect(words).toContain("c = 4.00 · e = c/a = 0.80");
    expect(text(render(results({ kind: "ellipse" }, { a: 3, b: 5 }), CURVES))).toContain("PF₁ + PF₂ = 10.00 = 2b");
    expect(text(render(results({ kind: "ellipse" }, { a: 3, b: 3 }), CURVES))).toContain("a = b: a circle");
  });

  it("gives the hyperbola's difference of distances, eccentricity and asymptotes", () => {
    const words = text(render(results({ kind: "hyperbola" }, { a: 3, b: 4, theta: 60 }), CURVES));
    expect(words).toContain("x²/9 − y²/16 = 1");
    expect(words).toContain("|PF₁ − PF₂| = 6.00 = 2a");
    expect(words).toContain("c = 5.00 · e = 1.67 · asymptotes y = ±1.33x");
  });

  it("hides every number but the equation without the words", () => {
    const quiet = text(render(results({ kind: "ellipse" }, { a: 5, b: 3 }), ["curve", "focus", "string"]));
    expect(quiet).toContain("x²/25 + y²/9 = 1");
    expect(quiet).not.toMatch(/PF|e =|c =|4\.00/);
    expect(text(render(results({ kind: "parabola" }, { a: 2 }), ["curve", "focus", "string"]))).not.toContain("F(2");
  });
});

describe("the tangents view", () => {
  it("gives the tangent's and normal's slopes", () => {
    expect(text(render(results({ kind: "parabola" }, { a: 2, t: 2 }), TANGENTS))).toContain("tangent slope 0.50 · normal slope −2.00");
    expect(text(render(results({ kind: "parabola" }, { a: 2, t: 0 }), TANGENTS))).toContain("tangent vertical · normal flat");
    expect(text(render(results({ kind: "ellipse" }, { a: 5, b: 3, theta: 90 }), TANGENTS))).toContain("tangent flat · normal vertical");
  });

  it("shows the reflected rays making equal angles with the tangent", () => {
    expect(text(render(results({ kind: "parabola" }, { a: 2, t: 1 }), TANGENTS))).toContain("ray and PF each meet the tangent at 45.0°");
    expect(text(render(results({ kind: "ellipse" }, { a: 5, b: 3, theta: 60 }), TANGENTS))).toContain("PF₁ and PF₂ each meet the tangent at");
    expect(text(render(results({ kind: "hyperbola" }, { a: 3, b: 4, theta: 60 }), TANGENTS))).toContain("tangent bisects ∠F₁PF₂");
  });
});

describe("on a phone", () => {
  const cases: [string, Partial<ConicParams>, Partial<ConicState>, string[]][] = [
    ["cone", {}, { tilt: 10 }, ["cone", "labels"]],
    ["cone", {}, { tilt: 75 }, ["cone", "labels"]],
    ["locus", {}, { e: 0.9, phi: 30 }, ["locus", "labels"]],
    ["locus", {}, { e: 2, phi: -100 }, ["locus", "labels"]],
    ["parabola", { kind: "parabola", opens: "right" }, { a: 5, t: 3 }, CURVES],
    ["parabola", { kind: "parabola", opens: "down" }, { a: 0.5, t: -3 }, TANGENTS],
    ["ellipse", { kind: "ellipse" }, { a: 5, b: 0.5, theta: 0 }, CURVES],
    ["ellipse", { kind: "ellipse" }, { a: 0.5, b: 5, theta: 90 }, TANGENTS],
    ["hyperbola", { kind: "hyperbola" }, { a: 0.5, b: 5, theta: 72 }, CURVES],
    ["hyperbola", { kind: "hyperbola" }, { a: 5, b: 0.5, theta: 180 }, TANGENTS],
  ];

  it.each(cases)("keeps the %s view's words on a 325 px canvas", (_name, params, state, layers) => {
    const layout = computeConicLayout(325);
    const rec = render(results(params, state), layers, 325);
    for (const call of rec.of("fillText")) {
      const [words, x, y] = call.args as [string, number, number];
      expect(words.length, words).toBeLessThanOrEqual(55);
      expect(y, words).toBeGreaterThanOrEqual(0);
      expect(y, words).toBeLessThanOrEqual(layout.height);
      // Alignment is not recorded, so a text must fit either drawn from x (left) or centred on it.
      const w = words.length * 6;
      const fitsLeft = x >= 0 && x + w <= 325;
      const fitsCentred = x - w / 2 >= 0 && x + w / 2 <= 325;
      expect(fitsLeft || fitsCentred, `"${words}" at ${x}`).toBe(true);
    }
  });

  it("keeps P, the foci and the cone inside their boxes", () => {
    const layout = computeConicLayout(325);
    const { plot } = layout;
    const inside = (x: number, y: number) => x >= plot.x - 1 && x <= plot.x + plot.width + 1 && y >= plot.y - 1 && y <= plot.y + plot.height + 1;
    for (const [, params, state, layers] of cases) {
      const rec = render(results(params, state), layers, 325);
      for (const call of rec.of("arc")) {
        const [x, y] = call.args as [number, number];
        expect(inside(x, y), `${JSON.stringify(state)} disc at ${x}, ${y}`).toBe(true);
      }
      for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
        const [x, y] = call.args as [number, number];
        if (!layers.includes("cone")) continue;
        expect(x >= layout.cone.x - 1 && x <= 325 && y >= 0 && y <= layout.height, `cone path at ${x}, ${y}`).toBe(true);
      }
    }
  });
});
