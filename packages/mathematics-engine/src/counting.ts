import type { SimulationModel } from "@ise/science-engine";

/**
 * Counting without listing, and the binomial theorem.
 *
 * Tree: shirts × trousers × shoes. One choice after another, each with a
 * fixed number of options, multiplies — the fundamental principle of
 * counting.
 *
 * Arrange and choose: r slots filled from n distinct letters. Without
 * repetition the slots offer n, n − 1, … choices, so ⁿPᵣ = n!/(n − r)!;
 * with repetition every slot offers n, so nʳ. A team ignores order, and
 * each team of r can be ordered r! ways, so ⁿCᵣ = ⁿPᵣ / r!.
 *
 * Restrictions: n people with two of them (A and B) always together (glue
 * them: 2·(n − 1)!), never together (n! − 2·(n − 1)!), round a table
 * ((n − 1)!), as beads on a necklace that can be turned over
 * ((n − 1)!/2), and the letters of a word with repeats (n!/(p!·q!·…)).
 *
 * Distribute: n identical objects into r distinct groups — stars and bars,
 * C(n + r − 1, r − 1), or C(n − 1, r − 1) when no group may be empty.
 *
 * Binomial: Pascal's triangle and the expansion of (px + q)ⁿ (or of
 * (px + q/x)ⁿ), with the general term T₍ᵣ₊₁₎ = C(n, r)(px)ⁿ⁻ʳ qʳ, the
 * middle term(s), and the sums of coefficients.
 *
 * All counting is exact: factorials and binomial coefficients are worked in
 * BigInt and every value the model can produce is below 2⁵³, so the numbers
 * are whole and exact.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** A whole number in [lo, hi]; NaN becomes lo. */
const whole = (v: number, lo: number, hi: number) => clamp(Number.isFinite(v) ? Math.round(v) : lo, lo, hi);

/** n! exactly. */
export function countingFactorialBig(n: number): bigint {
  let out = 1n;
  for (let k = 2n; k <= BigInt(Math.max(0, Math.floor(n))); k++) out *= k;
  return out;
}

export const countingFactorial = (n: number): number => Number(countingFactorialBig(n));

/** ⁿPᵣ = n!/(n − r)!: ordered arrangements of r of n distinct things; 0 when r > n. */
export function countingPermutations(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let out = 1n;
  for (let k = n - r + 1; k <= n; k++) out *= BigInt(k);
  return Number(out);
}

/** ⁿCᵣ = n!/(r!(n − r)!): selections of r of n distinct things; 0 when r < 0 or r > n. */
export function countingCombinations(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  return Number(countingFactorialBig(n) / (countingFactorialBig(r) * countingFactorialBig(n - r)));
}

/** Arrangements of all the letters of a word: n!/(p!·q!·…) over the repeated letters. */
export function countingWordArrangements(word: string): number {
  return Number(countingFactorialBig(word.length) / countingRepeatDivisorBig(word));
}

/** How many times each letter occurs, in order of first appearance. */
export function countingLetterTally(word: string): [string, number][] {
  const tally = new Map<string, number>();
  for (const letter of word) tally.set(letter, (tally.get(letter) ?? 0) + 1);
  return [...tally.entries()];
}

function countingRepeatDivisorBig(word: string): bigint {
  return countingLetterTally(word).reduce((d, [, k]) => d * countingFactorialBig(k), 1n);
}

/** Row n of Pascal's triangle: C(n, 0) … C(n, n). */
export function countingPascalRow(n: number): number[] {
  return Array.from({ length: n + 1 }, (_, r) => countingCombinations(n, r));
}

export type CountingRuleId = "line" | "together" | "apart" | "circle" | "necklace" | "word";
export const COUNTING_RULE_ORDER: readonly CountingRuleId[] = ["line", "together", "apart", "circle", "necklace", "word"];

export type CountingWordId = "banana" | "letter" | "allahabad" | "mississippi";
export const COUNTING_WORD_ORDER: readonly CountingWordId[] = ["banana", "letter", "allahabad", "mississippi"];
export const COUNTING_WORDS: Record<CountingWordId, string> = {
  banana: "BANANA",
  letter: "LETTER",
  allahabad: "ALLAHABAD",
  mississippi: "MISSISSIPPI",
};

/** People in a line under each rule; two of them, A and B, are the ones the rule is about. */
export function countingRestricted(rule: Exclude<CountingRuleId, "word">, people: number): number {
  const all = countingFactorial(people);
  const glued = 2 * countingFactorial(people - 1);
  switch (rule) {
    case "line": return all;
    case "together": return glued;
    case "apart": return all - glued;
    case "circle": return countingFactorial(people - 1);
    case "necklace": return people < 3 ? 1 : countingFactorial(people - 1) / 2;
  }
}

/** n identical objects into r distinct groups: C(n + r − 1, r − 1), or C(n − 1, r − 1) with none empty. */
export function countingDistributions(objects: number, groups: number, emptyAllowed: boolean): number {
  if (groups < 1) return 0;
  return emptyAllowed ? countingCombinations(objects + groups - 1, groups - 1) : countingCombinations(objects - 1, groups - 1);
}

export type CountingForm = "plain" | "reciprocal";
export const COUNTING_FORM_ORDER: readonly CountingForm[] = ["plain", "reciprocal"];

export interface CountingTerm {
  /** T₍ᵣ₊₁₎ */
  r: number;
  binomial: number;
  coefficient: number;
  xPower: number;
}

/** Every term of (px + q)ⁿ, or of (px + q/x)ⁿ: T₍ᵣ₊₁₎ = C(n, r)·pⁿ⁻ʳ·qʳ·x^(n − r) (or x^(n − 2r)). */
export function countingExpansion(n: number, p: number, q: number, form: CountingForm): CountingTerm[] {
  return Array.from({ length: n + 1 }, (_, r) => {
    const binomial = countingCombinations(n, r);
    return {
      r,
      binomial,
      coefficient: binomial * p ** (n - r) * q ** r || 0,
      xPower: form === "plain" ? n - r : n - 2 * r,
    };
  });
}

/** Limits of every count, so all of them stay exact. */
export const COUNTING_LIMITS = {
  choices: [1, 4],
  n: [1, 10],
  r: [1, 10],
  people: [3, 8],
  objects: [1, 12],
  groups: [1, 6],
  power: [0, 10],
  term: [0, 10],
  coefficient: [-3, 3],
} as const;

export type CountingParams = {
  repeat: "no" | "yes";
  rule: CountingRuleId;
  word: CountingWordId;
  empty: "allowed" | "none";
  form: CountingForm;
};

export interface CountingState {
  readonly shirts: number;
  readonly trousers: number;
  readonly shoes: number;
  /** Distinct letters, and slots to fill. */
  readonly n: number;
  readonly r: number;
  readonly people: number;
  /** Identical objects, and the groups they go into. */
  readonly objects: number;
  readonly groups: number;
  /** The power n of the binomial, and the r of the term T₍ᵣ₊₁₎. */
  readonly power: number;
  readonly term: number;
  /** The binomial is (px + q)ⁿ or (px + q/x)ⁿ. */
  readonly p: number;
  readonly q: number;
}

export type CountingResults = {
  shirts: number;
  trousers: number;
  shoes: number;
  outfits: number;
  n: number;
  r: number;
  repeat: number;
  arrangements: number;
  selections: number;
  orderings: number;
  people: number;
  rule: number;
  word: number;
  /** How many things are arranged: the people, or the word's letters. */
  things: number;
  /** Arrangements in a line with no rule: things! */
  lineCount: number;
  restricted: number;
  /** The product of the factorials of the repeated letters (1 unless the rule is a word). */
  repeatDivisor: number;
  objects: number;
  groups: number;
  emptyAllowed: number;
  bars: number;
  /** The places the objects and bars fill, of which the bars take `bars`. */
  places: number;
  distributions: number;
  power: number;
  term: number;
  /** r + 1: which term T₍ᵣ₊₁₎ is. */
  termNumber: number;
  p: number;
  q: number;
  form: number;
  binomial: number;
  termCoefficient: number;
  xPower: number;
  rowSum: number;
  altSum: number;
  coefficientSum: number;
  middleCount: number;
  /** The (first) middle term's number. */
  middleTerm: number;
  isMiddle: number;
};

const OUTPUTS = [
  "shirts", "trousers", "shoes", "outfits",
  "n", "r", "repeat", "arrangements", "selections", "orderings",
  "people", "rule", "word", "things", "lineCount", "restricted", "repeatDivisor",
  "objects", "groups", "emptyAllowed", "bars", "places", "distributions",
  "power", "term", "termNumber", "p", "q", "form", "binomial", "termCoefficient", "xPower",
  "rowSum", "altSum", "coefficientSum", "middleCount", "middleTerm", "isMiddle",
] as const satisfies readonly (keyof CountingResults)[];

const ruleOf = (params: CountingParams) => (COUNTING_RULE_ORDER.includes(params.rule) ? params.rule : "line");
const wordOf = (params: CountingParams) => (COUNTING_WORD_ORDER.includes(params.word) ? params.word : "banana");
const formOf = (params: CountingParams) => (COUNTING_FORM_ORDER.includes(params.form) ? params.form : "plain");

const L = COUNTING_LIMITS;

export const countingModel: SimulationModel<CountingState, CountingParams, CountingResults> = {
  id: "counting",
  defaultParams: { repeat: "no", rule: "line", word: "banana", empty: "allowed", form: "plain" },
  outputs: OUTPUTS,
  stateVariables: ["shirts", "trousers", "shoes", "n", "r", "people", "objects", "groups", "power", "term", "p", "q"],

  initialize() {
    return { shirts: 3, trousers: 2, shoes: 2, n: 5, r: 3, people: 5, objects: 5, groups: 3, power: 4, term: 1, p: 1, q: 1 };
  },

  /** Play builds Pascal's triangle a row a second, up to row 10. */
  advance(state, dt) {
    return { ...state, power: clamp(state.power + dt, L.power[0], L.power[1]) };
  },

  step(state, _params, sign) {
    return { ...state, power: whole(state.power + sign, L.power[0], L.power[1]) };
  },

  derive(state, params) {
    const shirts = whole(state.shirts, L.choices[0], L.choices[1]);
    const trousers = whole(state.trousers, L.choices[0], L.choices[1]);
    const shoes = whole(state.shoes, L.choices[0], L.choices[1]);

    const repeat = params.repeat === "yes";
    const n = whole(state.n, L.n[0], L.n[1]);
    // Without repetition there cannot be more slots than letters.
    const r = repeat ? whole(state.r, L.r[0], L.r[1]) : Math.min(whole(state.r, L.r[0], L.r[1]), n);

    const people = whole(state.people, L.people[0], L.people[1]);
    const ruleId = ruleOf(params);
    const wordId = wordOf(params);
    const word = COUNTING_WORDS[wordId];
    const isWord = ruleId === "word";
    const things = isWord ? word.length : people;

    const objects = whole(state.objects, L.objects[0], L.objects[1]);
    const groups = whole(state.groups, L.groups[0], L.groups[1]);
    const emptyAllowed = params.empty !== "none";

    const power = whole(state.power, L.power[0], L.power[1]);
    const term = Math.min(whole(state.term, L.term[0], L.term[1]), power);
    const p = whole(state.p, L.coefficient[0], L.coefficient[1]) || 0;
    const q = whole(state.q, L.coefficient[0], L.coefficient[1]) || 0;
    const formId = formOf(params);
    const chosen = countingExpansion(power, p, q, formId)[term]!;
    const middleTerm = power % 2 === 0 ? power / 2 + 1 : (power + 1) / 2;
    const middleCount = power % 2 === 0 ? 1 : 2;
    let altSum = 0;
    for (let k = 0; k <= power; k++) altSum += (k % 2 === 0 ? 1 : -1) * countingCombinations(power, k);

    return {
      shirts,
      trousers,
      shoes,
      outfits: shirts * trousers * shoes,
      n,
      r,
      repeat: repeat ? 1 : 0,
      arrangements: repeat ? n ** r : countingPermutations(n, r),
      selections: countingCombinations(n, r),
      orderings: countingFactorial(r),
      people,
      rule: COUNTING_RULE_ORDER.indexOf(ruleId),
      word: COUNTING_WORD_ORDER.indexOf(wordId),
      things,
      lineCount: countingFactorial(things),
      restricted: isWord ? countingWordArrangements(word) : countingRestricted(ruleId, people),
      repeatDivisor: isWord ? Number(countingRepeatDivisorBig(word)) : 1,
      objects,
      groups,
      emptyAllowed: emptyAllowed ? 1 : 0,
      bars: groups - 1,
      places: emptyAllowed ? objects + groups - 1 : Math.max(0, objects - 1),
      distributions: countingDistributions(objects, groups, emptyAllowed),
      power,
      term,
      termNumber: term + 1,
      p,
      q,
      form: COUNTING_FORM_ORDER.indexOf(formId),
      binomial: chosen.binomial,
      termCoefficient: chosen.coefficient,
      xPower: chosen.xPower || 0,
      rowSum: 2 ** power,
      altSum: altSum || 0,
      coefficientSum: (p + q) ** power || 0,
      middleCount,
      middleTerm,
      isMiddle: term + 1 === middleTerm || (middleCount === 2 && term + 1 === middleTerm + 1) ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof CountingState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "shirts":
      case "trousers":
      case "shoes":
        return { ...state, [id]: clamp(value, L.choices[0], L.choices[1]) };
      case "n": return { ...state, n: clamp(value, L.n[0], L.n[1]) };
      case "r": return { ...state, r: clamp(value, L.r[0], L.r[1]) };
      case "people": return { ...state, people: clamp(value, L.people[0], L.people[1]) };
      case "objects": return { ...state, objects: clamp(value, L.objects[0], L.objects[1]) };
      case "groups": return { ...state, groups: clamp(value, L.groups[0], L.groups[1]) };
      case "power": return { ...state, power: clamp(value, L.power[0], L.power[1]) };
      case "term": return { ...state, term: clamp(value, L.term[0], L.term[1]) };
      case "p": return { ...state, p: clamp(value, L.coefficient[0], L.coefficient[1]) };
      case "q": return { ...state, q: clamp(value, L.coefficient[0], L.coefficient[1]) };
      default: return state;
    }
  },
};
