import { describe, expect, it } from "vitest";
import {
  INTEGERS_SCENE_ORDER,
  INTEGERS_SCENES,
  integersGcd,
  integersLcm,
  integersModel as model,
  integersSigned,
  integersStandard,
  type IntegersParams,
  type IntegersState,
} from "./integers";

const base: IntegersState = { start: 3, p: 3, p2: 1, hop: 0 };
const derive = (params: Partial<IntegersParams> = {}, state: Partial<IntegersState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("whole-number helpers", () => {
  it("find common factors and multiples", () => {
    expect(integersGcd(12, -18)).toBe(6);
    expect(integersGcd(0, 5)).toBe(5);
    expect(integersLcm(4, 6)).toBe(12);
    expect(integersLcm(3, 4)).toBe(12);
    expect(integersLcm(0, 4)).toBe(0);
  });

  it("writes a rational in standard form: bottom positive, no common factor", () => {
    expect(integersStandard(3, -4)).toEqual([-3, 4]);
    expect(integersStandard(-6, -8)).toEqual([3, 4]);
    expect(integersStandard(2, -4)).toEqual([-1, 2]);
    expect(integersStandard(0, -5)).toEqual([0, 1]);
    expect(integersStandard(5, 0)).toEqual([0, 1]);
    expect(Object.is(integersStandard(0, -3)[0], -0)).toBe(false);
  });

  it("prints a true minus sign", () => {
    expect(integersSigned(-5)).toBe("−5");
    expect(integersSigned(7)).toBe("7");
  });
});

describe("hops: adding and subtracting integers", () => {
  it("adds a negative by hopping left: 3 + (−5) = −2", () => {
    expect(derive({ sign: 1, move: -5 }, { start: 3 })).toMatchObject({ added: -5, result: -2, hops: 5, direction: -1, resultSign: -1 });
  });

  it("adds a positive by hopping right: −4 + 6 = 2", () => {
    expect(derive({ sign: 1, move: 6 }, { start: -4 })).toMatchObject({ result: 2, direction: 1 });
  });

  it("subtracts by adding the opposite: 2 − (−4) = 2 + 4 = 6, and 1 − 3 = −2", () => {
    expect(derive({ sign: -1, move: -4 }, { start: 2 })).toMatchObject({ added: 4, opposite: 4, result: 6, direction: 1 });
    expect(derive({ sign: -1, move: 3 }, { start: 1 })).toMatchObject({ added: -3, result: -2 });
  });

  it("walks the frog hop by hop and says when it has landed", () => {
    const at = (hop: number) => derive({ sign: 1, move: -5 }, { start: 3, hop });
    expect(at(0)).toMatchObject({ position: 3, landed: 0 });
    expect(at(2)).toMatchObject({ position: 1, landed: 0 });
    expect(at(2.5).position).toBeCloseTo(0.5, 12);
    expect(at(5)).toMatchObject({ position: -2, landed: 1 });
    expect(at(7)).toMatchObject({ position: -2, landed: 1 });
    expect(derive({ move: 0 }, { start: 4 })).toMatchObject({ position: 4, landed: 1, direction: 0 });
  });

  it("plays: hops on, pauses on landing, then starts again", () => {
    const params = { ...model.defaultParams, sign: 1, move: -5, times: 3 };
    let s: IntegersState = { ...base, hop: 0 };
    for (let i = 0; i < 4; i++) s = model.advance(s, 1, params);
    expect(s.hop).toBe(6);
    expect(model.advance(s, 0.1, params).hop).toBe(0);
    expect(model.step({ ...base, hop: 0 }, params, 1).hop).toBe(1);
    expect(model.step({ ...base, hop: 5 }, params, 1).hop).toBe(5);
  });
});

describe("integers in life", () => {
  it("tells 4 + (−9) as a temperature, and the same sum as a lift, a bank and the sea", () => {
    const sum = { sign: 1, move: -9 };
    expect(derive({ ...sum, scene: "temperature" }, { start: 4 })).toMatchObject({ amount: -5, startAmount: 4, changeAmount: -9, below: 1, scale: 1 });
    expect(derive({ ...sum, scene: "lift" }, { start: 4 }).amount).toBe(-5);
    expect(derive({ ...sum, scene: "bank" }, { start: 4 })).toMatchObject({ amount: -500, startAmount: 400, changeAmount: -900 });
    expect(derive({ ...sum, scene: "sea" }, { start: 4 }).amount).toBe(-50);
  });

  it("names amounts the way people say them", () => {
    expect(INTEGERS_SCENES.temperature.format(-5)).toBe("−5 °C");
    expect(INTEGERS_SCENES.lift.format(-2)).toBe("basement 2");
    expect(INTEGERS_SCENES.lift.format(0)).toBe("ground floor");
    expect(INTEGERS_SCENES.bank.format(-300)).toBe("owes ₹300");
    expect(INTEGERS_SCENES.sea.format(-20)).toBe("−20 m");
    expect(INTEGERS_SCENE_ORDER.map((id) => derive({ scene: id }).scene)).toEqual([0, 1, 2, 3]);
  });
});

describe("times: multiplying integers", () => {
  it("follows the sign rules", () => {
    expect(derive({ times: 3, jump: -2 })).toMatchObject({ product: -6, turns: 1, productSign: -1 });
    expect(derive({ times: -3, jump: 2 })).toMatchObject({ product: -6, turns: 1 });
    expect(derive({ times: -3, jump: -2 })).toMatchObject({ product: 6, turns: 2, productSign: 1 });
    expect(derive({ times: -4, jump: -5 }).product).toBe(20);
    expect(derive({ times: 2, jump: 4 })).toMatchObject({ product: 8, turns: 0 });
    expect(Object.is(derive({ times: 0, jump: -3 }).product, -0)).toBe(false);
  });

  it("hops times × jump out from 0, turned round when the count is negative", () => {
    expect(derive({ times: 3, jump: -2 }, { hop: 1 }).timesPosition).toBe(-2);
    expect(derive({ times: -3, jump: -2 }, { hop: 1 }).timesPosition).toBe(2);
    expect(derive({ times: -3, jump: -2 }, { hop: 3 })).toMatchObject({ timesPosition: 6, timesLanded: 1 });
    expect(derive({ times: -3, jump: -2 }, { hop: 2 }).timesLanded).toBe(0);
  });
});

describe("rational numbers", () => {
  it("puts p/q on the line, in standard form", () => {
    expect(derive({ q: -4 }, { p: 3 })).toMatchObject({ value: -0.75, stdN: -3, stdD: 4, ratSign: -1, valid: 1, isInteger: 0 });
    expect(derive({ q: 3 }, { p: -6 })).toMatchObject({ value: -2, stdN: -2, stdD: 1, isInteger: 1 });
  });

  it("refuses a bottom of 0", () => {
    const r = derive({ q: 0 }, { p: 5 });
    expect(r).toMatchObject({ valid: 0, value: 0, stdN: 0, stdD: 1, compare: 0, same: 0, between: 0, lcd: 1, sumN: 0, sumD: 1 });
    for (const v of Object.values(r)) expect(Number.isFinite(v)).toBe(true);
  });

  it("compares exactly, and spots two names for one number", () => {
    expect(derive({ q: 4, q2: 3 }, { p: -3, p2: -2 }).compare).toBe(-1); // −3/4 < −2/3
    expect(derive({ q: 2, q2: -4 }, { p: -1, p2: 2 })).toMatchObject({ compare: 0, same: 1 }); // −1/2 = 2/(−4)
    expect(derive({ q: 3, q2: 2 }, { p: 1, p2: 1 }).compare).toBe(-1);
  });

  it("finds more and more fractions between 1/3 and 1/2 as the pieces get finer", () => {
    const gap = (zoom: number) => derive({ q: 3, q2: 2, zoom }, { p: 1, p2: 1 });
    expect(gap(1)).toMatchObject({ commonD: 6, aOver: 2, bOver: 3, between: 0 });
    expect(gap(2)).toMatchObject({ commonD: 12, aOver: 4, bOver: 6, between: 1 });
    expect(gap(10)).toMatchObject({ commonD: 60, aOver: 20, bOver: 30, between: 9 });
    expect(gap(1)).toMatchObject({ midN: 5, midD: 12 });
    expect(gap(1).midValue).toBeCloseTo(5 / 12, 12);
  });

  it("adds and subtracts fractions over the least common bottom", () => {
    expect(derive({ sign: 1, q: 3, q2: 4 }, { p: 1, p2: 1 })).toMatchObject({ lcd: 12, aScaled: 4, bScaled: 3, sumOver: 7, sumN: 7, sumD: 12 });
    expect(derive({ sign: 1, q: 4, q2: 3 }, { p: 2, p2: 1 })).toMatchObject({ lcd: 12, aScaled: 6, bScaled: 4, sumOver: 10, sumN: 5, sumD: 6 });
    expect(derive({ sign: -1, q: 4, q2: 2 }, { p: 3, p2: 1 })).toMatchObject({ lcd: 4, aScaled: 3, bScaled: 2, bSigned: -2, sumOver: 1, sumN: 1, sumD: 4 });
    expect(derive({ sign: 1, q: 6, q2: 4 }, { p: 5, p2: -1 })).toMatchObject({ lcd: 12, sumOver: 7, sumN: 7, sumD: 12 });
    expect(derive({ sign: -1, q: 2, q2: 2 }, { p: 1, p2: 1 })).toMatchObject({ sumOver: 0, sumN: 0, sumD: 1, sumValue: 0 });
  });
});

describe("variables", () => {
  it("clamps every state variable to its control's range", () => {
    const s = model.initialize(model.defaultParams);
    expect(model.setVariable(s, "start", 40, model.defaultParams).start).toBe(10);
    expect(model.setVariable(s, "start", -2.6, model.defaultParams).start).toBe(-3);
    expect(model.setVariable(s, "p", -99, model.defaultParams).p).toBe(-12);
    expect(model.setVariable(s, "p2", 99, model.defaultParams).p2).toBe(12);
    expect(model.setVariable(s, "hop", -1, model.defaultParams).hop).toBe(0);
    expect(model.getVariable(s, "p")).toBe(3);
  });

  it("gives only finite outputs, never −0, over the whole range", () => {
    for (const sign of [1, -1])
      for (const move of [-10, 0, 7])
        for (const q of [-12, -1, 0, 5])
          for (const times of [-5, 0, 4]) {
            const r = derive({ sign, move, q, q2: -q, times, jump: -times }, { start: -7, p: 0, p2: -3, hop: 2 });
            for (const [k, v] of Object.entries(r)) {
              expect(Number.isFinite(v), k).toBe(true);
              expect(Object.is(v, -0), k).toBe(false);
            }
          }
  });
});
