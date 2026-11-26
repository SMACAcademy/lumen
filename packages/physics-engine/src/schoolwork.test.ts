import { describe, expect, it } from "vitest";
import {
  SW_JOULES_PER_KWH,
  SW_MAX_T,
  schoolWorkModel as model,
  swLiftWork,
  swPower,
  swUnits,
  swWork,
  type SchoolWorkParams,
  type SchoolWorkState,
} from "./schoolwork";

const P = model.defaultParams;
const S0 = model.initialize(P);
const derive = (over: Partial<SchoolWorkParams> = {}, state: Partial<SchoolWorkState> = {}) =>
  model.derive({ ...S0, ...state }, { ...P, ...over });

describe("work = force × distance", () => {
  it("is F s when the force acts along the motion: 5 N over 2 m is 10 J", () => {
    expect(swWork(5, 2, "along")).toBe(10);
    expect(derive({ force: 5, distance: 2 })).toMatchObject({ work: 10, workSize: 10, workSign: 1, alignment: 1, direction: 0 });
    expect(derive({ force: 30, distance: 2 }).work).toBe(60);
    expect(derive({ force: 1, distance: 1 }).work).toBe(1); // 1 J = 1 N × 1 m
  });

  it("grows in step with the force and with the distance", () => {
    expect(derive({ force: 5, distance: 4 }).work).toBe(20);
    expect(derive({ force: 10, distance: 2 }).work).toBe(20);
    expect(derive({ force: 10, distance: 4 }).work).toBe(40);
  });

  it("is negative when the force acts against the motion, like friction", () => {
    expect(derive({ force: 10, distance: 3, direction: "against" })).toMatchObject({ work: -30, workSize: 30, workSign: -1, alignment: -1 });
    expect(derive({ force: 40, distance: 5, direction: "against" }).work).toBe(-200);
  });

  it("is zero when the force is at right angles to the motion: carrying a bag along level ground", () => {
    for (const force of [10, 40, 100]) {
      const r = derive({ force, distance: 10, direction: "across" });
      expect(Object.is(r.work, 0)).toBe(true); // a true zero, never −0
      expect(r.workSign).toBe(0);
    }
  });

  it("is zero when nothing moves: pushing a wall, holding a bag still", () => {
    expect(derive({ force: 80, distance: 0 })).toMatchObject({ work: 0, workSign: 0 });
    expect(Object.is(derive({ force: 50, distance: 0, direction: "against" }).work, 0)).toBe(true);
  });

  it("builds up as the box moves when Play is pressed (1 m/s)", () => {
    let s = S0;
    s = model.advance(s, 1, P);
    expect(derive({}, s)).toMatchObject({ moved: 1, workSoFar: 5, pushDone: 0 });
    s = model.advance(s, 1.5, P);
    expect(derive({}, s)).toMatchObject({ moved: 2, workSoFar: 10, pushDone: 1 });
    expect(derive({ direction: "against" }, s).workSoFar).toBe(-10);
  });
});

describe("work done lifting = m g h", () => {
  it("lifts a 10 kg bag 1.5 m with 147 J", () => {
    expect(swLiftWork(10, 1.5)).toBeCloseTo(147, 9);
    const r = derive({ mass: 10, height: 1.5 });
    expect(r.weight).toBeCloseTo(98, 9);
    expect(r.liftWork).toBeCloseTo(147, 9);
  });

  it("orders loads by m g h", () => {
    const works = [
      [5, 1],
      [10, 1],
      [5, 4],
      [20, 2],
    ].map(([mass, height]) => derive({ mass, height }).liftWork);
    expect(works.map((w) => +w.toFixed(6))).toEqual([49, 98, 196, 392]);
  });

  it("raises the load at 0.5 m/s when Play is pressed", () => {
    const r = derive({ mass: 10, height: 1.5 }, { t: 2 });
    expect(r.liftNow).toBe(1);
    expect(r.liftWorkSoFar).toBeCloseTo(98, 9);
    expect(derive({ mass: 10, height: 1.5 }, { t: 10 }).liftNow).toBe(1.5);
  });
});

describe("power = work ÷ time", () => {
  // Two 50 kg climbers go up 3 m of stairs: each does 50 × 9.8 × 3 = 1470 J.
  it("gives the same work but different powers to a fast and a slow climber", () => {
    const r = derive({ mass: 50, height: 3, timeA: 5, timeB: 15 });
    expect(r.liftWork).toBeCloseTo(1470, 9);
    expect(r.powerA).toBeCloseTo(294, 9);
    expect(r.powerB).toBeCloseTo(98, 9);
    expect(r.powerAkW).toBeCloseTo(0.294, 12);
    expect(r.powerRatio).toBe(3);
    expect(r.morePower).toBe(1);
  });

  it("keeps the work the same when A climbs faster, while the power rises", () => {
    const slow = derive({ timeA: 10 });
    const fast = derive({ timeA: 5 });
    expect(fast.liftWork).toBe(slow.liftWork);
    expect(slow.powerA).toBeCloseTo(147, 9);
    expect(fast.powerA).toBeCloseTo(294, 9);
  });

  it("halves B's power when B takes twice as long", () => {
    expect(derive({ timeB: 10 }).powerB).toBeCloseTo(147, 9);
    expect(derive({ timeB: 30 }).powerB).toBeCloseTo(49, 9);
    expect(derive({ timeA: 15, timeB: 15 }).morePower).toBe(0);
    expect(derive({ timeA: 20, timeB: 15 }).morePower).toBe(-1);
    expect(swPower(100, 0)).toBe(0);
  });

  it("moves each climber up at a steady rate and marks who is at the top", () => {
    const r = derive({ height: 3, timeA: 5, timeB: 15 }, { t: 5 });
    expect(r).toMatchObject({ climbA: 3, climbB: 1, aDone: 1, bDone: 0 });
    expect(derive({}, { t: 15 })).toMatchObject({ climbB: 3, bDone: 1 });
  });
});

describe("the commercial unit of energy", () => {
  it("is 1 kWh for a 100 W bulb on for 10 hours, which is 3.6 million joules", () => {
    expect(SW_JOULES_PER_KWH).toBe(1000 * 3600);
    const r = derive({ appliance: 100, hours: 10, days: 1 });
    expect(r).toMatchObject({ energyKWh: 1, dailyKWh: 1, applianceKW: 0.1, totalHours: 10 });
    expect(r.energyJ).toBe(3.6e6);
    expect(r.cost).toBe(5); // ₹5 a unit
  });

  it("counts units for different appliances", () => {
    expect(swUnits(15, 8)).toBeCloseTo(0.12, 12);
    expect(swUnits(60, 6)).toBeCloseTo(0.36, 12);
    expect(swUnits(1000, 2)).toBe(2);
    expect(swUnits(1500, 4)).toBe(6);
  });

  it("makes a month's bill: a 1000 W heater, 1 hour a day for 30 days at ₹5 a unit", () => {
    const r = derive({ appliance: 1000, hours: 1, days: 30, rate: 5 });
    expect(r.energyKWh).toBe(30);
    expect(r.cost).toBe(150);
    expect(r.energyJ).toBeCloseTo(1.08e8, 0);
  });
});

describe("model hygiene", () => {
  it("clamps params and state to their ranges and stays finite", () => {
    const r = derive(
      { force: -5, distance: 99, mass: 0, height: -1, timeA: 0, timeB: Number.NaN, appliance: 1e9, hours: 0, days: 0, rate: 0 },
      { t: -4 },
    );
    for (const key of model.outputs) expect(Number.isFinite(r[key]), key).toBe(true);
    expect(r).toMatchObject({ force: 0, distance: 20, mass: 1, height: 0, timeA: 1, timeB: 1, appliance: 3000, hours: 0.5, days: 1, rate: 1, t: 0 });
    expect(model.setVariable(S0, "t", 500, P).t).toBe(SW_MAX_T);
    expect(model.setVariable(S0, "t", -1, P).t).toBe(0);
    expect(model.getVariable(S0, "t")).toBe(0);
  });

  it("stops its clock and lists every output", () => {
    expect(model.advance({ t: SW_MAX_T - 1 }, 5, P).t).toBe(SW_MAX_T);
    expect(model.advance(S0, 0, P)).toBe(S0);
    expect(Object.keys(derive()).sort()).toEqual([...model.outputs].sort());
  });
});
