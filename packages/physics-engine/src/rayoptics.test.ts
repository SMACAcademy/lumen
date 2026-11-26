import { describe, expect, it } from "vitest";
import {
  RAY_ELEMENT_ORDER,
  RAY_ELEMENTS,
  rayBend,
  rayCriticalAngle,
  rayCrownIndex,
  rayImageOf,
  rayLensMakerFocal,
  rayMirrorImage,
  rayOpticsModel as model,
  rayPrism,
  rayPrismMinimum,
  raySnell,
  raySunlight,
  raySurfaceImage,
  rayThinLensImage,
  type RayElement,
  type RayOpticsParams,
  type RayOpticsState,
} from "./rayoptics";

const P = model.defaultParams;
const S: RayOpticsState = { u: -60, incidence: 30, prismIncidence: 40 };
const derive = (params: Partial<RayOpticsParams> = {}, state: Partial<RayOpticsState> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });

describe("mirrors: 1/v + 1/u = 1/f, f = R/2, m = −v/u", () => {
  it("puts a plane mirror's image as far behind as the object is in front, the same size", () => {
    expect(rayMirrorImage(-30, Infinity)).toEqual({ v: 30, m: 1, infinite: false });
    const r = derive({ element: "plane-mirror" }, { u: -20 });
    expect(r).toMatchObject({ v: 20, m: 1, f: 0, radius: 0, real: 0, erect: 1, size: 1 });
  });

  it("works the concave-mirror cases by hand (R = 30 cm, f = −15 cm)", () => {
    // Beyond C: u = −60 → 1/v = −1/15 + 1/60 = −3/60, v = −20, m = −1/3.
    const far = derive({ element: "concave-mirror", radius: 30 }, { u: -60 });
    expect(far.f).toBe(-15);
    expect(far.radius).toBe(-30);
    expect(far.v).toBeCloseTo(-20, 9);
    expect(far.m).toBeCloseTo(-1 / 3, 9);
    expect(far).toMatchObject({ real: 1, erect: 0, size: 0 });
    // At C: v = −30, m = −1.
    const atC = derive({ element: "concave-mirror", radius: 30 }, { u: -30 });
    expect(atC.v).toBeCloseTo(-30, 9);
    expect(atC.m).toBeCloseTo(-1, 9);
    expect(atC).toMatchObject({ real: 1, erect: 0, size: 1 });
    // Between C and F: u = −20 → v = −60, m = −3.
    const inside = derive({ element: "concave-mirror", radius: 30 }, { u: -20 });
    expect(inside.v).toBeCloseTo(-60, 9);
    expect(inside.m).toBeCloseTo(-3, 9);
    expect(inside.imageHeight).toBeCloseTo(-6, 9);
    // At F: the image is at infinity.
    expect(derive({ element: "concave-mirror", radius: 30 }, { u: -15 })).toMatchObject({ atInfinity: 1, v: 0, real: 1, erect: 0, size: 2 });
    // Inside F: u = −10 → 1/v = −1/15 + 1/10 = 1/30, v = +30 behind, m = +3.
    const close = derive({ element: "concave-mirror", radius: 30 }, { u: -10 });
    expect(close.v).toBeCloseTo(30, 9);
    expect(close.m).toBeCloseTo(3, 9);
    expect(close).toMatchObject({ real: 0, erect: 1, size: 2 });
  });

  it("always gives a convex mirror a virtual, erect, smaller image", () => {
    // R = 30, f = +15, u = −30: 1/v = 1/15 + 1/30 = 1/10, v = +10, m = +1/3.
    const r = derive({ element: "convex-mirror", radius: 30 }, { u: -30 });
    expect(r.f).toBe(15);
    expect(r.v).toBeCloseTo(10, 9);
    expect(r.m).toBeCloseTo(1 / 3, 9);
    expect(r).toMatchObject({ real: 0, erect: 1, size: 0 });
    for (const u of [-90, -40, -10, -4]) expect(derive({ element: "convex-mirror" }, { u })).toMatchObject({ real: 0, erect: 1, size: 0 });
  });

  it("finds f from a measured u and v, the u–v method", () => {
    // Pin at 60 cm, sharp image at 20 cm: 1/f = −1/20 − 1/60, f = −15.
    const u = -60;
    const v = -20;
    expect((u * v) / (u + v)).toBeCloseTo(-15, 9);
    expect(derive({ element: "concave-mirror", radius: 30 }, { u }).v).toBeCloseTo(v, 9);
  });
});

describe("lenses: 1/v − 1/u = 1/f, m = v/u", () => {
  it("works the convex-lens cases by hand (f = +15 cm)", () => {
    expect(rayThinLensImage(-30, 15).v).toBeCloseTo(30, 9);
    expect(rayThinLensImage(-30, 15).m).toBeCloseTo(-1, 9);
    expect(rayThinLensImage(-10, 15).v).toBeCloseTo(-30, 9);
    expect(rayThinLensImage(-10, 15).m).toBeCloseTo(3, 9);
    expect(rayThinLensImage(-15, 15).infinite).toBe(true);
  });

  it("works a concave lens by hand (f = −20, u = −20 → v = −10, m = +½)", () => {
    const r = rayThinLensImage(-20, -20);
    expect(r.v).toBeCloseTo(-10, 9);
    expect(r.m).toBeCloseTo(0.5, 9);
    expect(derive({ element: "concave-lens", radius: 20, index: 1.5 }, { u: -20 })).toMatchObject({ real: 0, erect: 1, size: 0 });
  });

  it("makes f from the lens maker's formula, with R₁ = +R, R₂ = −R for a biconvex lens", () => {
    // n = 1.5, R = 20: 1/f = 0.5 (1/20 + 1/20) = 1/20.
    expect(rayLensMakerFocal(1.5, 20, -20)).toBeCloseTo(20, 9);
    expect(rayLensMakerFocal(1.5, -20, 20)).toBeCloseTo(-20, 9);
    // Plano-convex: R₂ = ∞, f = R/(n − 1) = 40.
    expect(rayLensMakerFocal(1.5, 20, Infinity)).toBeCloseTo(40, 9);
    const r = derive({ element: "convex-lens", radius: 20, index: 1.5 }, { u: -30 });
    expect(r).toMatchObject({ r1: 20, r2: -20, radius: 20 });
    expect(r.lensFocal).toBeCloseTo(20, 9);
    expect(r.power1).toBeCloseTo(5, 9);
    // u = −30 → 1/v = 1/20 − 1/30 = 1/60, v = 60, m = −2.
    expect(r.v).toBeCloseTo(60, 9);
    expect(r.m).toBeCloseTo(-2, 9);
    // A denser glass bends more: n = 1.8 → f = 20/(2 × 0.8) = 12.5.
    expect(derive({ element: "convex-lens", radius: 20, index: 1.8 }).f).toBeCloseTo(12.5, 9);
  });

  it("adds the powers of lenses in contact, P = P₁ + P₂", () => {
    const r = derive({ element: "convex-lens", radius: 20, index: 1.5, partner: -2 }, { u: -60 });
    expect(r.power1).toBeCloseTo(5, 9);
    expect(r.power).toBeCloseTo(3, 9);
    expect(r.f).toBeCloseTo(100 / 3, 9);
    // The pair acts as one lens of f = 33.3 cm: 1/v = 3/100 − 1/60, v = 75.
    expect(r.v).toBeCloseTo(75, 9);
    // +5 D with −5 D has no power: the light goes straight through.
    const flat = derive({ element: "convex-lens", radius: 20, index: 1.5, partner: -5 }, { u: -40 });
    expect(flat).toMatchObject({ afocal: 1, f: 0, power: 0, v: -40, m: 1, real: 0 });
  });
});

describe("one refracting surface: n₂/v − n₁/u = (n₂ − n₁)/R", () => {
  it("images an object in air inside glass (R = 10, n = 1.5, u = −60 → v = +45)", () => {
    // 1.5/v = 0.5/10 − 1/60 = 1/30.
    const image = raySurfaceImage(-60, 1, 1.5, 10);
    expect(image.v).toBeCloseTo(45, 9);
    expect(image.m).toBeCloseTo(45 / (1.5 * -60), 9);
    const r = derive({ element: "surface", radius: 10, index: 1.5 }, { u: -60 });
    expect(r.v).toBeCloseTo(45, 9);
    expect(r.f).toBeCloseTo(30, 9);
    expect(r.power).toBeCloseTo(5, 9);
    expect(r).toMatchObject({ real: 1, erect: 0 });
    // Inside the first focal point (−20 cm) the image is virtual.
    expect(derive({ element: "surface", radius: 10, index: 1.5 }, { u: -10 })).toMatchObject({ real: 0, erect: 1 });
    expect(derive({ element: "surface", radius: 10, index: 1.5 }, { u: -20 }).atInfinity).toBe(1);
  });
});

describe("the three principal rays meet at the image", () => {
  const cases: [RayElement, number, number][] = [
    ["concave-mirror", 30, -60],
    ["concave-mirror", 30, -10],
    ["convex-mirror", 30, -30],
    ["plane-mirror", 30, -25],
    ["convex-lens", 20, -30],
    ["convex-lens", 20, -12],
    ["concave-lens", 20, -20],
    ["surface", 10, -60],
    ["surface", 10, -12],
  ];
  it.each(cases)("%s, R = %d, u = %d", (element, radius, u) => {
    const lens = rayImageOf({ element, radius, index: 1.5, partner: 0 }, u);
    const bender = { kind: RAY_ELEMENTS[element].kind, f: lens.f, n: 1.5, R: lens.R };
    const h = 2;
    const { v, m } = lens.image;
    for (const k of [0, h / u, -0.05, 0.08]) {
      const y = h - k * u;
      const out = rayBend(bender, y, k);
      // The outgoing line (or its extension) passes through the image point (v, m·h).
      expect(y + out * v).toBeCloseTo(m * h, 9);
    }
  });

  it("knows which elements are mirrors", () => {
    expect(RAY_ELEMENT_ORDER.filter((e) => RAY_ELEMENTS[e].kind === "mirror")).toHaveLength(3);
  });
});

describe("refraction and total internal reflection", () => {
  it("bends light into glass by Snell's law: i = 45° → r = 28.1°", () => {
    expect(raySnell(1, 1.5, 45).r).toBeCloseTo(28.126, 2);
    const r = derive({ medium: "glass", direction: "into" }, { incidence: 45 });
    expect(r.refraction).toBeCloseTo(28.126, 2);
    expect(r).toMatchObject({ n1: 1, n2: 1.5, tir: 0, reflection: 45 });
  });

  it("has the critical angles sin C = 1/n", () => {
    expect(rayCriticalAngle(1.33)).toBeCloseTo(48.75, 2);
    expect(rayCriticalAngle(1.5)).toBeCloseTo(41.81, 2);
    expect(rayCriticalAngle(2.42)).toBeCloseTo(24.41, 2);
  });

  it("traps light going out of glass beyond 41.8°, never going in", () => {
    expect(derive({ medium: "glass", direction: "out" }, { incidence: 41 }).tir).toBe(0);
    expect(derive({ medium: "glass", direction: "out" }, { incidence: 41 }).refraction).toBeCloseTo(79.75, 1);
    expect(derive({ medium: "glass", direction: "out" }, { incidence: 42 })).toMatchObject({ tir: 1, refraction: 0 });
    expect(derive({ medium: "glass", direction: "into" }, { incidence: 89 }).tir).toBe(0);
    expect(derive({ medium: "water", direction: "out" }, { incidence: 50 }).tir).toBe(1);
    expect(derive({ medium: "water", direction: "out" }, { incidence: 45 }).tir).toBe(0);
  });
});

describe("the prism", () => {
  it("has its least deviation when the ray passes symmetrically: A = 60°, n = 1.5 → D_m = 37.2°", () => {
    const min = rayPrismMinimum(60, 1.5);
    expect(min.deviation).toBeCloseTo(37.18, 2);
    expect(min.incidence).toBeCloseTo(48.59, 2);
    const path = rayPrism(60, 1.5, min.incidence);
    expect(path.r1).toBeCloseTo(30, 9);
    expect(path.e).toBeCloseTo(min.incidence, 9);
    expect(path.deviation).toBeCloseTo(min.deviation, 9);
    // n = sin((A + D_m)/2) / sin(A/2).
    expect(Math.sin(((60 + min.deviation) / 2) * (Math.PI / 180)) / Math.sin(30 * (Math.PI / 180))).toBeCloseTo(1.5, 9);
    // Either side of the minimum the deviation is larger.
    expect(rayPrism(60, 1.5, 40).deviation).toBeGreaterThan(min.deviation);
    expect(rayPrism(60, 1.5, 60).deviation).toBeGreaterThan(min.deviation);
    expect(rayPrismMinimum(60, 1.6).deviation).toBeCloseTo(46.26, 2);
  });

  it("follows δ = i + e − A and stops a steep ray at the second face", () => {
    const path = rayPrism(60, 1.5, 40);
    expect(path.deviation).toBeCloseTo(40 + path.e - 60, 9);
    expect(path.r1 + path.r2).toBeCloseTo(60, 9);
    expect(rayPrism(60, 1.5, 20).emerges).toBe(false);
    expect(derive({ prismAngle: 60, index: 1.5 }, { prismIncidence: 20 })).toMatchObject({ emerges: 0, deviation: 0 });
    // A > 2C: nothing gets through at any angle.
    expect(derive({ prismAngle: 75, index: 2 })).toMatchObject({ prismBlocked: 1, minDeviation: 0 });
  });

  it("lets a steep ray through a narrow prism even when r₁ > A (r₂ < 0, e < 0)", () => {
    // A = 30°, n = 1.5, i = 80°: r₁ = 41.0°, r₂ = −11.0°, e = −16.7°, δ = 80 − 16.7 − 30 = 33.3°.
    const path = rayPrism(30, 1.5, 80);
    expect(path.emerges).toBe(true);
    expect(path.r2).toBeLessThan(0);
    expect(path.e).toBeLessThan(0);
    expect(path.deviation).toBeCloseTo(80 + path.e - 30, 9);
    expect(path.e).toBeCloseTo(-16.70, 1);
    expect(path.deviation).toBeCloseTo(33.30, 1);
    expect(path.deviation).toBeGreaterThan(rayPrismMinimum(30, 1.5).deviation);
  });

  it("finds the minimum to within a degree of incidence", () => {
    expect(derive({ prismAngle: 60, index: 1.5 }, { prismIncidence: 48.5 }).atMinimum).toBe(1);
    expect(derive({ prismAngle: 60, index: 1.5 }, { prismIncidence: 45 }).atMinimum).toBe(0);
  });

  it("bends violet more than red (dispersion)", () => {
    expect(rayCrownIndex(1.5, 590)).toBeCloseTo(1.5, 12);
    expect(rayCrownIndex(1.5, 400)).toBeGreaterThan(rayCrownIndex(1.5, 700));
    const deviations = [700, 600, 550, 470, 400].map((wavelength) => derive({ wavelength }, { prismIncidence: 50 }).deviation);
    for (let k = 1; k < deviations.length; k++) expect(deviations[k]!).toBeGreaterThan(deviations[k - 1]!);
  });
});

describe("scattering", () => {
  it("scatters as 1/λ⁴: blue (450 nm) about 5.9 times as much as red (700 nm)", () => {
    expect(derive({ wavelength: 700 }).scattering).toBeCloseTo(1, 12);
    expect(derive({ wavelength: 450 }).scattering).toBeCloseTo(5.855, 3);
    expect(derive({ wavelength: 400 }).scattering).toBeCloseTo(9.379, 3);
  });

  it("lets less blue through when the sun is low", () => {
    const noon = derive({ sunAltitude: 60 });
    const sunset = derive({ sunAltitude: 5 });
    expect(sunset.airMass).toBeCloseTo(11.47, 2);
    expect(sunset.blueReaching).toBeLessThan(noon.blueReaching);
    expect(sunset.blueReaching).toBeLessThan(sunset.redReaching);
    expect(raySunlight(450, 90)).toBeCloseTo(Math.exp(-0.1 * (550 / 450) ** 4), 12);
  });
});

describe("instruments and eyes (D = 25 cm)", () => {
  it("gives the magnifying power of each instrument", () => {
    const telescope = derive({ instrument: "telescope", objective: 100, eyepiece: 5 });
    expect(telescope.magnifyingPower).toBeCloseTo(20, 9);
    expect(telescope.magnifyingNear).toBeCloseTo(24, 9);
    expect(telescope.scopeLength).toBe(105);
    const microscope = derive({ instrument: "microscope", objective: 2, eyepiece: 5, tube: 20 });
    expect(microscope.magnifyingPower).toBeCloseTo(50, 9);
    expect(microscope.magnifyingNear).toBeCloseTo(60, 9);
    expect(microscope.scopeLength).toBe(27);
    const magnifier = derive({ instrument: "magnifier", eyepiece: 5 });
    expect(magnifier.magnifyingPower).toBeCloseTo(5, 9);
    expect(magnifier.magnifyingNear).toBeCloseTo(6, 9);
  });

  it("corrects a short-sighted eye with a concave lens and a long-sighted one with a convex lens", () => {
    // Far point 80 cm: f = −80 cm, P = −1.25 D.
    const myopia = derive({ instrument: "myopia", farPoint: 80 });
    expect(myopia.correctivePower).toBeCloseTo(-1.25, 9);
    expect(myopia.correctiveFocal).toBeCloseTo(-80, 9);
    // Near point 75 cm: 1/f = 1/25 − 1/75, f = 37.5 cm, P = +2.67 D.
    const hyper = derive({ instrument: "hypermetropia", nearPoint: 75 });
    expect(hyper.correctivePower).toBeCloseTo(8 / 3, 9);
    expect(hyper.correctiveFocal).toBeCloseTo(37.5, 9);
    expect(rayThinLensImage(-25, 37.5).v).toBeCloseTo(-75, 9);
    expect(derive({ instrument: "telescope" })).toMatchObject({ correctivePower: 0, correctiveFocal: 0 });
  });
});

describe("the model", () => {
  it("walks the object in on play and starts again", () => {
    expect(model.advance({ ...S, u: -60 }, 1, P).u).toBe(-52);
    expect(model.advance({ ...S, u: -4.5 }, 1, P).u).toBe(-90);
    expect(model.step({ ...S, u: -30.4 }, P, 1).u).toBe(-29);
  });

  it("clamps what it is given", () => {
    expect(model.setVariable(S, "u", 10, P).u).toBe(-4);
    expect(model.setVariable(S, "u", -500, P).u).toBe(-90);
    expect(model.setVariable(S, "incidence", 120, P).incidence).toBe(89);
    expect(model.setVariable(S, "prismIncidence", 0, P).prismIncidence).toBe(10);
  });

  it("numbers every output, for every element and instrument", () => {
    for (const element of RAY_ELEMENT_ORDER) {
      for (const u of [-90, -30, -15, -10, -4]) {
        const r = derive({ element, instrument: "myopia" }, { u, incidence: 89, prismIncidence: 10 });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), `${element} ${u} ${key}`).toBe(true);
          expect(Object.is(r[key], -0), `${element} ${u} ${key} is −0`).toBe(false);
        }
      }
    }
  });
});
