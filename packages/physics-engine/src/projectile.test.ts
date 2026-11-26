import { describe, expect, it } from "vitest";
import { FLIGHT_LIMIT, apexTime, projectilePositionAt, projectileModel as model, timeOfFlight } from "./projectile";

const P = model.defaultParams;
const deg = (d: number) => (d * Math.PI) / 180;
const derive = (t: number, over: Partial<typeof P> = {}) => model.derive({ t }, { ...P, ...over });

describe("the two motions", () => {
  it("horizontal velocity never changes; vertical loses g every second", () => {
    const at = (t: number) => derive(t, { u: 20, angle: deg(30), g: 10 });
    expect(at(0).vx).toBeCloseTo(20 * Math.cos(deg(30)), 12);
    expect(at(1.5).vx).toBeCloseTo(at(0).vx, 12);
    expect(at(0).vy).toBeCloseTo(10, 12);
    expect(at(1).vy).toBeCloseTo(0, 12);
    expect(at(1.5).vy).toBeCloseTo(-5, 12);
  });

  it("position is uniform across and accelerated down", () => {
    const p = { ...P, u: 20, angle: deg(30), g: 10, h0: 0 };
    expect(projectilePositionAt(p, 2).x).toBeCloseTo(20 * Math.cos(deg(30)) * 2, 12);
    expect(projectilePositionAt(p, 2).y).toBeCloseTo(10 * 2 - 0.5 * 10 * 4, 12);
  });

  it("the top of the flight is where the vertical velocity runs out", () => {
    const r = derive(0, { u: 20, angle: deg(30), g: 10 });
    expect(r.apexTime).toBeCloseTo(1, 12);
    expect(r.maxHeight).toBeCloseTo(5, 12);
    expect(derive(r.apexTime, { u: 20, angle: deg(30), g: 10 }).vy).toBeCloseTo(0, 9);
  });
});

describe("flight time and range", () => {
  it("from the ground, the flight lasts 2u sinθ / g", () => {
    const p = { ...P, u: 20, angle: deg(30), g: 10, h0: 0 };
    expect(timeOfFlight(p)).toBeCloseTo(2, 12);
    expect(derive(0, p).range).toBeCloseTo((20 * 20 * Math.sin(deg(60))) / 10, 9);
  });

  it("45° goes furthest, and angles either side of it match", () => {
    const rangeAt = (d: number) => derive(0, { u: 15, angle: deg(d), g: 9.8, h0: 0 }).range;
    expect(rangeAt(45)).toBeGreaterThan(rangeAt(30));
    expect(rangeAt(45)).toBeGreaterThan(rangeAt(60));
    expect(rangeAt(30)).toBeCloseTo(rangeAt(60), 9);
  });

  it("launching from a height keeps it in the air longer", () => {
    const low = { ...P, u: 15, angle: deg(40), h0: 0 };
    expect(timeOfFlight({ ...low, h0: 10 })).toBeGreaterThan(timeOfFlight(low));
  });

  it("a horizontal launch from a height falls in the usual free-fall time", () => {
    const p = { ...P, u: 12, angle: 0, h0: 20, g: 10 };
    expect(timeOfFlight(p)).toBeCloseTo(2, 12); // √(2h/g)
    expect(apexTime(p)).toBe(0);
  });

  it("never follows a flight for longer than the simulation runs", () => {
    expect(timeOfFlight({ ...P, u: 20, angle: deg(89), g: 0.5 })).toBe(FLIGHT_LIMIT);
  });
});

describe("the flight itself", () => {
  it("stops at landing, however long time runs", () => {
    const params = { ...P, u: 14, angle: deg(45) };
    let s = model.initialize(params);
    s = model.advance(s, 100, params);
    expect(s.t).toBeCloseTo(timeOfFlight(params), 12);
    expect(model.derive(s, params).landed).toBe(true);
    expect(model.derive(s, params).y).toBeCloseTo(0, 9);
  });

  it("scrubbing cannot go before the launch or past the landing", () => {
    const params = { ...P, u: 14, angle: deg(45) };
    expect(model.setVariable({ t: 1 }, "t", -4, params).t).toBe(0);
    expect(model.setVariable({ t: 1 }, "t", 99, params).t).toBeCloseTo(timeOfFlight(params), 12);
  });

  it("steps land on whole strobe intervals", () => {
    expect(model.step({ t: 0 }, P, 1).t).toBeCloseTo(0.2, 12);
    expect(model.step({ t: 0.5 }, P, -1).t).toBeCloseTo(0.4, 12);
    expect(model.step({ t: 0 }, P, -1).t).toBe(0);
  });

  it("speed and heading describe the same velocity as the components", () => {
    const r = derive(1.2, { u: 16, angle: deg(55) });
    expect(r.speed).toBeCloseTo(Math.hypot(r.vx, r.vy), 12);
    expect(Math.tan(r.heading)).toBeCloseTo(r.vy / r.vx, 9);
  });
});
