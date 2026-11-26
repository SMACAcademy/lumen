import { describe, expect, it } from "vitest";
import { LIGHT_MATERIALS, lightModel as model, SCENE_ORDER } from "./light";

const P = model.defaultParams;
const derive = (objectDistance: number, over: Partial<typeof P> = {}, angle = 30) => model.derive({ objectDistance, angle }, { ...P, ...over });

describe("shadows and pinholes: light in straight lines", () => {
  it("makes a shadow by similar triangles: bigger when the object is nearer the lamp", () => {
    // A 10 cm card 20 cm from the lamp, screen at 80 cm: shadow 10 × 80 / 20 = 40 cm.
    expect(derive(20, { objectHeight: 10, screenDistance: 80 }).imageHeight).toBeCloseTo(40, 9);
    expect(derive(40, { objectHeight: 10, screenDistance: 80 }).imageHeight).toBeCloseTo(20, 9);
  });

  it("darkens the shadow by what the object is made of", () => {
    expect(derive(20, { material: "opaque" }).darkness).toBe(1);
    expect(derive(20, { material: "translucent" }).darkness).toBeCloseTo(LIGHT_MATERIALS.translucent.darkness, 9);
    expect(derive(20, { material: "transparent" }).darkness).toBe(0);
  });

  it("turns the pinhole image upside down, sized by the same triangles", () => {
    const r = derive(20, { scene: "pinhole", objectHeight: 10, screenDistance: 60 });
    expect(r.inverted).toBe(1);
    expect(r.imageHeight).toBeCloseTo(30, 9);
    expect(derive(20).inverted).toBe(0);
    expect(r.scene).toBe(SCENE_ORDER.indexOf("pinhole"));
  });
});

describe("a plane mirror", () => {
  it("reflects at the angle it was hit, and images as far behind as the object is in front", () => {
    const r = derive(35, { scene: "mirror" }, 50);
    expect(r.incidence).toBe(50);
    expect(r.reflection).toBe(50);
    expect(r.imageDistance).toBe(35);
  });
});

describe("refraction", () => {
  it("bends a ray towards the normal going into glass, by Snell's law", () => {
    const r = derive(30, { scene: "refraction", medium: "glass" }, 30);
    expect(r.index).toBe(1.5);
    expect(r.refracted).toBeCloseTo((Math.asin(0.5 / 1.5) * 180) / Math.PI, 6);
    expect(r.bendsTowardNormal).toBe(1);
    expect(r.criticalAngle).toBeCloseTo((Math.asin(1 / 1.5) * 180) / Math.PI, 6);
  });

  it("goes straight on along the normal, and bends most in diamond", () => {
    expect(derive(30, { scene: "refraction" }, 0)).toMatchObject({ refracted: 0, bendsTowardNormal: 0 });
    const water = derive(30, { scene: "refraction", medium: "water" }, 50).refracted;
    const diamond = derive(30, { scene: "refraction", medium: "diamond" }, 50).refracted;
    expect(diamond).toBeLessThan(water);
  });
});

describe("a convex lens", () => {
  it("makes a real, upside-down image beyond 2F smaller, at 2F the same size", () => {
    const far = derive(30, { scene: "lens", focal: 10 });
    expect(far.lensImage).toBeCloseTo(15, 9);
    expect(far).toMatchObject({ real: 1, inverted: 1 });
    expect(far.lensMagnification).toBeCloseTo(0.5, 9);
    expect(derive(20, { scene: "lens", focal: 10 }).lensMagnification).toBeCloseTo(1, 9);
  });

  it("makes a virtual, upright, magnified image inside F", () => {
    const near = derive(10, { scene: "lens", focal: 20 });
    expect(near.lensImage).toBeCloseTo(-20, 9);
    expect(near).toMatchObject({ real: 0, inverted: 0 });
    expect(near.lensMagnification).toBeCloseTo(2, 9);
  });
});

describe("the light model", () => {
  it("keeps the object between the lamp and the screen, and angles in range", () => {
    expect(model.setVariable({ objectDistance: 20, angle: 30 }, "objectDistance", 200, P).objectDistance).toBe(P.screenDistance - 5);
    expect(model.setVariable({ objectDistance: 20, angle: 30 }, "objectDistance", 0, P).objectDistance).toBe(10);
    expect(model.setVariable({ objectDistance: 20, angle: 30 }, "angle", 120, P).angle).toBe(80);
  });

  it("walks the object towards the lamp when played", () => {
    expect(model.advance({ objectDistance: 50, angle: 30 }, 1, P).objectDistance).toBeLessThan(50);
    expect(model.advance({ objectDistance: 11, angle: 30 }, 5, P).objectDistance).toBe(10);
  });

  it("numbers every output", () => {
    const r = derive(20);
    for (const key of model.outputs) expect(typeof r[key], key).toBe("number");
  });
});
