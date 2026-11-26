import { describe, expect, it } from "vitest";
import {
  STATS_SETS,
  STATS_TABLES,
  statsGrouped,
  statsMedian,
  statsMode,
  statsModel as model,
  type StatsState,
} from "./stats";

const start = model.initialize(model.defaultParams);
const derive = (state: StatsState = start) => model.derive(state, model.defaultParams);
const withSet = (set: number) => model.setVariable(start, "set", set, model.defaultParams);
const withTable = (table: number) => model.setVariable(start, "table", table, model.defaultParams);
const set = (state: StatsState, id: string, value: number) => model.setVariable(state, id, value, model.defaultParams);

describe("the centre of a set of marks", () => {
  it("finds the median as the middle value, or the average of the two middle ones", () => {
    expect(statsMedian([7, 3, 9, 1, 5])).toBe(5);
    expect(statsMedian([4, 1, 3, 2])).toBe(2.5);
    expect(statsMode([2, 3, 3, 5, 5])).toEqual({ mode: 3, frequency: 2, ties: 2 });
  });

  it("gives the class test a mean, median and mode of 11", () => {
    // 11 + 6 + 8 + 9 + 10 + 11 + 11 + 13 + 14 + 17 = 110 over 10 students.
    expect(derive()).toMatchObject({ count: 10, sum: 110, mean: 11, median: 11, mode: 11, modeFrequency: 3, modeKind: 1, deviationSum: 0, mark: 11 });
  });

  it("balances: the deviations from the mean add to zero for any marks", () => {
    let s = start;
    for (const [id, v] of [["m1", 20], ["m3", 0], ["m7", 19]] as const) s = set(s, id, v);
    expect(derive(s).deviationSum).toBe(0);
    expect(derive(set(withSet(1), "m2", 3)).deviationSum).toBe(0);
  });

  it("lets one far-out mark drag the mean but not the median", () => {
    const at = (m: number) => derive(set(start, "m1", m));
    expect(at(11)).toMatchObject({ mean: 11, median: 11 });
    expect(at(20)).toMatchObject({ mean: 11.9, median: 11 });
    // The red dot at 16 makes the total 115: a mean of 11.5.
    expect(at(16).mean).toBeCloseTo(11.5, 12);
    // The far-out set: 20, 6, 6, 7, 7, 7, 8, 8, 9 — nine marks, the middle (fifth) is 7.
    const far = derive(withSet(2));
    expect(far).toMatchObject({ count: 9, median: 7, mode: 7, sum: 78 });
    expect(far.mean).toBeCloseTo(78 / 9, 12);
    const tamed = derive(set(withSet(2), "m1", 9));
    expect(tamed.median).toBe(7);
    expect(tamed.mean).toBeCloseTo(67 / 9, 12);
  });

  it("averages the two middle marks of an even count, and says when there is no mode", () => {
    // 4, 6, 7, 8 | 10, 12, 12, 13: the middle two are 8 and 10.
    expect(derive(withSet(1))).toMatchObject({ count: 8, mean: 9, median: 9, mode: 12, modeKind: 1 });
    let s = set(withSet(1), "count", 5); // 6, 7, 10, 12, 13
    expect(derive(s)).toMatchObject({ median: 10, modeKind: 0, mode: 0, modeFrequency: 1 });
    s = set(set(s, "m1", 7), "m3", 12); // 7, 7, 12, 12, 13: two modes
    expect(derive(s)).toMatchObject({ modeKind: 2, mode: 7 });
  });
});

describe("the spread", () => {
  it("works the NCERT-style eight marks: mean 9, variance 9.25", () => {
    // Deviations −3, −2, 1, 3, 4, −5, −1, 3; squares add to 74; 74/8 = 9.25.
    const r = derive(withSet(1));
    expect(r).toMatchObject({ range: 9, min: 4, max: 13, mdMean: 2.75, mdMedian: 2.75, variance: 9.25 });
    expect(r.sd).toBeCloseTo(3.0414, 4);
  });

  it("works the class test: range 11, mean deviation 2.2, variance 8.8", () => {
    const r = derive();
    expect(r).toMatchObject({ range: 11, mdMean: 2.2, mdMedian: 2.2 });
    expect(r.variance).toBeCloseTo(8.8, 12);
    expect(r.sd).toBeCloseTo(2.9665, 4);
  });

  it("gives bunched and spread-out marks the same mean but different spreads", () => {
    const bunched = derive(withSet(3));
    const spread = derive(withSet(4));
    expect(bunched).toMatchObject({ mean: 10, median: 10, range: 2 });
    expect(spread).toMatchObject({ mean: 10, median: 10, range: 16, variance: 24 });
    expect(bunched.variance).toBeCloseTo(0.4, 12);
    expect(spread.sd).toBeCloseTo(Math.sqrt(24), 12);
  });

  it("takes the mean deviation about the median no larger than about the mean", () => {
    const r = derive(withSet(2));
    // About the median 7: 13 + 1 + 1 + 0 + 0 + 0 + 1 + 1 + 2 = 19, over 9.
    expect(r.mdMedian).toBeCloseTo(19 / 9, 12);
    expect(r.mdMedian).toBeLessThan(r.mdMean);
  });
});

describe("a change of scale", () => {
  it("leaves the spread alone when a constant is added", () => {
    const r = derive(set(withSet(1), "shift", 5));
    expect(r).toMatchObject({ newMean: 14, newMedian: 14, newRange: 9, newVariance: 9.25 });
    expect(r.newSd).toBeCloseTo(r.sd, 12);
  });

  it("multiplies σ by |k| and σ² by k²", () => {
    const doubled = derive(set(withSet(1), "scale", 2));
    expect(doubled).toMatchObject({ newMean: 18, newRange: 18, newVariance: 37 });
    expect(doubled.newSd).toBeCloseTo(2 * doubled.sd, 12);
    const flipped = derive(set(set(withSet(1), "scale", -2), "shift", 10));
    expect(flipped).toMatchObject({ newMean: -8, newMedian: -8, newVariance: 37 });
    expect(flipped.newSd).toBeCloseTo(2 * flipped.sd, 12);
  });
});

describe("grouped data", () => {
  it("works the class 10 marks table: mean 62 by either method, median 62.5, mode 52", () => {
    // Class marks 17.5 … 92.5; Σfx = 1860 over 30. With a = 47.5 and h = 15, u = −2 … 3 and Σfu = 29.
    const r = derive();
    expect(r).toMatchObject({ total: 30, sumFx: 1860, groupedMean: 62, assumedMean: 47.5, sumFu: 29, stepMean: 62 });
    // Cumulative 2, 5, 12, 18, 24, 30: n/2 = 15 falls in 55–70. 55 + (15 − 12)/6 × 15 = 62.5.
    expect(r).toMatchObject({ halfN: 15, medianClass: 4, medianLower: 55, cfBefore: 12, medianFreq: 6, groupedMedian: 62.5 });
    expect([r.cf1, r.cf2, r.cf3, r.cf4, r.cf5, r.cf6, r.cf7]).toEqual([2, 5, 12, 18, 24, 30, 0]);
    // Modal class 40–55 (f = 7), with 3 before and 6 after: 40 + (7 − 3)/(14 − 3 − 6) × 15 = 52.
    expect(r).toMatchObject({ modalClass: 3, modalLower: 40, modeBefore: 3, modalFreq: 7, modeAfter: 6, groupedMode: 52 });
  });

  it("gives the same mean whichever class mark is the assumed mean", () => {
    for (let a = 1; a <= 6; a++) expect(derive(set(start, "assumed", a)).stepMean).toBeCloseTo(62, 12);
    expect(derive(set(start, "assumed", 1))).toMatchObject({ assumedMean: 17.5, sumFu: 89 });
  });

  it("works the homework table: mean 28.6, median 28, mode 27", () => {
    const r = derive(withTable(1));
    expect(r).toMatchObject({ total: 50, sumFx: 1430, medianClass: 3, cfBefore: 13, groupedMedian: 28, modalClass: 3, groupedMode: 27 });
    expect(r.groupedMean).toBeCloseTo(28.6, 12);
    expect(r.stepMean).toBeCloseTo(28.6, 12);
  });

  it("works the class 11 table: mean 62, variance 201, σ ≈ 14.18", () => {
    // a = 65, h = 10: Σfu = −15, Σfu² = 105; σ² = 100 × (105/50 − (15/50)²) = 201.
    const r = derive(withTable(2));
    expect(r).toMatchObject({ classCount: 7, total: 50, sumFx: 3100, groupedMean: 62, assumedMean: 65, sumFu: -15, sumFu2: 105, groupedMedian: 62, groupedMode: 63 });
    expect(r.groupedVariance).toBeCloseTo(201, 10);
    expect(r.groupedSd).toBeCloseTo(14.177, 3);
    expect(r.stepMean).toBeCloseTo(62, 12);
  });

  it("agrees with the direct definition of the grouped variance", () => {
    for (const t of STATS_TABLES) {
      const g = statsGrouped(t.lower, t.width, t.frequencies, 1);
      const direct = t.frequencies.reduce((s, f, i) => s + f * (t.lower + t.width * (i + 0.5) - g.mean) ** 2, 0) / g.total;
      expect(g.variance, t.label).toBeCloseTo(direct, 9);
    }
  });

  it("counts a missing neighbour of the modal class as 0", () => {
    const s = set(start, "f1", 12); // 12, 3, 7, …: the first class is modal
    expect(derive(s)).toMatchObject({ modalClass: 1, modeBefore: 0, modalFreq: 12, modeAfter: 3 });
    // 10 + (12 − 0)/(24 − 0 − 3) × 15
    expect(derive(s).groupedMode).toBeCloseTo(10 + (12 / 21) * 15, 12);
  });

  it("drags a bar and moves the mean, and leaves classes the table does not have alone", () => {
    const r = derive(set(start, "f6", 12));
    expect(r.total).toBe(36);
    expect(r.groupedMean).toBeGreaterThan(62);
    expect(set(start, "f7", 9)).toBe(start);
  });
});

describe("the numbers the levels quote", () => {
  it("agrees with every worked answer in the text", () => {
    const eight = withSet(1);
    const doubled = derive(set(eight, "scale", 2));
    expect(derive(eight).sd).toBeCloseTo(3.04, 2);
    expect(doubled.newSd).toBeCloseTo(6.08, 2);
    expect(doubled.newVariance).toBeCloseTo(37, 10);
    const flipped = derive(set(set(eight, "scale", -2), "shift", 10));
    expect(flipped.newSd).toBeCloseTo(6.08, 2);
    expect(flipped.newMean).toBe(-8);
    expect(derive(set(eight, "shift", 5)).newMean).toBe(14);
    // a = 77.5: u runs −4 … 1, Σfu = −31, and 77.5 − 15.5 = 62.
    expect(derive(set(start, "assumed", 5))).toMatchObject({ assumedMean: 77.5, sumFu: -31, stepMean: 62 });
    // The sort cards: a 0 among the far-out set, and the first five of the eight marks.
    const low = derive(set(withSet(2), "m1", 0));
    expect(low.mean).toBeCloseTo(58 / 9, 12);
    expect(low.median).toBe(7);
    expect(derive(set(eight, "count", 5))).toMatchObject({ mean: 9.6, median: 10 });
    expect(derive(set(start, "m1", 20))).toMatchObject({ mean: 11.9, median: 11 });
    // Half the marks at 0 and half at 20 gives σ = 10.
    let ends = withSet(3);
    for (let i = 1; i <= 10; i++) ends = set(ends, `m${i}`, i <= 5 ? 0 : 20);
    expect(derive(ends).sd).toBe(10);
  });
});

describe("the model", () => {
  it("loads each data set and table whole", () => {
    STATS_SETS.forEach((s, i) => {
      const r = derive(withSet(i));
      expect(r.count, s.label).toBe(s.marks.length);
      expect(r.m1, s.label).toBe(s.marks[0]);
      expect(r.sum, s.label).toBe(s.marks.reduce((a, b) => a + b, 0));
    });
    STATS_TABLES.forEach((t, i) => {
      const r = derive(withTable(i));
      expect(r).toMatchObject({ classCount: t.frequencies.length, classLower: t.lower, classWidth: t.width, assumed: t.assumed });
    });
  });

  it("clamps every variable to its range", () => {
    expect(derive(set(start, "m1", 99)).mark).toBe(20);
    expect(derive(set(start, "m1", -5)).mark).toBe(0);
    expect(derive(set(start, "count", 30)).count).toBe(10);
    expect(derive(set(start, "count", 1)).count).toBe(5);
    expect(derive(set(start, "scale", 9)).scale).toBe(3);
    expect(derive(set(start, "shift", -99)).shift).toBe(-10);
    expect(derive(set(start, "f2", 50)).f2).toBe(20);
    expect(derive(set(start, "assumed", 9)).assumed).toBe(6);
    expect(derive(set(start, "set", 9)).set).toBe(4);
    expect(model.getVariable(set(start, "m4", 3), "m4")).toBe(3);
    expect(model.getVariable(start, "assumed")).toBe(3);
  });

  it("steps the picked-out mark by one", () => {
    expect(derive(model.step(start, model.defaultParams, 1)).mark).toBe(12);
    expect(derive(model.step(set(start, "m1", 0), model.defaultParams, -1)).mark).toBe(0);
  });

  it("numbers every output, even with every frequency zero", () => {
    let empty = start;
    for (let i = 1; i <= 6; i++) empty = set(empty, `f${i}`, 0);
    const cases = [start, empty, set(set(start, "scale", -2), "shift", -10), withTable(2), withSet(2)];
    for (const s of cases) {
      const r = derive(s);
      for (const key of model.outputs) {
        expect(Number.isFinite(r[key]), key).toBe(true);
        expect(Object.is(r[key], -0), key).toBe(false);
      }
    }
    expect(derive(empty)).toMatchObject({ empty: 1, total: 0, groupedMean: 0, groupedMedian: 0, groupedMode: 0 });
  });
});
