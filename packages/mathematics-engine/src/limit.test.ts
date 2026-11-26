import { describe, expect, it } from "vitest";
import {
  CORNER_KINDS,
  DISCONTINUITY_KINDS,
  isTrapped,
  LIMIT_FUNCTION_ORDER,
  LIMIT_FUNCTIONS,
  limitModel as model,
  limitOf,
  widestTrap,
  ZOOM_CURVE_ORDER,
  type LimitParams,
  type LimitState,
} from "./limit";

const base: LimitState = { h: 1, epsilon: 0.5, zoom: 0 };
const derive = (params: Partial<LimitParams> = {}, state: Partial<LimitState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("closing in", () => {
  it("closes on 2 from both sides of the hole, though f(1) does not exist", () => {
    const r = derive({ function: "hole" }, { h: 0.001 });
    expect(r.fLeft).toBeCloseTo(1.999, 9);
    expect(r.fRight).toBeCloseTo(2.001, 9);
    expect(r).toMatchObject({ hasLimit: 1, limit: 2, defined: 0, continuous: 0 });
    expect(Number.isNaN(LIMIT_FUNCTIONS.hole.f(1))).toBe(true);
  });

  it("finds the standard limits numerically: sin x / x → 1, (eˣ − 1)/x → 1, (√(x+1) − 1)/x → ½", () => {
    for (const [id, limit] of [["sinc", 1], ["expm", 1], ["root", 0.5]] as const) {
      const r = derive({ function: id }, { h: 0.001 });
      expect(r.fLeft, id).toBeCloseTo(limit, 2);
      expect(r.fRight, id).toBeCloseTo(limit, 2);
      expect(r.limit, id).toBe(limit);
    }
  });

  it("gets closer the smaller h is, wherever there is a limit", () => {
    for (const id of LIMIT_FUNCTION_ORDER) {
      const limit = limitOf(LIMIT_FUNCTIONS[id]);
      if (limit === null) continue;
      const far = derive({ function: id }, { h: 0.5 });
      const near = derive({ function: id }, { h: 0.01 });
      expect(Math.abs(near.fRight - limit), id).toBeLessThanOrEqual(Math.abs(far.fRight - limit));
      expect(Math.abs(near.fRight - limit), id).toBeLessThan(0.03);
    }
  });

  it("keeps the two sides of a jump 2 apart however close they come", () => {
    for (const h of [1, 0.1, 0.001]) expect(derive({ function: "jump" }, { h })).toMatchObject({ fLeft: -1, fRight: 1, gap: 2, hasLimit: 0 });
    expect(derive({ function: "jump" })).toMatchObject({ leftLimit: -1, rightLimit: 1, hasLeft: 1, hasRight: 1 });
  });

  it("runs off to −∞ and +∞ at a pole", () => {
    expect(derive({ function: "pole" }, { h: 0.001 })).toMatchObject({ fLeft: -1000, fRight: 1000, hasLimit: 0, hasLeft: 0, hasRight: 0 });
  });
});

describe("kinds of point", () => {
  it("names each one", () => {
    const kind = (id: LimitParams["function"]) => DISCONTINUITY_KINDS[derive({ function: id }).kind];
    expect(LIMIT_FUNCTION_ORDER.map(kind)).toEqual(["removable", "removable", "removable", "removable", "removable", "continuous", "jump", "infinite", "oscillating"]);
  });

  it("is continuous only when the limit exists, f(a) exists, and they agree", () => {
    expect(derive({ function: "smooth" })).toMatchObject({ continuous: 1, hasLimit: 1, defined: 1, limit: 1, value: 1 });
    expect(derive({ function: "moved" })).toMatchObject({ continuous: 0, hasLimit: 1, defined: 1, limit: 2, value: 3 });
    for (const id of LIMIT_FUNCTION_ORDER) {
      const fn = LIMIT_FUNCTIONS[id];
      expect(fn.kind === "continuous", id).toBe(limitOf(fn) !== null && fn.value === limitOf(fn));
      // The stored value is what the rule gives at a.
      expect(Number.isNaN(fn.f(fn.a)) ? null : fn.f(fn.a), id).toBe(fn.value);
    }
  });
});

describe("the ε–δ trap", () => {
  it("traps the hole's graph when δ is ε, and not when δ is twice ε", () => {
    expect(isTrapped(LIMIT_FUNCTIONS.hole, 0.2, 0.2)).toBe(true);
    expect(isTrapped(LIMIT_FUNCTIONS.hole, 0.4, 0.2)).toBe(false);
    expect(widestTrap(LIMIT_FUNCTIONS.hole, 0.2)).toBe(0.2);
    expect(derive({ function: "hole" }, { h: 0.2, epsilon: 0.2 })).toMatchObject({ trapped: 1, bestDelta: 0.2 });
  });

  it("can never trap a jump in a band thinner than half the jump", () => {
    expect(widestTrap(LIMIT_FUNCTIONS.jump, 0.5)).toBe(0);
    for (const h of [1, 0.1, 0.001]) expect(derive({ function: "jump" }, { h, epsilon: 0.5 }).trapped).toBe(0);
  });

  it("never traps a pole or an oscillation", () => {
    expect(widestTrap(LIMIT_FUNCTIONS.pole, 1)).toBe(0);
    expect(widestTrap(LIMIT_FUNCTIONS.wiggle, 0.5)).toBe(0);
  });

  it("allows a wider strip for a wider band", () => {
    for (const id of ["hole", "sinc", "expm", "root", "smooth"] as const) {
      expect(widestTrap(LIMIT_FUNCTIONS[id], 0.5), id).toBeGreaterThanOrEqual(widestTrap(LIMIT_FUNCTIONS[id], 0.1));
      expect(widestTrap(LIMIT_FUNCTIONS[id], 0.1), id).toBeGreaterThan(0);
    }
  });
});

describe("zooming in", () => {
  it("straightens a smooth curve: both slopes of x² at 1 come within 0.01 of 2", () => {
    const far = derive({ curve: "parabola" }, { zoom: 0 });
    const near = derive({ curve: "parabola" }, { zoom: 3 });
    expect(far.slopeGap).toBeGreaterThan(1);
    expect(near.slopeLeft).toBeCloseTo(2, 2);
    expect(near.slopeRight).toBeCloseTo(2, 2);
    expect(near).toMatchObject({ differentiable: 1, derivative: 2, zoomFactor: 1000 });
  });

  it("joins two rules smoothly when their slopes agree, and leaves a corner when they do not", () => {
    expect(derive({ curve: "joined" }, { zoom: 3 }).slopeGap).toBeLessThan(0.01);
    const broken = derive({ curve: "broken" }, { zoom: 3 });
    expect(broken.slopeLeft).toBeCloseTo(2, 2);
    expect(broken.slopeRight).toBeCloseTo(1, 10);
    expect(broken.differentiable).toBe(0);
  });

  it("leaves |x| a corner at every zoom", () => {
    for (const zoom of [0, 1.5, 3]) expect(derive({ curve: "abs" }, { zoom })).toMatchObject({ slopeLeft: -1, slopeRight: 1, slopeGap: 2 });
  });

  it("makes ∛x ever steeper, and the cusp ever sharper", () => {
    expect(derive({ curve: "cuberoot" }, { zoom: 3 }).slopeRight).toBeGreaterThan(derive({ curve: "cuberoot" }, { zoom: 1 }).slopeRight * 10);
    const cusp = derive({ curve: "cusp" }, { zoom: 3 });
    expect(cusp.slopeLeft).toBeLessThan(-5);
    expect(cusp.slopeRight).toBeGreaterThan(5);
    expect(ZOOM_CURVE_ORDER.map((curve) => CORNER_KINDS[derive({ curve }).corner])).toEqual(["smooth", "smooth", "corner", "corner", "vertical", "cusp"]);
  });
});

describe("the model", () => {
  it("shrinks h and zooms in on play, and stops at the ends", () => {
    let s = model.initialize(model.defaultParams);
    s = model.advance(s, 1, model.defaultParams);
    expect(s.h).toBeCloseTo(Math.exp(-0.9), 10);
    expect(s.zoom).toBe(0.5);
    for (let i = 0; i < 400; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s).toMatchObject({ h: 0.001, zoom: 3 });
  });

  it("keeps the controls in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["h", 0], ["epsilon", 9], ["zoom", 9]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toEqual({ h: 0.001, epsilon: 1, zoom: 3 });
    for (const fn of LIMIT_FUNCTION_ORDER) {
      for (const curve of ZOOM_CURVE_ORDER) {
        const r = model.derive(s, { function: fn, curve });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${fn} ${curve} ${key}`).toBe(true);
      }
    }
  });
});
