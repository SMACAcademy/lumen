import { describe, expect, it } from "vitest";
import {
  REL_G,
  REL_INITIAL,
  REL_LOOP,
  REL_RANGES,
  REL_RIVER_PLAY,
  relAreaUnderA,
  relInclineRange,
  relmotionModel as model,
  relPushState,
  type RelMotionParams,
  type RelMotionState,
  type RelStateKey,
} from "./relmotion";

const DEG = Math.PI / 180;
const derive = (state: Partial<RelMotionState> = {}, params: Partial<RelMotionParams> = {}) =>
  model.derive({ ...REL_INITIAL, ...state }, { ...model.defaultParams, ...params });

describe("free fall", () => {
  it("has a ball thrown up at 20 m/s stop rising after u/g and climb u²/2g", () => {
    const r = derive({ u: 20, h0: 0 });
    expect(r.tTop).toBeCloseTo(20 / 9.8, 12);
    expect(r.hMax).toBeCloseTo(400 / 19.6, 12);
    expect(r.tBack).toBeCloseTo(40 / 9.8, 12);
    expect(r.tGround).toBeCloseTo(r.tBack, 12);
    const top = derive({ u: 20, h0: 0, t: r.tTop });
    expect(top.fallV).toBeCloseTo(0, 12);
    expect(top.fallY).toBeCloseTo(r.hMax, 10);
  });

  it("keeps a = −9.8 m/s² on the way up, at the top and on the way down", () => {
    for (const t of [0, 0.5, 20 / 9.8, 3, 4]) expect(derive({ u: 20, h0: 0, t }).fallA).toBe(-9.8);
    expect(derive({ u: 20, h0: 0, t: 0.5 }).fallRising).toBe(1);
    expect(derive({ u: 20, h0: 0, t: 3 }).fallRising).toBe(-1);
  });

  it("follows v = u − gt and s = ut − ½gt², and the slope of v–t is −g", () => {
    for (const t of [0.3, 1.1, 2.7]) {
      const r = derive({ u: 25, h0: 10, t });
      expect(r.fallV).toBeCloseTo(25 - 9.8 * t, 12);
      expect(r.fallDisp).toBeCloseTo(25 * t - 4.9 * t * t, 10);
      const later = derive({ u: 25, h0: 10, t: t + 0.01 });
      expect((later.fallV - r.fallV) / 0.01).toBeCloseTo(-9.8, 8);
    }
  });

  it("comes back past the launch point with the speed it was thrown at", () => {
    const r = derive({ u: 15, h0: 30, t: (2 * 15) / 9.8 });
    expect(r.fallV).toBeCloseTo(-15, 10);
    expect(r.fallDisp).toBeCloseTo(0, 10);
  });

  it("drops a ball from 44.1 m to the ground in 3 s, landing at 29.4 m/s", () => {
    const r = derive({ u: 0, h0: 44.1 });
    expect(r.tGround).toBeCloseTo(3, 10);
    expect(r.vGround).toBeCloseTo(29.4, 10);
    expect(derive({ u: 0, h0: 44.1, t: 5 })).toMatchObject({ fallLanded: 1, fallY: 0, fallV: 0, fallA: 0 });
  });

  it("adds up the path: up, then all the way down", () => {
    const r = derive({ u: 20, h0: 10, t: 11 });
    expect(r.fallDistance).toBeCloseTo(2 * (400 / 19.6) + 10, 10);
    const climbing = derive({ u: 20, h0: 10, t: 1 });
    expect(climbing.fallDistance).toBeCloseTo(climbing.fallDisp, 12);
  });
});

describe("two cars", () => {
  it("gives B's velocity relative to A as v_B − v_A, and the gap changes at that rate", () => {
    const r = derive({ vA: 20, vB: 15, gap: 50, t: 2 });
    expect(r).toMatchObject({ vBA: -5, relSpeed: 5, separation: 40, xA: 40, xB: 80, meets: 1, tMeet: 10, carsMet: 0 });
    expect(derive({ vA: 20, vB: 15, gap: 50, t: 10 })).toMatchObject({ separation: 0, carsMet: 1 });
  });

  it("closes fast on an oncoming car and never on one pulling away", () => {
    expect(derive({ vA: 20, vB: -15 }).relSpeed).toBe(35);
    expect(derive({ vA: 10, vB: 15, gap: 50 })).toMatchObject({ meets: 0, tMeet: 0 });
    expect(derive({ vA: 20, vB: 10, gap: 50 }).tMeet).toBeCloseTo(5, 12);
  });
});

describe("changing acceleration", () => {
  it("integrates a = kt into v = v₀ + ½kt² and x = v₀t + kt³/6", () => {
    const r = derive({ k: 2, v0: 0, t: 3 }, { push: "ramp" });
    expect(r.pushA).toBe(6);
    expect(r.pushV).toBeCloseTo(9, 12);
    expect(r.pushX).toBeCloseTo(9, 12);
  });

  it("makes the area under a–t equal to the change in velocity, for both pushes", () => {
    for (const push of ["ramp", "drag"] as const) {
      for (const t of [0.5, 2, 5]) {
        const r = derive({ k: 0.8, v0: 12, t }, { push });
        expect(r.pushArea, `${push} ${t}`).toBeCloseTo(r.pushDv, 5);
      }
    }
  });

  it("agrees with a step-by-step integration of dv/dt = a and dx/dt = v", () => {
    for (const push of ["ramp", "drag"] as const) {
      const k = 0.7;
      let v = 8;
      let x = 0;
      const dt = 1e-4;
      for (let t = 0; t < 4 - 1e-9; t += dt) {
        const a = push === "ramp" ? k * (t + dt / 2) : -k * v;
        const vNext = push === "ramp" ? v + a * dt : v * Math.exp(-k * dt);
        x += ((v + vNext) / 2) * dt;
        v = vNext;
      }
      const exact = relPushState(push, k, 8, 4);
      expect(exact.v, push).toBeCloseTo(v, 6);
      expect(exact.x, push).toBeCloseTo(x, 4);
    }
  });

  it("brings a drag of a = −kv to rest within v₀/k, its acceleration fading as it slows", () => {
    const early = derive({ k: 0.5, v0: 10, t: 1 }, { push: "drag" });
    const late = derive({ k: 0.5, v0: 10, t: 3 }, { push: "drag" });
    expect(early.stopDistance).toBe(20);
    expect(late.pushAbsA).toBeLessThan(early.pushAbsA);
    expect(early.pushA).toBeCloseTo(-0.5 * early.pushV, 12);
    expect(derive({ k: 3, v0: 10, t: 12 }, { push: "drag" }).pushX).toBeLessThan(20);
  });

  it("finds no area before the clock starts", () => {
    expect(relAreaUnderA("ramp", 1, 1, 0)).toBe(0);
  });
});

describe("the river", () => {
  it("crosses fastest heading straight across, drifting d·v_r/v_b", () => {
    const r = derive({ width: 100, vRiver: 2, vBoat: 4, heading: 0 });
    expect(r.crossTime).toBe(25);
    expect(r.drift).toBe(50);
    expect(r.driftShortest).toBe(50);
    expect(r.shortestTime).toBe(25);
    for (const h of [-40, -10, 10, 40]) expect(derive({ width: 100, vRiver: 2, vBoat: 4, heading: h * DEG }).crossTime).toBeGreaterThan(25);
  });

  it("lands straight opposite heading upstream at sin θ = v_r/v_b", () => {
    const r = derive({ width: 100, vRiver: 2, vBoat: 4, heading: 30 * DEG });
    expect(r.straightHeading).toBeCloseTo(30, 10);
    expect(r.drift).toBeCloseTo(0, 10);
    expect(r.straight).toBe(1);
    expect(r.crossTime).toBeCloseTo(100 / (4 * Math.cos(30 * DEG)), 10);
    expect(r.groundSpeed).toBeCloseTo(Math.sqrt(12), 10);
    expect(derive({ width: 100, vRiver: 2, vBoat: 4, heading: 25 * DEG }).straight).toBe(0);
  });

  it("cannot cross straight when the river is faster than the boat", () => {
    expect(derive({ vRiver: 5, vBoat: 3 })).toMatchObject({ canStraight: 0, straightHeading: 0 });
  });

  it("plays the crossing as a time-lapse that lands at the far bank", () => {
    const half = derive({ width: 100, vRiver: 2, vBoat: 4, heading: 0, t: REL_RIVER_PLAY / 2 });
    expect(half.boatAcross).toBeCloseTo(50, 10);
    expect(half.boatAlong).toBeCloseTo(25, 10);
    expect(derive({ t: REL_RIVER_PLAY }).boatLanded).toBe(1);
  });
});

describe("rain", () => {
  it("tilts the umbrella forward by tan θ = v_person / v_rain", () => {
    const r = derive({ vRain: 30, vWalk: 10, vWind: 0 });
    expect(r.umbrellaAngle).toBeCloseTo(Math.atan(1 / 3) / DEG, 10);
    expect(r.rainRelSpeed).toBeCloseTo(Math.sqrt(1000), 10);
    expect(derive({ vRain: 5, vWalk: 5, vWind: 0 }).umbrellaAngle).toBeCloseTo(45, 10);
  });

  it("points the umbrella into a wind for someone standing still (NCERT: 35 m/s rain, 12 m/s wind)", () => {
    const r = derive({ vRain: 35, vWalk: 0, vWind: -12 });
    expect(r.umbrellaAngle).toBeCloseTo(Math.atan(12 / 35) / DEG, 10);
    expect(r.umbrellaAngle).toBeCloseTo(18.9, 1);
  });
});

describe("circular motion", () => {
  it("has v = ωr, a = v²/r = ω²r and T = 2πr/v when the speed is steady", () => {
    const r = derive({ radius: 2, omega: 3, aT: 0, t: 1 });
    expect(r.circSpeed).toBe(6);
    expect(r.ac).toBeCloseTo(18, 12);
    expect(r.ac).toBeCloseTo(3 * 3 * 2, 12);
    expect(r.period).toBeCloseTo((2 * Math.PI) / 3, 12);
    expect(r).toMatchObject({ aTan: 0, aAngle: 0 });
    expect(r.aNet).toBeCloseTo(18, 12);
  });

  it("goes once round in one period", () => {
    const r = derive({ radius: 2, omega: 3, aT: 0, t: (2 * Math.PI) / 3 });
    expect(r.revs).toBeCloseTo(1, 12);
  });

  it("adds a tangential part at right angles when the speed changes", () => {
    const r = derive({ radius: 2, omega: 1, aT: 1.5, t: 0 });
    expect(r.ac).toBe(2);
    expect(r.aNet).toBeCloseTo(2.5, 12);
    expect(r.aAngle).toBeCloseTo(Math.atan(0.75) / DEG, 10);
    expect(derive({ radius: 2, omega: 1, aT: 1.5, t: 2 }).circSpeed).toBe(5);
  });

  it("brakes to rest and stays there", () => {
    const r = derive({ radius: 2, omega: 1, aT: -1, t: 5 });
    expect(r).toMatchObject({ circSpeed: 0, ac: 0, aTan: 0, period: 0, circStopped: 1 });
    expect(r.phi).toBeCloseTo(1, 12); // 2 m of arc on a 2 m radius
  });
});

describe("a projectile on an incline", () => {
  it("lands where the formula says, checked against a step-by-step flight", () => {
    const cases: [number, number, number][] = [[20, 60, 30], [15, 40, 10], [25, 70, 35], [12, 45, 0]];
    for (const [u, thetaDeg, alphaDeg] of cases) {
      const theta = thetaDeg * DEG;
      const alpha = alphaDeg * DEG;
      let x = 0;
      let y = 0;
      let vx = u * Math.cos(theta);
      let vy = u * Math.sin(theta);
      const dt = 1e-5;
      let t = 0;
      do {
        x += vx * dt;
        vy -= REL_G * dt;
        y += vy * dt + 0.5 * REL_G * dt * dt;
        t += dt;
      } while (y > x * Math.tan(alpha));
      const r = derive({ speed: u, launch: theta, slope: alpha });
      expect(r.incR, `${u} ${thetaDeg} ${alphaDeg}`).toBeCloseTo(x / Math.cos(alpha), 2);
      expect(r.incT).toBeCloseTo(t, 3);
    }
  });

  it("gives 27.2 m for 20 m/s at 60° up a 30° slope", () => {
    expect(derive({ speed: 20, launch: 60 * DEG, slope: 30 * DEG }).incR).toBeCloseTo(200 / (9.8 * 0.75), 10);
  });

  it("goes furthest at 45° + α/2, where R = u²/(g(1 + sin α))", () => {
    for (const alphaDeg of [0, 20, 30]) {
      const alpha = alphaDeg * DEG;
      const best = derive({ speed: 20, launch: (45 + alphaDeg / 2) * DEG, slope: alpha });
      expect(best.incBest).toBe(45 + alphaDeg / 2);
      expect(best.incAtBest).toBe(1);
      expect(best.incR).toBeCloseTo(best.incRmax, 10);
      for (let d = 5; d <= 85; d++) expect(relInclineRange(20, d * DEG, alpha)).toBeLessThanOrEqual(best.incRmax + 1e-9);
    }
  });

  it("matches the level ground range u² sin 2θ / g when the slope is flat", () => {
    expect(derive({ speed: 20, launch: 30 * DEG, slope: 0 }).incR).toBeCloseTo((400 * Math.sin(60 * DEG)) / 9.8, 10);
  });

  it("does not fly when thrown into the slope", () => {
    expect(derive({ launch: 20 * DEG, slope: 30 * DEG })).toMatchObject({ incValid: 0, incR: 0, incT: 0, incAtBest: 0 });
  });
});

describe("the model", () => {
  it("loops the clock and steps it by half seconds", () => {
    expect(model.advance({ ...REL_INITIAL, t: REL_LOOP - 0.01 }, 0.02, model.defaultParams).t).toBe(0);
    expect(model.step({ ...REL_INITIAL, t: 1.2 }, model.defaultParams, 1).t).toBe(1.5);
  });

  it("holds every variable to its range", () => {
    for (const key of Object.keys(REL_RANGES) as RelStateKey[]) {
      const [lo, hi] = REL_RANGES[key];
      expect(model.setVariable(REL_INITIAL, key, 1e6, model.defaultParams)[key], key).toBe(hi);
      expect(model.setVariable(REL_INITIAL, key, -1e6, model.defaultParams)[key], key).toBe(lo);
      expect(model.getVariable(REL_INITIAL, key)).toBe(REL_INITIAL[key]);
    }
  });

  it("numbers every output at the corners of every range", () => {
    const keys = Object.keys(REL_RANGES) as RelStateKey[];
    for (const push of ["ramp", "drag"] as const) {
      for (const corner of [0, 1]) {
        for (const t of [0, 3, REL_LOOP]) {
          const state = Object.fromEntries(keys.map((k) => [k, REL_RANGES[k][corner]])) as RelMotionState;
          const r = model.derive({ ...state, t }, { push });
          for (const key of model.outputs) {
            expect(Number.isFinite(r[key]), `${push} ${corner} ${t} ${key}`).toBe(true);
            expect(Object.is(r[key], -0), key).toBe(false);
          }
        }
      }
    }
  });
});
