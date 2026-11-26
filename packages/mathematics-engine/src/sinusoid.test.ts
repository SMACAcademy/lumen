import { LabSession, binAt, visitOf, visitedCount } from "@ise/science-engine";
import { TAU } from "@ise/units";
import { describe, expect, it } from "vitest";
import { X_MIN, firstPeak, periodOf, sinusoidAt, sinusoidModel as model } from "./sinusoid";

const P = model.defaultParams;
const derive = (params: Partial<typeof P>, x = 0) => model.derive({ x, time: 0 }, { ...P, ...params });

describe("sinusoid values", () => {
  it("reduces to sin x with default parameters", () => {
    for (const x of [-3, -1, 0, 0.5, Math.PI / 2, 2.7]) {
      expect(sinusoidAt(x, P)).toBeCloseTo(Math.sin(x), 12);
    }
  });

  it("applies amplitude, frequency, phase and offset", () => {
    const p = { amplitude: 2, omega: 3, phi: 0.4, offset: -1 };
    for (const x of [-2, 0, 1.3]) {
      expect(sinusoidAt(x, p)).toBeCloseTo(-1 + 2 * Math.sin(3 * x + 0.4), 12);
    }
  });

  it("is exactly zero at the zeros of sin", () => {
    expect(sinusoidAt(Math.PI, P)).toBe(0);
  });
});

describe("derived features", () => {
  it("computes period, frequency and ω·T = 2π", () => {
    const r = derive({ omega: 2 });
    expect(r.period).toBeCloseTo(Math.PI, 12);
    expect(r.frequency).toBeCloseTo(1 / Math.PI, 12);
    for (const omega of [0.25, 1, 2.5, 4]) expect(derive({ omega }).omegaTimesPeriod).toBeCloseTo(TAU, 12);
    expect(periodOf(0)).toBe(Number.POSITIVE_INFINITY);
  });

  it("amplitude does not change the period (a classic misconception)", () => {
    expect(derive({ amplitude: 2.5 }).period).toBe(derive({ amplitude: 0.5 }).period);
  });

  it("computes range and midline", () => {
    const r = derive({ amplitude: -2, offset: 1 });
    expect(r.amplitude).toBe(2);
    expect(r.max).toBe(3);
    expect(r.min).toBe(-1);
  });

  it("phase shift is −φ/ω: positive φ moves the wave left", () => {
    expect(derive({ phi: Math.PI / 2 }).phaseShift).toBeCloseTo(-Math.PI / 2, 12);
    expect(derive({ phi: Math.PI / 2, omega: 2 }).phaseShift).toBeCloseTo(-Math.PI / 4, 12);
    // sin(x + π/2) is cos x
    for (const x of [-1, 0, 2]) expect(sinusoidAt(x, { ...P, phi: Math.PI / 2 })).toBeCloseTo(Math.cos(x), 12);
  });

  it("finds a real maximum for the first peak, for either sign of A", () => {
    for (const p of [
      { amplitude: 1, omega: 1, phi: 0, offset: 0 },
      { amplitude: -1.5, omega: 2, phi: 0.3, offset: 1 },
      { amplitude: 2, omega: 0.5, phi: -1, offset: 0 },
    ]) {
      const x = firstPeak(p, X_MIN);
      expect(x).toBeGreaterThanOrEqual(X_MIN);
      expect(x).toBeLessThan(X_MIN + periodOf(p.omega) + 1e-9);
      expect(sinusoidAt(x, p)).toBeCloseTo(p.offset + Math.abs(p.amplitude), 9);
    }
  });

  it("places the generating point at (A cos θ, A sin θ) with θ = ωx + φ", () => {
    const r = derive({ amplitude: 2, omega: 1, phi: 0.5, offset: 1 }, 1);
    expect(r.phase).toBeCloseTo(1.5, 12);
    expect(r.phasorX).toBeCloseTo(2 * Math.cos(1.5), 12);
    expect(r.offset + r.phasorY).toBeCloseTo(r.y, 12);
  });
});

describe("probe motion", () => {
  it("moves at the probe speed and wraps across the visible range", () => {
    const s = model.advance(model.initialize(P), 2, P);
    expect(s.x).toBeCloseTo(Math.PI, 12);
    const far = model.derive({ x: TAU + 0.5, time: 0 }, P);
    expect(far.xProbe).toBeCloseTo(-TAU + 0.5, 12);
    expect(far.passes).toBe(1);
  });

  it("setVariable wraps the shortest way", () => {
    const s = model.setVariable({ x: TAU - 0.1, time: 0 }, "x", -TAU + 0.1, P);
    expect(s.x).toBeCloseTo(TAU + 0.1, 12);
    expect(model.getVariable(s, "x")).toBeCloseTo(-TAU + 0.1, 12);
  });
});

describe("trace generation", () => {
  it("records the curve where the probe travelled, on the graph's x-axis", () => {
    const session = new LabSession(model);
    session.play();
    for (let i = 0; i < 60; i++) session.tick(1 / 60); // 1 s at π/2 per s → x from 0 to π/2
    const trace = session.getSnapshot().trace!;
    const bin = (x: number) => binAt(trace, x - X_MIN);
    expect(visitOf(trace, bin(Math.PI / 4))).toBe("current");
    expect(visitOf(trace, bin(-1))).toBe("none");
    const b = bin(Math.PI / 4);
    const centre = ((b + 0.5) / trace.binsPerPeriod) * trace.period + X_MIN;
    expect(trace.values.y![b]).toBeCloseTo(Math.sin(centre), 12);
  });

  it("restarts the trace when the wave changes", () => {
    const session = new LabSession(model);
    session.setVariable("x", 2, "sweep");
    expect(visitedCount(session.getSnapshot().trace!)).toBeGreaterThan(100);
    session.setParam("amplitude", 2);
    expect(visitedCount(session.getSnapshot().trace!)).toBe(1);
    session.setParam("probeSpeed", 1); // not a property of the wave
    expect(visitedCount(session.getSnapshot().trace!)).toBe(1);
  });
});
