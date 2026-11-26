import { describe, expect, it } from "vitest";
import { boltzmannDensity, halvingTimes, orderConcentration, rateLawModel as model, type RateLawParams, type RateLawState } from "./ratelaw";

const base: RateLawState = { a0: 1, k: 0.05, t: 0, T: 300, Ea: 10, steric: 1 };
const derive = (params: Partial<RateLawParams> = {}, state: Partial<RateLawState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });
const ORDERS = ["zero", "first", "second"] as const;

describe("the rate law", () => {
  it("multiplies the rate by 1, 2, 4 when [A] doubles", () => {
    for (const [i, order] of ORDERS.entries()) {
      const one = derive({ order }, { a0: 0.5 }).initialRate;
      const two = derive({ order }, { a0: 1 }).initialRate;
      expect(two / one, order).toBeCloseTo(2 ** i, 10);
      expect(derive({ order }).doubleFactor).toBe(2 ** i);
    }
  });

  it("slows as A is used up, except at zero order", () => {
    expect(derive({ order: "zero" }, { t: 10 }).rate).toBe(0.05);
    expect(derive({ order: "first" }, { t: 10 }).rate).toBeLessThan(0.05);
    expect(derive({ order: "second" }, { t: 10 }).rate).toBeCloseTo(0.05 * (1 / 1.5) ** 2, 10);
  });
});

describe("the integrated laws", () => {
  it("runs zero order straight down to nothing, and no further", () => {
    expect(orderConcentration(0, 1, 0.05, 10)).toBeCloseTo(0.5, 10);
    expect(orderConcentration(0, 1, 0.05, 20)).toBe(0);
    expect(derive({ order: "zero" }, { t: 40 })).toMatchObject({ concentration: 0, finished: 1, rate: 0, percentReacted: 100 });
  });

  it("gives half-lives of 10, 13.86 and 20 minutes", () => {
    expect(ORDERS.map((order) => derive({ order }).halfLife)).toEqual([10, expect.closeTo(13.863, 3), 20]);
    for (const [i, order] of ORDERS.entries()) expect(orderConcentration(i, 1, 0.05, derive({ order }).halfLife), order).toBeCloseTo(0.5, 10);
  });

  it("halves in equal times only at first order", () => {
    const gaps = (order: number) => {
      const [a, b, c] = halvingTimes(order, 1, 0.05) as [number, number, number];
      return [a, b - a, c - b];
    };
    expect(gaps(0)).toEqual([10, 5, 2.5]);
    expect(gaps(1)[1]).toBeCloseTo(gaps(1)[0]!, 10);
    expect(gaps(2)).toEqual([20, 40, 80]);
  });

  it("makes the half-life depend on [A]₀ in opposite ways at zero and second order", () => {
    const half = (order: RateLawParams["order"], a0: number) => derive({ order }, { a0 }).halfLife;
    expect(half("zero", 2)).toBeCloseTo(2 * half("zero", 1), 10);
    expect(half("first", 2)).toBeCloseTo(half("first", 1), 10);
    expect(half("second", 2)).toBeCloseTo(half("second", 1) / 2, 10);
  });
});

describe("the straight-line plot", () => {
  it("is [A], ln[A] or 1/[A] — one for each order", () => {
    const plots = ["concentration", "log", "inverse"] as const;
    for (const [i, order] of ORDERS.entries()) {
      expect(plots.map((plot) => derive({ order, plot }).straight), order).toEqual([0, 1, 2].map((j) => (j === i ? 1 : 0)));
    }
  });

  it("has slope −k, −k and +k", () => {
    for (const [i, order] of ORDERS.entries()) {
      const plot = (["concentration", "log", "inverse"] as const)[i]!;
      const y = (t: number) => derive({ order, plot }, { t }).plotY;
      expect((y(8) - y(2)) / 6, order).toBeCloseTo(derive({ order }).slope, 10);
      expect((y(14) - y(8)) / 6, order).toBeCloseTo((y(8) - y(2)) / 6, 10);
    }
    expect(ORDERS.map((order) => derive({ order }).slope)).toEqual([-0.05, -0.05, 0.05]);
  });
});

describe("collision theory", () => {
  it("lets through e^(−Eₐ/RT) of the collisions", () => {
    const T = 10000 / (2 * 8.314);
    expect(derive({}, { Ea: 10, T })).toMatchObject({ eaOverRT: expect.closeTo(2, 10), energyFraction: expect.closeTo(Math.exp(-2), 10) });
  });

  it("lets more through when hotter, or over a lower barrier", () => {
    const f = (state: Partial<RateLawState>) => derive({}, state).energyFraction;
    expect(f({ T: 600 })).toBeGreaterThan(f({ T: 300 }));
    expect(f({ Ea: 5 })).toBeGreaterThan(f({ Ea: 10 }));
  });

  it("cuts that down by the orientation factor", () => {
    const r = derive({}, { Ea: 12.5, T: 500, steric: 0.2 });
    expect(r.perThousand).toBeCloseTo(49.4, 1);
    expect(r.effectivePerThousand).toBeCloseTo(r.perThousand * 0.2, 10);
  });

  it("draws an energy distribution that holds every molecule", () => {
    let area = 0;
    for (let e = 0.005; e < 200; e += 0.01) area += boltzmannDensity(e, 600) * 0.01;
    expect(area).toBeCloseTo(1, 2);
    expect(boltzmannDensity(0, 300)).toBe(0);
  });
});

describe("the model", () => {
  it("plays to the end of the run and stops", () => {
    let s = model.initialize(model.defaultParams);
    for (let i = 0; i < 200; i++) s = model.advance(s, 0.1, model.defaultParams);
    expect(s.t).toBe(60);
  });

  it("keeps every control in range and numbers every output", () => {
    let s = model.initialize(model.defaultParams);
    for (const [id, value] of [["a0", 9], ["k", 0], ["t", 99], ["T", 0], ["Ea", 500], ["steric", 3]] as const) s = model.setVariable(s, id, value, model.defaultParams);
    expect(s).toEqual({ a0: 2, k: 0.01, t: 60, T: 250, Ea: 40, steric: 1 });
    for (const order of ORDERS) {
      for (const plot of ["concentration", "log", "inverse"] as const) {
        const r = model.derive({ ...s, k: 0.2 }, { order, plot });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${order} ${plot} ${key}`).toBe(true);
      }
    }
  });
});
