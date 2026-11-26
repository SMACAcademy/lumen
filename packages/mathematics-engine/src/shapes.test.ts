import { describe, expect, it } from "vitest";
import { SHAPE_ORDER, shapesModel as model } from "./shapes";

const P = model.defaultParams;
const derive = (shape: (typeof SHAPE_ORDER)[number], length = 4, breadth = 3, height = 2, radius = 2) =>
  model.derive({ length, breadth, height, radius }, { ...P, shape });

describe("area and perimeter", () => {
  it("of a rectangle: count the squares, walk round the edge", () => {
    expect(derive("rectangle")).toMatchObject({ area: 12, perimeter: 14, squares: 12 });
  });

  it("a triangle is half the rectangle around it", () => {
    const t = derive("triangle");
    expect(t.area).toBe(6);
    expect(t.perimeter).toBeCloseTo(4 + 3 + 5, 9);
    expect(t.squares).toBeLessThan(6);
  });

  it("a parallelogram has the area of the rectangle with the same base and height", () => {
    expect(derive("parallelogram").area).toBe(12);
    expect(derive("parallelogram").perimeter).toBeCloseTo(2 * (4 + Math.sqrt(1 + 9)), 9);
  });

  it("a circle: πr² and 2πr", () => {
    const c = derive("circle", 4, 3, 2, 3);
    expect(c.area).toBeCloseTo(Math.PI * 9, 9);
    expect(c.perimeter).toBeCloseTo(6 * Math.PI, 9);
    expect(c.squares).toBeLessThan(c.area);
    expect(c.squares).toBeGreaterThan(c.area / 2);
  });
});

describe("volume", () => {
  it("of a cuboid: layers of cubes", () => {
    const b = derive("cuboid", 4, 3, 2);
    expect(b).toMatchObject({ volume: 24, cubes: 24, surfaceArea: 2 * (12 + 6 + 8) });
    expect(derive("rectangle").volume).toBe(0);
  });

  it("keeps sizes whole and in range, and numbers every output", () => {
    expect(model.setVariable({ length: 1, breadth: 1, height: 1, radius: 1 }, "length", 40, P).length).toBe(12);
    expect(model.setVariable({ length: 1, breadth: 1, height: 1, radius: 1 }, "radius", 2.6, P).radius).toBe(3);
    const r = derive("cuboid");
    for (const key of model.outputs) expect(typeof r[key], key).toBe("number");
    expect(r.shape).toBe(SHAPE_ORDER.indexOf("cuboid"));
  });
});

describe("the net of a cuboid", () => {
  it("unfolds into three pairs of faces that add up to the surface area", () => {
    const b = derive("cuboid", 4, 3, 2);
    expect(b).toMatchObject({ faceLB: 12, faceLH: 8, faceBH: 6 });
    expect(2 * (b.faceLB + b.faceLH + b.faceBH)).toBe(b.surfaceArea);
    expect(derive("cuboid", 5, 4, 3).surfaceArea).toBe(94);
  });

  it("gives a cube 6a² of surface, and flat shapes no faces", () => {
    const cube = derive("cuboid", 3, 3, 3);
    expect(cube).toMatchObject({ surfaceArea: 54, volume: 27, faceLB: 9, faceLH: 9, faceBH: 9 });
    expect(derive("rectangle")).toMatchObject({ faceLB: 0, faceLH: 0, faceBH: 0 });
  });

  it("grows its surface, but not in proportion, when the height doubles", () => {
    expect(derive("cuboid", 4, 3, 2).surfaceArea).toBe(52);
    expect(derive("cuboid", 4, 3, 4).surfaceArea).toBe(80);
    expect(derive("cuboid", 4, 3, 4).volume).toBe(48);
  });
});
