import { LabSession, binAt, traceCoverage, visitOf } from "@ise/science-engine";
import { describe, expect, it } from "vitest";
import { T_MAX, distanceTravelled, kinematicsModel as model, positionAt, turningPoint, velocityAt } from "./kinematics";

const P = model.defaultParams;
const derive = (t: number, over: Partial<typeof P> = {}) => model.derive({ t }, { ...P, ...over });

describe("the equations of motion", () => {
  it("position and velocity follow s = ut + ½at² and v = u + at", () => {
    const p = { u: 4, a: -2, x0: 1 };
    expect(positionAt(p, 3)).toBeCloseTo(1 + 12 - 9, 12);
    expect(velocityAt(p, 3)).toBe(-2);
    expect(derive(3, p).x).toBeCloseTo(4, 12);
  });

  it("v² = u² + 2as holds at every instant", () => {
    for (const t of [0, 0.7, 2.5, 5]) {
      const r = derive(t, { u: 5, a: -3 });
      expect(r.v ** 2).toBeCloseTo(25 + 2 * -3 * r.displacement, 9);
    }
  });

  it("average velocity is displacement over time, not distance over time", () => {
    const r = derive(4, { u: 4, a: -2, x0: 0 }); // turns at t = 2
    expect(r.displacement).toBeCloseTo(0, 9);
    expect(r.distance).toBeCloseTo(8, 9);
    expect(r.avgVelocity).toBeCloseTo(0, 9);
    expect(derive(0).avgVelocity).toBe(0);
  });
});

describe("distance, displacement and turning", () => {
  it("they agree until the body turns round, and separate after", () => {
    const p = { u: 4, a: -2, x0: 0 };
    expect(turningPoint(p)).toBe(2);
    expect(distanceTravelled(p, 1)).toBeCloseTo(Math.abs(positionAt(p, 1)), 12);
    expect(distanceTravelled(p, 3)).toBeCloseTo(4 + 1, 12); // out 4 m, back 1 m
    expect(positionAt(p, 3)).toBeCloseTo(3, 12);
  });

  it("there is no turning point without acceleration, or if it falls outside the run", () => {
    expect(turningPoint({ u: 3, a: 0 })).toBeNaN();
    expect(turningPoint({ u: 3, a: -0.1 })).toBeNaN(); // t = 30 s, long after the run
    expect(turningPoint({ u: -3, a: -1 })).toBeNaN(); // already moving away
  });

  it("names what the motion is doing", () => {
    expect(derive(0, { u: 4, a: 2 }).phase).toBe("speeding up");
    expect(derive(0, { u: 4, a: -2 }).phase).toBe("slowing down");
    expect(derive(0, { u: 4, a: 0 }).phase).toBe("steady");
    expect(derive(2, { u: 4, a: -2 }).phase).toBe("turning");
    expect(derive(0, { u: 0, a: 0 }).phase).toBe("at rest");
  });

  it("reports the extremes of the whole run, including the turning point", () => {
    const r = derive(0, { u: 4, a: -2, x0: 0 });
    expect(r.xMax).toBeCloseTo(4, 12); // apex at t = 2
    expect(r.xMin).toBeCloseTo(positionAt({ u: 4, a: -2, x0: 0 }, T_MAX), 12);
    expect([r.vMin, r.vMax]).toEqual([4 + -2 * T_MAX, 4]);
  });
});

describe("time", () => {
  it("runs forward and stops at the end", () => {
    let s = model.initialize(P);
    s = model.advance(s, 2, P);
    expect(s.t).toBe(2);
    s = model.advance(s, 100, P);
    expect(s.t).toBe(T_MAX);
    expect(model.advance(s, 1, P).t).toBe(T_MAX);
  });

  it("steps land on strobe intervals and never go below zero", () => {
    const at = (t: number, sign: 1 | -1) => model.step({ t }, P, sign).t;
    expect(at(0, 1)).toBe(0.5);
    expect(at(0.5, 1)).toBe(1);
    expect(at(0.7, 1)).toBe(1);
    expect(at(0.7, -1)).toBeCloseTo(0.5, 12);
    expect(at(0, -1)).toBe(0);
  });

  it("scrubbing stays inside the run", () => {
    expect(model.setVariable({ t: 0 }, "t", -3, P).t).toBe(0);
    expect(model.setVariable({ t: 0 }, "t", 99, P).t).toBe(T_MAX);
  });
});

describe("the recorded graphs", () => {
  it("record position, velocity and acceleration as time runs", () => {
    const session = new LabSession(model);
    session.play();
    for (let i = 0; i < 180; i++) session.tick(1 / 60);
    const trace = session.getSnapshot().trace!;
    expect(traceCoverage(trace)).toBeGreaterThan(0.45);
    const bin = binAt(trace, 2);
    expect(visitOf(trace, bin)).toBe("current");
    expect(trace.values.x![bin]).toBeCloseTo(positionAt(P, 2), 1);
    expect(trace.values.v![bin]).toBeCloseTo(velocityAt(P, 2), 1);
    expect(trace.values.a![bin]).toBe(P.a);
    expect(visitOf(trace, binAt(trace, 5))).toBe("none");
  });

  it("start again when the launch changes", () => {
    const session = new LabSession(model);
    session.setVariable("t", 4, "sweep");
    expect(traceCoverage(session.getSnapshot().trace!)).toBeGreaterThan(0.5);
    session.setParam("u", -2);
    expect(traceCoverage(session.getSnapshot().trace!)).toBeLessThan(0.01);
  });
});
