import { describe, expect, it } from "vitest";
import {
  BIG_NUMBERS_CRORE,
  BIG_NUMBERS_LAKH,
  BIG_NUMBERS_LIMITS,
  BIG_NUMBERS_MILLION,
  BIG_NUMBERS_THOUSAND,
  bigNumbersDigitCount,
  bigNumbersFromRoman,
  bigNumbersGreatestPlace,
  bigNumbersIndianCommas,
  bigNumbersIndianWords,
  bigNumbersInternationalCommas,
  bigNumbersInternationalWords,
  bigNumbersModel as model,
  type BigNumbersParams,
  type BigNumbersState,
  bigNumbersRomanParts,
  bigNumbersRound,
  bigNumbersRoundGreatest,
  bigNumbersToRoman,
} from "./bignumbers";

const P = model.defaultParams;
const S = model.initialize(P);
const derive = (params: Partial<BigNumbersParams> = {}, state: Partial<BigNumbersState> = {}) => model.derive({ ...S, ...state }, { ...P, ...params });
/** A number from its Indian periods. */
const periods = (crores: number, lakhs: number, thousands: number, ones: number) => ({ crores, lakhs, thousands, ones });

describe("the big units", () => {
  it("1 lakh = 100 thousand, 10 lakh = 1 million, 1 crore = 10 million", () => {
    expect(BIG_NUMBERS_LAKH).toBe(100 * BIG_NUMBERS_THOUSAND);
    expect(10 * BIG_NUMBERS_LAKH).toBe(BIG_NUMBERS_MILLION);
    expect(BIG_NUMBERS_CRORE).toBe(10 * BIG_NUMBERS_MILLION);
    expect(BIG_NUMBERS_CRORE).toBe(100 * BIG_NUMBERS_LAKH);
  });

  it("builds the number from its Indian periods", () => {
    // 4 crore 56 lakh 78 thousand 912 = 4,56,78,912 = 45,678,912.
    const r = derive(periods(4, 56, 78, 912));
    expect(r).toMatchObject({ number: 45_678_912, digits: 8, millionsPeriod: 45, thousandsIntl: 678 });
    expect(r.inLakhs).toBeCloseTo(456.78912, 9);
    expect(r.inMillions).toBeCloseTo(45.678912, 9);
    expect(r.inCrores).toBeCloseTo(4.5678912, 9);
    // 10 lakh is 1 million, and 1 crore is 10 million.
    expect(derive(periods(0, 10, 0, 0))).toMatchObject({ number: 1_000_000, inMillions: 1, inLakhs: 10, digits: 7 });
    expect(derive(periods(1, 0, 0, 0))).toMatchObject({ number: 10_000_000, inMillions: 10, inLakhs: 100, inCrores: 1, digits: 8 });
    // The largest: 99,99,99,999 = 999,999,999.
    expect(derive(periods(99, 99, 99, 999))).toMatchObject({ number: 999_999_999, digits: 9 });
    // The smallest 6-digit number is 1 lakh.
    expect(derive(periods(0, 0, 99, 999))).toMatchObject({ number: 99_999, digits: 5 });
    expect(derive(periods(0, 1, 0, 0))).toMatchObject({ number: 100_000, digits: 6 });
  });

  it("clamps the periods to their places", () => {
    expect(derive(periods(150, -3, 100.4, 1200))).toMatchObject({ crores: 99, lakhs: 0, thousands: 99, ones: 999 });
  });

  it("places commas the Indian and the international way", () => {
    expect(bigNumbersIndianCommas(45_678_912)).toBe("4,56,78,912");
    expect(bigNumbersInternationalCommas(45_678_912)).toBe("45,678,912");
    expect(bigNumbersIndianCommas(12_345_678)).toBe("1,23,45,678");
    expect(bigNumbersInternationalCommas(12_345_678)).toBe("12,345,678");
    expect(bigNumbersIndianCommas(100_000)).toBe("1,00,000");
    expect(bigNumbersIndianCommas(999_999_999)).toBe("99,99,99,999");
    expect(bigNumbersInternationalCommas(999_999_999)).toBe("999,999,999");
    expect(bigNumbersIndianCommas(5290)).toBe("5,290");
    expect(bigNumbersIndianCommas(912)).toBe("912");
    expect(bigNumbersIndianCommas(0)).toBe("0");
  });

  it("writes numbers in words both ways", () => {
    expect(bigNumbersIndianWords(12_345_678)).toBe("one crore twenty-three lakh forty-five thousand six hundred seventy-eight");
    expect(bigNumbersInternationalWords(12_345_678)).toBe("twelve million three hundred forty-five thousand six hundred seventy-eight");
    expect(bigNumbersIndianWords(45_678_912)).toBe("four crore fifty-six lakh seventy-eight thousand nine hundred twelve");
    expect(bigNumbersInternationalWords(45_678_912)).toBe("forty-five million six hundred seventy-eight thousand nine hundred twelve");
    expect(bigNumbersIndianWords(1_000_000)).toBe("ten lakh");
    expect(bigNumbersInternationalWords(1_000_000)).toBe("one million");
    expect(bigNumbersIndianWords(10_000_000)).toBe("one crore");
    expect(bigNumbersInternationalWords(10_000_000)).toBe("ten million");
    expect(bigNumbersIndianWords(100_005)).toBe("one lakh five");
    expect(bigNumbersInternationalWords(100_005)).toBe("one hundred thousand five");
    expect(bigNumbersIndianWords(0)).toBe("zero");
    expect(bigNumbersIndianWords(1_000_000_000)).toBe("one hundred crore");
    expect(bigNumbersInternationalWords(1_000_000_000)).toBe("one billion");
  });

  it("counts digits", () => {
    expect(bigNumbersDigitCount(0)).toBe(1);
    expect(bigNumbersDigitCount(99_999)).toBe(5);
    expect(bigNumbersDigitCount(100_000)).toBe(6);
  });
});

describe("rounding and estimating", () => {
  it("rounds to the nearest ten, hundred, thousand and lakh, with 5 rounding up", () => {
    expect(bigNumbersRound(7850, 10)).toBe(7850);
    expect(bigNumbersRound(7850, 100)).toBe(7900);
    expect(bigNumbersRound(7850, 1000)).toBe(8000);
    expect(bigNumbersRound(7849, 100)).toBe(7800);
    expect(bigNumbersRound(15, 10)).toBe(20);
    expect(bigNumbersRound(14, 10)).toBe(10);
    expect(bigNumbersRound(478_632, BIG_NUMBERS_LAKH)).toBe(500_000);
  });

  it("rounds the big number to the chosen place", () => {
    // 4,78,632 to the nearest lakh is 5,00,000, 21,368 away.
    expect(derive({ ...periods(0, 4, 78, 632), place: 5 })).toMatchObject({ roundUnit: 100_000, roundLow: 400_000, roundHigh: 500_000, rounded: 500_000, roundGap: 21_368, roundedUp: 1 });
    // To the nearest ten thousand: 4,80,000. To the nearest ten lakh: 0.
    expect(derive({ ...periods(0, 4, 78, 632), place: 4 })).toMatchObject({ rounded: 480_000 });
    expect(derive({ ...periods(0, 4, 78, 632), place: 6 })).toMatchObject({ rounded: 0, roundedUp: 0, roundGap: 478_632 });
    // 4,56,78,912 to the nearest lakh: 4,57,00,000.
    expect(derive({ ...periods(4, 56, 78, 912), place: 5 })).toMatchObject({ rounded: 45_700_000, roundGap: 21_088 });
    // 7,850: to tens 7,850, hundreds 7,900, thousands 8,000.
    expect([1, 2, 3].map((place) => derive({ ...periods(0, 0, 7, 850), place }).roundGap)).toEqual([0, 50, 150]);
    // The place clamps to ten … crore.
    expect(derive({ place: 12 }).roundUnit).toBe(BIG_NUMBERS_CRORE);
    expect(derive({ place: 0 }).roundUnit).toBe(10);
  });

  it("estimates a sum by rounding both numbers to the same place", () => {
    // NCERT: 5,290 + 17,986 ≈ 5,000 + 18,000 = 23,000; exactly 23,276.
    expect(derive({ p: 5290, q: 17_986, place: 3 })).toMatchObject({ pRounded: 5000, qRounded: 18_000, sumEstimate: 23_000, sumExact: 23_276, sumGap: 276 });
    // To hundreds: 5,300 + 18,000 = 23,300.
    expect(derive({ p: 5290, q: 17_986, place: 2 })).toMatchObject({ sumEstimate: 23_300 });
  });

  it("estimates a product by rounding each factor to its greatest place", () => {
    expect(bigNumbersGreatestPlace(182)).toBe(100);
    expect(bigNumbersGreatestPlace(7)).toBe(1);
    expect(bigNumbersRoundGreatest(182)).toBe(200);
    expect(bigNumbersRoundGreatest(63)).toBe(60);
    expect(bigNumbersRoundGreatest(95)).toBe(100);
    // NCERT: 63 × 182 ≈ 60 × 200 = 12,000; exactly 11,466.
    expect(derive({ p: 63, q: 182 })).toMatchObject({ pGreatest: 60, qGreatest: 200, productEstimate: 12_000, productExact: 11_466, productGap: 534 });
    // 578 × 161 ≈ 600 × 200 = 1,20,000; exactly 93,058.
    expect(derive({ p: 578, q: 161 })).toMatchObject({ productEstimate: 120_000, productExact: 93_058 });
  });
});

describe("Roman numerals", () => {
  it("writes numbers place by place with the subtractive pairs", () => {
    expect(bigNumbersToRoman(4)).toBe("IV");
    expect(bigNumbersToRoman(9)).toBe("IX");
    expect(bigNumbersToRoman(14)).toBe("XIV");
    expect(bigNumbersToRoman(40)).toBe("XL");
    expect(bigNumbersToRoman(49)).toBe("XLIX");
    expect(bigNumbersToRoman(90)).toBe("XC");
    expect(bigNumbersToRoman(400)).toBe("CD");
    expect(bigNumbersToRoman(900)).toBe("CM");
    expect(bigNumbersToRoman(1994)).toBe("MCMXCIV");
    expect(bigNumbersToRoman(2026)).toBe("MMXXVI");
    expect(bigNumbersToRoman(3999)).toBe("MMMCMXCIX");
    expect(bigNumbersToRoman(0)).toBe("");
    expect(bigNumbersToRoman(4000)).toBe("");
    expect(bigNumbersRomanParts(1994)).toEqual(["M", "CM", "XC", "IV"]);
  });

  it("reads numerals back, and refuses ones that break the rules", () => {
    expect(bigNumbersFromRoman("XLIX")).toBe(49);
    expect(bigNumbersFromRoman("MCMXCIV")).toBe(1994);
    expect(bigNumbersFromRoman("lxxxix")).toBe(89);
    // Never more than three in a row; V, L and D never repeated or taken away; I only from V and X.
    for (const bad of ["IIII", "VV", "VX", "IC", "IL", "XXXX", "DD", "LC", "LL", "ABC", ""]) expect(bigNumbersFromRoman(bad), bad).toBeNaN();
    // The numerals the level marks as written correctly.
    expect(["XIV", "XC", "MCM", "XXXIX"].map(bigNumbersFromRoman)).toEqual([14, 90, 1900, 39]);
  });

  it("converts every number from 1 to 3999 there and back", () => {
    for (let n = 1; n <= 3999; n++) expect(bigNumbersFromRoman(bigNumbersToRoman(n))).toBe(n);
  });

  it("counts symbols and subtractive pairs", () => {
    expect(derive({ rThousands: 1, rHundreds: 9, rTens: 9, rOnes: 4 })).toMatchObject({ romanValue: 1994, romanSymbols: 7, romanPairs: 3, romanValid: 1 });
    expect(derive({ rThousands: 3, rHundreds: 8, rTens: 8, rOnes: 8 })).toMatchObject({ romanValue: 3888, romanSymbols: 15, romanPairs: 0 });
    expect(derive({ rThousands: 0, rHundreds: 0, rTens: 0, rOnes: 0 })).toMatchObject({ romanValue: 0, romanSymbols: 0, romanValid: 0 });
    expect(derive({ rThousands: 7, rHundreds: 12, rTens: -1, rOnes: 4.4 })).toMatchObject({ romanThousands: 3, romanHundreds: 9, romanTens: 0, romanOnes: 4 });
  });
});

describe("direct proportion: pens and their cost", () => {
  it("keeps cost ÷ pens the same", () => {
    // 5 pens at ₹12 cost ₹60; 8 pens cost ₹96.
    expect(derive({ penPrice: 12 }, { pens: 5 })).toMatchObject({ cost: 60, costPerPen: 12 });
    expect(derive({ penPrice: 12 }, { pens: 8 })).toMatchObject({ cost: 96, costPerPen: 12 });
    // Double the pens, double the cost.
    expect(derive({ penPrice: 12 }, { pens: 10 }).cost).toBe(2 * derive({ penPrice: 12 }, { pens: 5 }).cost);
    // No pens, no cost: the line goes through 0.
    expect(derive({ penPrice: 12 }, { pens: 0 })).toMatchObject({ cost: 0, costPerPen: 12 });
  });
});

describe("inverse proportion: workers and days", () => {
  it("keeps workers × days the same", () => {
    // 6 workers take 10 days; 4 workers take 15; 15 workers take 4.
    expect(derive({ work: 60 }, { workers: 6 })).toMatchObject({ days: 10, daysN: 10, daysD: 1, daysWhole: 1, workerDays: 60 });
    expect(derive({ work: 60 }, { workers: 4 })).toMatchObject({ days: 15, workerDays: 60 });
    expect(derive({ work: 60 }, { workers: 15 })).toMatchObject({ days: 4, workerDays: 60 });
    // Double the workers, half the days.
    expect(derive({ work: 60 }, { workers: 12 }).days).toBe(derive({ work: 60 }, { workers: 6 }).days / 2);
  });

  it("keeps fractional days exact", () => {
    const seven = derive({ work: 60 }, { workers: 7 });
    expect(seven).toMatchObject({ daysN: 60, daysD: 7, daysWhole: 0, workerDays: 60 });
    expect(seven.days).toBeCloseTo(8.5714, 4);
    expect(derive({ work: 60 }, { workers: 8 })).toMatchObject({ days: 7.5, daysN: 15, daysD: 2, workerDays: 60 });
    // On the curve of work 36, workers = days at 6.
    expect(derive({ work: 36 }, { workers: 6 })).toMatchObject({ days: 6 });
  });

  it("never reaches zero days, even with the most workers", () => {
    const r = derive({ work: 1 }, { workers: BIG_NUMBERS_LIMITS.workers[1] });
    expect(r.days).toBeGreaterThan(0);
    expect(r).toMatchObject({ daysN: 1, daysD: 30 });
  });
});

describe("state and controls", () => {
  it("clamps the pens and workers it is given", () => {
    expect(model.setVariable(S, "pens", 25, P).pens).toBe(20);
    expect(model.setVariable(S, "pens", -2, P).pens).toBe(0);
    expect(model.setVariable(S, "workers", 0, P).workers).toBe(1);
    expect(model.setVariable(S, "workers", 7.6, P).workers).toBe(8);
    expect(model.setVariable(S, "nothing", 3, P)).toBe(S);
    expect(model.getVariable(S, "pens")).toBe(5);
    expect(model.getVariable(S, "nothing")).toBeUndefined();
  });

  it("adds one pen and one worker a second on Play, and stops at the limits", () => {
    const later = model.advance(S, 2.5, P);
    expect(model.derive(later, P)).toMatchObject({ pens: 7, workers: 8 });
    const end = model.advance(S, 100, P);
    expect(end).toEqual({ pens: 20, workers: 30 });
    expect(model.step(S, P, 1)).toEqual({ pens: 6, workers: 7 });
    expect(model.step({ pens: 0, workers: 1 }, P, -1)).toEqual({ pens: 0, workers: 1 });
  });

  it("gives only finite numbers and no −0", () => {
    const extremes: Partial<BigNumbersParams>[] = [
      {},
      { ...periods(0, 0, 0, 0), place: 7, p: 1, q: 1, rThousands: 0, rHundreds: 0, rTens: 0, rOnes: 0, penPrice: 1, work: 1 },
      { ...periods(99, 99, 99, 999), place: 7, p: 99_999, q: 99_999, rThousands: 3, rHundreds: 9, rTens: 9, rOnes: 9, penPrice: 100, work: 360 },
      { crores: Number.NaN, place: Number.POSITIVE_INFINITY, p: Number.NaN, work: Number.NaN },
    ];
    for (const params of extremes) {
      for (const state of [S, { pens: 0, workers: 1 }, { pens: Number.NaN, workers: Number.NaN }]) {
        const r = model.derive(state, { ...P, ...params });
        for (const key of model.outputs) {
          expect(Number.isFinite(r[key]), key).toBe(true);
          expect(Object.is(r[key], -0), key).toBe(false);
        }
      }
    }
  });
});
