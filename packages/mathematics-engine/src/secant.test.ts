import { LabSession, binAt, binCenter, visitOf, visitedCount } from "@ise/science-engine";
import { describe, expect, it } from "vitest";
import { functionFamilies } from "./functions";
import { H_SHIFT, secantModel as model, secantSlope } from "./secant";

const P = model.defaultParams;
const derive = (x0: number, h: number, family = "quadratic") => model.derive({ x0, h, time: 0 }, { ...P, family });

describe("function families", () => {
  it("each exact derivative matches a central difference", () => {
    for (const fam of Object.values(functionFamilies)) {
      for (const x of [-2, -0.5, 0.3, 1.7]) {
        const numeric = (fam.f(x + 1e-6) - fam.f(x - 1e-6)) / 2e-6;
        expect(fam.df(x)).toBeCloseTo(numeric, 5);
      }
    }
  });
});

describe("secant and tangent", () => {
  it("secant slope of x² from x to x+h is 2x + h", () => {
    for (const [x, h] of [
      [1, 1.5],
      [-2, 0.5],
      [0.3, -0.7],
    ] as const) {
      expect(derive(x, h).secantSlope).toBeCloseTo(2 * x + h, 10);
    }
  });

  it("the tangent slope depends on P only, not on h", () => {
    expect(derive(1, 1.5).tangentSlope).toBe(derive(1, 0.01).tangentSlope);
    expect(derive(1, 0.01).tangentSlope).toBe(2);
  });

  it("the secant slope converges to the tangent slope as h → 0, for every family", () => {
    for (const family of Object.keys(functionFamilies)) {
      const errors = [1, 0.1, 0.01, 0.001].map((h) => derive(0.7, h, family).absError);
      for (let i = 1; i < errors.length; i++) expect(errors[i]!).toBeLessThan(errors[i - 1]!);
      expect(errors[3]!).toBeLessThan(0.01);
    }
  });

  it("rise and run are consistent", () => {
    const r = derive(1, 0.5);
    expect(r.dx).toBe(0.5);
    expect(r.dy).toBeCloseTo(1.5 * 1.5 - 1, 12);
    expect(r.secantSlope).toBeCloseTo(r.dy / r.dx, 12);
    expect(secantSlope("quadratic", 1, 0.5)).toBeCloseTo(r.secantSlope, 12);
  });
});

describe("h and P", () => {
  it("playing shrinks h geometrically but never reaches zero", () => {
    let s = model.initialize(P);
    s = model.advance(s, 1, P);
    expect(s.h).toBeCloseTo(1.5 * Math.exp(-P.shrinkRate), 12);
    for (let i = 0; i < 1000; i++) s = model.advance(s, 0.1, P);
    expect(s.h).toBe(P.hMin);
  });

  it("step forward halves h, step back doubles it (up to hMax)", () => {
    const s = model.initialize(P);
    expect(model.step(s, P, 1).h).toBeCloseTo(0.75, 12);
    expect(model.step(s, P, -1).h).toBe(P.hMax);
  });

  it("h keeps its sign and h = 0 becomes the smallest positive h", () => {
    const s = model.initialize(P);
    expect(model.setVariable(s, "h", -0.0001, P).h).toBe(-P.hMin);
    expect(model.setVariable(s, "h", 0, P).h).toBe(P.hMin);
    expect(model.setVariable(s, "h", 9, P).h).toBe(P.hMax);
  });

  it("P stays inside the family's view", () => {
    expect(model.setVariable(model.initialize(P), "x0", 10, P).x0).toBe(2.75);
  });
});

describe("slope-vs-h trace", () => {
  it("records secant slopes as h shrinks, at the right h", () => {
    const session = new LabSession(model);
    session.play();
    for (let i = 0; i < 120; i++) session.tick(1 / 60);
    const trace = session.getSnapshot().trace!;
    const b = binAt(trace, 1 + H_SHIFT);
    expect(visitOf(trace, b)).toBe("current");
    const h = binCenter(trace, b) - H_SHIFT;
    expect(trace.values.secantSlope![b]).toBeCloseTo(2 * 1 + h, 9); // x0 = 1 on x²
    expect(visitOf(trace, binAt(trace, -1 + H_SHIFT))).toBe("none");
  });

  it("restarts when P moves or the curve changes", () => {
    const session = new LabSession(model);
    session.setVariable("h", 0.2, "sweep");
    expect(visitedCount(session.getSnapshot().trace!)).toBeGreaterThan(50);
    session.setVariable("x0", 0, "sweep");
    expect(visitedCount(session.getSnapshot().trace!)).toBe(1);
    session.setVariable("h", 1, "sweep");
    session.setParam("family", "cubic");
    expect(visitedCount(session.getSnapshot().trace!)).toBe(1);
  });
});
