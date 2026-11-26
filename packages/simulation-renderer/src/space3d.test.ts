import { space3dModel, type Space3dParams, type Space3dState } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSpace3dLayout, space3dProject, space3dRenderer } from "./space3d/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

type V = readonly [number, number, number];
const base = space3dModel.initialize(space3dModel.defaultParams);
const vec = (key: "a" | "b" | "c" | "e" | "n", v: V): Partial<Space3dState> => ({ [`${key}x`]: v[0], [`${key}y`]: v[1], [`${key}z`]: v[2] });
const results = (state: Partial<Space3dState> = {}, params: Partial<Space3dParams> = {}) =>
  space3dModel.derive({ ...base, ...state }, { ...space3dModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800, angleUnit: "deg" | "rad" = "deg") => {
  const rec = recordingContext();
  space3dRenderer.draw(rec.ctx, computeSpace3dLayout(width), { results: r, trace: null, layers: new Set(["axes", ...layers]), highlight: null, theme: fallbackTheme, angleUnit, graphs: [] });
  return rec;
};
const words = (r: ReturnType<typeof results>, layers: string[]) => render(r, [...layers, "labels"]).texts().join(" | ");

describe("the projection", () => {
  it("puts z straight up, and x towards the viewer on the left at the default view", () => {
    const layout = computeSpace3dLayout(325);
    const yaw = Math.PI / 6;
    const [ox, oy] = space3dProject(layout, yaw, [0, 0, 0]);
    const [zx, zy] = space3dProject(layout, yaw, [0, 0, 1]);
    const [xx, xy] = space3dProject(layout, yaw, [1, 0, 0]);
    const [yx] = space3dProject(layout, yaw, [0, 1, 0]);
    expect(zx).toBeCloseTo(ox, 10);
    expect(zy).toBeLessThan(oy);
    expect(xx).toBeLessThan(ox);
    expect(xy).toBeGreaterThan(oy);
    expect(yx).toBeGreaterThan(ox);
  });

  it("turns the floor with the yaw but never tips z", () => {
    const layout = computeSpace3dLayout(325);
    const at = (yaw: number) => space3dProject(layout, yaw, [1, 0, 0]);
    expect(at(0)[0]).toBeCloseTo(layout.ox, 10);
    expect(at(Math.PI / 2)[0]).toBeLessThan(layout.ox);
    expect(space3dProject(layout, 1.2, [0, 0, 2])).toEqual(space3dProject(layout, -2, [0, 0, 2]));
  });
});

describe("the axes", () => {
  it("names x, y and z and the origin", () => {
    expect(render(results(), ["points"]).texts()).toEqual(expect.arrayContaining(["x", "y", "z", "O"]));
  });
});

describe("the section view", () => {
  const ends = { ...vec("a", [1, -2, 4]), ...vec("b", [4, 4, 1]) };
  it("marks A, B and P and gives P with the words", () => {
    const texts = render(results({ ...ends, m: 2, n: 1 }), ["points", "labels"]).texts();
    expect(texts).toEqual(expect.arrayContaining(["A", "B", "P", "Dividing AB in the ratio m : n"]));
    expect(texts.join(" ")).toContain("P = (3, 2, 2) divides AB 2 : 1 internally");
    expect(texts.join(" ")).toContain("AP = 4.90, PB = 2.45: AP : PB = 2 : 1");
  });

  it("divides externally, and says when it cannot", () => {
    expect(words(results({ ...vec("a", [1, 2, 3]), ...vec("b", [2, 3, 2]), m: 2, n: 1 }, { division: "external" }), ["points"])).toContain("P = (3, 4, 1) divides AB 2 : 1 externally");
    const none = render(results({ ...ends, m: 3, n: 3 }, { division: "external" }), ["points", "labels"]).texts();
    expect(none.join(" ")).toContain("m = n: no point divides AB externally");
    expect(none).not.toContain("P");
  });

  it("hides every number without the words", () => {
    expect(render(results({ ...ends, m: 2, n: 1 }), ["points"]).texts().join(" ")).not.toMatch(/\d/);
  });
});

describe("the scalar product view", () => {
  it("gives a·b, the angle and the shadow", () => {
    const text = words(results({ ...vec("a", [2, 3, 2]), ...vec("b", [1, 2, 1]) }), ["shadow"]);
    expect(text).toContain("a·b = 10.00 · θ = 8.0°");
    expect(text).toContain("shadow of a on b: a·b/|b| = 4.08");
    expect(words(results({ ...vec("a", [1, 0, 1]), ...vec("b", [0, 1, 1]) }), ["shadow"])).toContain("θ = 60.0°");
  });

  it("uses radians when the learner does", () => {
    const rec = render(results({ ...vec("a", [1, 0, 1]), ...vec("b", [0, 1, 1]) }), ["shadow", "labels"], 800, "rad");
    expect(rec.texts().join(" ")).toContain("θ = 1.05 rad");
  });

  it("says when there is no shadow, or no angle", () => {
    expect(words(results({ ...vec("a", [3, 2, 1]), ...vec("b", [1, -2, 1]) }), ["shadow"])).toContain("a ⊥ b: a·b = 0");
    expect(words(results(vec("a", [0, 0, 0])), ["shadow"])).toContain("a zero vector has no direction");
  });

  it("hides the numbers for estimating", () => {
    expect(render(results({ ...vec("a", [2, 3, 2]), ...vec("b", [1, 2, 1]) }), ["shadow"]).texts().join(" ")).not.toMatch(/\d/);
  });
});

describe("the vector product view", () => {
  it("fills the parallelogram and stands a × b up from it", () => {
    const rec = render(results({ ...vec("a", [1, 2, 2]), ...vec("b", [2, 1, -2]) }), ["area", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["a", "b"]));
    expect(rec.texts().join(" ")).toContain("|a × b| = 9.00 = area of the parallelogram");
    expect(rec.texts().join(" ")).toContain("a × b = (−6, 6, −3) · arrow drawn ×0.56");
    expect(rec.of("fill").length).toBeGreaterThan(0);
  });

  it("draws a short a × b to scale", () => {
    const text = words(results({ ...vec("a", [1, 0, 0]), ...vec("b", [0, 2, 0]) }), ["area"]);
    expect(text).toContain("a × b = (0, 0, 2)");
    expect(text).not.toContain("drawn ×");
  });

  it("names parallel vectors", () => {
    expect(words(results({ ...vec("a", [1, 2, -1]), ...vec("b", [-2, -4, 2]) }), ["area"])).toContain("a ∥ b: a × b = 0");
  });
});

describe("the box view", () => {
  it("gives the triple product and its volume", () => {
    const r = results({ ...vec("a", [1, 2, 0]), ...vec("b", [0, 1, 2]), ...vec("c", [2, 0, 1]) });
    const text = words(r, ["box"]);
    expect(text).toContain("[a b c] = 9.00 · volume 9.00");
    expect(text).toContain("right-handed");
    expect(render(r, ["box"]).texts()).toEqual(expect.arrayContaining(["a", "b", "c"]));
  });

  it("flattens when coplanar", () => {
    expect(words(results({ ...vec("a", [1, 1, 0]), ...vec("b", [0, 1, 1]), ...vec("c", [1, 2, 1]) }), ["box"])).toContain("coplanar: the box is flat, volume 0");
  });
});

describe("the direction cosines view", () => {
  it("marks α, β, γ and gives l, m, n", () => {
    const rec = render(results(vec("a", [4, 2, 4])), ["cosines", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["α", "β", "γ", "a"]));
    expect(rec.texts().join(" ")).toContain("l, m, n = 0.67, 0.33, 0.67 · l² + m² + n² = 1.00");
    expect(rec.texts().join(" ")).toContain("α, β, γ = 48.2°, 70.5°, 48.2° · |a| = 6.00");
  });
});

describe("the lines view", () => {
  it("names skew lines and their distance", () => {
    const r = results({ ...vec("a", [1, 2, 1]), ...vec("b", [1, -1, 1]), ...vec("c", [2, -1, -1]), ...vec("e", [2, 1, 2]) });
    const text = words(r, ["lines"]);
    expect(text).toContain("shortest distance 2.12 · skew");
    expect(text).toContain("angle between the lines");
  });

  it("says when they meet and when they are parallel", () => {
    expect(words(results({ ...vec("a", [-2, 0, 0]), ...vec("b", [1, 0, 0]), ...vec("c", [0, -2, -2]), ...vec("e", [0, 1, 1]) }), ["lines"])).toContain("shortest distance 0.00 · they meet");
    expect(words(results({ ...vec("a", [0, 0, 0]), ...vec("b", [1, 0, 0]), ...vec("c", [2, 3, 4]), ...vec("e", [-2, 0, 0]) }), ["lines"])).toContain("shortest distance 5.00 · parallel");
    expect(words(results({ ...vec("b", [1, 1, 0]), ...vec("e", [-1, 0, 1]) }), ["lines"])).toContain("angle between the lines 60.0°");
  });
});

describe("the plane view", () => {
  it("gives the distance from A and the angle L₁ makes", () => {
    const text = words(results({ ...vec("n", [2, -1, 2]), d: 3, ...vec("a", [3, 1, 2]), ...vec("b", [1, 0, 0]) }), ["plane"]);
    expect(text).toContain("A is 2.00 from the plane · O is 1.00");
    expect(text).toContain("L₁ meets the plane at 41.8°");
    expect(words(results({ ...vec("n", [0, 0, 1]), d: 2, ...vec("a", [1, 1, 0]), ...vec("b", [1, 2, 0]) }), ["plane"])).toContain("L₁ is parallel to the plane");
    expect(words(results(vec("n", [0, 0, 0])), ["plane"])).toContain("is not a plane");
  });
});

describe("on a phone", () => {
  const scenes: [string, Partial<Space3dState>, Partial<Space3dParams>][] = [
    ["points", { ...vec("a", [4, -4, 4]), ...vec("b", [-4, 4, -4]), m: 5, n: 1 }, { division: "external" }],
    ["points", { ...vec("a", [1, -2, 4]), ...vec("b", [4, 4, 1]), m: 2, n: 1 }, {}],
    ["shadow", { ...vec("a", [4, 4, 4]), ...vec("b", [-4, 4, -4]) }, {}],
    ["area", { ...vec("a", [4, -4, 4]), ...vec("b", [-4, -4, 4]) }, {}],
    ["box", { ...vec("a", [4, 4, 4]), ...vec("b", [-4, 4, 4]), ...vec("c", [4, -4, 4]) }, {}],
    ["cosines", vec("a", [-4, 4, -4]), {}],
    ["lines", { ...vec("a", [4, 4, 4]), ...vec("c", [-4, -4, -4]) }, {}],
    ["plane", { ...vec("n", [1, 1, 1]), d: 12, ...vec("a", [-4, -4, -4]) }, {}],
  ];

  it("keeps every label and caption on a 325 px canvas, at every turn of the view", () => {
    const layout = computeSpace3dLayout(325);
    expect(layout.height).toBeGreaterThanOrEqual(330);
    expect(layout.height).toBeLessThanOrEqual(420);
    for (const [layer, state, params] of scenes) {
      for (const yaw of [-Math.PI, -1, 0, Math.PI / 6, 2]) {
        const rec = render(results({ ...state, yaw }, params), [layer, "labels"], 325);
        for (const call of rec.of("fillText")) {
          const [text, x, y] = call.args as [string, number, number];
          const w = text.length * 6;
          const centred = Math.abs(x - 325 / 2) < 1e-9;
          expect(text.length, text).toBeLessThanOrEqual(55);
          expect(y, `${layer} ${text}`).toBeGreaterThanOrEqual(0);
          expect(y, `${layer} ${text}`).toBeLessThanOrEqual(layout.height);
          // Captions and titles are centred; names of points start at x.
          expect(centred ? x - w / 2 : x, `${layer} ${text}`).toBeGreaterThanOrEqual(0);
          expect(centred ? x + w / 2 : x + w, `${layer} ${text}`).toBeLessThanOrEqual(325);
        }
      }
    }
  });

  it("fits the captions within the width", () => {
    for (const [layer, state, params] of scenes) {
      const rec = render(results(state, params), [layer, "labels"], 325);
      for (const call of rec.of("fillText")) {
        const [text, x] = call.args as [string, number];
        if (Math.abs(x - 325 / 2) < 1e-9) {
          expect(x - (text.length * 6) / 2, text).toBeGreaterThanOrEqual(0);
          expect(x + (text.length * 6) / 2, text).toBeLessThanOrEqual(325);
        }
      }
    }
  });

  it("clips the scene to the view", () => {
    const rec = render(results(), ["lines"], 325);
    const [rect] = rec.of("rect");
    const layout = computeSpace3dLayout(325);
    expect(rect!.args).toEqual([layout.view.x, layout.view.y, layout.view.width, layout.view.height]);
    expect(rec.of("clip")).toHaveLength(1);
    expect(layout.view.x + layout.view.width).toBeLessThanOrEqual(325);
  });
});
