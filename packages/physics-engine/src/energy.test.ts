import { describe, expect, it } from "vitest";
import { ENERGY_TRACK_LIMIT, accelerationAt, energyModel as model } from "./energy";

const P = model.defaultParams;
const deg = (d: number) => (d * Math.PI) / 180;
const run = (over: Partial<typeof P>, seconds: number, dt = 0.001) => {
  const params = { ...P, ...over };
  let s = model.initialize(params);
  for (let i = 0; i < seconds / dt; i++) s = model.advance(s, dt, params);
  return { state: s, results: model.derive(s, params), params };
};

describe("the energy ledger", () => {
  it("starts with kinetic energy only", () => {
    const params = { ...P, mass: 2, v0: 6, incline: deg(20) };
    const r = model.derive(model.initialize(params), params);
    expect(r.kinetic).toBeCloseTo(36, 9); // ½ × 2 × 36
    expect(r.potential).toBe(0);
    expect(r.mechanical).toBeCloseTo(r.mechanicalStart, 9);
  });

  it("trades kinetic for potential, keeping the total, when nothing rubs", () => {
    const { results } = run({ mass: 2, v0: 6, incline: deg(20), muKinetic: 0, applied: 0 }, 0.4);
    expect(results.kinetic).toBeLessThan(36);
    expect(results.potential).toBeGreaterThan(0);
    expect(results.mechanical).toBeCloseTo(36, 6);
    expect(results.heat).toBe(0);
  });

  it("the work–energy theorem holds at every moment", () => {
    for (const over of [
      { muKinetic: 0, applied: 0 },
      { muKinetic: 0.3, applied: 0 },
      { muKinetic: 0.2, applied: 8 },
      { incline: 0, muKinetic: 0.25, applied: 10 },
    ]) {
      for (const seconds of [0.2, 0.5, 1]) {
        const { results } = run(over, seconds);
        expect(Math.abs(results.balance)).toBeLessThan(0.05);
      }
    }
  });

  it("friction only ever takes energy away, and charges for the path travelled", () => {
    // While it is still climbing the ledger closes exactly.
    const climbing = run({ muKinetic: 0.3, v0: 5, incline: deg(15) }, 0.8).results;
    expect(climbing.heat).toBeGreaterThan(0);
    expect(climbing.workFriction).toBeCloseTo(-climbing.heat, 12);
    expect(climbing.mechanical).toBeLessThan(climbing.mechanicalStart);
    expect(climbing.heat).toBeCloseTo(climbing.mechanicalStart - climbing.mechanical, 6);

    // Across the turning point a step charges friction one way for the whole
    // step, so the books close to within a step rather than exactly.
    const returned = run({ muKinetic: 0.3, v0: 5, incline: deg(15) }, 1.6).results;
    expect(returned.heat).toBeCloseTo(returned.mechanicalStart - returned.mechanical, 2);
  });

  it("a push adds energy, at a rate equal to force times velocity", () => {
    const params = { ...P, applied: 10, incline: 0, muKinetic: 0, v0: 3 };
    const r = model.derive({ s: 2, v: 4, path: 2, startEnergy: 9, time: 1 }, params);
    expect(r.workApplied).toBeCloseTo(20, 12);
    expect(r.power).toBeCloseTo(40, 12);
  });
});

describe("how high it gets", () => {
  it("four times the speed of launch reaches four times the height", () => {
    // ½mv² = mgh, so h ∝ v².
    const heightFrom = (v0: number) => {
      const params = { ...P, v0, incline: deg(30), muKinetic: 0, applied: 0, g: 10, mass: 2 };
      let s = model.initialize(params);
      // Climb until it stops going up.
      for (let i = 0; i < 4000 && s.v > 0; i++) s = model.advance(s, 0.001, params);
      return model.derive(s, params).height;
    };
    expect(heightFrom(6)).toBeCloseTo(36 / 20, 2); // v²/2g
    expect(heightFrom(3) * 4).toBeCloseTo(heightFrom(6), 2);
  });

  /** Runs until the block comes back down past its starting point. */
  const speedOnReturn = (over: Partial<typeof P>) => {
    const params = { ...P, v0: 5, incline: deg(25), applied: 0, ...over };
    let s = model.initialize(params);
    for (let i = 0; i < 20000; i++) {
      const next = model.advance(s, 0.001, params);
      if (next.s <= 0 && next.v < 0) return model.derive(next, params);
      s = next;
    }
    throw new Error("it never came back");
  };

  it("arrives back with the speed it left, when nothing rubs", () => {
    expect(speedOnReturn({ muKinetic: 0 }).speed).toBeCloseTo(5, 2);
  });

  it("with friction it comes back slower, and the loss is exactly the heat", () => {
    const r = speedOnReturn({ muKinetic: 0.2 });
    expect(r.speed).toBeLessThan(5);
    expect(r.heat).toBeGreaterThan(0);
    expect(r.mechanicalStart - r.mechanical).toBeCloseTo(r.heat, 2);
  });
});

describe("the block on its track", () => {
  it("is stopped at the end of the track", () => {
    const { state } = run({ v0: 12, incline: 0, muKinetic: 0, applied: 0 }, 3);
    expect(state.s).toBe(ENERGY_TRACK_LIMIT);
    expect(state.v).toBe(0);
  });

  it("holds still when friction is enough to resist the slope", () => {
    expect(accelerationAt({ ...P, incline: deg(10), muKinetic: 0.5, applied: 0, v0: 0 }, 0)).toBe(0);
    expect(accelerationAt({ ...P, incline: deg(40), muKinetic: 0.2, applied: 0, v0: 0 }, 0)).toBeLessThan(0);
  });

  it("placing it by hand sets it down at rest, and restarts the ledger from its height", () => {
    const params = { ...P, v0: 6, mass: 2, g: 10, incline: deg(30) };
    const moved = model.setVariable({ s: 3, v: 1, path: 9, startEnergy: 36, time: 4 }, "s", 1, params);
    expect(moved).toMatchObject({ s: 1, v: 0, path: 0, time: 0 });
    expect(moved.startEnergy).toBeCloseTo(10, 9); // mgh = 2 × 10 × 0.5
    const r = model.derive(moved, params);
    expect(r.kinetic).toBe(0);
    expect(r.potential).toBeCloseTo(10, 9);
    expect(r.balance).toBeCloseTo(0, 9);
  });

  it("the books balance for a block placed part-way up and let go", () => {
    const params = { ...P, v0: 6, mass: 2, g: 10, incline: deg(30), muKinetic: 0.1 };
    let s = model.setVariable(model.initialize(params), "s", 4, params);
    for (let i = 0; i < 600; i++) s = model.advance(s, 0.001, params);
    expect(Math.abs(model.derive(s, params).balance)).toBeLessThan(0.02);
  });
});
