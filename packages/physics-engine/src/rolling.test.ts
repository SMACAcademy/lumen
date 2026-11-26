import { describe, expect, it } from "vitest";
import {
  ROLL_BODY_ORDER,
  ROLL_G,
  ROLL_SCENE_ORDER,
  ROLLER_ORDER,
  ROLLERS,
  rollBodyInertia,
  rollDownIncline,
  rollingModel as model,
  type RollingParams,
  type RollingState,
} from "./rolling";

const DEG = Math.PI / 180;
const base: RollingState = { offset: 0, t: 0, vcm: 2, omega: 4, phi: 0, x: 0 };
const derive = (params: Partial<RollingParams> = {}, state: Partial<RollingState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const run = (state: RollingState, seconds: number, params: Partial<RollingParams> = {}) => {
  let s = state;
  for (let i = 0; i < Math.round(seconds / 0.01); i++) s = model.advance(s, 0.01, { ...model.defaultParams, ...params });
  return s;
};

describe("moments of inertia", () => {
  it("gives the standard values about the centre", () => {
    expect(rollBodyInertia("ring", 2, 0.5)).toEqual({ ix: 0.25, iy: 0.25, iz: 0.5 });
    expect(rollBodyInertia("disc", 2, 0.5)).toEqual({ ix: 0.125, iy: 0.125, iz: 0.25 });
    expect(rollBodyInertia("rod", 2, 1).iz).toBeCloseTo(1 / 6, 12);
    expect(rollBodyInertia("sphere", 2, 0.5).iz).toBeCloseTo(0.2, 12);
  });

  it("adds Md² for a parallel axis: a disc about its rim is 3/2 MR², a rod about its end ML²/3", () => {
    const disc = derive({ shape: "disc", axis: "z", mass: 2, radius: 0.5 }, { offset: 0.5 });
    expect(disc).toMatchObject({ iCentre: 0.25, shift: 0.5, iShifted: 0.75, atEdge: 1, inertiaRatio: 3 });
    const rod = derive({ shape: "rod", axis: "z", mass: 2, radius: 1 }, { offset: 0.5 });
    expect(rod.iShifted).toBeCloseTo(2 / 3, 12);
    expect(rod.atEdge).toBe(1);
    expect(derive({ shape: "sphere", mass: 2, radius: 0.5 }, { offset: 0.5 }).iShifted).toBeCloseTo(0.7, 12);
    // A ring about a tangent in its own plane: MR²/2 + MR² = 3/2 MR².
    expect(derive({ shape: "ring", axis: "y", mass: 2, radius: 0.5 }, { offset: 0.5 }).iShifted).toBeCloseTo(0.75, 12);
    expect(derive({ shape: "ring", axis: "z", mass: 2, radius: 0.5 }, { offset: 0.5 }).iShifted).toBeCloseTo(1, 12);
  });

  it("is least about the centre of mass, and the radius of gyration is √(I/M)", () => {
    for (const shape of ROLL_BODY_ORDER) {
      const centre = derive({ shape }, { offset: 0 });
      expect(derive({ shape }, { offset: 0.3 }).iShifted, shape).toBeGreaterThan(centre.iShifted);
      expect(centre.gyration ** 2 * 2).toBeCloseTo(centre.iShifted, 12);
    }
    expect(derive({ shape: "disc", mass: 2, radius: 0.5 }).gyration).toBeCloseTo(0.5 / Math.SQRT2, 12);
  });

  it("obeys I_z = I_x + I_y for the flat bodies but not for a sphere", () => {
    for (const shape of ["rod", "ring", "disc"] as const) {
      const r = derive({ shape });
      expect(r.planar, shape).toBe(1);
      expect(r.perpSum, shape).toBeCloseTo(r.iz, 12);
    }
    const sphere = derive({ shape: "sphere", mass: 2, radius: 0.5 });
    expect(sphere.planar).toBe(0);
    expect(sphere.perpSum).toBeCloseTo(0.4, 12);
    expect(sphere.iz).toBeCloseTo(0.2, 12);
  });
});

describe("rolling down an incline", () => {
  it("accelerates at g sin θ / (1 + k²/R²)", () => {
    const at30 = (roller: RollingParams["roller"]) => derive({ roller, angle: 30 * DEG, height: 1, mu: 0.4 });
    expect(at30("ring").accel).toBeCloseTo(2.45, 10);
    expect(at30("hollow").accel).toBeCloseTo(2.94, 10);
    expect(at30("disc").accel).toBeCloseTo(4.9 / 1.5, 10);
    expect(at30("solid").accel).toBeCloseTo(3.5, 10);
    expect(at30("disc").slips).toBe(0);
  });

  it("reaches the bottom at √(2gh/(1 + k²/R²)), whatever the mass, radius or angle", () => {
    expect(derive({ roller: "ring", height: 1 }).vBottom).toBeCloseTo(Math.sqrt(9.8), 10);
    expect(derive({ roller: "disc", height: 1 }).vBottom).toBeCloseTo(3.615, 3);
    expect(derive({ roller: "solid", height: 1 }).vBottom).toBeCloseTo(Math.sqrt(14), 10);
    const v = derive({ roller: "solid", angle: 20 * DEG }).vBottom;
    expect(derive({ roller: "solid", angle: 40 * DEG, mass: 7, radius: 0.2 }).vBottom).toBeCloseTo(v, 10);
  });

  it("finishes solid sphere, disc, hollow sphere, ring", () => {
    const times = ROLLER_ORDER.map((roller) => derive({ roller }).tBottom);
    expect(times[0]).toBeCloseTo(Math.sqrt(4 / 2.45), 10);
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeLessThan(times[i - 1]!);
    expect(derive().first).toBe(ROLLER_ORDER.indexOf("solid"));
  });

  it("splits the energy at the bottom: a disc keeps 1/3 in its spin, a ring 1/2", () => {
    const disc = derive({ roller: "disc", mass: 2, height: 1 }, { t: 5 });
    expect(disc.finished).toBe(1);
    expect(disc.keTotal).toBeCloseTo(19.6, 10);
    expect(disc.keRot).toBeCloseTo(19.6 / 3, 10);
    expect(disc.rotPercent).toBeCloseTo(100 / 3, 10);
    expect(disc.heat).toBe(0);
    expect(derive({ roller: "ring" }).rotPercent).toBeCloseTo(50, 10);
    expect(derive({ roller: "solid" }).rotPercent).toBeCloseTo(100 * (2 / 7), 10);
  });

  it("keeps the contact point at rest while it rolls: v = Rω", () => {
    const r = derive({ roller: "hollow", radius: 0.25 }, { t: 0.5 });
    expect(r.contactSpeed).toBeCloseTo(0, 12);
    expect(r.spin * 0.25).toBeCloseTo(r.v, 12);
    expect(r.s).toBeCloseTo(0.5 * 2.94 * 0.25, 10);
  });

  it("needs friction mg sin θ · (k²/R²)/(1 + k²/R²), and slips when μ is below tan θ · k²/(k² + R²)", () => {
    const disc = derive({ roller: "disc", mass: 2, angle: 30 * DEG });
    expect(disc.friction).toBeCloseTo(2 * 9.8 * 0.5 / 3, 10);
    expect(disc.muNeeded).toBeCloseTo(Math.tan(30 * DEG) / 3, 10);
    expect(derive({ roller: "ring", angle: 30 * DEG }).muNeeded).toBeCloseTo(0.2887, 4);
    const slipping = derive({ roller: "ring", angle: 30 * DEG, mu: 0.1 }, { t: 0.4 });
    expect(slipping.slips).toBe(1);
    expect(slipping.accel).toBeCloseTo(9.8 * (0.5 - 0.1 * Math.cos(30 * DEG)), 10);
    expect(slipping.contactSpeed).toBeGreaterThan(0);
    expect(slipping.heat).toBeGreaterThan(0);
  });

  it("slides without turning on a frictionless slope", () => {
    const r = derive({ roller: "ring", mu: 0 }, { t: 0.5 });
    expect(r.accel).toBeCloseTo(4.9, 10);
    expect(r.spin).toBe(0);
    expect(r.keRot).toBe(0);
    expect(rollDownIncline(ROLLERS.solid.beta, 30 * DEG, 0).rolls).toBe(false);
  });

  it("lets the rollers go on play and starts again after the last is down", () => {
    let s = model.initialize(model.defaultParams);
    s = run(s, 1.2);
    expect(derive({}, s)).toMatchObject({ finished: 1, raceOver: 0 });
    s = run(s, 0.2);
    expect(derive({}, s).raceOver).toBe(1);
    s = run(s, 1.2);
    expect(s.t).toBeLessThan(1);
  });
});

describe("a wheel on level ground", () => {
  it("moves its top at v + ωR and its contact point at v − ωR", () => {
    const rolling = derive({ radius: 0.5 }, { vcm: 2, omega: 4 });
    expect(rolling).toMatchObject({ topSpeed: 4, wheelSlip: 0, wheelRolls: 1 });
    const skidding = derive({ radius: 0.5 }, { vcm: 2, omega: 0 });
    expect(skidding).toMatchObject({ topSpeed: 2, wheelSlip: 2, wheelRolls: 0 });
  });

  it("gives each rim point v_cm + ω × r: at the front, √2 v, pointing down at 45°", () => {
    const r = derive({ radius: 0.5 }, { vcm: 2, omega: 4, phi: Math.PI / 2 });
    expect(r.pointVx).toBeCloseTo(2, 12);
    expect(r.pointVy).toBeCloseTo(-2, 12);
    expect(r.pointSpeed).toBeCloseTo(2 * Math.SQRT2, 12);
    expect(r.contactDistance).toBeCloseTo(0.5 * Math.SQRT2, 12);
    // Rolling, every point moves as if turning about the contact point: speed = ω × distance.
    for (const phi of [0.3, 1.7, 2.9, 4.4]) {
      const p = derive({ radius: 0.5 }, { vcm: 2, omega: 4, phi });
      expect(p.pointSpeed).toBeCloseTo(4 * p.contactDistance, 12);
    }
  });

  it("turns a sliding disc into a rolling one at 2/3 of its speed", () => {
    const start: RollingState = { ...base, vcm: 3, omega: 0 };
    expect(derive({ roller: "disc", radius: 0.5 }, start).settleSpeed).toBeCloseTo(2, 12);
    const later = run(start, 1, { roller: "disc", radius: 0.5, mu: 0.4 });
    expect(later.vcm).toBeCloseTo(2, 10);
    expect(later.omega).toBeCloseTo(4, 10);
    expect(derive({ roller: "disc", radius: 0.5 }, later).wheelRolls).toBe(1);
    // Halfway through the skid, still sliding.
    const early = run(start, 0.1, { roller: "disc", radius: 0.5, mu: 0.4 });
    expect(early.vcm).toBeCloseTo(3 - 0.4 * ROLL_G * 0.1, 10);
    expect(early.omega).toBeCloseTo((0.4 * ROLL_G * 0.1) / (0.5 * 0.5), 10);
  });

  it("sends a ring with enough backspin back the way it came", () => {
    const start: RollingState = { ...base, vcm: 2, omega: -20 };
    expect(derive({ roller: "ring", radius: 0.5 }, start).settleSpeed).toBeCloseTo(-4, 12);
    const later = run(start, 3, { roller: "ring", radius: 0.5 });
    expect(later.vcm).toBeCloseTo(-4, 9);
  });

  it("does nothing to the slip without friction", () => {
    const later = run({ ...base, vcm: 3, omega: 0 }, 1, { mu: 0 });
    expect(later.vcm).toBe(3);
    expect(later.omega).toBe(0);
  });
});

describe("equilibrium", () => {
  it("balances a see-saw when m₁x₁ = m₂x₂, and the pivot holds up everything", () => {
    const r = derive({ scene: "seesaw", m1: 30, x1: 2, m2: 40, x2: 1.5 });
    expect(r).toMatchObject({ balanced: 1, tilt: 0, netForce: 0 });
    expect(r.torqueLeft).toBeCloseTo(588, 10);
    expect(r.pivotForce).toBeCloseTo(784, 10);
    expect(r.cgX).toBeCloseTo(0, 12);
    const heavyLeft = derive({ scene: "seesaw", m1: 30, x1: 2, m2: 40, x2: 1 });
    expect(heavyLeft).toMatchObject({ balanced: 0, tilt: 1 });
    expect(heavyLeft.netTorque).toBeCloseTo(196, 10);
    expect(heavyLeft.cgX).toBeLessThan(0);
    expect(derive({ scene: "seesaw", m1: 30, x1: 1, m2: 40, x2: 1 }).tilt).toBe(-1);
  });

  it("solves NCERT's ladder: 3 m, 20 kg, foot 1 m out", () => {
    const r = derive({ scene: "ladder", foot: 1, mu: 0.4 });
    expect(r.ladderHeight).toBeCloseTo(Math.sqrt(8), 12);
    expect(r.wallForce).toBeCloseTo(34.65, 2);
    expect(r.floorNormal).toBeCloseTo(196, 10);
    expect(r.floorForce).toBeCloseTo(199.04, 2);
    expect(r).toMatchObject({ stands: 1, balanced: 1, netForce: 0 });
    expect(r.ladderMuNeeded).toBeCloseTo(1 / (2 * Math.sqrt(8)), 12);
  });

  it("lets the ladder slip when the floor's friction is too small", () => {
    const r = derive({ scene: "ladder", foot: 2, mu: 0.2 });
    expect(r.ladderMuNeeded).toBeCloseTo(2 / (2 * Math.sqrt(5)), 12);
    expect(r).toMatchObject({ stands: 0, balanced: 0 });
    expect(r.netForce).toBeGreaterThan(0);
    expect(derive({ scene: "ladder", foot: 1.1, mu: 0.2 }).stands).toBe(1);
    expect(derive({ scene: "ladder", foot: 1.2, mu: 0.2 }).stands).toBe(0);
  });

  it("gives a couple no net force but a torque F × separation", () => {
    const r = derive({ scene: "couple", force: 20, x1: 1, x2: 1 });
    expect(r).toMatchObject({ netForce: 0, coupleTorque: 40, netTorque: -40, balanced: 0 });
  });
});

describe("the model", () => {
  it("clamps every state variable to its control", () => {
    let s = model.initialize(model.defaultParams);
    s = model.setVariable(s, "offset", 5, model.defaultParams);
    s = model.setVariable(s, "omega", -99, model.defaultParams);
    s = model.setVariable(s, "vcm", 99, model.defaultParams);
    s = model.setVariable(s, "t", -1, model.defaultParams);
    expect(s).toMatchObject({ offset: 1, omega: -20, vcm: 6, t: 0 });
  });

  it("numbers every output, for every choice, even far outside the controls", () => {
    for (const shape of ROLL_BODY_ORDER) {
      for (const roller of ROLLER_ORDER) {
        for (const scene of ROLL_SCENE_ORDER) {
          for (const mu of [0, 1]) {
            const r = model.derive(
              { offset: 9, t: 99, vcm: -9, omega: 99, phi: 99, x: -5 },
              { ...model.defaultParams, shape, roller, scene, mu, angle: 2, height: 0, mass: 0, radius: 0, foot: 9, m1: 0, x1: 9 },
            );
            for (const key of model.outputs) expect(Number.isFinite(r[key]), `${shape} ${roller} ${scene} ${key}`).toBe(true);
            expect(Object.is(r.netTorque, -0)).toBe(false);
          }
        }
      }
    }
  });
});
