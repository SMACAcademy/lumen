import { describe, expect, it } from "vitest";
import {
  COUNTING_FORM_ORDER,
  COUNTING_RULE_ORDER,
  COUNTING_WORD_ORDER,
  countingCombinations,
  countingDistributions,
  countingExpansion,
  countingFactorial,
  countingFactorialBig,
  countingModel as model,
  countingPascalRow,
  countingPermutations,
  countingWordArrangements,
  type CountingParams,
  type CountingState,
} from "./counting";

const base: CountingState = model.initialize(model.defaultParams);
const derive = (params: Partial<CountingParams> = {}, state: Partial<CountingState> = {}) => model.derive({ ...base, ...state }, { ...model.defaultParams, ...params });

/** Count by listing, to check the formulas against brute force. */
function listArrangements(n: number, r: number, repeat: boolean): number {
  let count = 0;
  const walk = (used: Set<number>, depth: number) => {
    if (depth === r) return void count++;
    for (let k = 0; k < n; k++) {
      if (!repeat && used.has(k)) continue;
      used.add(k);
      walk(repeat ? new Set() : used, depth + 1);
      if (!repeat) used.delete(k);
    }
  };
  walk(new Set(), 0);
  return count;
}

function permutationsOf<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [items.slice()];
  return items.flatMap((item, i) => permutationsOf([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
}

describe("factorials and the counting functions", () => {
  it("works hand-done values exactly", () => {
    expect([0, 1, 2, 3, 4, 5, 10].map(countingFactorial)).toEqual([1, 1, 2, 6, 24, 120, 3628800]);
    expect(countingFactorialBig(20)).toBe(2432902008176640000n);
    expect(countingPermutations(5, 3)).toBe(60);
    expect(countingPermutations(5, 5)).toBe(120);
    expect(countingPermutations(5, 0)).toBe(1);
    expect(countingPermutations(3, 4)).toBe(0);
    expect(countingCombinations(5, 2)).toBe(10);
    expect(countingCombinations(6, 3)).toBe(20);
    expect(countingCombinations(10, 5)).toBe(252);
    expect(countingCombinations(4, 5)).toBe(0);
  });

  it("agrees with listing every arrangement", () => {
    for (let n = 1; n <= 5; n++) {
      for (let r = 1; r <= 4; r++) {
        expect(countingPermutations(n, r), `${n}P${r}`).toBe(listArrangements(n, r, false));
        expect(n ** r, `${n}^${r}`).toBe(listArrangements(n, r, true));
      }
    }
  });

  it("makes each team r! arrangements, and is symmetric", () => {
    for (let n = 1; n <= 10; n++) {
      for (let r = 0; r <= n; r++) {
        expect(countingCombinations(n, r) * countingFactorial(r)).toBe(countingPermutations(n, r));
        expect(countingCombinations(n, r)).toBe(countingCombinations(n, n - r));
      }
    }
  });

  it("counts a word's arrangements, repeats divided out", () => {
    expect(countingWordArrangements("MISSISSIPPI")).toBe(34650);
    expect(countingWordArrangements("BANANA")).toBe(60);
    expect(countingWordArrangements("LETTER")).toBe(180);
    expect(countingWordArrangements("ALLAHABAD")).toBe(7560);
    // By listing: the distinct orders of BANANA's letters.
    expect(new Set(permutationsOf([..."BANANA"]).map((p) => p.join(""))).size).toBe(60);
  });

  it("puts identical objects in groups by stars and bars", () => {
    expect(countingDistributions(5, 3, true)).toBe(21);
    expect(countingDistributions(5, 3, false)).toBe(6);
    expect(countingDistributions(2, 3, false)).toBe(0);
    // Brute force: solutions of x + y + z = 5 in whole numbers, and in positive ones.
    let any = 0;
    let positive = 0;
    for (let x = 0; x <= 5; x++) for (let y = 0; x + y <= 5; y++) {
      any++;
      if (x > 0 && y > 0 && 5 - x - y > 0) positive++;
    }
    expect([any, positive]).toEqual([21, 6]);
  });
});

describe("the tree", () => {
  it("multiplies one choice by the next", () => {
    expect(derive({}, { shirts: 3, trousers: 2, shoes: 3 }).outfits).toBe(18);
    expect(derive({}, { shirts: 4, trousers: 4, shoes: 4 }).outfits).toBe(64);
  });
});

describe("arranging and choosing", () => {
  it("fills 3 slots from 5 letters 60 ways, or 125 with repetition", () => {
    expect(derive({ repeat: "no" }, { n: 5, r: 3 })).toMatchObject({ arrangements: 60, selections: 10, orderings: 6, repeat: 0 });
    expect(derive({ repeat: "yes" }, { n: 5, r: 3 })).toMatchObject({ arrangements: 125, repeat: 1 });
  });

  it("makes 5P4 and 5P5 both 120, and 5C2 equal to 5C3", () => {
    expect(derive({}, { n: 5, r: 4 }).arrangements).toBe(120);
    expect(derive({}, { n: 5, r: 5 }).arrangements).toBe(120);
    expect(derive({}, { n: 5, r: 2 }).selections).toBe(10);
    expect(derive({}, { n: 5, r: 3 }).selections).toBe(10);
  });

  it("will not fill more slots than letters without repetition, but will with it", () => {
    expect(derive({ repeat: "no" }, { n: 3, r: 7 })).toMatchObject({ r: 3, arrangements: 6 });
    expect(derive({ repeat: "yes" }, { n: 2, r: 7 })).toMatchObject({ r: 7, arrangements: 128 });
    expect(derive({ repeat: "yes" }, { n: 10, r: 10 }).arrangements).toBe(1e10);
  });
});

describe("restrictions", () => {
  it("seats five people under each rule", () => {
    const count = (rule: CountingParams["rule"]) => derive({ rule }, { people: 5 }).restricted;
    expect(COUNTING_RULE_ORDER.filter((r) => r !== "word").map(count)).toEqual([120, 48, 72, 24, 12]);
  });

  it("agrees with listing for together and apart", () => {
    for (const people of [3, 4, 5, 6]) {
      const all = permutationsOf(Array.from({ length: people }, (_, i) => i));
      const together = all.filter((p) => Math.abs(p.indexOf(0) - p.indexOf(1)) === 1).length;
      expect(derive({ rule: "together" }, { people }).restricted).toBe(together);
      expect(derive({ rule: "apart" }, { people }).restricted).toBe(all.length - together);
    }
  });

  it("agrees with listing for a round table: rotations are the same seating", () => {
    for (const people of [3, 4, 5]) {
      const seatings = new Set(
        permutationsOf(Array.from({ length: people }, (_, i) => i)).map((p) => {
          const start = p.indexOf(0);
          return [...p.slice(start), ...p.slice(0, start)].join("");
        }),
      );
      expect(derive({ rule: "circle" }, { people }).restricted).toBe(seatings.size);
    }
    expect(derive({ rule: "circle" }, { people: 6 }).restricted).toBe(120);
  });

  it("halves the round table for a necklace, which can be turned over", () => {
    expect(derive({ rule: "necklace" }, { people: 3 }).restricted).toBe(1);
    expect(derive({ rule: "necklace" }, { people: 8 }).restricted).toBe(2520);
  });

  it("gives the word's count and the divisor of its repeats", () => {
    expect(derive({ rule: "word", word: "mississippi" })).toMatchObject({ restricted: 34650, things: 11, lineCount: 39916800, repeatDivisor: 1152 });
    expect(derive({ rule: "word", word: "allahabad" })).toMatchObject({ restricted: 7560, repeatDivisor: 48 });
  });
});

describe("distributions", () => {
  it("shares 5 sweets among 3 children 21 ways, or 6 if each gets one", () => {
    expect(derive({ empty: "allowed" }, { objects: 5, groups: 3 })).toMatchObject({ distributions: 21, bars: 2, places: 7 });
    expect(derive({ empty: "none" }, { objects: 5, groups: 3 })).toMatchObject({ distributions: 6, places: 4 });
    expect(derive({ empty: "none" }, { objects: 2, groups: 5 }).distributions).toBe(0);
    expect(derive({}, { objects: 12, groups: 1 }).distributions).toBe(1);
  });
});

describe("the binomial theorem", () => {
  it("builds Pascal's triangle, each entry the sum of the two above", () => {
    expect(countingPascalRow(5)).toEqual([1, 5, 10, 10, 5, 1]);
    for (let n = 1; n <= 10; n++) {
      const row = countingPascalRow(n);
      const above = countingPascalRow(n - 1);
      for (let r = 1; r < n; r++) expect(row[r]).toBe(above[r - 1]! + above[r]!);
    }
    expect(derive({}, { power: 6, term: 2 })).toMatchObject({ binomial: 15, rowSum: 64, altSum: 0 });
  });

  it("expands (x + 1)ⁿ by the row, and (2x + 3)⁵ term by term", () => {
    expect(countingExpansion(4, 1, 1, "plain").map((t) => t.coefficient)).toEqual([1, 4, 6, 4, 1]);
    // (2x + 3)⁵: T₄ = C(5, 3)(2x)²·3³ = 1080x².
    expect(derive({}, { power: 5, term: 3, p: 2, q: 3 })).toMatchObject({ termCoefficient: 1080, xPower: 2, termNumber: 4 });
    // The expansion's value at x = 2 agrees with (2·2 + 3)⁵.
    const sum = countingExpansion(5, 2, 3, "plain").reduce((s, t) => s + t.coefficient * 2 ** t.xPower, 0);
    expect(sum).toBe(7 ** 5);
  });

  it("finds the term independent of x in (x + 2/x)⁶", () => {
    expect(derive({ form: "reciprocal" }, { power: 6, term: 3, p: 1, q: 2 })).toMatchObject({ xPower: 0, termCoefficient: 160 });
    expect(derive({ form: "reciprocal" }, { power: 6, term: 2, p: 1, q: 2 }).xPower).toBe(2);
  });

  it("names the middle term or terms", () => {
    expect(derive({}, { power: 6, term: 3 })).toMatchObject({ middleCount: 1, middleTerm: 4, isMiddle: 1 });
    expect(derive({}, { power: 7, term: 3 })).toMatchObject({ middleCount: 2, middleTerm: 4, isMiddle: 1 });
    expect(derive({}, { power: 7, term: 4 }).isMiddle).toBe(1);
    expect(derive({}, { power: 7, term: 5 }).isMiddle).toBe(0);
  });

  it("sums the coefficients to (p + q)ⁿ: 2ⁿ for (1 + 1)ⁿ, 0 for (1 − 1)ⁿ", () => {
    expect(derive({}, { power: 8, p: 1, q: 1 }).coefficientSum).toBe(256);
    expect(derive({}, { power: 8, p: 1, q: 1 }).rowSum).toBe(256);
    expect(derive({}, { power: 5, p: 1, q: -1 }).coefficientSum).toBe(0);
    expect(derive({}, { power: 5, p: 2, q: 3 }).coefficientSum).toBe(3125);
    expect(derive({}, { power: 0 })).toMatchObject({ rowSum: 1, altSum: 1, binomial: 1, term: 0 });
    for (const form of COUNTING_FORM_ORDER) {
      const total = countingExpansion(7, 2, -3, form).reduce((s, t) => s + t.coefficient, 0);
      expect(total, form).toBe((2 - 3) ** 7);
    }
  });

  it("keeps the term inside the expansion", () => {
    expect(derive({}, { power: 3, term: 8 })).toMatchObject({ term: 3, termNumber: 4 });
  });
});

describe("the model", () => {
  it("clamps every variable and keeps every output a finite number, never −0", () => {
    const wild: CountingState = { shirts: 99, trousers: -5, shoes: Number.NaN, n: 99, r: 99, people: 1, objects: 99, groups: 0, power: 99, term: -4, p: 0, q: -9 };
    for (const rule of COUNTING_RULE_ORDER) {
      for (const word of COUNTING_WORD_ORDER) {
        for (const form of COUNTING_FORM_ORDER) {
          for (const repeat of ["no", "yes"] as const) {
            for (const state of [wild, base]) {
              const r = model.derive(state, { repeat, rule, word, form, empty: "none" });
              for (const key of model.outputs) {
                expect(Number.isFinite(r[key]), `${rule} ${word} ${form} ${key}`).toBe(true);
                expect(Object.is(r[key], -0), `${key} is −0`).toBe(false);
              }
            }
          }
        }
      }
    }
    expect(model.setVariable(base, "n", 50, model.defaultParams).n).toBe(10);
    expect(model.setVariable(base, "q", -50, model.defaultParams).q).toBe(-3);
  });

  it("builds a row a second on play, and stops at row 10", () => {
    let s: CountingState = { ...base, power: 0 };
    for (let i = 0; i < 30; i++) s = model.advance(s, 1, model.defaultParams);
    expect(s.power).toBe(10);
    expect(model.step({ ...base, power: 4 }, model.defaultParams, 1).power).toBe(5);
  });
});
