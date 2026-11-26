import type { SimulationModel } from "@ise/science-engine";

/**
 * Fractions as points on a number line.
 *
 * Cut each whole into `d` equal pieces and count `n` of them: the point lands
 * at n ÷ d. A second line cut into `d2` pieces lets two names be compared —
 * and when 3 pieces of 4 land exactly where 6 pieces of 8 do, the two
 * fractions are the same number with different names.
 *
 * With one piece in a whole the first line is the whole numbers: equally
 * spaced points, each one more than the last, so adding is hopping right.
 * A decimal ruler, cut into tenths and hundredths, carries a third point at
 * `dec` hundredths — 0.45 is 4 tenths and 5 hundredths — which can be
 * compared exactly with the fraction on the first line (5/10 = 0.5 > 0.45).
 */

export type NumberLineParams = {
  /** Pieces in each whole on the first line. */
  d: number;
  /** Pieces in each whole on the second line. */
  d2: number;
  /** How many wholes the lines show. */
  max: number;
};

export interface NumberLineState {
  /** Pieces counted on the first line (kept whole in the results). */
  readonly n: number;
  /** Pieces counted on the second line. */
  readonly n2: number;
  /** Hundredths counted on the decimal ruler (0.45 is 45). Taken as 0 when absent. */
  readonly dec?: number;
}

export type NumberLineResults = {
  n: number;
  d: number;
  value: number;
  n2: number;
  d2: number;
  value2: number;
  /** 1 when both points are the same number. */
  equal: number;
  /** −1, 0 or 1 as the first fraction is smaller than, equal to or bigger than the second. */
  compare: number;
  /** The whole number part. */
  whole: number;
  /** 1 when n < d: less than one whole. */
  proper: number;
  simplestN: number;
  simplestD: number;
  max: number;
  percent: number;
  /** Hundredths counted on the decimal ruler, kept whole and on the line. */
  dec: number;
  /** The decimal ruler's point: dec ÷ 100. */
  decimal: number;
  /** Its place-value digits: ones . tenths hundredths. */
  onesDigit: number;
  tenthsDigit: number;
  hundredthsDigit: number;
  /** −1, 0 or 1 as the first line's fraction is smaller than, equal to or bigger than the decimal. */
  decCompare: number;
};

export const MAX_DENOMINATOR = 12;
/** Wholes the lines can show: up to 10, so the whole numbers 0 to 10 fit on one line. */
export const MAX_WHOLES = 10;
/** Pieces per second when play walks the point along the line. */
const WALK_RATE = 1.5;

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x;
}

const pieces = (value: number) => Math.min(MAX_DENOMINATOR, Math.max(1, Math.round(value)));
const wholes = (value: number) => Math.min(MAX_WHOLES, Math.max(1, Math.round(value)));
/** Keep a count of pieces on the line: 0 to d·max. */
const onLine = (n: number, d: number, max: number) => Math.min(d * max, Math.max(0, n));

const OUTPUTS = [
  "n",
  "d",
  "value",
  "n2",
  "d2",
  "value2",
  "equal",
  "compare",
  "whole",
  "proper",
  "simplestN",
  "simplestD",
  "max",
  "percent",
  "dec",
  "decimal",
  "onesDigit",
  "tenthsDigit",
  "hundredthsDigit",
  "decCompare",
] as const satisfies readonly (keyof NumberLineResults)[];

export const numberLineModel: SimulationModel<NumberLineState, NumberLineParams, NumberLineResults> = {
  id: "number-line",
  defaultParams: { d: 4, d2: 8, max: 1 },
  outputs: OUTPUTS,
  stateVariables: ["n", "n2", "dec"],

  initialize() {
    return { n: 1, n2: 0, dec: 0 };
  },

  /** Play walks the first point along, piece by piece, and stops at the end. */
  advance(state, dt, params) {
    const d = pieces(params.d);
    return { ...state, n: onLine(state.n + WALK_RATE * dt, d, wholes(params.max)) };
  },

  step(state, params, sign) {
    const d = pieces(params.d);
    return { ...state, n: onLine(Math.round(state.n) + sign, d, wholes(params.max)) };
  },

  derive(state, params) {
    const d = pieces(params.d);
    const d2 = pieces(params.d2);
    const max = wholes(params.max);
    const n = onLine(Math.round(state.n), d, max);
    const n2 = onLine(Math.round(state.n2), d2, max);
    const dec = onLine(Math.round(Number.isFinite(state.dec) ? state.dec! : 0), 100, max);
    const value = n / d;
    const value2 = n2 / d2;
    // Compare exactly, by cross-multiplying whole numbers.
    const diff = n * d2 - n2 * d;
    const g = gcd(n, d) || 1;
    return {
      n,
      d,
      value,
      n2,
      d2,
      value2,
      equal: diff === 0 ? 1 : 0,
      compare: Math.sign(diff),
      whole: Math.floor(n / d),
      proper: n < d ? 1 : 0,
      simplestN: n === 0 ? 0 : n / g,
      simplestD: n === 0 ? 1 : d / g,
      max,
      percent: value * 100,
      dec,
      decimal: dec / 100,
      onesDigit: Math.floor(dec / 100),
      tenthsDigit: Math.floor(dec / 10) % 10,
      hundredthsDigit: dec % 10,
      // Exactly, in whole numbers: n/d against dec/100.
      decCompare: Math.sign(n * 100 - dec * d) || 0,
    };
  },

  getVariable(state, id) {
    return id === "n" ? state.n : id === "n2" ? state.n2 : id === "dec" ? (state.dec ?? 0) : undefined;
  },

  setVariable(state, id, value, params) {
    const max = wholes(params.max);
    if (id === "n") return { ...state, n: onLine(Math.round(value), pieces(params.d), max) };
    if (id === "n2") return { ...state, n2: onLine(Math.round(value), pieces(params.d2), max) };
    if (id === "dec") return { ...state, dec: onLine(Math.round(value), 100, max) };
    return state;
  },
};
