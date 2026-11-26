import {
  SYMSOLID_NET_ORDER,
  SYMSOLID_SHAPE_ORDER,
  SYMSOLID_SOLID_ORDER,
  symSolidModel,
  type SymSolidParams,
  type SymSolidState,
} from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeSymSolidLayout, symSolidRenderer } from "./symsolid/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const base: SymSolidState = { mirror: 60, turn: 0, sides: 5, pull: 0, baseSides: 4, fold: 0 };
const results = (params: Partial<SymSolidParams> = {}, state: Partial<SymSolidState> = {}) =>
  symSolidModel.derive({ ...base, ...state }, { ...symSolidModel.defaultParams, ...params });
const render = (r: ReturnType<typeof results>, layers: string[], width = 800) => {
  const rec = recordingContext();
  const set = new Set(layers);
  symSolidRenderer.draw(rec.ctx, computeSymSolidLayout(width, set), { results: r, trace: null, layers: set, highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};
const words = (rec: ReturnType<typeof render>) => rec.texts().join(" | ");

/** Every point the drawing moves or draws to, and every circle's full extent, stays on the canvas. */
function expectInside(rec: ReturnType<typeof render>, width: number, height: number, what: string) {
  for (const call of rec.calls) {
    if (call.method === "moveTo" || call.method === "lineTo") {
      const [x, y] = call.args as [number, number];
      expect(x, `${what} ${call.method} x`).toBeGreaterThanOrEqual(0);
      expect(x, `${what} ${call.method} x`).toBeLessThanOrEqual(width);
      expect(y, `${what} ${call.method} y`).toBeGreaterThanOrEqual(0);
      expect(y, `${what} ${call.method} y`).toBeLessThanOrEqual(height);
    }
    if (call.method === "arc") {
      const [x, y, r] = call.args as [number, number, number];
      expect(x - r, `${what} arc`).toBeGreaterThanOrEqual(0);
      expect(x + r, `${what} arc`).toBeLessThanOrEqual(width);
      expect(y - r, `${what} arc`).toBeGreaterThanOrEqual(0);
      expect(y + r, `${what} arc`).toBeLessThanOrEqual(height);
    }
    if (call.method === "fillText") {
      const [text, x] = call.args as [string, number];
      // Captions and titles are centred; a centred text this long must still fit.
      expect(text.length, `${what} "${text}"`).toBeLessThanOrEqual(55);
      expect(x, `${what} "${text}"`).toBeGreaterThanOrEqual(0);
      expect(x, `${what} "${text}"`).toBeLessThanOrEqual(width);
    }
  }
}

describe("the mirror view", () => {
  it("says when the mirror is a line of symmetry", () => {
    expect(words(render(results({ shape: "rectangle" }, { mirror: 90 }), ["mirror", "labels"]))).toContain("mirror at 90° · it folds onto itself");
    expect(words(render(results({ shape: "rectangle" }, { mirror: 30 }), ["mirror", "labels"]))).toContain("the two halves do not match");
    expect(words(render(results({ shape: "hexagon" }), ["mirror", "labels"]))).toContain("Regular hexagon: 6 lines of symmetry");
    expect(words(render(results({ shape: "parallelogram" }), ["mirror", "labels"]))).toContain("Parallelogram: no line of symmetry");
    expect(words(render(results({ shape: "circle" }), ["mirror", "labels"]))).toContain("Circle: endless lines of symmetry");
  });

  it("hides the count without the words", () => {
    const hidden = words(render(results({ shape: "hexagon" }), ["mirror"]));
    expect(hidden).not.toMatch(/lines|symmetry|folds/);
    expect(hidden).toContain("Regular hexagon");
  });

  it("draws the shape and its reflection: a letter as strokes", () => {
    // Letter H: three strokes, then three reflected strokes.
    const rec = render(results({ shape: "H" }, { mirror: 0 }), ["mirror"]);
    expect(rec.of("moveTo").length).toBeGreaterThanOrEqual(6);
  });

  it("maps a drag round the centre to the mirror's angle", () => {
    const layout = computeSymSolidLayout(325, new Set(["mirror"]));
    const [cx, cy] = layout.centre;
    expect(symSolidRenderer.pick!(layout, cx, cy - 60, undefined, {})).toMatchObject({ writes: [{ variable: "mirror", value: 90 }] });
    expect(symSolidRenderer.pick!(layout, cx + 60, cy, undefined, {})).toMatchObject({ writes: [{ variable: "mirror", value: 0 }] });
    expect(symSolidRenderer.pick!(layout, cx - 60, cy - 60, undefined, {})).toMatchObject({ writes: [{ variable: "mirror", value: 135 }] });
  });
});

describe("the turn view", () => {
  it("counts the fits on the way round", () => {
    expect(words(render(results({ shape: "square" }, { turn: 180 }), ["turn", "labels"]))).toContain("turned 180° · it fits!");
    expect(words(render(results({ shape: "square" }, { turn: 180 }), ["turn", "labels"]))).toContain("fits so far: 2 · order of rotational symmetry 4");
    expect(words(render(results({ shape: "kite" }, { turn: 100 }), ["turn", "labels"]))).toContain("it does not fit");
    expect(words(render(results({ shape: "circle" }, { turn: 100 }), ["turn", "labels"]))).toContain("a circle fits after any turn at all");
    expect(words(render(results({ shape: "pentagon" }, { turn: 72 }), ["turn"]))).not.toContain("fits");
  });

  it("maps a drag to the turn", () => {
    const layout = computeSymSolidLayout(325, new Set(["turn"]));
    const [cx, cy] = layout.centre;
    expect(symSolidRenderer.pick!(layout, cx - 60, cy, undefined, {})).toMatchObject({ writes: [{ variable: "turn", value: 180 }] });
    expect(symSolidRenderer.pick!(layout, cx, cy + 60, undefined, {})).toMatchObject({ writes: [{ variable: "turn", value: 270 }] });
    expect(symSolidRenderer.pick!(layout, 2, 2, undefined, {})).toBeNull();
  });
});

describe("the polygon view", () => {
  it("cuts the polygon into triangles from A and gives the sums", () => {
    const rec = render(results({}, { sides: 6 }), ["polygon", "labels"]);
    expect(words(rec)).toContain("Hexagon · 6 sides");
    expect(words(rec)).toContain("4 triangles · angle sum 4 × 180° = 720°");
    expect(words(rec)).toContain("each angle 120° · each exterior 60°");
    // Four triangles, six corner dots and A's own dot, and the pill behind A's angle.
    expect(rec.of("fill")).toHaveLength(4 + 7 + 1);
  });

  it("keeps the sum when A is pulled out", () => {
    expect(words(render(results({}, { sides: 6, pull: 0.3 }), ["polygon", "labels"]))).toContain("angle A is now 94.5° · the sum is still 720°");
  });

  it("adds the exterior angles to a full turn", () => {
    expect(words(render(results({}, { sides: 5 }), ["polygon", "exterior", "labels"]))).toContain("each exterior 72° · all together 360°");
  });

  it("hides the sizes without the words", () => {
    expect(words(render(results({}, { sides: 8 }), ["polygon", "exterior"]))).not.toMatch(/°/);
  });
});

describe("the solid view", () => {
  it("counts faces, edges and vertices, and checks Euler's formula", () => {
    expect(words(render(results({ solid: "cube" }), ["solid", "labels"]))).toContain("faces 6 · edges 12 · vertices 8");
    expect(words(render(results({ solid: "prism" }, { baseSides: 5 }), ["solid", "labels"]))).toContain("F + V − E = 7 + 10 − 15 = 2");
    expect(words(render(results({ solid: "prism" }, { baseSides: 5 }), ["solid"]))).toContain("Pentagonal prism");
    const cylinder = words(render(results({ solid: "cylinder" }), ["solid", "labels"]));
    expect(cylinder).toContain("2 flat faces · 1 curved surface · 2 edges · 0 vertices");
    expect(cylinder).toContain("not a polyhedron: Euler's formula is not for it");
    expect(words(render(results({ solid: "cone" }), ["solid", "labels"]))).toContain("1 flat face · 1 curved surface · 1 edge · 1 vertex");
  });

  it("dashes the hidden edges of a cube and dots every corner", () => {
    const rec = render(results({ solid: "cube" }), ["solid"]);
    // 3 hidden edges, 9 seen, 8 corners.
    expect(rec.of("setLineDash").filter((c) => (c.args[0] as number[]).length > 0)).toHaveLength(3);
    expect(rec.of("arc")).toHaveLength(8);
    expect(words(rec)).not.toMatch(/faces|edges/);
  });

  it("draws the top, front and side views", () => {
    const rec = render(results({ solid: "cone" }), ["solid", "views", "labels"]);
    expect(rec.texts()).toEqual(expect.arrayContaining(["Top", "Front", "Side", "circle", "triangle"]));
    expect(words(render(results({ solid: "cone" }), ["solid", "views"]))).not.toContain("circle");
  });
});

describe("the net view", () => {
  it("folds the net and says whether it closes", () => {
    expect(words(render(results({ net: "cross" }, { fold: 0 }), ["net", "labels"]))).toContain("flat: press play to fold it up");
    expect(words(render(results({ net: "cross" }, { fold: 0.5 }), ["net", "labels"]))).toContain("folded 45°");
    expect(words(render(results({ net: "cross" }, { fold: 1 }), ["net", "labels"]))).toContain("6 squares on 6 different faces: a closed cube");
    expect(words(render(results({ net: "block" }, { fold: 1 }), ["net", "labels"]))).toContain("only 4 of the 6 faces covered: not a cube");
    expect(words(render(results({ net: "block" }, { fold: 1 }), ["net"]))).not.toContain("cube");
    expect(render(results({ net: "stairs" }), ["net"]).of("fill")).toHaveLength(6);
  });
});

describe("on a phone", () => {
  it("keeps every view inside a 325 px canvas", () => {
    const check = (r: ReturnType<typeof results>, layers: string[], what: string) => {
      const layout = computeSymSolidLayout(325, new Set(layers));
      expectInside(render(r, [...layers, "labels"], 325), 325, layout.height, what);
    };
    for (const shape of SYMSOLID_SHAPE_ORDER) {
      for (const mirror of [0, 45, 90, 135]) check(results({ shape }, { mirror }), ["mirror"], `${shape} mirror ${mirror}`);
      for (const turn of [0, 72, 200, 360]) check(results({ shape }, { turn }), ["turn"], `${shape} turn ${turn}`);
    }
    for (let sides = 3; sides <= 12; sides++) {
      for (const pull of [0, 0.3]) {
        check(results({}, { sides, pull }), ["polygon"], `polygon ${sides} ${pull}`);
        check(results({}, { sides, pull }), ["polygon", "exterior"], `exterior ${sides} ${pull}`);
      }
    }
    for (const solid of SYMSOLID_SOLID_ORDER) {
      for (const baseSides of [3, 5, 8]) {
        check(results({ solid }, { baseSides }), ["solid"], `${solid} ${baseSides}`);
        check(results({ solid }, { baseSides }), ["solid", "views"], `${solid} views ${baseSides}`);
      }
    }
    for (const net of SYMSOLID_NET_ORDER) for (const fold of [0, 0.5, 1]) check(results({ net }, { fold }), ["net"], `${net} ${fold}`);
  });
});
