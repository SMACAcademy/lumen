import { describe, expect, it } from "vitest";
import {
  CHANCE_EVENT_ORDER,
  CHANCE_EVENTS,
  CHANCE_SURVEY_ORDER,
  CHANCE_SURVEYS,
  CHANCE_THEORY_ORDER,
  CHANCE_TRIALS_MAX,
  chanceFaceCounts,
  chanceLikelihood,
  chanceModel as model,
  chanceTallyCounts,
  type ChanceParams,
  type ChanceState,
} from "./chance";

const base: ChanceState = { counted: 0, row: 1, key: 1, trials: 0, red: 3, blue: 5, green: 2 };
const derive = (params: Partial<ChanceParams> = {}, state: Partial<ChanceState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

describe("the surveys", () => {
  it("hold every answer once, in a fixed order", () => {
    for (const id of CHANCE_SURVEY_ORDER) {
      const s = CHANCE_SURVEYS[id];
      expect(s.order.length, id).toBe(s.counts.reduce((a, b) => a + b, 0));
      expect(chanceTallyCounts(id, s.order.length), id).toEqual([...s.counts]);
      expect(s.categories).toHaveLength(5);
      expect(s.short).toHaveLength(5);
    }
    expect(CHANCE_SURVEYS.fruits.order.length).toBe(40);
    expect(CHANCE_SURVEYS.shoes.order.length).toBe(30);
    expect(CHANCE_SURVEYS.travel.order.length).toBe(75);
  });

  it("counts only the answers ticked off so far", () => {
    const half = derive({ survey: "fruits" }, { counted: 20 });
    expect(half.counted).toBe(20);
    expect(half.c1 + half.c2 + half.c3 + half.c4 + half.c5).toBe(20);
    expect(half.done).toBe(0);
    expect(derive({ survey: "fruits" }, { counted: 0 })).toMatchObject({ c1: 0, mostRow: 0, rowCount: 0 });
  });

  it("makes the frequency table of favourite fruits: 12, 8, 6, 10, 4", () => {
    const r = derive({ survey: "fruits" }, { counted: 75 });
    expect(r).toMatchObject({ total: 40, counted: 40, done: 1, c1: 12, c2: 8, c3: 6, c4: 10, c5: 4 });
    expect(r).toMatchObject({ mostRow: 1, mostCount: 12, leastCount: 4, difference: 8 });
  });

  it("writes 12 as two groups of five and two strokes", () => {
    expect(derive({ survey: "fruits" }, { counted: 40, row: 1 })).toMatchObject({ rowCount: 12, rowGroups: 2, rowLeft: 2 });
    expect(derive({ survey: "fruits" }, { counted: 40, row: 4 })).toMatchObject({ rowCount: 10, rowGroups: 2, rowLeft: 0 });
    expect(derive({ survey: "shoes" }, { counted: 30, row: 2 })).toMatchObject({ rowCount: 7, rowGroups: 1, rowLeft: 2 });
  });

  it("finds that most students in the travel survey come by bus", () => {
    expect(derive({ survey: "travel" }, { counted: 75 })).toMatchObject({ mostRow: 2, mostCount: 25, leastCount: 5, difference: 20 });
  });
});

describe("pictographs and bar graphs", () => {
  it("draws 12 mangoes as 6 pictures when one picture stands for 2", () => {
    expect(derive({ survey: "fruits" }, { counted: 40, row: 1, key: 2 })).toMatchObject({ rowPictures: 6, allWhole: 1 });
  });

  it("needs half pictures when the key does not divide every count", () => {
    const r = derive({ survey: "fruits" }, { counted: 40, row: 3, key: 4 });
    expect(r).toMatchObject({ rowCount: 6, rowPictures: 1.5, allWhole: 0 });
  });

  it("goes whole with a key of 5 for the travel survey, and not for the fruits", () => {
    expect(derive({ survey: "travel" }, { counted: 75, key: 5 }).allWhole).toBe(1);
    expect(derive({ survey: "travel" }, { counted: 75, key: 10 }).allWhole).toBe(0);
    expect(derive({ survey: "fruits" }, { counted: 40, key: 5 }).allWhole).toBe(0);
    expect(derive({ survey: "shoes" }, { counted: 30, key: 2 }).allWhole).toBe(0);
  });

  it("tops the bar graph's scale at the next multiple of the step", () => {
    expect(derive({ survey: "fruits" }, { counted: 40, key: 5 }).scaleTop).toBe(15);
    expect(derive({ survey: "fruits" }, { counted: 40, key: 2 }).scaleTop).toBe(12);
    expect(derive({ survey: "travel" }, { counted: 75, key: 10 }).scaleTop).toBe(30);
    expect(derive({ survey: "fruits" }, { counted: 0, key: 4 }).scaleTop).toBe(4);
  });
});

describe("chance words", () => {
  it("places each event from impossible (0) to certain (4)", () => {
    expect(chanceLikelihood(0, 6)).toBe(0);
    expect(chanceLikelihood(1, 6)).toBe(1);
    expect(chanceLikelihood(1, 2)).toBe(2);
    expect(chanceLikelihood(26, 52)).toBe(2);
    expect(chanceLikelihood(5, 6)).toBe(3);
    expect(chanceLikelihood(6, 6)).toBe(4);
    const word = (event: ChanceParams["event"]) => derive({ event }).likelihood;
    expect([word("sun-east"), word("seven"), word("six"), word("head"), word("not-six"), word("month-32")]).toEqual([4, 0, 1, 2, 3, 0]);
  });

  it("gives the exact chance of each event", () => {
    expect(derive({ event: "ace" }).eventChance).toBeCloseTo(1 / 13, 12);
    expect(derive({ event: "not-sunday" }).eventChance).toBeCloseTo(6 / 7, 12);
    for (const id of CHANCE_EVENT_ORDER) {
      const e = CHANCE_EVENTS[id];
      expect(e.favourable).toBeLessThanOrEqual(e.possible);
      expect(Number.isFinite(derive({ event: id }).eventChance), id).toBe(true);
    }
  });
});

describe("the experiment", () => {
  it("replays the same tosses: a run of n is the start of a longer run", () => {
    expect(chanceFaceCounts("coin", 1000).reduce((a, b) => a + b, 0)).toBe(1000);
    expect(chanceFaceCounts("die", 600).reduce((a, b) => a + b, 0)).toBe(600);
    const first = chanceFaceCounts("die", 100);
    const more = chanceFaceCounts("die", 200);
    first.forEach((c, i) => expect(more[i]).toBeGreaterThanOrEqual(c));
  });

  it("gets 8 heads in the first 10 tosses, and 499 in 1000", () => {
    expect(derive({ experiment: "coin" }, { trials: 10 })).toMatchObject({ trials: 10, hits: 8, experimental: 0.8, theoretical: 0.5 });
    expect(derive({ experiment: "coin" }, { trials: 10 }).gap).toBeCloseTo(0.3, 12);
    expect(derive({ experiment: "coin" }, { trials: 1000 })).toMatchObject({ hits: 499, experimental: 0.499 });
  });

  it("settles the share of sixes near 1/6", () => {
    expect(derive({ experiment: "die" }, { trials: 10 })).toMatchObject({ hits: 3, experimental: 0.3 });
    const long = derive({ experiment: "die" }, { trials: 1000 });
    expect(long).toMatchObject({ hits: 167, experimental: 0.167 });
    expect(long.theoretical).toBeCloseTo(1 / 6, 12);
    expect(long.gap).toBeLessThan(0.001);
  });

  it("shrinks the gap as the trials grow, while the theory stays put", () => {
    for (const experiment of ["coin", "die"] as const) {
      const at = (trials: number) => derive({ experiment }, { trials });
      expect(at(1000).gap).toBeLessThan(at(100).gap);
      expect(at(100).gap).toBeLessThan(at(10).gap);
      expect(at(10).theoretical).toBe(at(1000).theoretical);
    }
  });

  it("reports nothing measured before the first toss", () => {
    expect(derive({ experiment: "coin" }, { trials: 0 })).toMatchObject({ hits: 0, experimental: 0, gap: 0.5 });
    expect(derive({}, { trials: CHANCE_TRIALS_MAX + 50 }).trials).toBe(CHANCE_TRIALS_MAX);
  });
});

describe("favourable over possible", () => {
  it("draws a red ball 3 times in 10 from a bag of 3 red, 5 blue and 2 green", () => {
    const r = derive({ theory: "bag-red" });
    expect(r).toMatchObject({ source: 0, favourable: 3, possible: 10, notFavourable: 7, pEvent: 0.3, empty: 0 });
    expect(r.pNot).toBeCloseTo(0.7, 12);
    expect(derive({ theory: "bag-blue" }).pEvent).toBe(0.5);
    expect(derive({ theory: "bag-green" }).pEvent).toBe(0.2);
  });

  it("counts the deck: 26 red, 13 hearts, 4 kings, 12 face cards, 1 ace of spades", () => {
    const deck = (theory: ChanceParams["theory"]) => derive({ theory });
    expect(deck("card-red")).toMatchObject({ source: 1, favourable: 26, possible: 52, pEvent: 0.5 });
    expect(deck("card-heart")).toMatchObject({ favourable: 13, pEvent: 0.25 });
    expect(deck("card-king").favourable).toBe(4);
    expect(deck("card-king").pEvent).toBeCloseTo(1 / 13, 12);
    expect(deck("card-face").favourable).toBe(12);
    expect(deck("card-face").pEvent).toBeCloseTo(3 / 13, 12);
    expect(deck("card-ace-spades").favourable).toBe(1);
  });

  it("counts the die: 2, 4, 6 are even; 2, 3, 5 are prime; 5, 6 are more than 4", () => {
    expect(derive({ theory: "die-even" })).toMatchObject({ source: 2, favourable: 3, possible: 6, pEvent: 0.5 });
    expect(derive({ theory: "die-prime" })).toMatchObject({ favourable: 3, possible: 6 });
    expect(derive({ theory: "die-over-4" }).pEvent).toBeCloseTo(1 / 3, 12);
  });

  it("always has P(E) + P(not E) = 1", () => {
    for (const theory of CHANCE_THEORY_ORDER) {
      const r = derive({ theory });
      expect(r.pEvent + r.pNot, theory).toBeCloseTo(1, 12);
      expect(r.pEvent).toBeGreaterThanOrEqual(0);
      expect(r.pEvent).toBeLessThanOrEqual(1);
    }
  });

  it("makes red impossible with no red balls, and certain with only red", () => {
    expect(derive({ theory: "bag-red" }, { red: 0 }).pEvent).toBe(0);
    expect(derive({ theory: "bag-red" }, { red: 4, blue: 0, green: 0 })).toMatchObject({ pEvent: 1, pNot: 0 });
  });

  it("flags an empty bag instead of dividing by zero", () => {
    const r = derive({ theory: "bag-blue" }, { red: 0, blue: 0, green: 0 });
    expect(r).toMatchObject({ empty: 1, possible: 0, pEvent: 0, pNot: 0 });
    expect(Object.is(r.pNot, -0)).toBe(false);
  });
});

describe("the controls", () => {
  it("clamps every variable to its range, in whole numbers where it counts", () => {
    let s = model.initialize(model.defaultParams);
    s = model.setVariable(s, "red", 14.6, model.defaultParams);
    s = model.setVariable(s, "blue", -3, model.defaultParams);
    s = model.setVariable(s, "key", 2.4, model.defaultParams);
    s = model.setVariable(s, "row", 9, model.defaultParams);
    s = model.setVariable(s, "trials", 5000, model.defaultParams);
    s = model.setVariable(s, "counted", -4, model.defaultParams);
    expect(s).toMatchObject({ red: 10, blue: 0, key: 2, row: 5, trials: 1000, counted: 0 });
  });

  it("counts and tosses on while playing, and stops at the end", () => {
    const s = model.advance(model.initialize(model.defaultParams), 2, model.defaultParams);
    expect(s.counted).toBe(8);
    expect(s.trials).toBe(100);
    const end = model.advance(s, 1000, model.defaultParams);
    expect(derive({}, end)).toMatchObject({ counted: 40, done: 1, trials: 1000 });
  });

  it("gives finite numbers for every output", () => {
    for (const survey of CHANCE_SURVEY_ORDER)
      for (const theory of CHANCE_THEORY_ORDER) {
        const r = derive({ survey, theory }, { counted: 13, red: 0, blue: 0, green: 0 });
        for (const key of model.outputs) expect(Number.isFinite(r[key]), `${survey} ${theory} ${key}`).toBe(true);
      }
  });
});
