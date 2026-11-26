import { shapesModel, type ShapeId } from "@ise/mathematics-engine";
import { describe, expect, it } from "vitest";
import { computeShapesLayout, cuboidNet, insideCircle, shapesRenderer } from "./shapes/renderer";
import { recordingContext } from "./testing/recorder";
import { fallbackTheme } from "./theme";

const results = (shape: ShapeId, length = 4, breadth = 3, height = 2, radius = 3) => shapesModel.derive({ length, breadth, height, radius }, { shape });
const render = (r: ReturnType<typeof results>, layers = ["grid", "shape", "labels"], width = 800) => {
  const rec = recordingContext();
  shapesRenderer.draw(rec.ctx, computeShapesLayout(width), { results: r, trace: null, layers: new Set(layers), highlight: null, theme: fallbackTheme, angleUnit: "deg", graphs: [] });
  return rec;
};

describe("what the shapes renderer draws", () => {
  it("names the area and perimeter", () => {
    expect(render(results("rectangle")).texts()).toEqual(expect.arrayContaining(["area = 12 squares · perimeter = 14"]));
    expect(render(results("triangle")).texts().join(" ")).toContain("area = 6 squares");
    expect(render(results("circle", 4, 3, 2, 3)).texts().join(" ")).toContain("area ≈ 28.3 squares");
    expect(render(results("cuboid")).texts()).toEqual(expect.arrayContaining(["4 × 3 × 2 = 24 cubes · surface 52 squares"]));
  });

  it("shades the whole squares inside a circle, as the model counts them", () => {
    const r = results("circle", 4, 3, 2, 3);
    expect(insideCircle(3)).toHaveLength(r.squares);
    expect(render(r, ["shape"]).of("fillRect")).toHaveLength(r.squares);
  });

  it("resizes a rectangle by dragging its corner", () => {
    const layout = computeShapesLayout(800);
    const x = layout.grid.x + 6 * layout.unit;
    const y = layout.grid.y + layout.grid.height - 2 * layout.unit;
    expect(shapesRenderer.pick!(layout, x, y, undefined, results("rectangle"))?.writes).toEqual([
      { variable: "length", value: 6 },
      { variable: "breadth", value: 2 },
    ]);
    expect(shapesRenderer.pick!(layout, x, y, undefined, results("cuboid"))).toBeNull();
  });

  it("fits a phone", () => {
    const phone = computeShapesLayout(375);
    expect(phone.grid.x + phone.grid.width).toBeLessThanOrEqual(375);
    expect(() => render(results("cuboid", 12, 12, 10), undefined, 375)).not.toThrow();
  });
});

describe("the net of a cuboid", () => {
  it("unfolds into six faces in three matching pairs, to scale", () => {
    const layout = computeShapesLayout(800);
    const { faces, scale } = cuboidNet(layout, 4, 3, 2);
    expect(faces).toHaveLength(6);
    const area = (pair: string) => faces.filter((f) => f.pair === pair).map((f) => Math.round((f.width * f.height) / (scale * scale)));
    expect(area("lb")).toEqual([12, 12]);
    expect(area("lh")).toEqual([8, 8]);
    expect(area("bh")).toEqual([6, 6]);
    // Six rectangles shaded, one per face.
    expect(render(results("cuboid", 4, 3, 2), ["net"]).of("fillRect")).toHaveLength(6);
  });

  it("adds the faces up as 2(lb + bh + hl), and names each face's area only with the labels", () => {
    const shown = render(results("cuboid", 4, 3, 2), ["net", "labels"]).texts();
    expect(shown).toContain("2(12 + 6 + 8) = 52 squares · volume 24 cubes");
    expect(shown).toEqual(expect.arrayContaining(["12", "8", "6"]));
    expect(render(results("cuboid", 5, 4, 3), ["net", "labels"]).texts()).toContain("2(20 + 12 + 15) = 94 squares · volume 60 cubes");
    const bare = render(results("cuboid", 5, 4, 3), ["net"]).texts();
    expect(bare.join(" ")).not.toMatch(/94|20|12|15/);
    // The net is for boxes only.
    expect(render(results("rectangle"), ["net"]).of("fillRect")).toHaveLength(0);
  });

  it("keeps the biggest net and its words on a 325 px phone", () => {
    for (const [l, b, h] of [[12, 12, 10], [1, 1, 1], [12, 1, 1], [1, 12, 10], [3, 3, 3]] as const) {
      const layout = computeShapesLayout(325);
      const { faces } = cuboidNet(layout, l, b, h);
      for (const f of faces) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x + f.width).toBeLessThanOrEqual(325 + 1e-9);
        expect(f.y).toBeGreaterThanOrEqual(0);
        expect(f.y + f.height).toBeLessThanOrEqual(layout.grid.y + layout.grid.height + 1e-9);
      }
      for (const call of render(results("cuboid", l, b, h), ["net", "labels"], 325).of("fillText")) {
        const [text, x] = call.args as [string, number];
        expect(text.length, text).toBeLessThanOrEqual(55);
        expect(x - (text.length * 6) / 2, text).toBeGreaterThanOrEqual(0);
        expect(x + (text.length * 6) / 2, text).toBeLessThanOrEqual(325);
      }
    }
  });
});
