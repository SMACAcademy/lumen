import { describe, expect, it } from "vitest";
import {
  CCHEM_BEAKER_COPPER,
  CCHEM_LIQUID_ORDER,
  cchemCoatThickness,
  cchemCopperFromCharge,
  currentChemModel as model,
  type CurrentChemParams,
} from "./currentchem";

const P = model.defaultParams;
const derive = (over: Partial<CurrentChemParams> = {}, minutes = 0) => model.derive({ minutes }, { ...P, ...over });
const shows = (over: Partial<CurrentChemParams>) => derive({ cells: 2, salt: 0, ...over }).shows;

describe("the tester", () => {
  it("works when its two ends touch, whatever shows the current", () => {
    for (const tester of ["bulb", "led", "compass"] as const) expect(shows({ tester, liquid: "joined" }), tester).toBe(1);
    expect(derive({ tester: "bulb", liquid: "joined", cells: 2 }).testerCurrent).toBeCloseTo(500, 9);
  });

  it("lights a bulb only for a liquid that conducts well", () => {
    expect(shows({ tester: "bulb", liquid: "copperSulphate" })).toBe(1);
    for (const liquid of ["distilled", "tap", "lemon", "vinegar", "sugar", "oil"] as const) expect(shows({ tester: "bulb", liquid }), liquid).toBe(0);
  });

  it("glows an LED for the weak current of lemon juice, vinegar and tap water", () => {
    for (const liquid of ["tap", "lemon", "vinegar", "copperSulphate"] as const) expect(shows({ tester: "led", liquid }), liquid).toBe(1);
    for (const liquid of ["distilled", "sugar", "oil"] as const) expect(shows({ tester: "led", liquid }), liquid).toBe(0);
    expect(derive({ tester: "led", liquid: "lemon", cells: 2 }).testerCurrent).toBeCloseTo(4.8, 9);
    // One cell's 1.5 V is less than the 1.8 V an LED needs.
    expect(shows({ tester: "led", liquid: "joined", cells: 1 })).toBe(0);
  });

  it("turns a compass needle for the same liquids as the LED", () => {
    for (const liquid of CCHEM_LIQUID_ORDER) expect(shows({ tester: "compass", liquid }), liquid).toBe(shows({ tester: "led", liquid }));
    expect((derive({ tester: "compass", liquid: "tap", cells: 2 }).deflection * 180) / Math.PI).toBeCloseTo(44.5, 1);
  });

  it("makes distilled water conduct once salt is stirred in", () => {
    const water = derive({ tester: "bulb", liquid: "distilled", cells: 2, salt: 0 });
    expect(water).toMatchObject({ shows: 0, liquidKind: 1 });
    const one = derive({ tester: "bulb", liquid: "distilled", cells: 2, salt: 1 });
    expect(one).toMatchObject({ shows: 1, liquidKind: 3 });
    expect(one.testerCurrent).toBeCloseTo(65.2, 1);
    expect(derive({ tester: "bulb", liquid: "distilled", cells: 2, salt: 4 }).testerCurrent).toBeCloseTo(187.5, 1);
    // Salt does not dissolve in oil.
    expect(derive({ tester: "bulb", liquid: "oil", salt: 5 })).toMatchObject({ testerCurrent: 0, liquidKind: 0, salt: 0 });
  });

  it("names how well each liquid conducts", () => {
    const kinds = CCHEM_LIQUID_ORDER.map((liquid) => derive({ liquid, salt: 0 }).liquidKind);
    expect(kinds).toEqual([4, 1, 2, 2, 2, 1, 0, 3]);
  });
});

describe("electrolysis", () => {
  it("coats the negative rod with copper from copper sulphate, and the blue fades", () => {
    const r = derive({ bath: "copperSulphate", current: 0.5 }, 10);
    expect(r.charge).toBe(300);
    expect(r.copperDeposit).toBeCloseTo(98.7, 1);
    expect(r.hydrogen).toBe(0);
    expect(r.oxygen).toBeCloseTo(18.65, 2);
    expect(r.blueLeft).toBeCloseTo(92.2, 1);
    expect(derive({ bath: "copperSulphate", current: 0.5 }, 5).copperDeposit).toBeCloseTo(49.35, 2);
    expect(derive({ bath: "copperSulphate", current: 2 }, 30).blueLeft).toBeLessThan(50);
  });

  it("gives twice as much hydrogen as oxygen from water", () => {
    const r = derive({ bath: "water", current: 0.5 }, 10);
    expect(r.hydrogen).toBeCloseTo(37.3, 1);
    expect(r.oxygen).toBeCloseTo(18.65, 2);
    expect(r.hydrogen / r.oxygen).toBeCloseTo(2, 12);
    expect(r.copperDeposit).toBe(0);
  });

  it("uses the real amount of copper per coulomb", () => {
    expect(cchemCopperFromCharge(96500 * 2)).toBeCloseTo(63500, 9);
    expect(CCHEM_BEAKER_COPPER).toBeCloseTo(1270, 9);
  });
});

describe("electroplating", () => {
  it("coats the key on the negative terminal, more for more current or more time", () => {
    const r = derive({ current: 1, keyOn: "negative" }, 10);
    expect(r.coatThickness).toBeCloseTo(22.03, 2);
    expect(r.plateLoss).toBeCloseTo(197.4, 1);
    expect(r).toMatchObject({ coatOnKey: 1, keyLoss: 0, plateBlue: 100 });
    expect(derive({ current: 1 }, 20).coatThickness).toBeCloseTo(44.06, 2);
    expect(derive({ current: 0.5 }, 20).coatThickness).toBeCloseTo(r.coatThickness, 12);
    expect(derive({ current: 1.5 }, 10).coatThickness).toBeCloseTo(33.05, 2);
    expect(cchemCoatThickness(8.96 * 1000 * 10 * 1e-4)).toBeCloseTo(1, 12);
  });

  it("eats the key away when it is on the positive terminal", () => {
    const r = derive({ current: 1, keyOn: "positive" }, 10);
    expect(r).toMatchObject({ coatThickness: 0, coatOnKey: 0, plateLoss: 0 });
    expect(r.keyLoss).toBeCloseTo(174.1, 1);
    expect(r.plateBlue).toBeLessThan(100);
  });
});

describe("the model", () => {
  it("runs one minute each second of play, and stops at 30", () => {
    expect(model.advance({ minutes: 4 }, 0.5, P).minutes).toBeCloseTo(4.5, 12);
    expect(model.advance({ minutes: 29.9 }, 1, P).minutes).toBe(30);
    expect(model.step({ minutes: 4.4 }, P, 1).minutes).toBe(5);
    expect(model.setVariable({ minutes: 0 }, "minutes", 99, P).minutes).toBe(30);
    expect(model.setVariable({ minutes: 5 }, "minutes", -3, P).minutes).toBe(0);
  });

  it("clamps the controls it is given", () => {
    expect(derive({ cells: 9, salt: -2, current: 5 })).toMatchObject({ cells: 4, salt: 0, current: 2 });
  });

  it("numbers every output", () => {
    for (const liquid of CCHEM_LIQUID_ORDER)
      for (const tester of ["bulb", "led", "compass"] as const) {
        const r = derive({ liquid, tester, keyOn: "positive", bath: "water" }, 30);
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${liquid} ${tester} ${key}`).toBe(true);
        for (const key of model.outputs) expect(Object.is(r[key], -0), key).toBe(false);
      }
  });
});
