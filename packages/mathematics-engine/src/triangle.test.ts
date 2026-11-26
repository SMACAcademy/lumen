import { describe, expect, it } from "vitest";
import { triangleModel as model } from "./triangle";

const P = model.defaultParams;
const derive = (a: number, b: number) => model.derive({ a, b }, P);

describe("Pythagoras", () => {
  it("fits the squares on the legs exactly into the square on the hypotenuse", () => {
    const r = derive(3, 4);
    expect(r).toMatchObject({ c: 5, squareA: 9, squareB: 16, squareC: 25, whole: 1 });
    for (const [a, b] of [[1, 1], [2, 7], [6.5, 3]] as const) {
      const t = derive(a, b);
      expect(t.squareC).toBeCloseTo(t.squareA + t.squareB, 9);
    }
  });

  it("finds whole-number hypotenuses", () => {
    expect(derive(5, 12)).toMatchObject({ c: 13, whole: 1 });
    expect(derive(1, 1).whole).toBe(0);
  });
});

describe("the trig ratios", () => {
  it("are opposite, adjacent and opposite-over-adjacent, over the hypotenuse", () => {
    const r = derive(4, 3);
    expect(r.sin).toBeCloseTo(3 / 5, 12);
    expect(r.cos).toBeCloseTo(4 / 5, 12);
    expect(r.tan).toBeCloseTo(3 / 4, 12);
    expect(r.identity).toBe(1);
  });

  it("depend only on the angle, not the size", () => {
    expect(derive(8, 6).sin).toBeCloseTo(derive(4, 3).sin, 12);
    expect(derive(8, 6).theta).toBeCloseTo(derive(4, 3).theta, 12);
  });

  it("know the special angles", () => {
    expect(derive(5, 5)).toMatchObject({ theta: 45, special: 45, tan: 1 });
    expect(derive(Math.sqrt(3), 1).special).toBe(30);
    expect(derive(4, 3).special).toBe(0);
    expect(derive(5, 5).other).toBe(45);
  });
});

describe("the model", () => {
  it("raises the height on Play and starts again from the bottom", () => {
    expect(model.advance({ a: 4, b: 3 }, 1, P).b).toBeCloseTo(4.5, 12);
    expect(model.advance({ a: 4, b: 11.9 }, 1, P).b).toBe(1);
    expect(model.advance({ a: 4, b: 3 }, 1, { sweep: "base" }).a).toBeCloseTo(5.5, 12);
  });

  it("keeps the legs in range and numbers every output", () => {
    expect(model.setVariable({ a: 4, b: 3 }, "a", 99, P).a).toBe(20);
    expect(model.setVariable({ a: 4, b: 3 }, "b", -1, P).b).toBe(0.5);
    const r = derive(4, 3);
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
  });
});
