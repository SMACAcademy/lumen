import { describe, expect, it } from "vitest";
import {
  type CurrentWorkParams,
  type CurrentWorkState,
  currentWorkModel as model,
  cwJouleHeat,
  cwKick,
  cwWireField,
} from "./currentwork";

const P = model.defaultParams;
const S0 = model.initialize(P);
const derive = (over: Partial<CurrentWorkParams> = {}, state: Partial<CurrentWorkState> = {}) => model.derive({ ...S0, ...state }, { ...P, ...over });
const run = (over: Partial<CurrentWorkParams>, seconds: number, from: Partial<CurrentWorkState> = {}) => {
  const params = { ...P, ...over };
  let s: CurrentWorkState = { ...S0, ...from };
  for (let i = 0; i < seconds * 50; i++) s = model.advance(s, 0.02, params);
  return { state: s, results: model.derive(s, params) };
};

describe("the heating effect", () => {
  it("makes H = I²Rt: 5 A through 20 Ω for 30 s is 15 000 J", () => {
    expect(cwJouleHeat(5, 20, 30)).toBe(15000);
    const r = derive({ heatCurrent: 5, coilResistance: 20 }, { seconds: 30 });
    expect(r.heat).toBeCloseTo(15000, 9);
    expect(r.heatPower).toBeCloseTo(500, 9);
    expect(r.heatVoltage).toBeCloseTo(100, 9);
  });

  it("gives four times the heat for twice the current", () => {
    expect(derive({ heatCurrent: 2, coilResistance: 20 }, { seconds: 30 }).heat).toBeCloseTo(2400, 9);
    expect(derive({ heatCurrent: 4, coilResistance: 20 }, { seconds: 30 }).heat).toBeCloseTo(9600, 9);
  });

  it("100 J each second in 4 Ω needs 5 A and 20 V", () => {
    const r = derive({ heatCurrent: 5, coilResistance: 4 }, { seconds: 1 });
    expect(r.heat).toBeCloseTo(100, 9);
    expect(r.heatVoltage).toBeCloseTo(20, 9);
  });

  it("keeps heating while Play runs", () => {
    const { results } = run({ heatCurrent: 1, coilResistance: 10 }, 10, { seconds: 0 });
    expect(results.seconds).toBeCloseTo(10, 6);
    expect(results.heat).toBeCloseTo(100, 4);
  });
});

describe("the house circuit", () => {
  it("runs on 220 V at 50 Hz, and a 2 kW load draws 9.09 A — too much for a 5 A fuse", () => {
    const r = derive({ bulbs: 0, heaters: 2, fuseRating: 5 });
    expect(r.mainsVoltage).toBe(220);
    expect(r.mainsFrequency).toBe(50);
    expect(r.housePower).toBe(2000);
    expect(r.houseCurrent).toBeCloseTo(9.0909, 4);
    expect(r).toMatchObject({ fuseBlown: 1, supplyOn: 0 });
    expect(derive({ bulbs: 0, heaters: 2, fuseRating: 10 }).fuseBlown).toBe(0);
  });

  it("adds the currents of appliances in parallel", () => {
    expect(derive({ bulbs: 1, heaters: 0 }).houseCurrent).toBeCloseTo(0.4545, 4);
    expect(derive({ bulbs: 5, heaters: 0 }).houseCurrent).toBeCloseTo(2.2727, 4);
    expect(derive({ bulbs: 0, heaters: 1 }).houseCurrent).toBeCloseTo(4.5455, 4);
    expect(derive({ bulbs: 5, heaters: 1, fuseRating: 5 })).toMatchObject({ housePower: 1500, fuseBlown: 1 });
    expect(derive({ bulbs: 0, heaters: 1, fuseRating: 5 }).fuseBlown).toBe(0);
  });

  it("blows the fuse on a short circuit: 220 V across 0.5 Ω is 440 A", () => {
    const r = derive({ bulbs: 1, fault: "short", fuseRating: 15 });
    expect(r.houseCurrent).toBeCloseTo(440, 9);
    expect(r.fuseBlown).toBe(1);
  });

  it("earths a leak safely; without the earth wire the metal body is live", () => {
    const earthed = derive({ heaters: 1, bulbs: 0, fault: "leak", earthed: "earthed" });
    expect(earthed).toMatchObject({ fuseBlown: 1, shockDanger: 0 });
    const bare = derive({ heaters: 1, bulbs: 0, fault: "leak", earthed: "not" });
    expect(bare).toMatchObject({ fuseBlown: 0, shockDanger: 1 });
    expect(bare.houseCurrent).toBeCloseTo(4.5455, 4);
    expect(derive({ heaters: 1, bulbs: 0, fault: "leak", earthed: "not", protector: "mcb" }).shockDanger).toBe(1);
    expect(derive({ fault: "none", earthed: "not" }).shockDanger).toBe(0);
  });
});

describe("the electromagnet", () => {
  it("is as strong as turns × current, one pin for every 20", () => {
    expect(derive({ coilTurns: 20, magnetCurrent: 2 })).toMatchObject({ magnetStrength: 40, pinsHeld: 2 });
    expect(derive({ coilTurns: 60, magnetCurrent: 2 })).toMatchObject({ magnetStrength: 120, pinsHeld: 6 });
    expect(derive({ coilTurns: 100, magnetCurrent: 3 }).pinsHeld).toBe(15);
    expect(derive({ coilTurns: 10, magnetCurrent: 1 }).pinsHeld).toBe(0);
  });

  it("lets go when switched off, and is far weaker without the iron nail", () => {
    expect(derive({ coilTurns: 100, magnetCurrent: 3, switchOn: "off" })).toMatchObject({ magnetOn: 0, pinsHeld: 0, nailNorthEnd: 0 });
    expect(derive({ coilTurns: 100, magnetCurrent: 3, core: "none" })).toMatchObject({ magnetStrength: 3, pinsHeld: 0 });
  });

  it("has its north end where the current goes anticlockwise", () => {
    expect(derive({ currentDirection: "forward" }).nailNorthEnd).toBe(1);
    expect(derive({ currentDirection: "reverse" }).nailNorthEnd).toBe(-1);
  });
});

describe("field lines", () => {
  it("round a wire: 20 μT for each ampere per centimetre", () => {
    expect(cwWireField(1, 1)).toBe(20);
    expect(derive({ wireCurrent: 2, distance: 2 }).wireField).toBeCloseTo(20, 9);
    expect(derive({ wireCurrent: 4, distance: 2 }).wireField).toBeCloseTo(40, 9);
    expect(derive({ wireCurrent: 5, distance: 10 }).wireField).toBeCloseTo(10, 9);
  });

  it("turn anticlockwise round a current coming towards you (right-hand thumb rule)", () => {
    expect(derive({ fieldSource: "wire", currentDirection: "forward" })).toMatchObject({ fieldTurn: 1, compassPoints: 1, rightPole: 0 });
    expect(derive({ fieldSource: "wire", currentDirection: "reverse" })).toMatchObject({ fieldTurn: -1, compassPoints: -1 });
    expect(derive({ fieldSource: "wire", wireCurrent: 0 }).fieldTurn).toBe(0);
  });

  it("make a loop and a solenoid behave like a bar magnet", () => {
    expect(derive({ fieldSource: "magnet" }).rightPole).toBe(1);
    expect(derive({ fieldSource: "solenoid", currentDirection: "forward" }).rightPole).toBe(1);
    expect(derive({ fieldSource: "solenoid", currentDirection: "reverse" }).rightPole).toBe(-1);
    expect(derive({ fieldSource: "loop", currentDirection: "reverse" }).rightPole).toBe(-1);
  });
});

describe("the motor", () => {
  it("pushes a wire by Fleming's left-hand rule: field right, current towards you, force up", () => {
    expect(derive({ poles: "nLeft", currentDirection: "forward" }).rodForce).toBe(1);
    expect(derive({ poles: "nLeft", currentDirection: "reverse" }).rodForce).toBe(-1);
    expect(derive({ poles: "nRight", currentDirection: "forward" }).rodForce).toBe(-1);
    expect(derive({ poles: "nRight", currentDirection: "reverse" }).rodForce).toBe(1);
    expect(derive({ motorCurrent: 0 }).rodForce).toBe(0);
  });

  it("keeps turning one way with a split ring", () => {
    expect(derive({ motorRings: "split" })).toMatchObject({ keepsTurning: 1, spin: -1 });
    expect(derive({ motorRings: "split", poles: "nRight" }).spin).toBe(1);
    const { results } = run({ motorRings: "split", motorCurrent: 5 }, 8);
    expect(results.turnRate).toBeLessThan(-0.3);
  });

  it("only swings to upright and stops with slip rings", () => {
    expect(derive({ motorRings: "slip" })).toMatchObject({ keepsTurning: 0, spin: 0 });
    const { results } = run({ motorRings: "slip", motorCurrent: 5 }, 12);
    expect(Math.abs(results.turnRate)).toBeLessThan(0.01);
    expect(results.coilAngle).toBeCloseTo(Math.PI / 2, 2);
  });
});

describe("electromagnetic induction", () => {
  it("kicks more for a faster magnet and more turns, and not at all for a still one", () => {
    expect(cwKick(50, 2, "N")).toBeCloseTo(5, 12);
    expect(derive({ coilTurns: 20, magnetVelocity: 1 }).kick).toBeCloseTo(1, 12);
    expect(derive({ coilTurns: 80, magnetVelocity: 1 }).kick).toBeCloseTo(4, 12);
    expect(derive({ coilTurns: 100, magnetVelocity: 0 }).kick).toBe(0);
    expect(derive({ coilTurns: 100, magnetVelocity: 2 }).kick).toBe(10);
  });

  it("kicks the other way for the other pole or the other direction", () => {
    expect(derive({ coilTurns: 40, magnetVelocity: -1 }).kick).toBeCloseTo(-2, 12);
    expect(derive({ coilTurns: 40, magnetVelocity: 1, magnetPole: "S" }).kick).toBeCloseTo(-2, 12);
    expect(derive({ coilTurns: 40, magnetVelocity: -1, magnetPole: "S" }).kick).toBeCloseTo(2, 12);
    expect(derive({ coilTurns: 40, magnetVelocity: -1 }).kickSize).toBeCloseTo(2, 12);
  });
});

describe("the generator", () => {
  it("makes AC with slip rings: at 50 turns a second the current reverses 100 times a second", () => {
    const r = derive({ genSpeed: 50, genRings: "slip" });
    expect(r).toMatchObject({ isAC: 1, acFrequency: 50, reversals: 100 });
    expect(r.reversalGap).toBeCloseTo(0.01, 12);
  });

  it("makes DC with a split ring: the output never goes negative", () => {
    expect(derive({ genRings: "split" })).toMatchObject({ isAC: 0, reversals: 0, acFrequency: 0 });
    expect(derive({ genRings: "split" }, { genAngle: 1.5 * Math.PI }).genOutput).toBeCloseTo(1, 12);
    expect(derive({ genRings: "slip" }, { genAngle: 1.5 * Math.PI }).genOutput).toBeCloseTo(-1, 12);
  });

  it("is drawn turning at most once a second", () => {
    const { state } = run({ genSpeed: 50 }, 0.2);
    expect(state.genAngle).toBeCloseTo(0.4 * Math.PI, 6);
  });
});

describe("the model as a whole", () => {
  it("numbers every output, with no −0", () => {
    for (const over of [{}, { fault: "short" as const }, { motorCurrent: 0, magnetVelocity: -0 }, { genRings: "split" as const }]) {
      const r = derive(over);
      for (const key of model.outputs) {
        expect(Number.isFinite(r[key]), key).toBe(true);
        expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
  });

  it("clamps what it is given", () => {
    expect(model.setVariable(S0, "seconds", 9999, P).seconds).toBe(600);
    expect(model.setVariable(S0, "seconds", -5, P).seconds).toBe(0);
    expect(derive({ heatCurrent: 50, coilResistance: 0 })).toMatchObject({ heatCurrent: 10, coilResistance: 1 });
    expect(derive({ distance: 0 }).distance).toBe(1);
    expect(model.step({ ...S0, seconds: 30 }, P, 1).seconds).toBe(40);
  });
});
