import { describe, expect, it } from "vitest";
import {
  RATIO_POWER_THING_ORDER,
  RATIO_POWER_THINGS,
  ratioPowerFloorRoot,
  ratioPowerMantissa,
  ratioPowerModel as model,
  type RatioPowerParams,
  type RatioPowerState,
  ratioPowerPrimeFactors,
  ratioPowerSquareMaker,
} from "./ratiopower";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (params: Partial<RatioPowerParams> = {}, state: Partial<RatioPowerState> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });

describe("sharing in a ratio", () => {
  it("cuts the total into a + b equal parts", () => {
    // 20 sweets in the ratio 2 : 3: 5 parts of 4 sweets, so 8 and 12.
    expect(derive({ a: 2, b: 3, total: 20 })).toMatchObject({ parts: 5, partSize: 4, shareA: 8, shareB: 12, fair: 1 });
    // 30 sweets, 2 : 3 → 12 and 18.
    expect(derive({ a: 2, b: 3, total: 30 })).toMatchObject({ shareA: 12, shareB: 18 });
    // 21 does not share into 5 equal parts.
    const r = derive({ a: 2, b: 3, total: 21 });
    expect(r.fair).toBe(0);
    expect(r.shareA).toBeCloseTo(8.4, 9);
  });

  it("writes a ratio in its simplest form", () => {
    expect(derive({ a: 4, b: 6 })).toMatchObject({ simpleA: 2, simpleB: 3 });
    expect(derive({ a: 10, b: 15 })).toMatchObject({ simpleA: 2, simpleB: 3 });
    expect(derive({ a: 6, b: 4 })).toMatchObject({ simpleA: 3, simpleB: 2 });
    expect(derive({ a: 5, b: 7 })).toMatchObject({ simpleA: 5, simpleB: 7 });
  });
});

describe("proportion and the unitary method", () => {
  it("checks the product of extremes against the product of means", () => {
    // 2 : 3 = 8 : 12, because 2 × 12 = 3 × 8 = 24.
    expect(derive({ a: 2, b: 3, c: 8, d: 12 })).toMatchObject({ extremes: 24, means: 24, proportional: 1 });
    expect(derive({ a: 2, b: 3, c: 8, d: 11 }).proportional).toBe(0);
  });

  it("finds the missing term through one unit", () => {
    // 4 people need 6 eggs; one person 1.5; 10 people 15.
    expect(derive({ a: 4, b: 6, c: 10 })).toMatchObject({ unitValue: 1.5, missingD: 15 });
    expect(derive({ a: 2, b: 3, c: 8 }).missingD).toBe(12);
  });
});

describe("percentages", () => {
  it("reads the grid out of 100", () => {
    expect(derive({ price: 500 }, { pct: 35 })).toMatchObject({ pct: 35, pctDecimal: 0.35, pctN: 7, pctD: 20, pctOfPrice: 175 });
    expect(derive({}, { pct: 75 })).toMatchObject({ pctN: 3, pctD: 4 });
    expect(derive({}, { pct: 0 })).toMatchObject({ pctN: 0, pctD: 1 });
    expect(derive({}, { pct: 100 })).toMatchObject({ pctN: 1, pctD: 1 });
  });

  it("increases and decreases by a percentage", () => {
    // ₹800 with 25 % off: ₹200 off, pay ₹600.
    expect(derive({ price: 800, change: -25 })).toMatchObject({ changeAmount: -200, changed: 600 });
    // ₹500 up by 20 %: ₹600.
    expect(derive({ price: 500, change: 20 })).toMatchObject({ changeAmount: 100, changed: 600 });
  });

  it("finds profit and loss per cent on the cost price", () => {
    expect(derive({ price: 400, sell: 600 })).toMatchObject({ profit: 200, profitPercent: 50, gain: 1 });
    expect(derive({ price: 500, sell: 600 })).toMatchObject({ profit: 100, profitPercent: 20, gain: 1 });
    // ₹1200 sold for ₹1000: a loss of ₹200, which is 16⅔ %.
    expect(derive({ price: 1200, sell: 1000 })).toMatchObject({ profit: -200, profitPercent: -16.67, gain: -1 });
    expect(derive({ price: 300, sell: 300 })).toMatchObject({ profit: 0, profitPercent: 0, gain: 0 });
  });
});

describe("simple and compound interest", () => {
  it("SI = PRT/100", () => {
    expect(derive({ price: 1000, rate: 10 }, { years: 5 })).toMatchObject({ si: 500, amountSI: 1500 });
    expect(derive({ price: 5000, rate: 4 }, { years: 5 }).si).toBe(1000);
  });

  it("A = P(1 + R/100)ⁿ, counted in whole years", () => {
    // ₹10,000 at 10 % for 2 years: 11,000 then 12,100.
    expect(derive({ price: 10000, rate: 10 }, { years: 2 })).toMatchObject({ amountCI: 12100, ci: 2100, si: 2000, ciMore: 100 });
    // ₹1000 at 10 % for 5 years: 1610.51.
    const r = derive({ price: 1000, rate: 10 }, { years: 5 });
    expect(r).toMatchObject({ amountCI: 1610.51, ci: 610.51, ciMore: 110.51 });
    // In the first year the two are the same.
    expect(derive({ price: 1000, rate: 10 }, { years: 1 }).ciMore).toBe(0);
    expect(derive({ price: 1000, rate: 10 }, { years: 2.7 }).years).toBe(2);
  });

  it("lets the years go by when played, and steps a year at a time", () => {
    expect(model.advance({ ...S, years: 0 }, 1.5, P).years).toBeCloseTo(1.5, 9);
    expect(model.advance({ ...S, years: 9.5 }, 2, P).years).toBe(10);
    expect(model.step({ ...S, years: 2 }, P, 1).years).toBe(3);
    expect(model.step({ ...S, years: 0 }, P, -1).years).toBe(0);
  });
});

describe("powers and their laws", () => {
  it("is repeated multiplication", () => {
    expect(derive({ base: 2, m: 5 }).powerM).toBe(32);
    expect(derive({ base: 10, m: 6 }).powerM).toBe(1000000);
    expect(derive({ base: 7, m: 0 }).powerM).toBe(1);
    expect(derive({ base: 2, m: -3 }).powerM).toBe(0.125);
  });

  it("adds powers when multiplying, subtracts when dividing, multiplies for a power of a power", () => {
    const r = derive({ base: 2, m: 3, n: 4 });
    expect(r).toMatchObject({ powerM: 8, powerN: 16, sumMN: 7, product: 128, diffMN: -1, quotient: 0.5, productMN: 12, powerPower: 4096 });
    expect(r.product).toBe(r.powerM * r.powerN);
    expect(derive({ base: 10, m: 6, n: 2 })).toMatchObject({ quotient: 10000, diffMN: 4 });
    expect(derive({ base: 2, m: 3, n: 2 }).powerPower).toBe(64);
  });

  it("stays finite at the far ends", () => {
    const r = derive({ base: 10, m: 8, n: 8 });
    expect(r.powerPower).toBe(1e64);
    expect(Number.isFinite(derive({ base: 10, m: -5, n: 8 }).powerPower)).toBe(true);
  });
});

describe("standard form", () => {
  it("knows the real sizes", () => {
    expect(ratioPowerMantissa("1496")).toBe(1.496);
    expect(ratioPowerMantissa("7")).toBe(7);
    expect(RATIO_POWER_THINGS.sun.exponent).toBe(11);
    expect(RATIO_POWER_THINGS["blood-cell"].exponent).toBe(-6);
    for (const id of RATIO_POWER_THING_ORDER) {
      const k = ratioPowerMantissa(RATIO_POWER_THINGS[id].digits);
      expect(k, id).toBeGreaterThanOrEqual(1);
      expect(k, id).toBeLessThan(10);
    }
  });

  it("matches when the power of ten is right", () => {
    const sun = derive({ thing: "sun" }, { se: 11 });
    expect(sun.match).toBe(1);
    expect(sun.builtValue).toBeCloseTo(149_600_000_000, 0);
    expect(derive({ thing: "sun" }, { se: 10 }).match).toBe(0);
    const cell = derive({ thing: "blood-cell" }, { se: -6 });
    expect(cell).toMatchObject({ match: 1, thingExponent: -6, thingMantissa: 7 });
    expect(cell.thingValue).toBeCloseTo(0.000007, 12);
  });
});

describe("squares and square roots", () => {
  it("finds perfect squares and their roots", () => {
    expect(derive({}, { tiles: 64 })).toMatchObject({ root: 8, rootFloor: 8, isPerfect: 1, leftover: 0, toNext: 17 });
    expect(derive({}, { tiles: 324 })).toMatchObject({ root: 18, isPerfect: 1 });
    // 40 tiles: a 6 × 6 square with 4 left over, 9 short of 7 × 7.
    expect(derive({}, { tiles: 40 })).toMatchObject({ rootFloor: 6, isPerfect: 0, leftover: 4, toNext: 9 });
  });

  it("uses prime factors in pairs", () => {
    expect(ratioPowerPrimeFactors(72)).toEqual([2, 2, 2, 3, 3]);
    expect(ratioPowerPrimeFactors(324)).toEqual([2, 2, 3, 3, 3, 3]);
    expect(ratioPowerSquareMaker(72)).toBe(2);
    expect(ratioPowerSquareMaker(180)).toBe(5);
    expect(derive({}, { tiles: 72 })).toMatchObject({ multiplier: 2, madeSquare: 144, madeRoot: 12 });
    expect(derive({}, { tiles: 1 })).toMatchObject({ multiplier: 1, madeRoot: 1, isPerfect: 1 });
    expect(ratioPowerFloorRoot(399)).toBe(19);
  });
});

describe("the model's contract", () => {
  it("clamps every state variable to its control", () => {
    expect(model.setVariable(S, "pct", 140, P).pct).toBe(100);
    expect(model.setVariable(S, "years", 3.6, P).years).toBe(4);
    expect(model.setVariable(S, "se", -20, P).se).toBe(-8);
    expect(model.setVariable(S, "tiles", 0, P).tiles).toBe(1);
    expect(model.getVariable({ ...S, tiles: 50 }, "tiles")).toBe(50);
    expect(model.setVariable(S, "nope", 1, P)).toBe(S);
  });

  it("clamps parameters, and every output is a finite number with no −0", () => {
    const r = derive({ a: 0, b: 99, total: -5, price: 0, change: -500, rate: 0, base: 0, thing: "nowhere" as never }, { years: 0 });
    expect(r).toMatchObject({ a: 1, b: 20, total: 0, price: 100, change: -90, rate: 1, base: 1, thing: 0 });
    for (const key of model.outputs) {
      expect(typeof r[key], key).toBe("number");
      expect(Number.isFinite(r[key]), key).toBe(true);
      expect(Object.is(r[key], -0), key).toBe(false);
    }
  });
});
