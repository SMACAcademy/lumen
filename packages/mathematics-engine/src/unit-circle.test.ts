import { LabSession, traceSegments, visitOf, visitedCount, binAt } from "@ise/science-engine";
import { TAU, degToRad } from "@ise/units";
import { describe, expect, it } from "vitest";
import {
  cosOf,
  quadrantOf,
  referenceAngleOf,
  sinOf,
  snappedStep,
  tanOf,
  unitCircleModel as model,
} from "./unit-circle";

const P = model.defaultParams;
const at = (deg: number) => model.derive({ theta: degToRad(deg), time: 0 }, P);

describe("exact trigonometric values", () => {
  it.each([
    [0, 0, 1],
    [30, 0.5, Math.sqrt(3) / 2],
    [45, Math.SQRT1_2, Math.SQRT1_2],
    [60, Math.sqrt(3) / 2, 0.5],
    [90, 1, 0],
    [180, 0, -1],
    [270, -1, 0],
    [360, 0, 1],
  ])("θ = %i° → sin %f, cos %f", (deg, sin, cos) => {
    const r = at(deg);
    expect(r.sin).toBeCloseTo(sin, 12);
    expect(r.cos).toBeCloseTo(cos, 12);
  });

  it("returns exactly zero (not 1e-16) at quadrantal angles", () => {
    expect(sinOf(Math.PI)).toBe(0);
    expect(cosOf(Math.PI / 2)).toBe(0);
    expect(cosOf((3 * Math.PI) / 2)).toBe(0);
    expect(Object.is(sinOf(TAU), -0) || sinOf(TAU) === 0).toBe(true);
  });

  it("tan is sin/cos and undefined where cos θ = 0", () => {
    expect(tanOf(degToRad(45))).toBeCloseTo(1, 12);
    expect(tanOf(degToRad(135))).toBeCloseTo(-1, 12);
    expect(Number.isNaN(tanOf(Math.PI / 2))).toBe(true);
    expect(Number.isNaN(at(270).tan)).toBe(true);
  });

  it("satisfies sin²θ + cos²θ = 1 across a full sweep", () => {
    for (let deg = -720; deg <= 720; deg += 0.7) {
      expect(Math.abs(at(deg).identity - 1)).toBeLessThan(1e-12);
    }
  });
});

describe("geometry", () => {
  it("places the point at (r cos θ, r sin θ) and projections match", () => {
    const params = { ...P, radius: 2 };
    const r = model.derive({ theta: degToRad(30), time: 0 }, params);
    expect(r.x).toBeCloseTo(Math.sqrt(3), 12);
    expect(r.y).toBeCloseTo(1, 12);
    expect(r.x).toBeCloseTo(2 * r.cos, 12);
    expect(r.y).toBeCloseTo(2 * r.sin, 12);
  });

  it("identifies quadrants, including axis angles as 0", () => {
    expect(quadrantOf(degToRad(45))).toBe(1);
    expect(quadrantOf(degToRad(135))).toBe(2);
    expect(quadrantOf(degToRad(225))).toBe(3);
    expect(quadrantOf(degToRad(315))).toBe(4);
    expect(quadrantOf(degToRad(90))).toBe(0);
    expect(quadrantOf(degToRad(-45))).toBe(4);
  });

  it("computes reference angles", () => {
    expect(referenceAngleOf(degToRad(150))).toBeCloseTo(degToRad(30), 12);
    expect(referenceAngleOf(degToRad(210))).toBeCloseTo(degToRad(30), 12);
    expect(referenceAngleOf(degToRad(330))).toBeCloseTo(degToRad(30), 12);
    expect(referenceAngleOf(degToRad(420))).toBeCloseTo(degToRad(60), 12);
  });

  it("normalizes the displayed angle and counts revolutions", () => {
    const r = at(400);
    expect(r.thetaDeg).toBeCloseTo(40, 10);
    expect(r.revolutions).toBe(1);
    const neg = at(-30);
    expect(neg.thetaDeg).toBeCloseTo(330, 10);
    expect(neg.revolutions).toBe(-1);
  });
});

describe("motion", () => {
  it("advances by ω·dt counter-clockwise and clockwise", () => {
    const s0 = model.initialize(P);
    const ccw = model.advance(s0, 2, P);
    expect(ccw.theta).toBeCloseTo(Math.PI / 2, 12);
    expect(ccw.time).toBe(2);
    const cw = model.advance(s0, 2, { ...P, direction: "cw" });
    expect(cw.theta).toBeCloseTo(-Math.PI / 2, 12);
  });

  it("is deterministic: many small steps equal one large step", () => {
    let s = model.initialize(P);
    for (let i = 0; i < 1000; i++) s = model.advance(s, 0.008, P);
    expect(s.theta).toBeCloseTo(model.advance(model.initialize(P), 8, P).theta, 9);
    expect(model.derive(s, P).revolutions).toBe(1);
  });

  it("steps to the next multiple of the step size", () => {
    const step = degToRad(15);
    expect(snappedStep(0, step, 1)).toBeCloseTo(step, 12);
    expect(snappedStep(degToRad(17), step, 1)).toBeCloseTo(degToRad(30), 12);
    expect(snappedStep(degToRad(17), step, -1)).toBeCloseTo(degToRad(15), 12);
    expect(snappedStep(degToRad(30), step, -1)).toBeCloseTo(degToRad(15), 12);
    const s = model.step({ theta: 0, time: 0 }, { ...P, direction: "cw" }, 1);
    expect(s.theta).toBeCloseTo(-step, 12);
  });

  it("setVariable moves to the nearest equivalent angle (drag across 0° continues forward)", () => {
    const s = model.setVariable({ theta: TAU + degToRad(350), time: 0 }, "theta", degToRad(10), P);
    expect(s.theta).toBeCloseTo(2 * TAU + degToRad(10), 12);
    expect(model.getVariable(s, "theta")).toBeCloseTo(degToRad(10), 12);
    const back = model.setVariable({ theta: degToRad(10), time: 0 }, "theta", degToRad(350), P);
    expect(back.theta).toBeCloseTo(degToRad(-10), 12);
  });
});

describe("LabSession with the unit circle", () => {
  it("generates the sine curve progressively while playing", () => {
    const session = new LabSession(model);
    session.play();
    for (let i = 0; i < 60 * 2; i++) session.tick(1 / 60); // 2 s at 45°/s → 90°
    const snap = session.getSnapshot();
    expect(snap.results.thetaDeg).toBeCloseTo(90, 6);
    expect(snap.results.sin).toBeCloseTo(1, 9);
    const trace = snap.trace!;
    // 90° of 360° at 720 bins/rev ≈ 180 bins (plus the boundary bin).
    expect(visitedCount(trace)).toBeGreaterThanOrEqual(180);
    expect(visitedCount(trace)).toBeLessThanOrEqual(182);
    const segments = traceSegments(trace);
    expect(segments).toHaveLength(1);
    // Every recorded value comes from the model.
    for (const bin of segments[0]!.bins) {
      const theta = ((bin + 0.5) / trace.binsPerPeriod) * TAU;
      expect(trace.values.sin![bin]).toBeCloseTo(Math.sin(theta), 12);
      expect(trace.values.cos![bin]).toBeCloseTo(Math.cos(theta), 12);
    }
  });

  it("reveals only what the slider sweeps", () => {
    const session = new LabSession(model);
    session.setVariable("theta", degToRad(30), "jump");
    session.setVariable("theta", degToRad(60), "sweep");
    const trace = session.getSnapshot().trace!;
    expect(visitOf(trace, binAt(trace, degToRad(45)))).toBe("current");
    expect(visitOf(trace, binAt(trace, degToRad(15)))).toBe("none");
    expect(visitOf(trace, binAt(trace, degToRad(90)))).toBe("none");
  });

  it("reset returns θ to its initial value and clears the curve", () => {
    const session = new LabSession(model);
    session.setVariable("theta", degToRad(200));
    session.reset();
    const snap = session.getSnapshot();
    expect(snap.results.theta).toBe(0);
    expect(visitedCount(snap.trace!)).toBe(1);
  });

  it("parameter changes take effect on the next tick", () => {
    const session = new LabSession(model);
    session.setParam("omega", Math.PI); // 180°/s
    session.setParam("direction", "cw");
    session.play();
    session.tick(0.05);
    session.tick(0.05);
    expect(session.getSnapshot().results.theta).toBeCloseTo(-Math.PI * 0.1, 12);
  });
});
