import { describe, expect, it } from "vitest";
import {
  CONIC_KIND_ORDER,
  CONIC_OPENING_ORDER,
  conicModel as model,
  conicPoint,
  conicPolarRadius,
  coneSection,
  hyperbolaTheta,
  type ConicParams,
  type ConicResults,
  type ConicState,
} from "./conic";

const base: ConicState = model.initialize(model.defaultParams);
const derive = (params: Partial<ConicParams> = {}, state: Partial<ConicState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("slicing the cone (α = 30°)", () => {
  it("names the section from the plane's tilt", () => {
    expect(derive({}, { tilt: 90 })).toMatchObject({ sliceKind: 0, sliceE: 0 });
    expect(derive({}, { tilt: 60 }).sliceKind).toBe(1);
    expect(derive({}, { tilt: 30 })).toMatchObject({ sliceKind: 2, sliceE: 1 });
    expect(derive({}, { tilt: 10 }).sliceKind).toBe(3);
  });

  it("gives e = cos β / cos α", () => {
    // cos 60° / cos 30° = 0.5 / 0.866 = 1/√3.
    expect(derive({}, { tilt: 60 }).sliceE).toBeCloseTo(1 / Math.sqrt(3), 10);
    // β = 0: 1 / cos 30° = 2/√3.
    expect(derive({}, { tilt: 0 }).sliceE).toBeCloseTo(2 / Math.sqrt(3), 10);
    expect(coneSection(29.8)).toEqual({ shape: 2, e: 1 });
    expect(coneSection(31).shape).toBe(1);
  });
});

describe("the focus–directrix locus", () => {
  it("keeps PF/PM equal to e wherever P is", () => {
    for (const e of [0.3, 0.5, 0.8, 1, 1.5, 2]) {
      for (const phi of [-150, -90, -45, 60, 120, 180]) {
        const r = derive({}, { e, phi });
        expect(r.lratio, `e ${e} φ ${phi}`).toBeCloseTo(e, 10);
        expect(r.lpf).toBeCloseTo(Math.hypot(r.lx, r.ly), 10);
        expect(r.lpm).toBeCloseTo(r.lx + 2, 10);
        expect(r.lpf).toBeLessThanOrEqual(6 + 1e-9);
      }
    }
  });

  it("is an ellipse below e = 1, a parabola at it and a hyperbola above", () => {
    expect(derive({}, { e: 0.5 }).locusKind).toBe(1);
    expect(derive({}, { e: 1 }).locusKind).toBe(2);
    // A slider value a hair from 1 counts as exactly 1.
    expect(derive({}, { e: 0.2 + 0.05 * 16 })).toMatchObject({ locusKind: 2, locusE: 1 });
    expect(derive({}, { e: 1.5 }).locusKind).toBe(3);
  });

  it("puts the parabola's latus-rectum end at (0, 2): PF = PM = 2", () => {
    const r = derive({}, { e: 1, phi: 90 });
    expect(r.lx).toBeCloseTo(0, 10);
    expect(r.ly).toBeCloseTo(2, 10);
    expect(r.lpf).toBeCloseTo(2, 10);
    expect(r.lpm).toBeCloseTo(2, 10);
  });

  it("keeps P on the curve near φ = 0 by moving it round, not off to infinity", () => {
    const r = derive({}, { e: 1, phi: 0 });
    expect(Number.isFinite(r.lpf)).toBe(true);
    expect(r.phi).toBeGreaterThan(0);
    expect(r.lpf).toBeCloseTo(6, 8);
    expect(conicPolarRadius(1, 0)).toBe(Number.POSITIVE_INFINITY);
    // e > 1, the far branch: negative r puts the point behind the directrix.
    const far = conicPolarRadius(2, 180);
    expect(far).toBeCloseTo(4 / 3, 10);
    expect(conicPolarRadius(2, 0)).toBeCloseTo(-4, 10);
  });
});

describe("the parabola", () => {
  it("y² = 8x has focus (2, 0), directrix x = −2 and latus rectum 8", () => {
    const r = derive({ kind: "parabola", opens: "right" }, { a: 2, t: 1 });
    expect(r).toMatchObject({ f1x: 2, f1y: 0, directrix: -2, directrixVertical: 1, latusRectum: 8, ecc: 1, focusCount: 1, px: 2, py: 4 });
    expect(r.pf1).toBeCloseTo(4, 10);
    expect(r.pm).toBeCloseTo(4, 10);
    expect(r.ratio).toBeCloseTo(1, 10);
  });

  it("x² = −16y has focus (0, −4), directrix y = 4 and latus rectum 16", () => {
    const r = derive({ kind: "parabola", opens: "down" }, { a: 4, t: 0.5 });
    expect(r).toMatchObject({ f1x: 0, f1y: -4, directrix: 4, directrixVertical: 0, latusRectum: 16 });
    // P = (2at, −at²) = (4, −1); on x² = −16y.
    expect(r.px).toBeCloseTo(4, 10);
    expect(r.py).toBeCloseTo(-1, 10);
    expect(r.px * r.px).toBeCloseTo(-16 * r.py, 10);
  });

  it("puts every point of every orientation the same distance from focus and directrix", () => {
    for (const opens of CONIC_OPENING_ORDER) {
      for (const t of [-3, -1.2, 0, 0.7, 2.5]) {
        const r = derive({ kind: "parabola", opens }, { a: 1.5, t });
        expect(r.pf1, `${opens} t ${t}`).toBeCloseTo(r.pm, 10);
        expect(r.pf1).toBeCloseTo(1.5 * (1 + t * t), 10);
      }
    }
  });

  it("has tangent slope 1/t and normal slope −t on y² = 4ax", () => {
    // y² = 8x at (2, 4): tangent 4y = 4(x + 2), i.e. y = x + 2.
    expect(derive({ kind: "parabola" }, { a: 2, t: 1 })).toMatchObject({ tangentSlope: 1, normalSlope: -1, tangentVertical: 0 });
    const r = derive({ kind: "parabola" }, { a: 2, t: 2 });
    expect(r.tangentSlope).toBeCloseTo(0.5, 10);
    expect(r.normalSlope).toBeCloseTo(-2, 10);
    // At the vertex the tangent is the y-axis.
    expect(derive({ kind: "parabola" }, { a: 2, t: 0 })).toMatchObject({ tangentVertical: 1, tangentSlope: 0, normalSlope: 0, normalVertical: 0 });
    // x² = 4ay at its vertex: tangent flat, normal vertical.
    expect(derive({ kind: "parabola", opens: "up" }, { a: 2, t: 0 })).toMatchObject({ tangentSlope: 0, normalVertical: 1 });
  });

  it("checks the tangent's slope against the curve itself", () => {
    for (const opens of CONIC_OPENING_ORDER) {
      const r = derive({ kind: "parabola", opens }, { a: 1.5, t: 1.3 });
      const [x1, y1] = conicPoint("parabola", opens, 1.5, 0, 1.3 - 1e-6);
      const [x2, y2] = conicPoint("parabola", opens, 1.5, 0, 1.3 + 1e-6);
      expect(r.tangentSlope, opens).toBeCloseTo((y2 - y1) / (x2 - x1), 5);
    }
  });

  it("reflects a ray parallel to the axis through the focus", () => {
    // y² = 8x at (2, 4): the tangent y = x + 2 makes 45° with both the ray and PF.
    const r = derive({ kind: "parabola" }, { a: 2, t: 1 });
    expect(r.angle1).toBeCloseTo(45, 10);
    expect(r.angle2).toBeCloseTo(45, 10);
    for (const opens of CONIC_OPENING_ORDER) {
      for (const t of [-2.5, -0.4, 0, 1.7]) {
        const s = derive({ kind: "parabola", opens }, { a: 3, t });
        expect(s.angle1, `${opens} t ${t}`).toBeCloseTo(s.angle2, 8);
      }
    }
  });
});

describe("the ellipse", () => {
  it("x²/25 + y²/9 = 1 has foci (±4, 0), e = 0.8 and latus rectum 18/5", () => {
    const r = derive({ kind: "ellipse" }, { a: 5, b: 3, theta: 60 });
    expect(r).toMatchObject({ c: 4, f1x: 4, f2x: -4, f1y: 0, majorVertical: 0, focusCount: 2 });
    expect(r.ecc).toBeCloseTo(0.8, 12);
    expect(r.latusRectum).toBeCloseTo(3.6, 12);
    expect(r.directrix).toBeCloseTo(6.25, 12);
  });

  it("keeps PF₁ + PF₂ = 2a = 10 all the way round, and PF₁/PM = e", () => {
    for (const theta of [-180, -120, -30, 0, 45, 90, 150]) {
      const r = derive({ kind: "ellipse" }, { a: 5, b: 3, theta });
      expect(r.sumDist, `θ ${theta}`).toBeCloseTo(10, 10);
      expect(r.ratio).toBeCloseTo(0.8, 10);
      // PF₁ = a − ex.
      expect(r.pf1).toBeCloseTo(5 - 0.8 * r.px, 10);
    }
  });

  it("turns its major axis to y when b > a", () => {
    // x²/9 + y²/25 = 1: foci (0, ±4), e = 4/5, PF₁ + PF₂ = 10.
    const r = derive({ kind: "ellipse" }, { a: 3, b: 5, theta: 20 });
    expect(r).toMatchObject({ majorVertical: 1, c: 4, f1x: 0, f1y: 4, f2y: -4, directrixVertical: 0 });
    expect(r.ecc).toBeCloseTo(0.8, 12);
    expect(r.sumDist).toBeCloseTo(10, 10);
    expect(r.ratio).toBeCloseTo(0.8, 10);
    expect(r.latusRectum).toBeCloseTo(3.6, 12);
  });

  it("becomes a circle when a = b: one centre, e = 0, no directrix", () => {
    const r = derive({ kind: "ellipse" }, { a: 3, b: 3, theta: 40 });
    expect(r).toMatchObject({ c: 0, ecc: 0, f1x: 0, f2x: 0, hasDirectrix: 0, pm: 0, ratio: 0 });
    expect(r.sumDist).toBeCloseTo(6, 10);
    expect(r.angle1).toBeCloseTo(90, 8);
  });

  it("has tangent slope −(b cos θ)/(a sin θ), flat at the top and upright at the ends", () => {
    const r = derive({ kind: "ellipse" }, { a: 5, b: 3, theta: 60 });
    expect(r.tangentSlope).toBeCloseTo(-(3 * 0.5) / (5 * Math.sin(Math.PI / 3)), 10);
    expect(r.normalSlope).toBeCloseTo(-1 / r.tangentSlope, 10);
    expect(derive({ kind: "ellipse" }, { a: 5, b: 3, theta: 90 })).toMatchObject({ tangentSlope: 0, normalVertical: 1, tangentVertical: 0 });
    expect(derive({ kind: "ellipse" }, { a: 5, b: 3, theta: 0 })).toMatchObject({ tangentVertical: 1 });
    expect(derive({ kind: "ellipse" }, { a: 5, b: 3, theta: 180 })).toMatchObject({ tangentVertical: 1 });
  });

  it("makes equal angles with the two focal lines (the whispering gallery)", () => {
    for (const theta of [-140, -10, 35, 120]) {
      const r = derive({ kind: "ellipse" }, { a: 5, b: 3, theta });
      expect(r.angle1, `θ ${theta}`).toBeCloseTo(r.angle2, 8);
    }
  });
});

describe("the hyperbola", () => {
  it("x²/9 − y²/16 = 1 has foci (±5, 0), e = 5/3, asymptotes y = ±(4/3)x and latus rectum 32/3", () => {
    const r = derive({ kind: "hyperbola" }, { a: 3, b: 4, theta: 60 });
    expect(r).toMatchObject({ c: 5, f1x: 5, f2x: -5 });
    expect(r.ecc).toBeCloseTo(5 / 3, 12);
    expect(r.asymptoteSlope).toBeCloseTo(4 / 3, 12);
    expect(r.latusRectum).toBeCloseTo(32 / 3, 12);
    expect(r.directrix).toBeCloseTo(9 / 5, 12);
    // P = (a sec 60°, b tan 60°) = (6, 4√3).
    expect(r.px).toBeCloseTo(6, 10);
    expect(r.py).toBeCloseTo(4 * Math.sqrt(3), 10);
  });

  it("keeps |PF₁ − PF₂| = 2a = 6 on both branches, and PF₁/PM = e", () => {
    for (const theta of [-150, -60, 0, 30, 70, 120, 180]) {
      const r = derive({ kind: "hyperbola" }, { a: 3, b: 4, theta });
      expect(r.diffDist, `θ ${theta}`).toBeCloseTo(6, 9);
      expect(r.ratio).toBeCloseTo(5 / 3, 9);
      expect((r.px * r.px) / 9 - (r.py * r.py) / 16).toBeCloseTo(1, 9);
    }
  });

  it("keeps θ away from ±90°, where the point would be at infinity", () => {
    expect(hyperbolaTheta(80)).toBe(72);
    expect(hyperbolaTheta(90)).toBe(72);
    expect(hyperbolaTheta(100)).toBe(108);
    expect(hyperbolaTheta(-85)).toBe(-72);
    expect(hyperbolaTheta(45)).toBe(45);
    const r = derive({ kind: "hyperbola" }, { a: 3, b: 4, theta: 90 });
    expect(r.param).toBe(72);
    expect(Number.isFinite(r.px) && Number.isFinite(r.py)).toBe(true);
  });

  it("has tangent slope b/(a sin θ), upright at the vertex, bisecting the angle F₁PF₂", () => {
    const r = derive({ kind: "hyperbola" }, { a: 3, b: 4, theta: 60 });
    expect(r.tangentSlope).toBeCloseTo(4 / (3 * Math.sin(Math.PI / 3)), 10);
    expect(r.angle1).toBeCloseTo(r.angle2, 8);
    expect(derive({ kind: "hyperbola" }, { a: 3, b: 4, theta: 0 })).toMatchObject({ tangentVertical: 1, px: 3, py: 0 });
    // Tangent xx₁/a² − yy₁/b² = 1 at (6, 4√3): slope = b²x₁/(a²y₁).
    expect(r.tangentSlope).toBeCloseTo((16 * 6) / (9 * 4 * Math.sqrt(3)), 10);
  });
});

describe("the model as a whole", () => {
  const all = (r: ConicResults) => Object.entries(r);

  it("gives finite numbers, never −0, across every kind and extreme", () => {
    for (const kind of CONIC_KIND_ORDER) {
      for (const opens of CONIC_OPENING_ORDER) {
        for (const state of [
          { a: 0.5, b: 5, t: -3, theta: -180, e: 0.2, phi: -180, tilt: 0 },
          { a: 5, b: 0.5, t: 3, theta: 180, e: 2, phi: 0, tilt: 90 },
          { a: 2, b: 2, t: 0, theta: 90, e: 1, phi: 0, tilt: 30 },
          { a: 3, b: 4, t: 0, theta: -90, e: 1.4, phi: -1, tilt: 29.6 },
        ]) {
          for (const [key, value] of all(derive({ kind, opens }, state))) {
            expect(Number.isFinite(value), `${kind} ${opens} ${key}`).toBe(true);
            expect(Object.is(value, -0), `${kind} ${opens} ${key} is −0`).toBe(false);
          }
        }
      }
    }
  });

  it("clamps what it is given", () => {
    const s = model.setVariable(base, "a", 99, model.defaultParams);
    expect(s.a).toBe(5);
    expect(model.setVariable(base, "tilt", -5, model.defaultParams).tilt).toBe(0);
    expect(model.setVariable(base, "e", 0, model.defaultParams).e).toBe(0.2);
    expect(model.setVariable(base, "t", 9, model.defaultParams).t).toBe(3);
    expect(model.setVariable(base, "theta", 400, model.defaultParams).theta).toBe(180);
    expect(model.setVariable(base, "nope", 1, model.defaultParams)).toBe(base);
  });

  it("carries the points round in play, and steps them", () => {
    const later = model.advance({ ...base, t: 2.9, theta: 170, phi: 170 }, 1, model.defaultParams);
    expect(later.t).toBeCloseTo(-2.5, 10);
    expect(later.theta).toBeCloseTo(-154, 10);
    const stepped = model.step({ ...base, t: 1, theta: 60 }, model.defaultParams, 1);
    expect(stepped).toMatchObject({ t: 1.5, theta: 75 });
  });
});
