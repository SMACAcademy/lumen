import { describe, expect, it } from "vitest";
import {
  MIRROR_CLEAN_ANGLES,
  type MirrorAngleParams,
  type MirrorAngleState,
  mirrorAngleModel as model,
  mirrorFacetTilts,
  periscopePath,
  reflectOffFacet,
  traceMirrorImages,
} from "./mirrorangle";

const start = model.initialize(model.defaultParams);
const derive = (over: Partial<MirrorAngleState> = {}, scene: MirrorAngleParams["scene"] = "surface") =>
  model.derive({ ...start, ...over }, { scene });

describe("regular and diffuse reflection", () => {
  it("keeps parallel rays parallel off a smooth surface, with angle out = angle in", () => {
    const r = derive({ incidence: 30, roughness: 0 });
    expect(r.spread).toBe(0);
    expect(r.diffuse).toBe(0);
    expect(r.reflection).toBeCloseTo(30, 9);
  });

  it("scatters them off a rough surface, more the rougher it is", () => {
    const some = derive({ roughness: 40 });
    const lots = derive({ roughness: 100 });
    expect(some.diffuse).toBe(1);
    expect(lots.spread).toBeGreaterThan(some.spread);
    // The widest pair of bits tilt +0.9 and −1 of 18°, and each ray turns by twice its bit's tilt.
    expect(lots.spread).toBeCloseTo(2 * 18 * 1.9, 9);
  });

  it("still obeys i = r at every small bit of a rough surface", () => {
    for (const roughness of [0, 35, 100]) {
      for (const incidence of [0, 25, 50]) {
        const r = derive({ incidence, roughness });
        expect(r.facetOut, `${incidence}° at ${roughness}%`).toBeCloseTo(r.facetIn, 9);
      }
    }
    for (const t of mirrorFacetTilts(100)) {
      const ray = reflectOffFacet(20, t);
      expect(ray.out).toBeCloseTo(20 + 2 * t, 9);
      expect(ray.facetIn).toBeCloseTo(Math.abs(20 + t), 9);
    }
  });

  it("never sends a ray back into the surface", () => {
    for (const t of mirrorFacetTilts(100)) expect(Math.abs(reflectOffFacet(50, t).out)).toBeLessThan(90);
  });
});

describe("mirrors at an angle", () => {
  it("gives NCERT's counts: 90° → 3, 60° → 5, 45° → 7", () => {
    expect(derive({ mirrorAngle: 90 }, "angle").images).toBe(3);
    expect(derive({ mirrorAngle: 60 }, "angle").images).toBe(5);
    expect(derive({ mirrorAngle: 45 }, "angle").images).toBe(7);
  });

  it("gives 360°/θ − 1 for every angle that divides 360° exactly", () => {
    for (const theta of MIRROR_CLEAN_ANGLES) {
      const r = derive({ mirrorAngle: theta }, "angle");
      expect(r.wholeFit, `${theta}°`).toBe(1);
      expect(r.images, `${theta}°`).toBe(360 / theta - 1);
    }
  });

  it("traces each image to the right place", () => {
    expect(traceMirrorImages(90).map((i) => [i.angle, i.reflections])).toEqual([
      [135, 1],
      [225, 2],
      [315, 1],
    ]);
    // A single flat mirror (180°): one image, straight behind it.
    expect(traceMirrorImages(180).map((i) => i.angle)).toEqual([270]);
  });

  it("depends on where the object stands when 360/θ is not whole", () => {
    // 100°: four images with the object halfway, three with it close to one mirror.
    expect(traceMirrorImages(100).length).toBe(4);
    expect(traceMirrorImages(100, 85).length).toBe(3);
    expect(derive({ mirrorAngle: 100 }, "angle").wholeFit).toBe(0);
  });

  it("swaps left and right in images made by an odd number of reflections", () => {
    const right = derive({ mirrorAngle: 90 }, "angle");
    expect(right.reversedImages).toBe(2);
    expect(right.uprightImages).toBe(1);
    expect(derive({ mirrorAngle: 180 }, "angle").reversedImages).toBe(1);
    expect(derive({ mirrorAngle: 60 }, "angle")).toMatchObject({ reversedImages: 3, uprightImages: 2 });
  });

  it("steps through the angles that divide 360° exactly", () => {
    const s = model.step({ ...start, mirrorAngle: 90 }, { scene: "angle" }, -1);
    expect(s.mirrorAngle).toBe(72);
    expect(model.step({ ...start, mirrorAngle: 100 }, { scene: "angle" }, 1).mirrorAngle).toBe(120);
    expect(model.step({ ...start, mirrorAngle: 180 }, { scene: "angle" }, 1).mirrorAngle).toBe(180);
  });

  it("shows 5 images in each corner of a kaleidoscope", () => {
    expect(derive({}, "kaleidoscope").kaleidoImages).toBe(5);
  });
});

describe("the periscope", () => {
  it("turns the light through 90° at each 45° mirror and lifts your sight by the tube's height", () => {
    const r = derive({ tilt: 45, tubeHeight: 60 }, "periscope");
    expect(r.turnAngle).toBeCloseTo(90, 9);
    expect(r.topIncidence).toBe(45);
    expect(r.landing).toBe(0);
    expect(r.sees).toBe(1);
    expect(r.lift).toBeCloseTo(60, 9);
    expect(r.periscopeReversed).toBe(0);
  });

  it("always sends the light out parallel to how it came in", () => {
    for (const tilt of [30, 40, 45, 52, 60]) expect(periscopePath(50, tilt).exitAngle).toBe(0);
  });

  it("loses the light against the tube when the mirrors are tilted too far", () => {
    expect(derive({ tilt: 50, tubeHeight: 50 }, "periscope")).toMatchObject({ sees: 0, lift: 0 });
    expect(derive({ tilt: 40, tubeHeight: 50 }, "periscope").sees).toBe(0);
    expect(derive({ tilt: 44, tubeHeight: 50 }, "periscope").sees).toBe(1);
  });
});

describe("the model contract", () => {
  it("clamps what it is given", () => {
    const s = model.setVariable(start, "mirrorAngle", 10, model.defaultParams);
    expect(s.mirrorAngle).toBe(30);
    expect(model.setVariable(start, "roughness", 140, model.defaultParams).roughness).toBe(100);
    expect(model.setVariable(start, "tilt", 90, model.defaultParams).tilt).toBe(60);
    expect(model.setVariable(start, "tubeHeight", 5, model.defaultParams).tubeHeight).toBe(20);
    expect(model.setVariable(start, "nothing", 5, model.defaultParams)).toBe(start);
  });

  it("turns the kaleidoscope on play", () => {
    expect(model.advance(start, 1, model.defaultParams).turn).toBeCloseTo(0.8, 9);
  });

  it("numbers every output in every scene, with no −0", () => {
    for (const scene of ["surface", "angle", "kaleidoscope", "periscope"] as const) {
      for (const over of [{}, { roughness: 100, incidence: 0 }, { mirrorAngle: 30, tilt: 30 }, { mirrorAngle: 180, tilt: 60, tubeHeight: 100 }]) {
        const r = derive(over, scene);
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
