import { solveTriModel, type SolveTriParams, type SolveTriState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSolveTriLayout, solveTriRenderer } from "./solvetri/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base = solveTriModel.initialize(solveTriModel.defaultParams);
const results = (state: Partial<SolveTriState> = {}, params: Partial<SolveTriParams> = {}) =>
  solveTriModel.derive({ ...base, ...state }, { ...solveTriModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const layout = computeSolveTriLayout(width);
  solveTriRenderer.draw(rec.ctx, layout, { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return { rec, layout, texts: rec.texts(), all: rec.texts().join(" | ") };
};

const MODES = {
  sine: ["triangle", "circle", "labels"],
  cosine: ["triangle", "cosine", "labels"],
  centres: ["triangle", "centres", "labels"],
  ambiguous: ["ambiguous", "labels"],
  heights: ["sight", "labels"],
};

describe("the sine rule view", () => {
  it("names corners and sides, and gives 2R only with the words", () => {
    const shown = render(results({ a: 4, b: 3, angleC: 90 }), MODES.sine);
    expect(shown.all).toContain("a/sin A = b/sin B = c/sin C = 2R = 5.00");
    expect(shown.texts).toEqual(expect.arrayContaining(["a = 4.00", "b = 3.00", "c = 5.00", "A 53.1°", "C 90°"]));
    const bare = render(results({ a: 5, b: 8, angleC: 60 }), ["triangle", "circle"]);
    expect(bare.texts).toEqual(expect.arrayContaining(["A", "B", "C", "a", "b", "c"]));
    expect(bare.all).not.toMatch(/\d\.\d|°/);
  });

  it("draws the circumcircle with radius R on the canvas", () => {
    const { rec, layout } = render(results({ a: 4, b: 3, angleC: 90 }), MODES.sine);
    const circles = rec.of("arc").filter((c) => (c.args[4] as number) === Math.PI * 2 && (c.args[2] as number) > 20);
    expect(circles).toHaveLength(1);
    // Fitted to the stage: the circle's diameter is no wider than the stage.
    expect(2 * (circles[0]!.args[2] as number)).toBeLessThanOrEqual(layout.stage.height);
  });
});

describe("the cosine rule view", () => {
  it("shows the term vanishing at 90°, and added when C is obtuse", () => {
    const right = render(results({ a: 4, b: 3, angleC: 90 }), MODES.cosine).all;
    expect(right).toContain("c² = 25.00 = 25.00 − 0.00");
    expect(right).toContain("C = 90°: cos C = 0, so c² = a² + b²");
    expect(render(results({ a: 5, b: 8, angleC: 60 }), MODES.cosine).all).toContain("c² = 49.00 = 89.00 − 40.00");
    expect(render(results({ a: 5, b: 8, angleC: 120 }), MODES.cosine).all).toContain("c² = 129.00 = 89.00 + 40.00");
  });

  it("hides c without the words", () => {
    const bare = render(results({ a: 5, b: 8, angleC: 60 }), ["triangle", "cosine"]).all;
    expect(bare).not.toContain("7.00");
    expect(bare).toContain("c² = a² + b² − 2ab cos C");
  });
});

describe("the centres view", () => {
  it("marks O, I, G and H, and gives R and r for the 3-4-5 triangle", () => {
    const shown = render(results({ a: 4, b: 3, angleC: 90 }), MODES.centres);
    expect(shown.texts).toEqual(expect.arrayContaining(["O", "I", "G", "H"]));
    expect(shown.all).toContain("R 2.50 · r 1.00 · area 6.00");
    expect(render(results({ a: 4, b: 3, angleC: 90 }), ["triangle", "centres"]).all).not.toContain("2.50");
  });

  it("draws Euler's line except when the centres meet", () => {
    const dashed = (layers: ReturnType<typeof render>) => layers.rec.of("setLineDash").filter((c) => JSON.stringify(c.args[0]) === "[6,4]").length;
    expect(dashed(render(results({ a: 5, b: 8, angleC: 60 }), MODES.centres))).toBe(1);
    expect(dashed(render(results({ a: 5, b: 5, angleC: 60 }), MODES.centres))).toBe(0);
  });
});

describe("the ambiguous case view", () => {
  it("counts the triangles with the words on", () => {
    expect(render(results({ ssaA: 30, ssaB: 10, ssaSide: 7 }), MODES.ambiguous).all).toContain("h = b sin A = 5.00 · a = 7.00: two triangles");
    expect(render(results({ ssaA: 30, ssaB: 10, ssaSide: 4 }), MODES.ambiguous).all).toContain("no triangle");
    expect(render(results({ ssaA: 30, ssaB: 10, ssaSide: 5 }), MODES.ambiguous).all).toContain("one triangle");
  });

  it("marks B₁ and B₂ when there are two", () => {
    expect(render(results({ ssaA: 30, ssaB: 10, ssaSide: 7 }), MODES.ambiguous).texts).toEqual(expect.arrayContaining(["B₁", "B₂", "A", "C"]));
    expect(render(results({ ssaA: 30, ssaB: 10, ssaSide: 12 }), MODES.ambiguous).texts).toContain("B");
  });
});

describe("the heights view", () => {
  it("gives the tower's height only with the words, but always the given angle and distance", () => {
    const shown = render(results({ elev: 60, dist: 30 }, { sight: "tower" }), MODES.heights);
    expect(shown.all).toContain("h = d tan θ = 30 × tan 60° = 51.96 m");
    const bare = render(results({ elev: 60, dist: 30 }, { sight: "tower" }), ["sight"]);
    expect(bare.texts).toEqual(expect.arrayContaining(["60°", "30 m", "h = ?"]));
    expect(bare.all).not.toContain("51.96");
  });

  it("solves the two-point problem, and warns when the angles are the wrong way round", () => {
    const shown = render(results({ elev: 60, far: 30, gap: 20 }, { sight: "two-points" }), MODES.heights);
    expect(shown.all).toContain("h = 17.32 m, its foot 10.00 m from the nearer point");
    expect(render(results({ elev: 60, far: 30, gap: 20 }, { sight: "two-points" }), ["sight"]).all).not.toContain("17.32");
    expect(render(results({ elev: 30, far: 60 }, { sight: "two-points" }), MODES.heights).all).toContain("smaller angle");
  });

  it("puts the ships 54.90 m apart from a 75 m lighthouse", () => {
    const shown = render(results({ elev: 45, far: 30, tall: 75 }, { sight: "lighthouse" }), MODES.heights);
    expect(shown.all).toContain("The ships are 54.90 m apart");
    expect(shown.texts).toEqual(expect.arrayContaining(["45°", "30°", "75 m"]));
    expect(render(results({ elev: 45, far: 30, tall: 75 }, { sight: "lighthouse" }), ["sight"]).all).not.toContain("54.9");
  });
});

describe("on a phone", () => {
  const states: [Partial<SolveTriState>, Partial<SolveTriParams>][] = [
    [{ a: 4, b: 3, angleC: 90 }, {}],
    [{ a: 10, b: 1, angleC: 10 }, {}],
    [{ a: 1, b: 10, angleC: 170 }, {}],
    [{ a: 10, b: 10, angleC: 170 }, {}],
    [{ ssaA: 150, ssaB: 1, ssaSide: 12 }, {}],
    [{ ssaA: 10, ssaB: 12, ssaSide: 1 }, {}],
    [{ elev: 80, dist: 100 }, { sight: "tower" }],
    [{ elev: 10, dist: 5 }, { sight: "tower" }],
    [{ elev: 80, far: 10, gap: 100 }, { sight: "two-points" }],
    [{ elev: 80, far: 10, tall: 150 }, { sight: "lighthouse" }],
    [{ elev: 11, far: 10, tall: 10 }, { sight: "lighthouse" }],
  ];

  it("keeps every word on a 325 px canvas, and captions short", () => {
    for (const [state, params] of states) {
      for (const layers of Object.values(MODES)) {
        const { rec, layout } = render(results(state, params), layers, 325);
        expect(layout.height).toBeGreaterThanOrEqual(330);
        expect(layout.height).toBeLessThanOrEqual(420);
        for (const call of rec.of("fillText")) {
          const [text, x, y] = call.args as [string, number, number];
          const w = text.length * 6;
          expect(x - w / 2, `${text} in ${layers[1] ?? layers[0]}`).toBeGreaterThanOrEqual(0);
          expect(x + w / 2, `${text} in ${layers[1] ?? layers[0]}`).toBeLessThanOrEqual(325);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(layout.height);
          expect(text.length, text).toBeLessThanOrEqual(56);
        }
      }
    }
  });

  it("keeps the triangle's corners on the canvas", () => {
    for (const [state] of states.slice(0, 4)) {
      const { rec } = render(results(state), MODES.sine, 325);
      // The three corner labels sit beside the corners; they must all be on the canvas.
      const corners = rec.of("fillText").filter((c) => /^[ABC] /.test(String(c.args[0])));
      expect(corners).toHaveLength(3);
      for (const c of corners) {
        expect(c.args[1] as number).toBeGreaterThan(0);
        expect(c.args[1] as number).toBeLessThan(325);
      }
    }
  });
});
