import { describe, expect, it } from "vitest";
import { MAX_OMEGA, angularAcceleration, momentOfInertia, rotationModel as model, torqueOf } from "./rotation";

const P = model.defaultParams;
const derive = (state: { theta?: number; omega: number }, over: Partial<typeof P> = {}) =>
  model.derive({ theta: state.theta ?? 0, omega: state.omega, time: 0 }, { ...P, ...over });

describe("moment of inertia", () => {
  it("depends on where the mass sits, not only how much there is", () => {
    const body = { mass: 2, radius: 0.5 };
    expect(momentOfInertia({ ...body, shape: "disc" })).toBeCloseTo(0.25, 12); // ½mR²
    expect(momentOfInertia({ ...body, shape: "ring" })).toBeCloseTo(0.5, 12); // mR²
    expect(momentOfInertia({ ...body, shape: "sphere" })).toBeCloseTo(0.2, 12); // ⅖mR²
    expect(momentOfInertia({ ...body, shape: "rod" })).toBeCloseTo(1 / 6, 12); // ⅓mR²
  });

  it("a ring is the hardest to spin, a rod the easiest", () => {
    const of = (shape: Parameters<typeof momentOfInertia>[0]["shape"]) => momentOfInertia({ shape, mass: 2, radius: 0.5 });
    expect(of("ring")).toBeGreaterThan(of("shell"));
    expect(of("shell")).toBeGreaterThan(of("disc"));
    expect(of("disc")).toBeGreaterThan(of("sphere"));
    expect(of("sphere")).toBeGreaterThan(of("rod"));
  });

  it("grows with the square of the radius", () => {
    const small = momentOfInertia({ shape: "disc", mass: 2, radius: 0.5 });
    const big = momentOfInertia({ shape: "disc", mass: 2, radius: 1 });
    expect(big).toBeCloseTo(4 * small, 12);
  });

  it("the radius of gyration says where a single point mass would sit", () => {
    const ring = derive({ omega: 0 }, { shape: "ring", radius: 0.5 });
    expect(ring.gyration).toBeCloseTo(0.5, 12); // all of a ring's mass is at the rim
    expect(derive({ omega: 0 }, { shape: "disc", radius: 0.5 }).gyration).toBeCloseTo(0.5 / Math.SQRT2, 12);
  });
});

describe("torque turns things", () => {
  it("is force times the distance from the axle", () => {
    expect(torqueOf({ ...P, force: 4, radius: 0.5, leverFraction: 1 })).toBeCloseTo(2, 12);
    expect(torqueOf({ ...P, force: 4, radius: 0.5, leverFraction: 0.5 })).toBeCloseTo(1, 12);
  });

  it("the same force closer to the axle turns it more slowly", () => {
    const rim = derive({ omega: 1 }, { force: 4, leverFraction: 1 });
    const inner = derive({ omega: 1 }, { force: 4, leverFraction: 0.5 });
    expect(inner.alpha).toBeCloseTo(rim.alpha / 2, 9);
  });

  it("angular acceleration is torque divided by moment of inertia", () => {
    const r = derive({ omega: 0 }, { shape: "disc", mass: 2, radius: 0.5, force: 4 });
    expect(r.torque).toBeCloseTo(2, 12);
    expect(r.inertia).toBeCloseTo(0.25, 12);
    expect(r.alpha).toBeCloseTo(8, 9);
    expect(r.netTorque).toBeCloseTo(r.torque, 9);
  });

  it("the same torque spins a ring up more slowly than a disc", () => {
    const disc = derive({ omega: 0 }, { shape: "disc" });
    const ring = derive({ omega: 0 }, { shape: "ring" });
    expect(ring.alpha).toBeCloseTo(disc.alpha / 2, 9);
  });
});

describe("axle friction", () => {
  it("holds the wheel still until the torque beats it", () => {
    expect(angularAcceleration({ ...P, force: 2, radius: 0.5, axleFriction: 2 }, 0)).toBe(0);
    expect(angularAcceleration({ ...P, force: 8, radius: 0.5, axleFriction: 2 }, 0)).toBeGreaterThan(0);
  });

  it("always opposes the spin, and can bring it to a stop", () => {
    const params = { ...P, force: 0, axleFriction: 1 };
    let s = { theta: 0, omega: 5, time: 0 };
    for (let i = 0; i < 4000; i++) s = model.advance(s, 0.001, params);
    expect(s.omega).toBe(0);
    expect(s.theta).toBeGreaterThan(0);
  });
});

describe("spinning up", () => {
  it("angular velocity grows at the rate the acceleration says", () => {
    const params = { ...P, shape: "disc" as const, mass: 2, radius: 0.5, force: 4, axleFriction: 0 };
    let s = model.initialize(params);
    for (let i = 0; i < 500; i++) s = model.advance(s, 0.001, params);
    expect(s.omega).toBeCloseTo(8 * 0.5, 6); // α = 8 rad/s² for half a second
    expect(model.derive(s, params).revolutions).toBeGreaterThan(0);
  });

  it("angular momentum and energy follow from the spin", () => {
    const r = derive({ omega: 6 }, { shape: "ring", mass: 2, radius: 0.5 });
    expect(r.inertia).toBeCloseTo(0.5, 12);
    expect(r.angularMomentum).toBeCloseTo(3, 12); // Iω
    expect(r.kinetic).toBeCloseTo(9, 12); // ½Iω²
    expect(r.rimSpeed).toBeCloseTo(3, 12); // ωR
  });

  it("never spins faster than the axle allows", () => {
    const params = { ...P, force: 40, radius: 1 };
    let s = model.initialize(params);
    for (let i = 0; i < 20000; i++) s = model.advance(s, 0.001, params);
    expect(s.omega).toBe(MAX_OMEGA);
    expect(model.setVariable(s, "omega", 999, params).omega).toBe(MAX_OMEGA);
  });
});
