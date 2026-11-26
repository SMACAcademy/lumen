import type { SimulationModel } from "@ise/science-engine";

/**
 * Algebraic identities, factorisation and polynomials, for classes 8 and 9.
 *
 * Identities as areas: a square of side a + b cuts into a², two a × b
 * rectangles and b², so (a + b)² = a² + 2ab + b². From a square of side a,
 * take away two a × b strips; the b × b corner was taken twice, so add it
 * back: (a − b)² = a² − 2ab + b². Cut b² from the corner of a², and the
 * L-shape left rearranges into an (a + b) × (a − b) rectangle. And an
 * (x + a) by (x + b) rectangle is x², a·x, b·x and ab, so
 * (x + a)(x + b) = x² + (a + b)x + ab.
 *
 * Multiplying: (px + q)(rx + s) on an area grid. Every term of one bracket
 * meets every term of the other, and the two x cells are like terms.
 *
 * Factorising: x² + bx + c as tiles. One x² tile, b x tiles split as m on
 * one side and n = b − m on the other: the tiles close into an (x + m) by
 * (x + n) rectangle exactly when the corner needs m × n = c unit tiles.
 *
 * Polynomials: p(x) = c₃x³ + c₂x² + c₁x + c₀ with whole-number coefficients.
 * Its degree, its value p(a), and its zeroes, where the graph meets the
 * x-axis. Dividing p(x) by (x − a) (synthetic division, the short form of
 * long division) leaves the remainder p(a): the remainder theorem. So
 * (x − a) is a factor exactly when p(a) = 0: the factor theorem.
 *
 * Every input is a whole number and every output is exact integer arithmetic,
 * checked by hand in the tests.
 */

/** Control ranges, shared with the concept and the tests. */
export const POLYSCHOOL_SIDE_RANGE = [1, 9] as const;
export const POLYSCHOOL_MUL_X_RANGE = [0, 4] as const;
export const POLYSCHOOL_MUL_UNIT_RANGE = [-6, 6] as const;
export const POLYSCHOOL_FB_RANGE = [-10, 10] as const;
export const POLYSCHOOL_FC_RANGE = [-24, 24] as const;
export const POLYSCHOOL_FM_RANGE = [-10, 10] as const;
export const POLYSCHOOL_C3_RANGE = [-2, 2] as const;
export const POLYSCHOOL_C2_RANGE = [-9, 9] as const;
export const POLYSCHOOL_C1_RANGE = [-12, 12] as const;
export const POLYSCHOOL_C0_RANGE = [-12, 12] as const;
export const POLYSCHOOL_A_RANGE = [-5, 5] as const;

/** The kind of polynomial, by degree; the zero polynomial has no degree. */
export const POLYSCHOOL_TYPE_LABELS: Record<string, string> = {
  "0": "constant",
  "1": "linear",
  "2": "quadratic",
  "3": "cubic",
  "4": "zero polynomial",
};

const SUPERSCRIPT: Record<number, string> = { 2: "²", 3: "³" };

/**
 * A polynomial as a book prints it, highest power first: [1, −6, 11, −6] → "x³ − 6x² + 11x − 6".
 * Coefficients are listed from the highest power down; "0" when all vanish.
 */
export function polySchoolText(coeffs: readonly number[], letter = "x"): string {
  const top = coeffs.length - 1;
  const terms: string[] = [];
  coeffs.forEach((c, i) => {
    if (c === 0) return;
    const power = top - i;
    const m = Math.abs(c);
    const body = power === 0 ? String(m) : `${m === 1 ? "" : m}${letter}${power === 1 ? "" : SUPERSCRIPT[power] ?? `^${power}`}`;
    if (terms.length === 0) terms.push(`${c < 0 ? "−" : ""}${body}`);
    else terms.push(`${c < 0 ? "−" : "+"} ${body}`);
  });
  return terms.length ? terms.join(" ") : "0";
}

/** "x + 3", "x − 2", "x": a bracket x + k as printed. */
export function polySchoolBinomial(k: number, letter = "x"): string {
  if (k === 0) return letter;
  return `${letter} ${k < 0 ? "−" : "+"} ${Math.abs(k)}`;
}

/**
 * Synthetic division of p(x) (coefficients highest power first) by (x − a).
 * Returns the quotient's coefficients and the remainder: bring down the first
 * coefficient, then repeatedly multiply by a and add the next one.
 */
export function polySchoolDivide(coeffs: readonly number[], a: number): { quotient: number[]; remainder: number; carries: number[] } {
  const rows: number[] = [];
  const carries: number[] = [];
  let acc = 0;
  coeffs.forEach((c, i) => {
    const carry = i === 0 ? 0 : acc * a;
    carries.push(carry || 0);
    acc = c + carry;
    rows.push(acc || 0);
  });
  const remainder = rows.pop() ?? 0;
  return { quotient: rows, remainder, carries };
}

/** p(a), term by term. */
export function polySchoolValue(coeffs: readonly number[], a: number): number {
  return coeffs.reduce((acc, c) => acc * a + c, 0) || 0;
}

/**
 * How many different real zeroes a polynomial of degree ≤ 3 has, found exactly
 * from whole-number coefficients (highest power first): by the discriminant
 * for a quadratic, and the cubic discriminant for a cubic. The zero
 * polynomial is counted as 0.
 */
export function polySchoolZeroCount(coeffs: readonly [number, number, number, number]): number {
  const [a, b, c, d] = coeffs;
  if (a !== 0) {
    const disc = 18 * a * b * c * d - 4 * b ** 3 * d + b * b * c * c - 4 * a * c ** 3 - 27 * a * a * d * d;
    if (disc > 0) return 3;
    if (disc < 0) return 1;
    // A repeated zero: all three the same when b² = 3ac, otherwise a double one and a single one.
    return b * b === 3 * a * c ? 1 : 2;
  }
  if (b !== 0) {
    const disc = c * c - 4 * b * d;
    return disc > 0 ? 2 : disc === 0 ? 1 : 0;
  }
  if (c !== 0) return 1;
  return 0;
}

/** Whether x² + bx + c splits into (x + m)(x + n) with whole numbers m and n. */
export function polySchoolSplits(b: number, c: number): boolean {
  const disc = b * b - 4 * c;
  if (disc < 0) return false;
  const root = Math.round(Math.sqrt(disc));
  return root * root === disc && (b + root) % 2 === 0;
}

export type PolySchoolParams = Record<string, never>;

export interface PolySchoolState {
  /** The two lengths of the identity pictures, and x for (x + a)(x + b). */
  readonly a: number;
  readonly b: number;
  readonly x: number;
  /** (mp·x + mq)(mr·x + ms). */
  readonly mp: number;
  readonly mq: number;
  readonly mr: number;
  readonly ms: number;
  /** x² + fb·x + fc, with the x tiles split as fm and fb − fm. */
  readonly fb: number;
  readonly fc: number;
  readonly fm: number;
  /** p(x) = c3·x³ + c2·x² + c1·x + c0, looked at x = pa. */
  readonly c3: number;
  readonly c2: number;
  readonly c1: number;
  readonly c0: number;
  readonly pa: number;
}

export type PolySchoolResults = {
  a: number;
  b: number;
  x: number;
  plusSide: number;
  plusSquare: number;
  aSquared: number;
  bSquared: number;
  ab: number;
  twoAB: number;
  plusExpanded: number;
  minusSide: number;
  minusSquare: number;
  minusExpanded: number;
  minusDrawable: number;
  diffSquares: number;
  sumTimesDiff: number;
  xPlusA: number;
  xPlusB: number;
  pairProduct: number;
  xSquared: number;
  pairMiddle: number;
  pairExpanded: number;
  mp: number;
  mq: number;
  mr: number;
  ms: number;
  mulX2: number;
  mulX1: number;
  mulX0: number;
  mulCrossA: number;
  mulCrossB: number;
  mulCells: number;
  mulTerms: number;
  mulLike: number;
  firstAt2: number;
  secondAt2: number;
  mulAt2: number;
  fb: number;
  fc: number;
  fm: number;
  fn: number;
  fmn: number;
  fGap: number;
  fits: number;
  perfectSquare: number;
  factorable: number;
  c3: number;
  c2: number;
  c1: number;
  c0: number;
  degree: number;
  polyType: number;
  isZeroPoly: number;
  termCount: number;
  leadCoeff: number;
  zeroCount: number;
  pa: number;
  pValue: number;
  isZeroAt: number;
  q2: number;
  q1: number;
  q0: number;
  remainder: number;
  isFactor: number;
};

const OUTPUTS = [
  "a", "b", "x", "plusSide", "plusSquare", "aSquared", "bSquared", "ab", "twoAB", "plusExpanded",
  "minusSide", "minusSquare", "minusExpanded", "minusDrawable", "diffSquares", "sumTimesDiff",
  "xPlusA", "xPlusB", "pairProduct", "xSquared", "pairMiddle", "pairExpanded",
  "mp", "mq", "mr", "ms", "mulX2", "mulX1", "mulX0", "mulCrossA", "mulCrossB", "mulCells", "mulTerms", "mulLike", "firstAt2", "secondAt2", "mulAt2",
  "fb", "fc", "fm", "fn", "fmn", "fGap", "fits", "perfectSquare", "factorable",
  "c3", "c2", "c1", "c0", "degree", "polyType", "isZeroPoly", "termCount", "leadCoeff", "zeroCount",
  "pa", "pValue", "isZeroAt", "q2", "q1", "q0", "remainder", "isFactor",
] as const satisfies readonly (keyof PolySchoolResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
/** Every input is a whole number. */
const whole = (v: number, range: readonly [number, number]) => clamp(Math.round(v), range[0], range[1]) || 0;
/** During Play the point a runs on continuously, and counts whole steps. */
const counted = (v: number, range: readonly [number, number]) => clamp(Math.floor(v + 1e-9), range[0], range[1]) || 0;
/** Turns −0 into 0. */
const z = (v: number) => v || 0;
/** Play moves a on by one every this many seconds. */
const STEP_TIME = 0.8;

const RANGES: Record<keyof PolySchoolState, readonly [number, number]> = {
  a: POLYSCHOOL_SIDE_RANGE,
  b: POLYSCHOOL_SIDE_RANGE,
  x: POLYSCHOOL_SIDE_RANGE,
  mp: POLYSCHOOL_MUL_X_RANGE,
  mq: POLYSCHOOL_MUL_UNIT_RANGE,
  mr: POLYSCHOOL_MUL_X_RANGE,
  ms: POLYSCHOOL_MUL_UNIT_RANGE,
  fb: POLYSCHOOL_FB_RANGE,
  fc: POLYSCHOOL_FC_RANGE,
  fm: POLYSCHOOL_FM_RANGE,
  c3: POLYSCHOOL_C3_RANGE,
  c2: POLYSCHOOL_C2_RANGE,
  c1: POLYSCHOOL_C1_RANGE,
  c0: POLYSCHOOL_C0_RANGE,
  pa: POLYSCHOOL_A_RANGE,
};

export const polySchoolModel: SimulationModel<PolySchoolState, PolySchoolParams, PolySchoolResults> = {
  id: "polyschool",
  defaultParams: {},
  outputs: OUTPUTS,
  stateVariables: ["a", "b", "x", "mp", "mq", "mr", "ms", "fb", "fc", "fm", "c3", "c2", "c1", "c0", "pa"],

  initialize() {
    return { a: 5, b: 3, x: 4, mp: 2, mq: 3, mr: 3, ms: 5, fb: 5, fc: 6, fm: 1, c3: 1, c2: -6, c1: 11, c0: -6, pa: 0 };
  },

  /** Play walks the point a along the x-axis, one whole number at a time, and stops at the end. */
  advance(state, dt) {
    return { ...state, pa: clamp(state.pa + dt / STEP_TIME, POLYSCHOOL_A_RANGE[0], POLYSCHOOL_A_RANGE[1]) };
  },

  step(state, _params, sign) {
    return { ...state, pa: counted(counted(state.pa, POLYSCHOOL_A_RANGE) + sign, POLYSCHOOL_A_RANGE) };
  },

  derive(state) {
    // Identities.
    const a = whole(state.a, POLYSCHOOL_SIDE_RANGE);
    const b = whole(state.b, POLYSCHOOL_SIDE_RANGE);
    const x = whole(state.x, POLYSCHOOL_SIDE_RANGE);

    // Multiplying.
    const mp = whole(state.mp, POLYSCHOOL_MUL_X_RANGE);
    const mq = whole(state.mq, POLYSCHOOL_MUL_UNIT_RANGE);
    const mr = whole(state.mr, POLYSCHOOL_MUL_X_RANGE);
    const ms = whole(state.ms, POLYSCHOOL_MUL_UNIT_RANGE);
    const cells = [mp * mr, mp * ms, mq * mr, mq * ms];
    const mulX2 = mp * mr;
    const mulX1 = mp * ms + mq * mr;
    const mulX0 = mq * ms;

    // Factorising.
    const fb = whole(state.fb, POLYSCHOOL_FB_RANGE);
    const fc = whole(state.fc, POLYSCHOOL_FC_RANGE);
    const fm = whole(state.fm, POLYSCHOOL_FM_RANGE);
    const fn = fb - fm;
    const fmn = fm * fn;
    const fits = fmn === fc ? 1 : 0;

    // Polynomials.
    const c3 = whole(state.c3, POLYSCHOOL_C3_RANGE);
    const c2 = whole(state.c2, POLYSCHOOL_C2_RANGE);
    const c1 = whole(state.c1, POLYSCHOOL_C1_RANGE);
    const c0 = whole(state.c0, POLYSCHOOL_C0_RANGE);
    const coeffs = [c3, c2, c1, c0] as const;
    const pa = counted(state.pa, POLYSCHOOL_A_RANGE);
    const lead = coeffs.findIndex((c) => c !== 0);
    const isZeroPoly = lead < 0;
    const degree = isZeroPoly ? 0 : 3 - lead;
    const pValue = polySchoolValue(coeffs, pa);
    const { quotient, remainder } = polySchoolDivide(coeffs, pa);

    return {
      a,
      b,
      x,
      plusSide: a + b,
      plusSquare: (a + b) ** 2,
      aSquared: a * a,
      bSquared: b * b,
      ab: a * b,
      twoAB: 2 * a * b,
      plusExpanded: a * a + 2 * a * b + b * b,
      minusSide: z(a - b),
      minusSquare: (a - b) ** 2,
      minusExpanded: a * a - 2 * a * b + b * b,
      minusDrawable: a > b ? 1 : 0,
      diffSquares: z(a * a - b * b),
      sumTimesDiff: z((a + b) * (a - b)),
      xPlusA: x + a,
      xPlusB: x + b,
      pairProduct: (x + a) * (x + b),
      xSquared: x * x,
      pairMiddle: (a + b) * x,
      pairExpanded: x * x + (a + b) * x + a * b,
      mp,
      mq,
      mr,
      ms,
      mulX2: z(mulX2),
      mulX1: z(mulX1),
      mulX0: z(mulX0),
      mulCrossA: z(mp * ms),
      mulCrossB: z(mq * mr),
      mulCells: cells.filter((c) => c !== 0).length,
      mulTerms: [mulX2, mulX1, mulX0].filter((c) => c !== 0).length,
      mulLike: mp * ms !== 0 && mq * mr !== 0 ? 1 : 0,
      firstAt2: z(2 * mp + mq),
      secondAt2: z(2 * mr + ms),
      mulAt2: z((2 * mp + mq) * (2 * mr + ms)),
      fb,
      fc,
      fm,
      fn: z(fn),
      fmn: z(fmn),
      fGap: z(fc - fmn),
      fits,
      perfectSquare: fits && fm === fn ? 1 : 0,
      factorable: polySchoolSplits(fb, fc) ? 1 : 0,
      c3,
      c2,
      c1,
      c0,
      degree,
      polyType: isZeroPoly ? 4 : degree,
      isZeroPoly: isZeroPoly ? 1 : 0,
      termCount: coeffs.filter((c) => c !== 0).length,
      leadCoeff: isZeroPoly ? 0 : coeffs[lead]!,
      zeroCount: polySchoolZeroCount(coeffs),
      pa,
      pValue,
      isZeroAt: pValue === 0 ? 1 : 0,
      q2: z(quotient[0] ?? 0),
      q1: z(quotient[1] ?? 0),
      q0: z(quotient[2] ?? 0),
      remainder: z(remainder),
      isFactor: remainder === 0 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof PolySchoolState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in RANGES)) return state;
    const key = id as keyof PolySchoolState;
    return { ...state, [key]: whole(value, RANGES[key]) };
  },
};
