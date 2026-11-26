import { describe, expect, it } from "vitest";
import {
  circularSpeed,
  ESCAPE_REACH,
  escapeSpeed,
  impactTime,
  launchRadius,
  orbitModel as model,
  orbitOf,
  positionAtTime,
  runLimit,
} from "./orbits";

const P = model.defaultParams;
const derive = (t: number, over: Partial<typeof P> = {}) => model.derive({ t }, { ...P, ...over });

describe("speeds at a given height", () => {
  it("escape speed is always √2 times the circular speed", () => {
    for (const launchHeight of [0, 0.5, 3]) {
      const p = { ...P, launchHeight };
      expect(escapeSpeed(p) / circularSpeed(p)).toBeCloseTo(Math.SQRT2, 12);
    }
  });

  it("both fall off as the satellite starts further out", () => {
    expect(circularSpeed({ ...P, launchHeight: 3 })).toBeLessThan(circularSpeed({ ...P, launchHeight: 0 }));
    expect(circularSpeed({ ...P, launchHeight: 3 })).toBeCloseTo(Math.sqrt(1 / 4), 12); // √(μ/r) with r = 4
  });

  it("a heavier planet demands a faster orbit", () => {
    expect(circularSpeed({ ...P, planetMass: 4 })).toBeCloseTo(2 * circularSpeed({ ...P, planetMass: 1 }), 12);
  });
});

describe("the shape of the orbit", () => {
  it("the circular speed gives a circle", () => {
    const r = derive(0, { speedFactor: 1 });
    expect(r.eccentricity).toBeCloseTo(0, 9);
    expect(r.perigee).toBeCloseTo(r.apogee, 9);
    expect(r.escapes).toBe(0);
  });

  it("a little more speed gives an ellipse, with the launch point closest", () => {
    const r = derive(0, { speedFactor: 1.2 });
    expect(r.eccentricity).toBeGreaterThan(0);
    expect(r.eccentricity).toBeLessThan(1);
    expect(r.perigee).toBeCloseTo(launchRadius({ ...P, launchHeight: 1 }), 6);
    expect(r.apogee).toBeGreaterThan(r.perigee);
  });

  it("too little speed drops it into the planet", () => {
    const r = derive(0, { speedFactor: 0.5 });
    expect(r.perigee).toBeLessThan(1);
    expect(r.crashes).toBe(1);
  });

  it("escape speed unbinds it, and the energy says so", () => {
    expect(derive(0, { speedFactor: 1.415 }).escapes).toBe(1);
    expect(derive(0, { speedFactor: 1.415 }).specificEnergy).toBeGreaterThanOrEqual(0);
    expect(derive(0, { speedFactor: 1.3 }).escapes).toBe(0);
    expect(derive(0, { speedFactor: 1.3 }).specificEnergy).toBeLessThan(0);
  });

  it("the semi-latus rectum matches a(1 - e²), and survives an escape", () => {
    const bound = derive(0, { speedFactor: 1.2 });
    expect(bound.semiLatusRectum).toBeCloseTo(bound.semiMajor * (1 - bound.eccentricity ** 2), 9);
    // a is infinite once it escapes, but the conic still has a finite width.
    expect(Number.isFinite(derive(0, { speedFactor: 1.5 }).semiLatusRectum)).toBe(true);
  });

  it("says which apse the launch point is", () => {
    expect(derive(0, { speedFactor: 1.2 }).launchAtPerigee).toBe(1);
    expect(derive(0, { speedFactor: 0.9 }).launchAtPerigee).toBe(0);
  });

  it("a bound orbit has negative energy and a finite size", () => {
    const r = derive(0, { speedFactor: 1 });
    expect(r.specificEnergy).toBeLessThan(0);
    expect(Number.isFinite(r.semiMajor)).toBe(true);
    expect(r.semiMajor).toBeCloseTo(launchRadius({ ...P, launchHeight: 1 }), 9);
  });
});

describe("Kepler's laws", () => {
  it("the period follows T² ∝ a³", () => {
    const near = orbitOf({ ...P, launchHeight: 0, speedFactor: 1 });
    const far = orbitOf({ ...P, launchHeight: 3, speedFactor: 1 });
    const ratio = (far.period / near.period) ** 2 / (far.semiMajor / near.semiMajor) ** 3;
    expect(ratio).toBeCloseTo(1, 9);
  });

  it("a wider orbit takes longer", () => {
    expect(derive(0, { launchHeight: 3 }).period).toBeGreaterThan(derive(0, { launchHeight: 0 }).period);
  });

  it("the satellite comes back to where it started after one period", () => {
    const params = { ...P, launchHeight: 1, speedFactor: 1.15 };
    const start = positionAtTime(params, 0);
    const later = positionAtTime(params, orbitOf(params).period);
    expect(later.x).toBeCloseTo(start.x, 4);
    expect(later.y).toBeCloseTo(start.y, 4);
  });

  it("it moves fastest at its closest approach", () => {
    // Launched faster than circular speed, so the launch itself is the perigee
    // and half a period later it is at the far end of the ellipse.
    const params = { ...P, speedFactor: 1.3 };
    const orbit = orbitOf(params);
    const atPerigee = positionAtTime(params, 0);
    const atApogee = positionAtTime(params, orbit.period / 2);
    expect(atPerigee.r).toBeLessThan(atApogee.r);
    expect(atPerigee.speed).toBeGreaterThan(atApogee.speed);
  });
});

describe("how long the run lasts", () => {
  it("a bound orbit never stops: it goes round again", () => {
    const params = { ...P, launchHeight: 4, speedFactor: 1 };
    const period = orbitOf(params).period;
    expect(period).toBeGreaterThan(60); // a wide orbit: it used to be cut off at 40 s
    expect(runLimit(params)).toBe(Number.POSITIVE_INFINITY);
    // Advancing past the end of a lap starts the next one.
    const nearly = model.advance({ t: period - 0.5 }, 1, params);
    expect(nearly.t).toBeCloseTo(0.5, 9);
    expect(model.derive(nearly, params).r).toBeCloseTo(model.derive({ t: 0.5 }, params).r, 9);
  });

  it("a slow, wide orbit gets all the way round, not 40 seconds of the way", () => {
    const params = { ...P, launchHeight: 4, planetMass: 0.5, speedFactor: 1 };
    let state = model.initialize(params);
    for (let i = 0; i < 400; i++) state = model.advance(state, 0.5, params);
    expect(orbitOf(params).period).toBeGreaterThan(90);
    // 200 s of running, and it is still going: the clock only wraps.
    expect(model.derive(state, params).r).toBeCloseTo(5, 6);
  });

  it("an escape is followed until there is nothing left to see", () => {
    const params = { ...P, speedFactor: 1.5 };
    const limit = runLimit(params);
    expect(Number.isFinite(limit)).toBe(true);
    expect(positionAtTime(params, limit).r).toBeCloseTo(ESCAPE_REACH, 4);
    expect(model.advance({ t: limit }, 100, params).t).toBeCloseTo(limit, 9);
  });
});

describe("escaping orbits, solved rather than stepped", () => {
  it("keeps its energy and angular momentum on the way out", () => {
    for (const speedFactor of [1.45, 1.8, 2.5]) {
      const params = { ...P, speedFactor };
      const { energy, h } = orbitOf(params);
      for (const t of [0.5, 4, 15]) {
        const at = positionAtTime(params, t);
        expect((at.speed * at.speed) / 2 - params.planetMass / at.r).toBeCloseTo(energy, 6);
      }
      // Angular momentum shows up as the sweep: r²dθ/dt, checked across a step.
      const a = positionAtTime(params, 4);
      const b = positionAtTime(params, 4.001);
      const dTheta = Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x);
      expect((a.r * a.r * dTheta) / 0.001).toBeCloseTo(h, 2);
    }
  });

  it("the knife-edge parabola is handled too", () => {
    const params = { ...P, speedFactor: Math.SQRT2 };
    const orbit = orbitOf(params);
    expect(orbit.eccentricity).toBeCloseTo(1, 9);
    expect(orbit.escapes).toBe(true);
    const at = positionAtTime(params, 6);
    expect(at.r).toBeGreaterThan(2);
    // A parabolic orbit arrives at infinity with nothing to spare: v² = 2μ/r.
    expect(at.speed).toBeCloseTo(Math.sqrt((2 * params.planetMass) / at.r), 9);
  });

  it("starts at the launch point and only ever gets further away", () => {
    const params = { ...P, speedFactor: 1.6 };
    expect(positionAtTime(params, 0).r).toBeCloseTo(2, 9);
    let last = 0;
    for (const t of [0, 1, 2, 5, 10, 20]) {
      const r = positionAtTime(params, t).r;
      expect(r).toBeGreaterThan(last);
      last = r;
    }
  });
});

describe("hitting the ground", () => {
  it("a crashing orbit stops the moment it reaches the surface", () => {
    const params = { ...P, launchHeight: 1, speedFactor: 0.5 };
    const impact = impactTime(params);
    expect(impact).toBeGreaterThan(0);
    expect(impact).toBeLessThan(orbitOf(params).period / 2);
    expect(positionAtTime(params, impact).r).toBeCloseTo(1, 4);
  });

  it("the run cannot be advanced, stepped or scrubbed past the impact", () => {
    const params = { ...P, launchHeight: 1, speedFactor: 0.5 };
    const impact = impactTime(params);
    expect(model.advance({ t: impact - 0.1 }, 5, params).t).toBeCloseTo(impact, 9);
    expect(model.step({ t: impact - 0.1 }, params, 1).t).toBeCloseTo(impact, 9);
    expect(model.setVariable({ t: 0 }, "t", 30, params).t).toBeCloseTo(impact, 9);
    expect(model.derive({ t: 30 }, params).r).toBeCloseTo(1, 4);
    // The clock stops with it: no readout claims the flight went on.
    expect(model.derive({ t: 30 }, params).t).toBeCloseTo(impact, 9);
  });

  it("an orbit that clears the planet runs on, and says it never lands", () => {
    const params = { ...P, speedFactor: 1.2 };
    expect(impactTime(params)).toBe(Number.POSITIVE_INFINITY);
    expect(model.derive({ t: 0 }, params).impactTime).toBe(Number.POSITIVE_INFINITY);
    expect(model.advance({ t: 0 }, 5, params).t).toBe(5);
  });

  it("an escape never lands either", () => {
    expect(impactTime({ ...P, speedFactor: 1.5 })).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("the run", () => {
  it("starts at the launch point, out to the right of the planet", () => {
    for (const speedFactor of [0.8, 1, 1.25]) {
      const r = derive(0, { launchHeight: 1, speedFactor });
      expect(r.x).toBeCloseTo(2, 6);
      expect(r.y).toBeCloseTo(0, 6);
      expect(r.r).toBeCloseTo(2, 6);
    }
  });

  it("a slower launch makes the launch point the furthest point, a faster one the closest", () => {
    const slow = derive(0, { speedFactor: 0.8 });
    expect(slow.apogee).toBeCloseTo(2, 6); // it falls inwards from here
    const fast = derive(0, { speedFactor: 1.25 });
    expect(fast.perigee).toBeCloseTo(2, 6); // it climbs away from here
  });

  it("energy and angular momentum hold all the way round", () => {
    const params = { ...P, speedFactor: 1.25 };
    const at = (t: number) => model.derive({ t }, params);
    for (const t of [0, 1, 3, 6]) {
      expect(at(t).specificEnergy).toBeCloseTo(at(0).specificEnergy, 9);
      expect(at(t).specificAngularMomentum).toBeCloseTo(at(0).specificAngularMomentum, 9);
    }
  });

  it("stepping walks round the orbit a twelfth at a time", () => {
    const params = { ...P, speedFactor: 1 };
    const period = orbitOf(params).period;
    expect(model.step({ t: 0 }, params, 1).t).toBeCloseTo(period / 12, 9);
    // Back from the launch is round the far side, not a dead stop.
    expect(model.step({ t: 0 }, params, -1).t).toBeCloseTo((11 * period) / 12, 9);
  });
});
