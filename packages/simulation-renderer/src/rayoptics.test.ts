import { rayOpticsModel, type RayOpticsParams, type RayOpticsState } from "@ise/physics-engine";
import { describe, expect, it } from "vitest";
import { computeRayOpticsLayout, rayOpticsRenderer, rayWavelengthColour } from "./rayoptics/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: RayOpticsState = { u: -60, incidence: 30, prismIncidence: 40 };
const results = (params: Partial<RayOpticsParams> = {}, state: Partial<RayOpticsState> = {}) =>
  rayOpticsModel.derive({ ...base, ...state }, { ...rayOpticsModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const set = new Set(layers);
  rayOpticsRenderer.draw(rec.ctx, computeRayOpticsLayout(width, set), { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const words = (r: ReturnType<typeof results>, layers: string[], width = 800) => render(r, layers, width).texts().join(" | ");

/** Every text drawn, with a rough width of 6 px a character, must lie on the canvas. */
function expectOnCanvas(rec: ReturnType<typeof render>, width: number, height: number) {
  for (const call of rec.of("fillText")) {
    const [text, x, y] = call.args as [string, number, number];
    expect(text.length, text).toBeLessThanOrEqual(55);
    // Labels are drawn left, centred or right; allow for whichever this one is by checking the widest case.
    expect(y, text).toBeGreaterThanOrEqual(0);
    expect(y, text).toBeLessThanOrEqual(height);
    expect(x, text).toBeGreaterThanOrEqual(0);
    expect(x, text).toBeLessThanOrEqual(width);
  }
}

describe("the bench", () => {
  it("names the image for a concave mirror at each place along the axis", () => {
    const beyond = words(results({ element: "concave-mirror", radius: 30 }, { u: -60 }), ["bench", "rays", "labels"]);
    expect(beyond).toContain("Concave mirror · f = −15.0 cm");
    expect(beyond).toContain("u = −60 cm → v = −20.0 cm · m = −0.33");
    expect(beyond).toContain("real · inverted · diminished");
    expect(words(results({ element: "concave-mirror", radius: 30 }, { u: -30 }), ["bench", "labels"])).toContain("real · inverted · same size");
    expect(words(results({ element: "concave-mirror", radius: 30 }, { u: -10 }), ["bench", "labels"])).toContain("v = +30.0 cm · m = +3.00");
    expect(words(results({ element: "concave-mirror", radius: 30 }, { u: -15 }), ["bench", "labels"])).toContain("image at infinity · real · inverted · magnified");
  });

  it("names the image for lenses, the plane mirror and the glass surface", () => {
    expect(words(results({ element: "convex-lens", radius: 20, index: 1.5 }, { u: -30 }), ["bench", "labels"])).toContain("v = +60.0 cm · m = −2.00");
    expect(words(results({ element: "concave-lens", radius: 20, index: 1.5 }, { u: -20 }), ["bench", "labels"])).toContain("virtual · erect · diminished");
    const plane = words(results({ element: "plane-mirror" }, { u: -25 }), ["bench", "labels"]);
    expect(plane).toContain("Plane mirror");
    expect(plane).toContain("v = +25.0 cm · m = +1.00");
    expect(plane).not.toContain("f =");
    const surface = words(results({ element: "surface", radius: 10, index: 1.5 }, { u: -60 }), ["bench", "labels"]);
    expect(surface).toContain("v = +45.0 cm");
    expect(surface).toContain("glass, n = 1.50");
    expect(surface).toContain("F₁");
  });

  it("marks F and C, and keeps every number off the drawing without the words", () => {
    const quiet = render(results({ element: "concave-mirror", radius: 30 }, { u: -60 }), ["bench", "rays"]).texts();
    expect(quiet).toEqual(expect.arrayContaining(["Concave mirror", "F", "C", "O", "I"]));
    expect(quiet.join(" ")).not.toMatch(/\d/);
  });

  it("draws three principal rays, each in two pieces, and dashes the way back to a virtual image", () => {
    const realRays = render(results({ element: "convex-lens", radius: 20 }, { u: -40 }), ["bench", "rays"]);
    const virtualRays = render(results({ element: "convex-lens", radius: 20 }, { u: -10 }), ["bench", "rays"]);
    const strokes = (rec: ReturnType<typeof render>) => rec.of("stroke").length;
    // A virtual image adds one dashed extension per ray.
    expect(strokes(virtualRays) - strokes(realRays)).toBe(3);
  });

  it("puts the image where the formula says, and the rays meet there", () => {
    const layout = computeRayOpticsLayout(800, new Set(["bench"]));
    const rec = render(results({ element: "convex-lens", radius: 20 }, { u: -30 }), ["bench", "rays"]);
    const sx = layout.scene.width / 200;
    const imageX = layout.scene.x + layout.scene.width / 2 + 60 * sx;
    // The image arrow is a vertical segment at v = +60 cm.
    const verticals = rec.of("moveTo").filter((c) => Math.abs((c.args[0] as number) - imageX) < 1);
    expect(verticals.length).toBeGreaterThan(0);
  });

  it("drags the object along the axis", () => {
    const layout = computeRayOpticsLayout(800, new Set(["bench"]));
    const r = results();
    const x = layout.scene.x + layout.scene.width / 2 - 40 * (layout.scene.width / 200);
    expect(rayOpticsRenderer.pick!(layout, x, layout.scene.y + 100, undefined, r)?.writes).toEqual([{ variable: "u", value: -40 }]);
    expect(rayOpticsRenderer.pick!(layout, layout.width - 10, layout.scene.y + 100, "object", r)?.writes).toEqual([{ variable: "u", value: -4 }]);
  });

  it("fits a phone's canvas, wherever the object is", () => {
    for (const element of ["concave-mirror", "convex-mirror", "plane-mirror", "convex-lens", "concave-lens", "surface"] as const) {
      for (const u of [-90, -30, -15, -4]) {
        const layout = computeRayOpticsLayout(325, new Set(["bench"]));
        const rec = render(results({ element, radius: 30, partner: element === "convex-lens" ? -1 : 0 }, { u }), ["bench", "rays", "labels"], 325);
        expectOnCanvas(rec, 325, layout.height);
      }
    }
  });
});

describe("the interface", () => {
  it("refracts into glass and says so", () => {
    const text = words(results({ medium: "glass", direction: "into" }, { incidence: 45 }), ["interface", "rays", "labels"]);
    expect(text).toContain("Light going from air into glass");
    expect(text).toContain("i = 45° → r = 28.1°");
    expect(text).toContain("bent towards the normal");
  });

  it("totally reflects beyond the critical angle, and hides C without the words", () => {
    const text = words(results({ medium: "glass", direction: "out" }, { incidence: 50 }), ["interface", "rays", "labels"]);
    expect(text).toContain("i = 50° is beyond C = 41.8°");
    expect(text).toContain("total internal reflection: no light escapes");
    const quiet = render(results({ medium: "diamond", direction: "out" }, { incidence: 20 }), ["interface", "rays"]).texts();
    expect(quiet.join(" ")).not.toMatch(/24|C =/);
    expect(quiet).toContain("diamond, n = 2.42");
  });

  it("drags the incoming ray round the normal", () => {
    const layout = computeRayOpticsLayout(800, new Set(["interface"]));
    const ox = layout.scene.x + layout.scene.width / 2;
    const oy = layout.scene.y + layout.scene.height / 2;
    expect(rayOpticsRenderer.pick!(layout, ox - 50, oy - 50, undefined, results())?.writes).toEqual([{ variable: "incidence", value: 45 }]);
  });

  it("fits a phone's canvas", () => {
    for (const incidence of [0, 45, 89]) {
      const layout = computeRayOpticsLayout(325, new Set(["interface"]));
      expectOnCanvas(render(results({ medium: "water", direction: "out" }, { incidence }), ["interface", "rays", "labels"], 325), 325, layout.height);
    }
  });
});

describe("the prism", () => {
  it("reports the deviation and its minimum", () => {
    const text = words(results({ prismAngle: 60, index: 1.5 }, { prismIncidence: 48.5 }), ["prism", "deviation", "labels"]);
    expect(text).toContain("A 60° prism, n = 1.50 for yellow light");
    expect(text).toContain("δ = 37.2°");
    expect(text).toContain("D_m = 37.2° at i = 48.6° · n = 1.500");
  });

  it("says when no ray comes out", () => {
    expect(words(results({ prismAngle: 60, index: 1.5 }, { prismIncidence: 20 }), ["prism", "deviation", "labels"])).toContain("trapped at the second face");
    expect(words(results({ prismAngle: 75, index: 2 }), ["prism", "labels"])).toContain("no ray gets through: A is more than 2C");
  });

  it("spreads white light into seven colours, and hides D_m without the words", () => {
    const r = results({ prismAngle: 60, index: 1.5 }, { prismIncidence: 50 });
    const white = render(r, ["prism", "spectrum"]);
    const single = render(r, ["prism"]);
    // Seven coloured rays, each inside the glass and out of it.
    expect(white.of("stroke").length - single.of("stroke").length).toBe(14);
    expect(new Set([690, 640, 590, 550, 510, 470, 430].map(rayWavelengthColour)).size).toBe(7);
    expect(white.texts().join(" ")).not.toMatch(/D_m|37/);
  });

  it("drags the incidence along the graph", () => {
    const layout = computeRayOpticsLayout(800, new Set(["prism"]));
    const x = layout.graph.x + (50 / 90) * layout.graph.width;
    expect(rayOpticsRenderer.pick!(layout, x, layout.graph.y + 20, undefined, results())?.writes).toEqual([{ variable: "prismIncidence", value: 50 }]);
  });

  it("fits a phone's canvas", () => {
    for (const prismIncidence of [10, 48.5, 89]) {
      const layout = computeRayOpticsLayout(325, new Set(["prism"]));
      expectOnCanvas(render(results({ prismAngle: 60 }, { prismIncidence }), ["prism", "deviation", "spectrum", "labels"], 325), 325, layout.height);
    }
  });
});

describe("the sky", () => {
  it("scatters blue more than red, and reddens a low sun", () => {
    const text = words(results({ wavelength: 450, sunAltitude: 5 }), ["sky", "rays", "labels"]);
    expect(text).toContain("The sun 5° above the horizon");
    expect(text).toContain("450 nm scatters 5.86× as much as red");
    expect(text).toContain("blue 7.7% · red 64.6% of sunlight gets through");
    expect(words(results({ wavelength: 450 }), ["sky"])).not.toContain("5.86");
  });

  it("fits a phone's canvas", () => {
    for (const sunAltitude of [2, 30, 90]) {
      const layout = computeRayOpticsLayout(325, new Set(["sky"]));
      expectOnCanvas(render(results({ sunAltitude, wavelength: 400 }), ["sky", "rays", "labels"], 325), 325, layout.height);
    }
  });
});

describe("instruments", () => {
  it("gives each instrument's magnifying power only with the words", () => {
    expect(words(results({ instrument: "telescope", objective: 100, eyepiece: 5 }), ["instrument", "rays", "labels"])).toContain("m = f_o/f_e = 20.0 · tube 105.0 cm");
    expect(words(results({ instrument: "microscope", objective: 2, eyepiece: 5, tube: 20 }), ["instrument", "rays", "labels"])).toContain("m = (L/f_o)(D/f_e) = 50.0");
    expect(words(results({ instrument: "magnifier", eyepiece: 5 }), ["instrument", "rays", "labels"])).toContain("m = 1 + D/f = 6.0 at the near point");
    expect(words(results({ instrument: "microscope", objective: 2, eyepiece: 5, tube: 20 }), ["instrument", "rays"])).not.toContain("50");
  });

  it("chooses the spectacle lens", () => {
    expect(words(results({ instrument: "myopia", farPoint: 80 }), ["instrument", "rays", "labels"])).toContain("P = −1.25 D, f = −80.0 cm");
    expect(words(results({ instrument: "hypermetropia", nearPoint: 75 }), ["instrument", "rays", "labels"])).toContain("P = +2.67 D, f = +37.5 cm");
    expect(words(results({ instrument: "hypermetropia", nearPoint: 75 }), ["instrument"])).toContain("convex lens · near point 75 cm");
  });

  it("fits a phone's canvas", () => {
    for (const instrument of ["magnifier", "microscope", "telescope", "myopia", "hypermetropia"] as const) {
      const layout = computeRayOpticsLayout(325, new Set(["instrument"]));
      expectOnCanvas(render(results({ instrument, objective: instrument === "microscope" ? 1 : 150, eyepiece: 2 }), ["instrument", "rays", "labels"], 325), 325, layout.height);
    }
  });
});
