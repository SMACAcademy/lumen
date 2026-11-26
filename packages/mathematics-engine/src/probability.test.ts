import { describe, expect, it } from "vitest";
import {
  PROBABILITY_DIST_ORDER,
  PROBABILITY_EVENT_ORDER,
  PROBABILITY_TRIALS_MAX,
  probabilityBinomial,
  probabilityChoose,
  probabilityDistribution,
  probabilityModel as model,
  probabilitySimulate,
  type ProbabilityParams,
  type ProbabilityState,
} from "./probability";

const base = model.initialize(model.defaultParams);
const derive = (params: Partial<ProbabilityParams> = {}, state: Partial<ProbabilityState> = {}) =>
  model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("two dice", () => {
  it("counts the sums 2 to 12 as 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1 out of 36", () => {
    const counts = Array.from({ length: 11 }, (_, i) => derive({ eventA: "sum" }, { s: i + 2 }).countA);
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1]);
    expect(derive({ eventA: "sum" }, { s: 7 }).pA).toBeCloseTo(1 / 6, 12);
  });

  it("counts the other events by hand", () => {
    const count = (eventA: ProbabilityParams["eventA"], s = 7) => derive({ eventA }, { s }).countA;
    expect(count("doubles")).toBe(6);
    expect(count("firstEven")).toBe(18);
    expect(count("six")).toBe(11);
    expect(count("atLeast", 10)).toBe(6);
    expect(count("atLeast", 4)).toBe(33);
    expect(count("atLeast", 9)).toBe(10);
    expect(count("atLeast", 2)).toBe(36);
  });

  it("adds with the overlap taken off once: doubles or a sum of at least 10 is 10/36", () => {
    const r = derive({ eventA: "doubles", eventB: "atLeast" }, { t: 10 });
    expect(r).toMatchObject({ countA: 6, countB: 6, countBoth: 2, countEither: 10, exclusive: 0 });
    expect(r.pEither).toBeCloseTo(r.pA + r.pB - r.pBoth, 12);
    expect(r.pEither).toBeCloseTo(10 / 36, 12);
  });

  it("knows mutually exclusive events", () => {
    expect(derive({ eventA: "doubles", eventB: "sum" }, { t: 7 }).exclusive).toBe(1);
    expect(derive({ eventA: "doubles", eventB: "sum" }, { t: 11 }).exclusive).toBe(1);
    expect(derive({ eventA: "sum", eventB: "six" }, { s: 2 }).exclusive).toBe(1);
    expect(derive({ eventA: "sum", eventB: "six" }, { s: 7 })).toMatchObject({ exclusive: 0, countBoth: 2 });
    expect(derive({ eventA: "firstEven", eventB: "sum" }, { t: 3 }).exclusive).toBe(0);
    expect(derive({ eventA: "doubles", eventB: "firstEven" }).exclusive).toBe(0);
  });

  it("shrinks the sample space to B for P(A|B), which is not P(B|A)", () => {
    const sixes = derive({ eventA: "six", eventB: "atLeast" }, { t: 10 });
    expect(sixes).toMatchObject({ countB: 6, countBoth: 5 });
    expect(sixes.pAgivenB).toBeCloseTo(5 / 6, 12);
    expect(sixes.pBgivenA).toBeCloseTo(5 / 11, 12);
    expect(sixes.pAgivenB).toBeCloseTo(sixes.pBoth / sixes.pB, 12);
    expect(derive({ eventA: "doubles", eventB: "atLeast" }, { t: 10 }).pAgivenB).toBeCloseTo(1 / 3, 12);
    expect(derive({ eventA: "doubles", eventB: "atLeast" }, { t: 4 }).pAgivenB).toBeCloseTo(5 / 33, 12);
  });

  it("finds a first die even independent of exactly the odd sums", () => {
    const independent = Array.from({ length: 11 }, (_, i) => derive({ eventA: "firstEven", eventB: "sum" }, { t: i + 2 }).independent);
    expect(independent).toEqual([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0]);
    const seven = derive({ eventA: "firstEven", eventB: "sum" }, { t: 7 });
    expect(seven.pAgivenB).toBeCloseTo(seven.pA, 12);
    expect(seven.pBoth).toBeCloseTo(seven.productAB, 12);
  });

  it("sorts the independence pairs of the level", () => {
    const ind = (eventA: ProbabilityParams["eventA"], eventB: ProbabilityParams["eventB"], s = 7, t = 7) => derive({ eventA, eventB }, { s, t }).independent;
    expect(ind("doubles", "firstEven")).toBe(1);
    expect(ind("firstEven", "sum", 7, 7)).toBe(1);
    expect(ind("doubles", "atLeast", 7, 10)).toBe(0);
    expect(ind("six", "firstEven")).toBe(0);
    expect(ind("doubles", "sum", 7, 7)).toBe(0);
    expect(ind("firstEven", "sum", 7, 8)).toBe(0);
  });
});

describe("the disease test", () => {
  it("gives 18 true and 49 false positives out of 1000, so a positive means illness only 27% of the time", () => {
    const r = derive();
    expect(r).toMatchObject({ sick: 20, healthy: 980, truePositives: 18, falseNegatives: 2, falsePositives: 49, trueNegatives: 931, positives: 67, pPositive: 0.067 });
    expect(r.posterior).toBeCloseTo(18 / 67, 12);
  });

  it("agrees with Bayes' theorem and total probability", () => {
    for (const [prevalence, sensitivity, falsePositive] of [[0.01, 0.95, 0.1], [0.3, 0.6, 0.02], [0.5, 1, 0]] as const) {
      const r = derive({}, { prevalence, sensitivity, falsePositive });
      const total = prevalence * sensitivity + (1 - prevalence) * falsePositive;
      expect(r.pPositive).toBeCloseTo(total, 9);
      expect(r.posterior).toBeCloseTo((prevalence * sensitivity) / total, 12);
      expect(r.positives / 1000).toBeCloseTo(total, 9);
    }
  });

  it("works NCERT's HIV example: 0.1% ill, 90% detected, 1% false positives gives 90/1089", () => {
    // Below this lab's 0.5% slider, so worked directly.
    const p = 0.001 * 0.9;
    expect(p / (p + 0.999 * 0.01)).toBeCloseTo(90 / 1089, 12);
  });

  it("passes even odds a little above 5.26% prevalence", () => {
    expect(derive({}, { prevalence: 0.05 }).posterior).toBeLessThan(0.5);
    expect(derive({}, { prevalence: 0.055 }).posterior).toBeGreaterThan(0.5);
    expect(derive({}, { prevalence: 0.05 / 0.95 }).posterior).toBeCloseTo(0.5, 12);
  });

  it("helps more by cutting false positives than by catching more of the ill", () => {
    expect(derive({}, { prevalence: 0.2 }).posterior).toBeCloseTo(0.18 / 0.22, 12);
    expect(derive({}, { falsePositive: 0.01 }).posterior).toBeCloseTo(18 / 27.8, 12);
    expect(derive({}, { sensitivity: 0.99 }).posterior).toBeCloseTo(19.8 / 68.8, 12);
  });
});

describe("distributions", () => {
  it("works out ⁿCᵣ and binomial probabilities by hand", () => {
    expect([0, 1, 2, 3, 4].map((r) => probabilityChoose(4, r))).toEqual([1, 4, 6, 4, 1]);
    expect(probabilityChoose(10, 3)).toBe(120);
    expect(probabilityBinomial(4, 2, 0.5)).toBe(0.375);
    expect(probabilityBinomial(3, 1, 1 / 6)).toBeCloseTo(75 / 216, 12);
    expect(probabilityBinomial(5, 6, 0.5)).toBe(0);
  });

  it("makes every distribution add to 1", () => {
    for (const dist of PROBABILITY_DIST_ORDER) {
      for (const [n, p] of [[1, 0.3], [4, 0.5], [10, 0.9], [7, 0], [7, 1]] as const) {
        const total = probabilityDistribution(dist, n, p).probs.reduce((a, b) => a + b, 0);
        expect(total, `${dist} ${n} ${p}`).toBeCloseTo(1, 12);
      }
    }
  });

  it("gives a binomial the mean np and variance npq", () => {
    for (const [n, p] of [[4, 0.5], [10, 0.3], [6, 0.9], [1, 0.25]] as const) {
      const r = derive({ dist: "binomial" }, { n, p });
      expect(r.mean, `${n} ${p}`).toBeCloseTo(n * p, 9);
      expect(r.variance, `${n} ${p}`).toBeCloseTo(n * p * (1 - p), 9);
    }
    expect(derive({ dist: "binomial" }, { n: 10, p: 0.3 })).toMatchObject({ mean: 3, variance: 2.1 });
  });

  it("gives the sum of two dice mean 7 and variance 35/6, and the larger mean 161/36", () => {
    const sum = derive({ dist: "diceSum" }, { r: 7 });
    expect(sum).toMatchObject({ mean: 7, xMin: 2, xMax: 12, modeValue: 7 });
    expect(sum.variance).toBeCloseTo(35 / 6, 9);
    expect(sum.pAt).toBeCloseTo(6 / 36, 12);
    const larger = derive({ dist: "diceMax" }, { r: 6 });
    expect(larger.pAt).toBeCloseTo(11 / 36, 12);
    expect(larger.mean).toBeCloseTo(161 / 36, 9);
    expect(larger.variance).toBeCloseTo(2555 / 1296, 9);
    expect(larger).toMatchObject({ xMin: 1, xMax: 6, modeValue: 6 });
  });

  it("splits P(X ≤ r) and P(X ≥ r) with P(X = r) in both", () => {
    const r = derive({ dist: "binomial" }, { n: 4, p: 0.5, r: 2 });
    expect(r).toMatchObject({ pAt: 0.375, pAtMost: 0.6875, pAtLeast: 0.6875, modeValue: 2 });
    expect(derive({ dist: "binomial" }, { n: 4, p: 0.5, r: 0 }).pAtLeast).toBe(1);
    expect(derive({ dist: "binomial" }, { n: 4, p: 0.5, r: 9 })).toMatchObject({ pAt: 0, pAtMost: 1, pAtLeast: 0 });
    expect(derive({ dist: "diceSum" }, { r: 0 })).toMatchObject({ pAt: 0, pAtMost: 0, pAtLeast: 1 });
    // A tie at 1 and 2 when n = 3 and p = ½: the smaller is reported.
    expect(derive({ dist: "binomial" }, { n: 3, p: 0.5 }).modeValue).toBe(1);
  });

  it("shrinks the variance as p moves from ½ towards 1", () => {
    expect(derive({ dist: "binomial" }, { n: 6, p: 0.5 }).variance).toBeCloseTo(1.5, 12);
    expect(derive({ dist: "binomial" }, { n: 6, p: 0.9 }).variance).toBeCloseTo(0.54, 9);
  });
});

describe("the simulation", () => {
  it("replays the same trials exactly and counts every one", () => {
    const a = probabilitySimulate("binomial", 4, 0.5, 500);
    expect(probabilitySimulate("diceSum", 4, 0.5, 500).reduce((x, y) => x + y, 0)).toBe(500);
    expect(probabilitySimulate("binomial", 4, 0.5, 500)).toEqual(a);
    expect(a.reduce((x, y) => x + y, 0)).toBe(500);
  });

  it("settles onto the exact bars as the trials pile up", () => {
    for (const dist of PROBABILITY_DIST_ORDER) {
      const few = derive({ dist }, { n: 4, p: 0.5, trials: 20 });
      const many = derive({ dist }, { n: 4, p: 0.5, trials: PROBABILITY_TRIALS_MAX });
      expect(many.maxGap, dist).toBeLessThan(0.03);
      expect(many.maxGap, dist).toBeLessThan(few.maxGap);
      expect(Math.abs(many.simMean - many.mean), dist).toBeLessThan(0.1);
    }
  });

  it("runs on with play and stops at the limit", () => {
    let s = model.initialize(model.defaultParams);
    s = model.advance(s, 1, model.defaultParams);
    expect(derive({}, s).trials).toBe(200);
    for (let i = 0; i < 100; i++) s = model.advance(s, 1, model.defaultParams);
    expect(s.trials).toBe(PROBABILITY_TRIALS_MAX);
    expect(model.step(s, model.defaultParams, 1).trials).toBe(PROBABILITY_TRIALS_MAX);
    expect(model.step({ ...s, trials: 0 }, model.defaultParams, -1).trials).toBe(0);
  });
});

describe("the model", () => {
  it("clamps what is set, and rounds the whole-number variables", () => {
    const s = model.initialize(model.defaultParams);
    expect(model.setVariable(s, "s", 40, model.defaultParams).s).toBe(12);
    expect(model.setVariable(s, "n", 3.4, model.defaultParams).n).toBe(3);
    expect(model.setVariable(s, "p", -1, model.defaultParams).p).toBe(0);
    expect(model.setVariable(s, "prevalence", 0, model.defaultParams).prevalence).toBe(0.005);
    expect(model.setVariable(s, "nonsense", 3, model.defaultParams)).toBe(s);
  });

  it("numbers every output, whatever it is given", () => {
    for (const eventA of PROBABILITY_EVENT_ORDER) {
      for (const dist of PROBABILITY_DIST_ORDER) {
        for (const state of [
          { s: -5, t: 99, prevalence: -1, sensitivity: 9, falsePositive: 9, n: 0, p: 2, r: -3, trials: -10 },
          { s: Number.NaN, t: 2, prevalence: 0.5, sensitivity: 1, falsePositive: 0, n: 99, p: 0, r: 99, trials: 99999 },
        ]) {
          const r = model.derive(state, { eventA, eventB: "six", dist });
          for (const key of model.outputs) expect(Number.isFinite(r[key]), `${eventA} ${dist} ${key}`).toBe(true);
          for (const key of model.outputs) expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
        }
      }
    }
  });
});
