import { describe, expect, it } from "vitest";
import {
  efieldCoulombForce,
  EF_EPSILON0,
  EF_K,
  efieldAt,
  efieldModel as model,
  efieldGaussField,
  type EfieldParams,
  type EfieldState,
} from "./efield";

const start = model.initialize(model.defaultParams);
const derive = (state: Partial<EfieldState> = {}, params: Partial<EfieldParams> = {}) =>
  model.derive({ ...start, ...state }, { ...model.defaultParams, ...params });

describe("charge and Coulomb's law", () => {
  it("counts 6.25 × 10¹² electrons in every microcoulomb", () => {
    expect(derive({ q1: 1 }).electrons12).toBeCloseTo(6.25, 10);
    expect(derive({ q1: -4 }).electrons12).toBeCloseTo(25, 10);
  });

  it("gives 5.4 N between 2 µC and −3 µC 10 cm apart, and a quarter of that at twice the distance", () => {
    const near = derive({ q1: 2, q2: -3, sep: 10 });
    expect(near.force12).toBeCloseTo(5.4, 10);
    expect(near.interaction).toBe(-1);
    expect(derive({ q1: 2, q2: -3, sep: 20 }).force12).toBeCloseTo(1.35, 10);
    expect(derive({ q1: 1, q2: 1, sep: 10 }).force12).toBeCloseTo(0.9, 10);
    expect(derive({ q1: -1, q2: -2 }).interaction).toBe(1);
    expect(derive({ q1: 0, q2: -2 }).interaction).toBe(0);
    expect(efieldCoulombForce(1, 1, 100)).toBeCloseTo(EF_K * 1e-12, 15);
  });

  it("adds the forces on q₃ as vectors", () => {
    // Two +1 µC charges 20 cm apart, q₃ = +1 µC 10 cm above their midpoint.
    const r = derive({ q1: 1, q2: 1, q3: 1, sep: 20, px: 0, py: 10 });
    expect(r.f31).toBeCloseTo(0.45, 10);
    expect(r.f32).toBeCloseTo(0.45, 10);
    expect(r.netX).toBeCloseTo(0, 12);
    expect(r.netForce).toBeCloseTo(0.9 * Math.SQRT1_2, 10);
    expect(r.netAngle).toBeCloseTo(90, 9);
  });

  it("finds no net force a third of the way from 1 µC to 4 µC", () => {
    const r = derive({ q1: 1, q2: 4, q3: 1, sep: 30, px: -5, py: 0 });
    expect(r.netForce).toBeCloseTo(0, 12);
    expect(derive({ q1: 1, q2: 4, q3: 1, sep: 30, px: -4.5, py: 0 }).netForce).toBeGreaterThan(0.05);
    expect(derive({ q1: 1, q2: 4, q3: 1, sep: 30, px: -5.5, py: 0 }).netForce).toBeGreaterThan(0.05);
  });

  it("makes the force on q₃ equal q₃E, and no force on an uncharged q₃", () => {
    const r = derive({ q1: 3, q2: -1, q3: 2, sep: 12, px: 4, py: 7 });
    expect(r.netX).toBeCloseTo(2e-6 * r.fieldX, 12);
    expect(r.netY).toBeCloseTo(2e-6 * r.fieldY, 12);
    expect(derive({ q3: 0 })).toMatchObject({ netForce: 0, netX: 0, netY: 0, netAngle: 0 });
  });
});

describe("the electric field", () => {
  it("is kq/r², falling to a quarter at twice the distance", () => {
    expect(derive({ q1: 1, q2: 0, sep: 20, px: 0, py: 0 }).field).toBeCloseTo(9e5, 4);
    expect(derive({ q1: 1, q2: 0, sep: 20, px: 10, py: 0 }).field).toBeCloseTo(2.25e5, 4);
    expect(derive({ q1: 1, q2: 0, sep: 20, px: 10, py: 0 }).fieldAngle).toBeCloseTo(0, 9);
    expect(derive({ q1: -1, q2: 0, sep: 20, px: 10, py: 0 }).fieldAngle).toBeCloseTo(180, 9);
  });

  it("holds distances at 1 cm next to a charge and flags it", () => {
    const r = derive({ q1: 1, q2: 0, sep: 20, px: -10, py: 0.5 });
    expect(r.tooClose).toBe(1);
    expect(r.field).toBeCloseTo(9e7, 1);
    const exactly = derive({ q1: 1, q2: 0, sep: 20, px: -10, py: 0 });
    for (const key of model.outputs) expect(Number.isFinite(exactly[key]), key).toBe(true);
  });

  it("of a dipole matches the exact axial and equatorial formulas", () => {
    // −1 µC at (−1, 0), +1 µC at (1, 0): p = 2 × 10⁻⁸ C m along +x, a = 1 cm.
    const base = { q1: -1, q2: 1, sep: 2 };
    const p = 1e-6 * 0.02;
    const a = 0.01;
    const axial = derive({ ...base, px: 10, py: 0 });
    expect(axial).toMatchObject({ isDipole: 1, pDirection: 1 });
    expect(axial.pairMoment).toBeCloseTo(p, 15);
    expect(axial.field).toBeCloseTo((2 * EF_K * p * 0.1) / (0.1 ** 2 - a * a) ** 2, 3);
    expect(axial.fieldAlongP).toBeCloseTo(1, 12);
    const equatorial = derive({ ...base, px: 0, py: 10 });
    expect(equatorial.field).toBeCloseTo((EF_K * p) / (0.1 ** 2 + a * a) ** 1.5, 3);
    expect(equatorial.fieldAlongP).toBeCloseTo(-1, 12);
    expect(derive({ ...base, px: 0, py: 0 }).fieldAlongP).toBeCloseTo(-1, 12);
    expect(derive({ q1: 1, q2: -2 })).toMatchObject({ isDipole: 0, pairMoment: 0, fieldAlongP: 0 });
  });

  it("adds fields from several charges by superposition", () => {
    const [ex, ey] = efieldAt(0, 0, [[-10, 0, 1], [10, 0, 1]]);
    expect(ex).toBeCloseTo(0, 6);
    expect(ey).toBeCloseTo(0, 6);
  });
});

describe("a dipole in a uniform field", () => {
  it("feels τ = pE sin θ and no net force", () => {
    const r = derive({ dipoleCharge: 1, dipoleLength: 2, fieldE: 5e4, theta: 30 });
    expect(r.dipoleP).toBeCloseTo(2e-8, 20);
    expect(r.torque).toBeCloseTo(5e-4, 12);
    expect(r.maxTorque).toBeCloseTo(1e-3, 12);
    expect(r.forceEach).toBeCloseTo(0.05, 12);
    expect(r.dipoleNetForce).toBe(0);
    expect(derive({ dipoleCharge: 1, dipoleLength: 2, fieldE: 5e4, theta: 90 }).torque).toBe(r.maxTorque);
  });

  it("has least energy along the field and most against it", () => {
    expect(derive({ dipoleCharge: 1, dipoleLength: 2, fieldE: 5e4, theta: 0 }).energy).toBeCloseTo(-1e-3, 12);
    expect(derive({ dipoleCharge: 1, dipoleLength: 2, fieldE: 5e4, theta: 90 }).energy).toBeCloseTo(0, 12);
    expect(derive({ dipoleCharge: 1, dipoleLength: 2, fieldE: 5e4, theta: 180 }).energy).toBeCloseTo(1e-3, 12);
    expect(derive({ theta: 0 }).torque).toBe(0);
  });
});

describe("flux and Gauss's law", () => {
  it("gives Φ = EA cos θ", () => {
    expect(derive({ fieldE: 3000, area: 100, tilt: 0 }).flux).toBeCloseTo(30, 10);
    expect(derive({ fieldE: 3000, area: 100, tilt: 60 }).flux).toBeCloseTo(15, 10);
    expect(derive({ fieldE: 3000, area: 100, tilt: 90 }).flux).toBeCloseTo(0, 10);
    expect(derive({ fieldE: 3000, area: 100, tilt: 180 }).flux).toBeCloseTo(-30, 10);
  });

  it("counts only the charge inside the sphere, whatever its size", () => {
    const small = derive({ q1: 2, q2: -2, q3: 0, sep: 10, gaussR: 4 });
    const bigger = derive({ q1: 2, q2: -2, q3: 0, sep: 10, gaussR: 8 });
    expect(small.qEnclosed).toBe(2);
    expect(small.gaussFlux).toBeCloseTo(2e-6 / EF_EPSILON0, 6);
    expect(small.gaussFlux).toBeCloseTo(2.259e5, -2);
    expect(bigger.gaussFlux).toBe(small.gaussFlux);
    expect(bigger.avgField).toBeLessThan(small.avgField);
    const both = derive({ q1: 2, q2: -2, q3: 0, sep: 10, gaussR: 12 });
    expect(both).toMatchObject({ qEnclosed: 0, gaussFlux: 0, enclosedCount: 2 });
    expect(derive({ q1: 2, q2: -2, q3: 1, sep: 10, px: -3, py: 0, gaussR: 4 }).qEnclosed).toBe(3);
  });

  it("matches the flux of kq/r² over a sphere around a lone charge", () => {
    const r = derive({ q1: 1, q2: 0, q3: 0, gaussR: 10 });
    expect(r.avgField * r.sphereArea).toBeCloseTo(r.gaussFlux, 6);
    // 4πk ≈ 1/ε₀ to the 0.1% that k = 9 × 10⁹ is rounded to.
    expect(Math.abs(r.avgField / (EF_K * 1e-6 / 0.01) - 1)).toBeLessThan(0.002);
  });
});

describe("a line, a sheet and a shell", () => {
  it("gives λ/2πε₀r, σ/2ε₀ and kQ/r² outside a shell, zero inside", () => {
    expect(derive({ amount: 1, dist: 10 }, { source: "line" }).appField).toBeCloseTo(1e-6 / (2 * Math.PI * EF_EPSILON0 * 0.1), 4);
    expect(derive({ amount: 1, dist: 20 }, { source: "line" }).appField).toBeCloseTo(derive({ amount: 1, dist: 10 }, { source: "line" }).appField / 2, 4);
    expect(derive({ amount: 1, dist: 5 }, { source: "sheet" }).appField).toBeCloseTo(1e-6 / (2 * EF_EPSILON0), 4);
    expect(derive({ amount: 1, dist: 30 }, { source: "sheet" }).appField).toBe(derive({ amount: 1, dist: 5 }, { source: "sheet" }).appField);
    expect(derive({ amount: 1, dist: 20 }, { source: "shell" }).appField).toBeCloseTo(2.25e5, 4);
    expect(derive({ amount: 1, dist: 5 }, { source: "shell" })).toMatchObject({ appField: 0, insideShell: 1 });
    expect(efieldGaussField("shell", 1, 10)).toBeCloseTo(9e5, 4);
  });
});

describe("a charge between the plates", () => {
  it("is deflected y = qEx²/2mv², like a thrown ball", () => {
    const r = derive({ fieldE: 1000, speed: 10000 });
    expect(r.hitsPlate).toBe(0);
    expect(r.accel).toBeCloseTo((1.6e-19 * 1000) / 9.1e-31, -6);
    expect(r.exitDeflection).toBeCloseTo((1.6e-19 * 1000 * 0.05 ** 2) / (2 * 9.1e-31 * 1e14) * 1000, 9);
    expect(r.exitDeflection).toBeCloseTo(2.2, 1);
    expect(r.transit).toBeCloseTo(5, 9);
    expect(derive({ fieldE: 1000, speed: 20000 }).exitDeflection).toBeCloseTo(r.exitDeflection / 4, 9);
  });

  it("pushes an electron towards the + plate and a proton towards the − plate", () => {
    expect(derive({ fieldE: 1000, speed: 10000, progress: 1 }).posY).toBeGreaterThan(0);
    expect(derive({ fieldE: 1000, speed: 300, progress: 1 }, { particle: "proton" }).posY).toBeLessThan(0);
    expect(derive({ fieldE: 1000, speed: 300 }, { particle: "proton" }).exitDeflection).toBeCloseTo(1.33, 2);
  });

  it("only just gets an electron through a 5000 N/C field at about 10 500 km/s", () => {
    expect(derive({ fieldE: 5000, speed: 10400 }).hitsPlate).toBe(1);
    const through = derive({ fieldE: 5000, speed: 10500 });
    expect(through.hitsPlate).toBe(0);
    expect(through.exitDeflection).toBeGreaterThan(9.9);
    expect(derive({ fieldE: 5000, speed: 11100 }).exitDeflection).toBeLessThan(9);
  });

  it("stops at a plate when the field is too strong for the speed", () => {
    const r = derive({ fieldE: 10000, speed: 10000, progress: 1 });
    expect(r.hitsPlate).toBe(1);
    expect(r.hitX).toBeLessThan(5);
    expect(r.posY).toBeCloseTo(10, 6);
    expect(r.exitDeflection).toBeCloseTo(10, 9);
  });

  it("flies on Play and starts again for a new speed", () => {
    let s = { ...start, progress: 0 };
    for (let i = 0; i < 300; i++) s = model.advance(s, 1 / 60, model.defaultParams);
    expect(s.progress).toBe(1);
    expect(model.setVariable(s, "speed", 5000, model.defaultParams)).toMatchObject({ speed: 5000, progress: 0 });
  });
});

describe("controls", () => {
  it("clamp to their ranges", () => {
    expect(model.setVariable(start, "q1", 50, model.defaultParams).q1).toBe(10);
    expect(model.setVariable(start, "sep", 0, model.defaultParams).sep).toBe(2);
    expect(model.setVariable(start, "theta", 400, model.defaultParams).theta).toBe(180);
    expect(model.setVariable(start, "nope", 1, model.defaultParams)).toBe(start);
  });

  it("numbers every output", () => {
    for (const params of [{ source: "line" }, { source: "sheet" }, { source: "shell" }, { particle: "proton" }] as const) {
      const r = derive({ fieldE: 0, q1: 0, q2: 0, q3: 0 }, params);
      for (const key of model.outputs) {
        expect(Number.isFinite(r[key]), key).toBe(true);
        expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
  });
});
