import { geoSchoolModel, type GeoSchoolParams, type GeoSchoolState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeGeoSchoolLayout, geoSchoolCircleFrame, geoSchoolRenderer, geoSchoolTriangleFrame } from "./geoschool/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = geoSchoolModel.initialize(geoSchoolModel.defaultParams);
const results = (state: Partial<GeoSchoolState> = {}, params: Partial<GeoSchoolParams> = {}) =>
  geoSchoolModel.derive({ ...base, ...state }, { ...geoSchoolModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const set = new Set(layers);
  const layout = computeGeoSchoolLayout(width, set);
  geoSchoolRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, layout };
};
const texts = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).rec.texts();

describe("the turn view", () => {
  it("names the angle and the rest of the turn", () => {
    const t = texts(results({ turn: 135 }), ["turn", "labels"]);
    expect(t).toEqual(expect.arrayContaining(["135°: an obtuse angle", "The rest of the full turn: 225°", "135°"]));
    expect(texts(results({ turn: 270 }), ["turn", "labels"])).toContain("270°: a reflex angle");
    expect(texts(results({ turn: 360 }), ["turn", "labels"])).toContain("360°: a complete turn");
  });

  it("hides the size without the words, but keeps the protractor", () => {
    const t = texts(results({ turn: 135 }), ["turn"]);
    expect(t).toEqual(["0°", "90°", "180°", "270°"]);
  });
});

describe("the pairs view", () => {
  it("adds the linear pair and matches the opposite angles", () => {
    const t = texts(results({ cross: 50 }), ["pairs", "labels"]);
    expect(t).toEqual(expect.arrayContaining(["50° + 130° = 180°: a linear pair", "Vertically opposite angles are equal: 50° = 50°"]));
    expect(t.filter((s) => s === "130°")).toHaveLength(2);
  });
});

describe("the parallel view", () => {
  it("matches corresponding angles only when the lines are parallel", () => {
    expect(texts(results({ cut: 60, tilt: 0 }), ["parallel", "labels"])).toEqual(
      expect.arrayContaining(["Parallel: corresponding angles equal, 60° = 60°", "Co-interior angles: 120° + 60° = 180°"]),
    );
    expect(texts(results({ cut: 60, tilt: 12 }), ["parallel", "labels"])).toEqual(
      expect.arrayContaining(["Not parallel: 60° and 48° no longer match", "Co-interior: 120° + 48° = 168°, not 180°"]),
    );
  });
});

describe("the triangle view", () => {
  it("adds the three angles, and shows the exterior angle", () => {
    expect(texts(results({ angleA: 50, angleB: 60 }), ["triangle", "labels"])).toEqual(expect.arrayContaining(["50° + 60° + 70° = 180°", "An acute-angled triangle"]));
    expect(texts(results({ angleA: 50, angleB: 60 }), ["triangle", "exterior", "labels"])).toEqual(expect.arrayContaining(["Exterior angle 120° = 50° + 70°", "120°"]));
    expect(texts(results({ angleA: 50, angleB: 60 }), ["triangle", "tear", "labels"])).toContain("Copied to the top, they fill a straight line");
  });

  it("writes no angle sizes without the words", () => {
    const t = texts(results({ angleA: 50, angleB: 60 }), ["triangle", "exterior"]);
    expect(t.join(" ")).not.toMatch(/\d/);
    expect(t).toEqual(expect.arrayContaining(["A", "B", "C"]));
  });

  it("drags the apex back to the same angles", () => {
    const r = results({ angleA: 50, angleB: 60 });
    const layout = computeGeoSchoolLayout(325, new Set(["triangle", "labels"]));
    const { C } = geoSchoolTriangleFrame(layout, r);
    const pick = geoSchoolRenderer.pick!(layout, C[0], C[1], undefined, r);
    expect(pick).toEqual({ writes: [{ variable: "angleA", value: 50 }, { variable: "angleB", value: 60 }], region: "apex" });
    expect(geoSchoolRenderer.pick!(layout, 5, 5, undefined, r)).toBeNull();
  });
});

describe("the build view", () => {
  it("says when three sticks cannot meet", () => {
    const t = texts(results({ sideP: 3, sideQ: 4, sideR: 8 }), ["build", "labels"]);
    expect(t).toEqual(expect.arrayContaining(["SSS: three sides", "No triangle fits", "3 + 4 = 7, less than 8: they can't meet"]));
    expect(texts(results({ sideP: 3, sideQ: 4, sideR: 5 }), ["build", "labels"])).toContain("3 + 4 = 7, more than 5: the sticks close");
    expect(texts(results({ sideP: 1, sideQ: 2, sideR: 3 }), ["build", "labels"])).toContain("1 + 2 = 3, just 3: they lie flat");
  });

  it("shows SSA making two triangles, and AAA making any size", () => {
    const ssa = texts(results({ sideP: 8, sideQ: 6, angleA: 40 }, { rule: "ssa" }), ["build", "labels"]);
    expect(ssa).toEqual(expect.arrayContaining(["SSA: two sides, an angle not between", "Two different triangles fit", "Y′", "40°"]));
    expect(texts(results({}, { rule: "aaa" }), ["build", "labels"])).toEqual(expect.arrayContaining(["Endless triangles fit, of any size", "Same angles, different sizes: not congruent"]));
    expect(texts(results({ sideP: 6, sideQ: 10 }, { rule: "rhs" }), ["build", "labels"])).toEqual(expect.arrayContaining(["Exactly one triangle fits", "8", "10", "6"]));
    expect(texts(results({ sideP: 6, sideQ: 5 }, { rule: "rhs" }), ["build", "labels"])).toContain("The hypotenuse 5 must be longer than 6");
  });
});

describe("the quad view", () => {
  it("adds to 360° and bisects the diagonals of a parallelogram", () => {
    const t = texts(results({ quadBase: 6, quadSide: 4, quadAngle: 60, quadShift: 0 }), ["quad", "labels"]);
    expect(t).toEqual(expect.arrayContaining(["Parallelogram ABCD", "60° + 120° + 60° + 120° = 360°", "Diagonals bisect: AO = OC = 4.36, BO = OD = 2.65"]));
    const trap = texts(results({ quadBase: 6, quadSide: 4, quadAngle: 60, quadShift: 2 }), ["quad", "labels"]);
    expect(trap).toEqual(expect.arrayContaining(["60° + 139.1° + 40.9° + 120° = 360°"]));
    expect(trap.join(" ")).toContain("the diagonals don't bisect");
  });
});

describe("the circle view", () => {
  it("doubles the angle at P at the centre, and adds a cyclic quadrilateral's opposite angles", () => {
    const t = texts(results({ arc: 100, pointP: 90, pointQ: 270 }), ["circle", "cyclic", "labels"]);
    expect(t).toEqual(expect.arrayContaining(["At the centre 100° = 2 × 50°, the angle at P", "Cyclic APBQ: 50° + 130° = 180°"]));
    expect(texts(results({ arc: 100, pointP: 270 }), ["circle", "labels"])).toContain("At the centre 260° = 2 × 130°, the angle at P");
    expect(texts(results({ arc: 180, pointP: 60 }), ["circle", "labels"])).toContain("A diameter: the angle in a semicircle is 90°");
    expect(texts(results({ arc: 100, pointP: 60, pointQ: 120 }), ["circle", "cyclic", "labels"])).toContain("Same segment: 50° = 50°");
  });

  it("hides every size without the words", () => {
    expect(texts(results({ arc: 120, pointP: 90 }), ["circle", "cyclic"]).join(" ")).not.toMatch(/\d/);
  });

  it("drags P round the circle", () => {
    const r = results({ arc: 100, pointP: 90 });
    const layout = computeGeoSchoolLayout(325, new Set(["circle"]));
    const { on } = geoSchoolCircleFrame(layout);
    const [x, y] = on(90);
    expect(geoSchoolRenderer.pick!(layout, x, y, undefined, r)).toEqual({ writes: [{ variable: "pointP", value: 90 }], region: "P" });
    const [x2, y2] = on(150);
    expect(geoSchoolRenderer.pick!(layout, x2, y2, "P", r)).toEqual({ writes: [{ variable: "pointP", value: 150 }], region: "P" });
  });
});

describe("on a 325 px phone", () => {
  const cases: [string[], Partial<GeoSchoolState>, Partial<GeoSchoolParams>][] = [
    [["turn", "labels"], { turn: 0 }, {}],
    [["turn", "labels"], { turn: 359 }, {}],
    [["pairs", "labels"], { cross: 10 }, {}],
    [["pairs", "labels"], { cross: 170 }, {}],
    [["parallel", "labels"], { cut: 40, tilt: 30 }, {}],
    [["parallel", "labels"], { cut: 140, tilt: -30 }, {}],
    [["triangle", "exterior", "labels"], { angleA: 150, angleB: 10 }, {}],
    [["triangle", "tear", "labels"], { angleA: 10, angleB: 150 }, {}],
    [["triangle", "labels"], { angleA: 10, angleB: 10 }, {}],
    [["build", "labels"], { sideP: 1, sideQ: 1, sideR: 12 }, {}],
    [["build", "labels"], { sideP: 12, sideQ: 12, sideR: 12 }, {}],
    [["build", "labels"], { sideP: 12, sideQ: 12, angleA: 150 }, { rule: "sas" }],
    [["build", "labels"], { sideP: 12, angleA: 150, angleB: 20 }, { rule: "asa" }],
    [["build", "labels"], { sideP: 12, sideQ: 6, angleA: 30 }, { rule: "ssa" }],
    [["build", "labels"], { sideP: 12, sideQ: 2, angleA: 80 }, { rule: "ssa" }],
    [["build", "labels"], { sideP: 1, sideQ: 12 }, { rule: "rhs" }],
    [["build", "labels"], { sideP: 12, sideQ: 3 }, { rule: "rhs" }],
    [["build", "labels"], { sideP: 4, angleA: 30, angleB: 30 }, { rule: "aaa" }],
    [["quad", "labels"], { quadBase: 8, quadSide: 6, quadAngle: 140, quadShift: 2 }, {}],
    [["quad", "labels"], { quadBase: 3, quadSide: 6, quadAngle: 40, quadShift: -2 }, {}],
    [["circle", "cyclic", "labels"], { arc: 20, pointP: 270, pointQ: 0 }, {}],
    [["circle", "cyclic", "labels"], { arc: 180, pointP: 180, pointQ: 300 }, {}],
  ];

  it.each(cases.map((c, i) => [i, ...c] as const))("case %i keeps every word and shape on the canvas", (_i, layers, state, params) => {
    const { rec, layout } = render(results(state, params), layers, 325);
    const W = layout.width;
    const H = layout.height;
    for (const call of rec.of("fillText")) {
      const [text, x, y] = call.args as [string, number, number];
      expect(text.length, text).toBeLessThanOrEqual(55);
      // Every word is centred: half its width either side.
      expect(x - (text.length * 6) / 2, text).toBeGreaterThanOrEqual(0);
      expect(x + (text.length * 6) / 2, text).toBeLessThanOrEqual(W);
      expect(y, text).toBeGreaterThanOrEqual(0);
      expect(y, text).toBeLessThanOrEqual(H);
    }
    if (layers[0] === "parallel") return; // Its long lines are clipped to the figure.
    for (const call of [...rec.of("moveTo"), ...rec.of("lineTo")]) {
      const [x, y] = call.args as [number, number];
      expect(x).toBeGreaterThanOrEqual(-0.5);
      expect(x).toBeLessThanOrEqual(W + 0.5);
      expect(y).toBeGreaterThanOrEqual(-0.5);
      expect(y).toBeLessThanOrEqual(layout.lines[0] - 8);
    }
    for (const call of rec.of("arc")) {
      const [x, y, r] = call.args as [number, number, number];
      expect(x - r).toBeGreaterThanOrEqual(-0.5);
      expect(x + r).toBeLessThanOrEqual(W + 0.5);
      expect(y - r).toBeGreaterThanOrEqual(-0.5);
      expect(y + r).toBeLessThanOrEqual(layout.lines[0] - 8);
    }
  });
});
