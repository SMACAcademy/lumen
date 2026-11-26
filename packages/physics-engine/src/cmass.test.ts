import { describe, expect, it } from "vitest";
import {
  CMASS_INITIAL,
  CMASS_RANGES,
  cmassLoop,
  cmassModel as model,
  cmassTurningPoints,
  cmassWellForce,
  cmassWellU,
  type CmassParams,
  type CmassState,
} from "./cmass";

const deg = (d: number) => (d * Math.PI) / 180;
const derive = (state: Partial<CmassState> = {}, params: Partial<CmassParams> = {}) =>
  model.derive({ ...CMASS_INITIAL, ...state }, { ...model.defaultParams, ...params });

describe("the centre of mass of a rod", () => {
  it("is the mass-weighted average position, Σmx / Σm", () => {
    // 2 kg at 0 and 3 kg at 1 m: (0 + 3) / 5 = 0.6 m.
    expect(derive({ mA: 2, mB: 0, mC: 3 }).xcm).toBeCloseTo(0.6, 12);
    // 1 kg at each end and 2 kg at 0.3 m: (0.6 + 1) / 4 = 0.4 m.
    expect(derive({ mA: 1, mB: 2, mC: 1, xB: 0.3 })).toMatchObject({ rodMass: 4 });
    expect(derive({ mA: 1, mB: 2, mC: 1, xB: 0.3 }).xcm).toBeCloseTo(0.4, 12);
    expect(derive({ mA: 1, mB: 2, mC: 1, xB: 0.2 }).xcm).toBeCloseTo(0.35, 12);
    expect(derive({ mA: 1, mB: 2, mC: 1, xB: 0.8 }).xcm).toBeCloseTo(0.65, 12);
  });
});

describe("the exploding shell", () => {
  it("would land R = u² sin 2θ / g away: 40.8 m at 20 m/s and 45°", () => {
    const r = derive({ shellSpeed: 20, shellAngle: deg(45) });
    expect(r.shellRange).toBeCloseTo(400 / 9.8, 9);
    expect(r.shellHeight).toBeCloseTo(200 / 19.6, 9);
    expect(r.shellFlight).toBeCloseTo((40 * Math.SQRT1_2) / 9.8, 9);
  });

  it("sends one half 3R/2 when the other is stopped dead at the top", () => {
    const r = derive({ shellSpeed: 20, shellAngle: deg(45), fragShare: 0.5, fragVelocity: 0 });
    expect(r.land1).toBeCloseTo(r.shellRange / 2, 9);
    expect(r.land2).toBeCloseTo((3 * r.shellRange) / 2, 9);
    expect(r.land2).toBeCloseTo(61.22, 2);
    expect(r.frag2Velocity).toBeCloseTo(2 * 20 * Math.SQRT1_2, 9);
  });

  it("keeps the centre of mass on the old parabola however it bursts", () => {
    for (const [share, v1] of [[0.5, 0], [0.25, -10], [0.8, 30]] as const) {
      const flight = derive({ fragShare: share, fragVelocity: v1 }).shellFlight;
      expect(derive({ fragShare: share, fragVelocity: v1 }).cmLand).toBeCloseTo(derive().shellRange, 9);
      for (const t of [0.3, flight / 2 + 0.1, flight - 0.05]) {
        const r = derive({ fragShare: share, fragVelocity: v1, t });
        expect(share * r.frag1X + (1 - share) * r.frag2X, `${share} at ${t}`).toBeCloseTo(r.cmX, 9);
      }
    }
  });

  it("bursts at the top and lands both pieces together", () => {
    const flight = derive().shellFlight;
    expect(derive({ t: flight / 2 - 0.01 }).shellExploded).toBe(0);
    expect(derive({ t: flight / 2 + 0.01 }).shellExploded).toBe(1);
    expect(derive({ t: flight + 0.01 })).toMatchObject({ shellLanded: 1, cmY: 0, fragY: 0 });
  });
});

describe("a glancing collision of two pucks", () => {
  it("sends equal masses off at right angles when it is elastic", () => {
    for (const offset of [0.2, 0.5, 0.8]) {
      const r = derive({ puckM1: 1, puckM2: 1, puckE: 1, puckOffset: offset });
      expect(r.puckSeparation, `${offset}`).toBeCloseTo(Math.PI / 2, 12);
      expect(r.keLost).toBeCloseTo(0, 12);
    }
  });

  it("sends the struck puck along the line of centres: 30° below for an offset of 0.5", () => {
    const r = derive({ puckM1: 1, puckM2: 1, puckU: 2, puckE: 1, puckOffset: 0.5 });
    expect(r.puckDeflect2).toBeCloseTo(deg(30), 12);
    expect(r.puckDir1).toBeCloseTo(deg(60), 12);
    expect(r.puckV2).toBeCloseTo(Math.sqrt(3), 12);
    expect(r.puckV1).toBeCloseTo(1, 12);
  });

  it("conserves momentum in both directions, elastic or not", () => {
    for (const [m1, m2, e, offset] of [[1, 1, 0.5, 0.6], [2, 0.5, 0.2, 0.3], [0.5, 3, 1, 0.7]] as const) {
      const r = derive({ puckM1: m1, puckM2: m2, puckE: e, puckOffset: offset, puckU: 3 });
      expect(r.pxAfter).toBeCloseTo(r.pxBefore, 12);
      expect(r.pyAfter).toBeCloseTo(0, 12);
    }
  });

  it("loses ½·(m₁m₂/(m₁+m₂))(1 − e²)uₙ²: 0.48 J for 1 kg on 1 kg at 2 m/s, offset 0.6, e = 0.5", () => {
    const r = derive({ puckM1: 1, puckM2: 1, puckU: 2, puckE: 0.5, puckOffset: 0.6 });
    expect(r.keBefore).toBe(2);
    expect(r.keLost).toBeCloseTo(0.48, 12);
    expect(r.keLostPercent).toBeCloseTo(24, 10);
    // Head on: 0.5 and 1.5 m/s afterwards.
    const head = derive({ puckM1: 1, puckM2: 1, puckU: 2, puckE: 0.5, puckOffset: 0 });
    expect(head.puckV1x).toBeCloseTo(0.5, 12);
    expect(head.puckV2x).toBeCloseTo(1.5, 12);
    expect(head.keLost).toBeCloseTo(0.75, 12);
    expect(head.puckSeparation).toBe(0);
  });

  it("brings the pucks into contact at the meeting time", () => {
    const r = derive({ puckOffset: 0.5, puckU: 2 });
    const at = derive({ puckOffset: 0.5, puckU: 2, t: r.puckMeet });
    expect(Math.hypot(at.puck1X - at.puck2X, at.puck1Y - at.puck2Y)).toBeCloseTo(0.2, 9);
    expect(derive({ t: r.puckMeet - 0.01 }).puckCollided).toBe(0);
  });
});

describe("the rocket", () => {
  it("pushes with u·dm/dt: 2000 m/s × 50 kg/s = 100 kN", () => {
    expect(derive({ exhaust: 2000, burnRate: 50 }).thrust).toBeCloseTo(100, 12);
  });

  it("reaches u ln(m₀/m) in empty space", () => {
    const half = derive({ exhaust: 2000, burnRate: 50, fuel: 500 });
    expect(half.burnTime).toBe(10);
    expect(half.massRatio).toBe(2);
    expect(half.burnoutSpeed).toBeCloseTo(2000 * Math.LN2, 9);
    expect(derive({ exhaust: 2000, fuel: 750 }).burnoutSpeed).toBeCloseTo(2000 * Math.log(4), 9);
    const mid = derive({ exhaust: 2000, burnRate: 50, fuel: 500, t: 4 });
    expect(mid.rocketMass).toBe(800);
    expect(mid.rocketSpeed).toBeCloseTo(2000 * Math.log(1000 / 800), 9);
    expect(mid.rocketAccel).toBeCloseTo(100000 / 800, 9);
    expect(derive({ t: 15 })).toMatchObject({ rocketBurnt: 1, rocketMass: 500 });
    expect(derive({ t: 15 }).rocketSpeed).toBeCloseTo(2000 * Math.LN2, 9);
  });

  it("loses g·t to gravity on a vertical launch", () => {
    const r = derive({ exhaust: 2000, burnRate: 50, fuel: 500 }, { gravity: "on" });
    expect(r.burnoutSpeed).toBeCloseTo(2000 * Math.LN2 - 98, 9);
    expect(derive({ t: 0 }, { gravity: "on" }).rocketAccel).toBeCloseTo(100 - 9.8, 9);
  });

  it("climbs a height whose rate of change is its speed", () => {
    const h = 1e-4;
    for (const t of [3, 12]) {
      const a = derive({ t: t - h }, { gravity: "on" });
      const b = derive({ t: t + h }, { gravity: "on" });
      expect((b.rocketHeight - a.rocketHeight) / (2 * h)).toBeCloseTo(derive({ t }, { gravity: "on" }).rocketSpeed, 3);
    }
  });

  it("comes down and stops on the ground when it runs out of fuel early", () => {
    const r = derive({ exhaust: 500, burnRate: 200, fuel: 100, t: 20 }, { gravity: "on" });
    expect(r).toMatchObject({ rocketLanded: 1, rocketHeight: 0, rocketSpeed: 0 });
  });
});

describe("work by a spring", () => {
  it("is the area under F = −kx: ½kx²", () => {
    expect(derive({ springK: 200, springX1: 0, springX2: 0.2 })).toMatchObject({ springForce: -40 });
    expect(derive({ springK: 200, springX1: 0, springX2: 0.2 }).workHand).toBeCloseTo(4, 12);
    expect(derive({ springK: 200, springX1: 0, springX2: 0.2 }).workSpring).toBeCloseTo(-4, 12);
    expect(derive({ springK: 200, springX1: 0.1, springX2: 0.3 }).workHand).toBeCloseTo(8, 12);
  });

  it("is positive for the spring as it relaxes, and nothing from −x to +x", () => {
    expect(derive({ springX1: 0.2, springX2: 0 }).workSpring).toBeCloseTo(4, 12);
    expect(derive({ springX1: -0.2, springX2: 0.2 }).workSpring).toBe(0);
    expect(derive({ springX1: 0, springX2: -0.2 }).workSpring).toBeCloseTo(-4, 12);
  });
});

describe("power", () => {
  it("is F·v for a car climbing steadily: 29.6 kW for 1000 kg up sin θ = 0.1 at 20 m/s against 500 N", () => {
    const r = derive({ carMass: 1000, slope: Math.asin(0.1), carSpeed: 20, resistance: 500 });
    expect(r.carForce).toBeCloseTo(1480, 9);
    expect(r.carPower).toBeCloseTo(29.6, 9);
    expect(r.carAvgPower).toBeCloseTo(29.6, 9);
    expect(r.carClimb).toBeCloseTo(2, 12);
  });

  it("grows with speed when speeding up, and the average is half the final", () => {
    const r = derive({ carMass: 1000, driveForce: 2000, t: 10 }, { drive: "speeding" });
    expect(r.carV).toBeCloseTo(20, 12);
    expect(r.carPower).toBeCloseTo(40, 12);
    expect(r.carAvgPower).toBeCloseTo(20, 12);
    expect(r.carWork).toBeCloseTo(200, 12);
    // Average power is work ÷ time.
    expect(r.carWork / 10).toBeCloseTo(r.carAvgPower, 12);
    expect(derive({ t: 0 }, { drive: "speeding" })).toMatchObject({ carPower: 0, carAvgPower: 0 });
  });
});

describe("the vertical circle", () => {
  it("needs √(5gr) at the bottom and √(gr) at the top: 7 m/s and 3.13 m/s for r = 1 m", () => {
    const r = derive({ loopR: 1, loopV0: 7 });
    expect(r.loopMinBottom).toBeCloseTo(7, 9);
    expect(r.loopMinTop).toBeCloseTo(Math.sqrt(9.8), 12);
    expect(r.loopFate).toBe(2);
    expect(r.loopTop).toBeCloseTo(Math.sqrt(9.8), 6);
    expect(r.tensionTop).toBeCloseTo(0, 9);
    expect(derive({ loopR: 1, loopV0: 6.9 }).loopFate).toBe(1);
  });

  it("pulls 6mg harder at the bottom than at the top", () => {
    const r = derive({ loopR: 1, loopV0: 8, loopMass: 0.5 });
    expect(r.tensionBottom).toBeCloseTo(36.9, 9);
    expect(r.tensionTop).toBeCloseTo(7.5, 9);
    expect(r.tensionDiff).toBeCloseTo(29.4, 9);
    expect(derive({ loopR: 1.5, loopV0: 9.5, loopMass: 1.2 }).tensionDiff).toBeCloseTo(6 * 1.2 * 9.8, 9);
  });

  it("goes slack where cos φ = (2gr − v₀²)/(3gr): 1.56 m up at 6 m/s", () => {
    const r = derive({ loopR: 1, loopV0: 6 });
    expect(r.loopFate).toBe(1);
    expect(Math.cos(r.leaveAngle)).toBeCloseTo((19.6 - 36) / 29.4, 12);
    expect(r.leaveHeight).toBeCloseTo(45.8 / 29.4, 12);
    expect(derive({ loopR: 1, loopV0: 4 })).toMatchObject({ loopFate: 0, leaveHeight: 0 });
  });

  it("follows the circle until then, and falls inside it afterwards", () => {
    const early = cmassLoop(6, 1, 0.5, 0.1);
    expect(Math.hypot(early.x, early.y)).toBeCloseTo(1, 9);
    expect(early.slack).toBe(0);
    // Energy holds on the string: v² = v₀² − 2g·(height above the bottom).
    expect(early.speed ** 2).toBeCloseTo(36 - 2 * 9.8 * (early.y + 1), 4);
    const late = cmassLoop(6, 1, 0.5, 1.2);
    expect(late.slack).toBe(1);
    expect(late.tension).toBe(0);
    expect(Math.hypot(late.x, late.y)).toBeLessThanOrEqual(1 + 1e-3);
  });

  it("swings like a pendulum below the centre when too slow", () => {
    const r = derive({ loopR: 1, loopV0: 3 });
    expect(r.swingAngle).toBeCloseTo(Math.acos(1 - 9 / 19.6), 12);
    for (const t of [0.4, 1.3, 3]) {
      const s = derive({ loopR: 1, loopV0: 3, t });
      expect(Math.abs(s.loopPhi), `${t}`).toBeLessThanOrEqual(r.swingAngle + 1e-3);
      expect(s.loopTension).toBeGreaterThan(0);
    }
  });
});

describe("the potential-energy well", () => {
  it("has F = −dU/dx: 3 N at x = 0.5", () => {
    expect(cmassWellU(0)).toBe(2);
    expect(cmassWellForce(0.5)).toBeCloseTo(3, 12);
    for (const x of [-1.6, -0.3, 0.7, 1.4]) expect(cmassWellForce(x)).toBeCloseTo(-(cmassWellU(x + 1e-6) - cmassWellU(x - 1e-6)) / 2e-6, 4);
    expect(derive({ ballX0: 0.5 }).ballForce).toBeCloseTo(3, 12);
  });

  it("names the minima stable and the hump unstable", () => {
    expect([-1, -0.5, 0, 0.5, 1, 1.5].map((ballX0) => derive({ ballX0 }).ballEquilibrium)).toEqual([1, 0, 2, 0, 1, 0]);
  });

  it("turns back where U = E", () => {
    // From −0.5: E = 1.125 J, so (x² − 1)² = 0.5625 and the far turning point is −√1.75.
    expect(cmassTurningPoints(-0.5).left).toBeCloseTo(-Math.sqrt(1.75), 12);
    expect(cmassTurningPoints(-0.5).right).toBeCloseTo(-0.5, 12);
    expect(cmassTurningPoints(-0.5).crosses).toBe(0);
    // From −1.5: E = 3.125 J is over the 2 J hump, so it runs right across to +1.5.
    expect(cmassTurningPoints(-1.5)).toMatchObject({ crosses: 1 });
    expect(cmassTurningPoints(-1.5).right).toBeCloseTo(1.5, 12);
  });

  it("keeps its energy and stays between the turning points as it runs", () => {
    for (const t of [0.5, 2, 7]) {
      const r = derive({ ballX0: -0.5, t });
      expect(r.ballU + 0.5 * r.ballV ** 2, `${t}`).toBeCloseTo(1.125, 5);
      expect(r.ballX).toBeGreaterThanOrEqual(-Math.sqrt(1.75) - 1e-4);
      expect(r.ballX).toBeLessThanOrEqual(-0.5 + 1e-4);
    }
    expect(derive({ ballX0: 1, t: 5 }).ballX).toBeCloseTo(1, 9);
  });
});

describe("the model", () => {
  it("clamps every variable to its range", () => {
    const s = model.setVariable(CMASS_INITIAL, "loopV0", 99, model.defaultParams);
    expect(s.loopV0).toBe(10);
    expect(model.setVariable(CMASS_INITIAL, "fuel", -5, model.defaultParams).fuel).toBe(100);
    expect(model.setVariable(CMASS_INITIAL, "nope", 3, model.defaultParams)).toBe(CMASS_INITIAL);
    expect(model.getVariable(CMASS_INITIAL, "xB")).toBe(0.3);
  });

  it("runs the clock to its end and stops", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 300; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.t).toBe(20);
    expect(model.step({ ...s, t: 3.2 }, model.defaultParams, 1).t).toBe(3.5);
  });

  it("numbers every output at the corners of every range", () => {
    const keys = Object.keys(CMASS_RANGES) as (keyof CmassState)[];
    for (const corner of [0, 1]) {
      for (const t of [0, 2.5, 20]) {
        const state = Object.fromEntries(keys.map((k) => [k, CMASS_RANGES[k][corner]])) as unknown as CmassState;
        for (const gravity of ["off", "on"] as const) {
          for (const drive of ["steady", "speeding"] as const) {
            const r = model.derive({ ...state, t }, { gravity, drive });
            for (const key of model.outputs) {
              expect(Number.isFinite(r[key]), `${corner} ${t} ${gravity} ${drive} ${key}`).toBe(true);
              expect(Object.is(r[key], -0), `−0 in ${key}`).toBe(false);
            }
          }
        }
      }
    }
  });
});
