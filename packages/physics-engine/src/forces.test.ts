import { describe, expect, it } from "vitest";
import { TRACK_LIMIT, forcesModel as model, frictionAndAcceleration, normalForce, slipAngle } from "./forces";

const P = model.defaultParams;
const deg = (d: number) => (d * Math.PI) / 180;
const derive = (over: Partial<typeof P> = {}, state = { s: 0, v: 0, time: 0 }) => model.derive(state, { ...P, ...over });

describe("resolving the weight", () => {
  it("splits into a pull along the slope and a press into it", () => {
    const r = derive({ mass: 2, incline: deg(30), g: 10 });
    expect(r.weight).toBeCloseTo(20, 12);
    expect(r.weightAlong).toBeCloseTo(-10, 9); // mg sin30, pulling down the slope
    expect(r.normal).toBeCloseTo(20 * Math.cos(deg(30)), 9);
  });

  it("on the flat, the surface carries the whole weight", () => {
    expect(normalForce({ ...P, mass: 3, incline: 0, g: 10 })).toBeCloseTo(30, 12);
    expect(derive({ mass: 3, incline: 0, g: 10 }).weightAlong).toBeCloseTo(0, 12);
  });
});

describe("static friction holds, up to a point", () => {
  it("matches whatever would otherwise move the block, and no more", () => {
    // A 10 N push on a block that can resist up to μs·N = 0.4 × 20 = 8 N.
    const light = derive({ mass: 2, g: 10, applied: 5, muStatic: 0.4 });
    expect(light.friction).toBeCloseTo(-5, 9);
    expect(light.a).toBe(0);
    expect(light.motion).toBe("still");
    expect(light.held).toBe(1);

    const hard = derive({ mass: 2, g: 10, applied: 10, muStatic: 0.4, muKinetic: 0.3 });
    expect(hard.a).toBeGreaterThan(0);
    expect(hard.friction).toBeCloseTo(-6, 9); // now kinetic: μk·N = 0.3 × 20
    expect(hard.motion).toBe("sliding up");
    expect(hard.held).toBe(0);
  });

  it("warns when the block is on the verge of moving", () => {
    expect(derive({ mass: 2, g: 10, applied: 7.9, muStatic: 0.4 }).motion).toBe("on the verge");
  });

  it("a block on a slope stays put until tan θ passes μs", () => {
    const onSlope = (d: number) => derive({ mass: 2, g: 10, incline: deg(d), muStatic: 0.5, muKinetic: 0.4, applied: 0 });
    expect(slipAngle({ muStatic: 0.5 })).toBeCloseTo(Math.atan(0.5), 12);
    expect(onSlope(20).motion).toBe("still"); // tan20 = 0.36 < 0.5
    expect(onSlope(20).a).toBe(0);
    expect(onSlope(35).motion).toBe("sliding down"); // tan35 = 0.70 > 0.5
    expect(onSlope(35).a).toBeLessThan(0);
  });
});

describe("Newton's second law", () => {
  it("acceleration is the resultant force divided by the mass", () => {
    const r = derive({ mass: 4, g: 10, applied: 20, muStatic: 0, muKinetic: 0, incline: 0 });
    expect(r.netForce).toBeCloseTo(20, 9);
    expect(r.a).toBeCloseTo(5, 9);
  });

  it("the same force gives half the acceleration to twice the mass", () => {
    const one = derive({ mass: 2, applied: 12, muStatic: 0, muKinetic: 0 });
    const two = derive({ mass: 4, applied: 12, muStatic: 0, muKinetic: 0 });
    expect(one.a).toBeCloseTo(2 * two.a, 9);
  });

  it("friction opposes the motion, whichever way the block is going", () => {
    const up = frictionAndAcceleration({ ...P, mass: 2, g: 10, muKinetic: 0.3 }, 1.5);
    const down = frictionAndAcceleration({ ...P, mass: 2, g: 10, muKinetic: 0.3 }, -1.5);
    expect(up.friction).toBeCloseTo(-6, 9);
    expect(down.friction).toBeCloseTo(6, 9);
  });
});

describe("the block moving", () => {
  it("speeds up under a steady force", () => {
    const params = { ...P, mass: 2, g: 10, applied: 10, muStatic: 0.4, muKinetic: 0.3, incline: 0 };
    let s = model.initialize(params);
    s = model.advance(s, 0.5, params);
    expect(s.v).toBeCloseTo(2 * 0.5, 6); // a = (10 − 6)/2 = 2 m/s²
    expect(s.s).toBeGreaterThan(0);
  });

  it("is brought to a stop by friction, and not dragged backwards", () => {
    const params = { ...P, mass: 2, g: 10, applied: 0, muStatic: 0.4, muKinetic: 0.3, incline: 0 };
    let s = { s: 0, v: 2, time: 0 };
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.02, params);
    expect(s.v).toBe(0);
    expect(s.s).toBeGreaterThan(0);
    expect(model.derive(s, params).motion).toBe("still");
  });

  it("stops at the end of the track", () => {
    const params = { ...P, mass: 1, applied: 40, muStatic: 0, muKinetic: 0 };
    let s = model.initialize(params);
    for (let i = 0; i < 400; i++) s = model.advance(s, 0.02, params);
    expect(s.s).toBe(TRACK_LIMIT);
    expect(s.v).toBe(0);
  });

  it("can be placed by hand, which also puts it at rest", () => {
    expect(model.setVariable({ s: 0, v: 3, time: 0 }, "s", 2, P)).toEqual({ s: 2, v: 0, time: 0 });
    expect(model.setVariable({ s: 0, v: 0, time: 0 }, "s", 99, P).s).toBe(TRACK_LIMIT);
  });
});
