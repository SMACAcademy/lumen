import { describe, expect, it } from "vitest";
import {
  bankIdealSpeed,
  bankMaxSpeed,
  bankMinSpeed,
  bankedRoadForces,
  conicalPeriod,
  liftNormalForce,
  PULLEY_TRAVEL,
  pulleyRigMotion,
  pulleysModel as model,
  type PulleysParams,
} from "./pulleys";

const P = model.defaultParams;
const deg = (d: number) => (d * Math.PI) / 180;
const derive = (over: Partial<PulleysParams> = {}, t = 0) => model.derive({ t }, { ...P, ...over });

describe("the Atwood machine", () => {
  it("matches a = (m₁ − m₂)g/(m₁ + m₂) and T = 2m₁m₂g/(m₁ + m₂) worked by hand", () => {
    // 3 kg and 2 kg: a = 9.8/5 = 1.96 m/s², T = 2·3·2·9.8/5 = 23.52 N.
    const r = derive({ rig: "atwood", m1: 3, m2: 2 });
    expect(r.accel).toBeCloseTo(1.96, 12);
    expect(r.tension).toBeCloseTo(23.52, 12);
    expect(r).toMatchObject({ moves: 1, direction: 1 });
    // 4 kg and 1 kg: a = 3·9.8/5 = 5.88, T = 8·9.8/5 = 15.68 N.
    expect(derive({ m1: 4, m2: 1 }).tension).toBeCloseTo(15.68, 12);
    expect(derive({ m1: 4, m2: 1 }).a1).toBeCloseTo(5.88, 12);
  });

  it("does not move with equal masses, and T is then each weight", () => {
    const r = derive({ m1: 3, m2: 3 });
    expect(r).toMatchObject({ accel: 0, a1: 0, moves: 0, direction: 0 });
    expect(r.tension).toBeCloseTo(3 * 9.8, 12);
    expect(Object.is(r.accel, -0)).toBe(false);
  });

  it("runs backwards when m₂ is heavier, and each block obeys its own F = ma", () => {
    const r = derive({ m1: 2, m2: 5 });
    expect(r.direction).toBe(-1);
    expect(r.accel).toBeCloseTo((-3 * 9.8) / 7, 12);
    // m₁ is pulled up: T − m₁g = m₁a (a upwards); m₂: m₂g − T = m₂a.
    expect(r.tension - r.weight1).toBeCloseTo(2 * r.a1, 10);
    expect(r.weight2 - r.tension).toBeCloseTo(5 * r.a2, 10);
  });

  it("is in free fall when one side is far heavier, and T is always below the heavier weight", () => {
    const r = derive({ m1: 10, m2: 0.5 });
    expect(r.a1).toBeLessThan(9.8);
    expect(r.tension).toBeLessThan(r.weight1);
    expect(r.tension).toBeGreaterThan(r.weight2);
  });

  it("releases on Play and stops after the full travel", () => {
    const r = derive({ m1: 3, m2: 2 }, 1);
    expect(r.travel1).toBeCloseTo(0.98, 12); // ½ · 1.96 · 1²
    expect(r.speed1).toBeCloseTo(1.96, 12);
    const end = Math.sqrt((2 * PULLEY_TRAVEL) / 1.96);
    expect(derive({ m1: 3, m2: 2 }, end + 1)).toMatchObject({ travel1: PULLEY_TRAVEL, arrived: 1, speed1: 0 });
    expect(derive({ m1: 3, m2: 3 }, 5)).toMatchObject({ travel1: 0, arrived: 0 });
  });
});

describe("a block on a table pulled by a hanging mass", () => {
  it("matches a = m₂g/(m₁ + m₂) on a smooth table", () => {
    // 2 kg on the table, 1 kg hanging: a = 9.8/3, T = m₁a = 6.5333 N.
    const r = derive({ rig: "table", m1: 2, m2: 1, mu: 0 });
    expect(r.accel).toBeCloseTo(9.8 / 3, 12);
    expect(r.tension).toBeCloseTo((2 * 9.8) / 3, 12);
    expect(r.tableNormal).toBeCloseTo(19.6, 12);
    expect(derive({ rig: "table", m1: 6, m2: 1, mu: 0 }).accel).toBeCloseTo(1.4, 12);
  });

  it("subtracts friction μm₁g once it slides", () => {
    // 4 kg, 2 kg, μ = 0.25: a = (2 − 1)·9.8/6 = 1.6333; T = 4·2·9.8·1.25/6 = 16.333 N.
    const r = derive({ rig: "table", m1: 4, m2: 2, mu: 0.25 });
    expect(r.accel).toBeCloseTo(9.8 / 6, 12);
    expect(r.tension).toBeCloseTo(98 / 6, 10);
    expect(r.friction).toBeCloseTo(9.8, 12);
    // Block 1: T − f = m₁a. Block 2: m₂g − T = m₂a.
    expect(r.tension - r.friction).toBeCloseTo(4 * r.a1, 10);
    expect(r.weight2 - r.tension).toBeCloseTo(2 * r.a2, 10);
  });

  it("stays put while the hanging weight is no more than μm₁g, and T is then the hanging weight", () => {
    const r = derive({ rig: "table", m1: 4, m2: 2, mu: 0.5 });
    expect(r).toMatchObject({ accel: 0, moves: 0 });
    expect(r.tension).toBeCloseTo(19.6, 12);
    expect(r.friction).toBeCloseTo(19.6, 12);
    expect(derive({ rig: "table", m1: 4, m2: 2, mu: 0.6 }).friction).toBeCloseTo(19.6, 12);
  });
});

describe("the movable pulley", () => {
  it("moves m₂ half as far as m₁, so a₁ = 2a₂", () => {
    // 2 kg and 2 kg: a₁ = 2·2·9.8/10 = 3.92, a₂ = 1.96, T = 3·2·2·9.8/10 = 11.76 N.
    const r = derive({ rig: "movable", m1: 2, m2: 2 }, 0.5);
    expect(r.a1).toBeCloseTo(3.92, 12);
    expect(r.a2).toBeCloseTo(1.96, 12);
    expect(r.tension).toBeCloseTo(11.76, 12);
    expect(r.travel2).toBeCloseTo(r.travel1 / 2, 12);
    expect(r.speed1).toBeCloseTo(2 * r.speed2, 12);
    // m₁g − T = m₁a₁; 2T − m₂g = m₂a₂.
    expect(r.weight1 - r.tension).toBeCloseTo(2 * r.a1, 10);
    expect(2 * r.tension - r.weight2).toBeCloseTo(2 * r.a2, 10);
  });

  it("balances when m₂ = 2m₁", () => {
    const r = derive({ rig: "movable", m1: 1.5, m2: 3 });
    expect(r).toMatchObject({ a1: 0, a2: 0, moves: 0 });
    expect(r.tension).toBeCloseTo(1.5 * 9.8, 12);
    expect(derive({ rig: "movable", m1: 1, m2: 4 }).direction).toBe(-1);
  });

  it("agrees with the helper", () => {
    expect(pulleyRigMotion("movable", 3, 1).accel).toBeCloseTo((2 * 5 * 9.8) / 13, 12);
  });
});

describe("the lift", () => {
  it("reads N = m(g + a)", () => {
    expect(derive({ personMass: 60, liftAccel: 2 }).liftNormal).toBeCloseTo(708, 10);
    expect(derive({ personMass: 50, liftAccel: 0 }).scaleReading).toBeCloseTo(50, 12);
    expect(derive({ personMass: 50, liftAccel: -4.9 }).scaleReading).toBeCloseTo(25, 12);
    expect(derive({ personMass: 50, liftAccel: 1.96 }).scaleReading).toBeCloseTo(60, 12);
    expect(liftNormalForce(70, -9.8)).toBe(0);
  });

  it("feels heavier, normal, lighter or weightless", () => {
    expect(derive({ liftAccel: 2 }).feel).toBe(1);
    expect(derive({ liftAccel: 0 }).feel).toBe(0);
    expect(derive({ liftAccel: -2 }).feel).toBe(-1);
    expect(derive({ liftAccel: -9.8 })).toMatchObject({ feel: -2, liftNormal: 0, scaleReading: 0 });
  });
});

describe("the pendulum in an accelerating car", () => {
  it("tilts by tan θ = a/g, with T = m√(g² + a²) and pseudo force ma", () => {
    const r = derive({ carAccel: 9.8 });
    expect(r.tilt).toBeCloseTo(Math.PI / 4, 12);
    expect(r.bobTension).toBeCloseTo(0.5 * 9.8 * Math.SQRT2, 12);
    expect(r.pseudoForce).toBeCloseTo(4.9, 12);
    // The tension's parts: horizontal ma, vertical mg.
    expect(r.bobTension * Math.sin(r.tilt)).toBeCloseTo(r.pseudoForce, 12);
    expect(r.bobTension * Math.cos(r.tilt)).toBeCloseTo(r.bobWeight, 12);
    expect(derive({ carAccel: 0 }).tilt).toBe(0);
    expect(derive({ view: "car" }).inCarFrame).toBe(1);
  });
});

describe("the banked road", () => {
  it("on a flat road needs μrg ≥ v²: v_max = √(μrg)", () => {
    // r = 50, μ = 0.4: v_max = √196 = 14 m/s.
    expect(bankMaxSpeed(50, 0, 0.4)).toBeCloseTo(14, 12);
    expect(derive({ bank: 0, roadMu: 0.4, radius: 50, speed: 14 }).safe).toBe(1);
    expect(derive({ bank: 0, roadMu: 0.4, radius: 50, speed: 14.5 })).toMatchObject({ safe: 0, skid: 1 });
    expect(derive({ bank: 0, roadMu: 0.4, radius: 50, speed: 14 }).frictionNeeded).toBeCloseTo(3920, 8);
  });

  it("needs no friction at v₀ = √(rg tan θ)", () => {
    expect(bankIdealSpeed(40, deg(45))).toBeCloseTo(Math.sqrt(392), 10);
    const v0 = bankIdealSpeed(50, deg(20));
    expect(v0).toBeCloseTo(13.355, 3);
    const r = derive({ radius: 50, bank: deg(20), roadMu: 0, speed: v0 });
    expect(Math.abs(r.frictionNeeded)).toBeLessThan(1e-8);
    expect(r.safe).toBe(1);
  });

  it("puts v_max and v_min exactly where friction reaches μN", () => {
    const [r, th, mu] = [50, deg(15), 0.3];
    const vmax = bankMaxSpeed(r, th, mu);
    const vmin = bankMinSpeed(r, th, mu);
    expect(vmax).toBeCloseTo(Math.sqrt((50 * 9.8 * (0.3 + Math.tan(th))) / (1 - 0.3 * Math.tan(th))), 12);
    const top = bankedRoadForces(1000, vmax, r, th);
    expect(top.friction / top.normal).toBeCloseTo(mu, 10);
    expect(vmin).toBe(0); // tan 15° < 0.3: a parked car does not slide down
    const steep = bankMinSpeed(r, deg(35), 0.3);
    const low = bankedRoadForces(1000, steep, r, deg(35));
    expect(-low.friction / low.normal).toBeCloseTo(0.3, 10);
    expect(derive({ radius: 50, bank: deg(35), roadMu: 0.3, speed: steep - 0.5 })).toMatchObject({ safe: 0, skid: -1 });
  });

  it("lets a steeper bank take the curve faster", () => {
    expect(derive({ bank: deg(30), roadMu: 0.3 }).maxSpeed).toBeGreaterThan(derive({ bank: deg(10), roadMu: 0.3 }).maxSpeed);
  });
});

describe("the conical pendulum", () => {
  it("has tan θ = v²/rg and T = 2π√(L cos θ/g)", () => {
    const r = derive({ stringLength: 1, coneAngle: deg(60) });
    expect(r.conePeriod).toBeCloseTo(2 * Math.PI * Math.sqrt(0.5 / 9.8), 12);
    expect(r.conePeriod).toBeCloseTo(1.4192, 4);
    expect(r.coneRadius).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect((r.bobSpeed * r.bobSpeed) / (r.coneRadius * 9.8)).toBeCloseTo(Math.tan(deg(60)), 10);
    expect(r.coneTension).toBeCloseTo(9.8, 12); // mg / cos 60° = 0.5 · 9.8 · 2
    // v = 2πr / T
    expect(r.bobSpeed).toBeCloseTo((2 * Math.PI * r.coneRadius) / r.conePeriod, 10);
    expect(conicalPeriod(1, deg(20))).toBeGreaterThan(conicalPeriod(1, deg(60)));
  });
});

describe("the model", () => {
  it("numbers every output in every rig and extreme", () => {
    for (const rig of ["atwood", "table", "movable"] as const)
      for (const over of [{}, { m1: 0.5, m2: 10 }, { m1: 10, m2: 0.5, mu: 1 }, { liftAccel: -9.8, carAccel: 0, bank: 0, roadMu: 0, speed: 0 }, { bank: deg(40), roadMu: 1, speed: 50, coneAngle: deg(80) }])
        for (const t of [0, 0.7, 100]) {
          const r = derive({ rig, ...over }, t);
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${rig} ${key}`).toBe(true);
        }
  });

  it("clamps what it is given", () => {
    expect(model.setVariable({ t: 1 }, "t", -5, P)).toEqual({ t: 0 });
    expect(derive({ m1: 50 }).m1).toBe(10);
    expect(model.advance({ t: 0 }, 0.1, P).t).toBeCloseTo(0.1, 12);
    expect(model.step({ t: 0 }, P, -1).t).toBe(0);
  });
});
