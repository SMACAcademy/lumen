import type { SimulationModel } from "@ise/science-engine";

/**
 * Area by strips: the definite integral as the limit of a sum.
 *
 * Strips: [a, b] is cut into n strips of width Δx = (b − a)/n. Each strip is
 * a rectangle whose height is f at its left edge, its right edge or its
 * middle — or a trapezium with f at both edges. Their total closes on the
 * exact area F(b) − F(a) as n grows: the error of the left and right sums
 * shrinks like 1/n, of the midpoint and trapezium sums like 1/n².
 *
 * Signed area: a strip below the axis has a negative height, so it counts
 * negative. ∫₀^{2π} sin x dx = 0, while the area actually shaded is 4.
 *
 * Properties: swapping the limits makes every Δx negative and flips the sign;
 * splitting at any c adds up, ∫ₐᶜ + ∫ᶜᵇ = ∫ₐᵇ; an odd function over [−a, a]
 * gives zero.
 *
 * Between two curves: each strip runs from one curve to the other, with
 * height |f − g|. Where the curves cross, the one on top changes.
 *
 * Every antiderivative below is entered by hand and checked in the tests
 * against a fine Riemann sum.
 */

export type RiemannRule = "left" | "right" | "mid" | "trap";
export const RIEMANN_RULE_ORDER: readonly RiemannRule[] = ["left", "right", "mid", "trap"];
export const RIEMANN_RULE_NAMES: Record<RiemannRule, string> = { left: "left", right: "right", mid: "midpoint", trap: "trapezium" };

export interface RiemannFunction {
  label: string;
  f(x: number): number;
  /** An antiderivative: F′ = f. */
  F(x: number): number;
  /** Where f = 0 inside the window, ascending. */
  roots: readonly number[];
  /** The window drawn; a, b and c are kept inside it. */
  x: readonly [number, number];
  y: readonly [number, number];
  /** 1 odd, 2 even, 0 neither. */
  symmetry: 0 | 1 | 2;
}

export type RiemannFunctionId = "square" | "cube" | "root" | "sine" | "exp" | "recip";
export const RIEMANN_FUNCTION_ORDER: readonly RiemannFunctionId[] = ["square", "cube", "root", "sine", "exp", "recip"];

const TWO_PI = 2 * Math.PI;

export const RIEMANN_FUNCTIONS: Record<RiemannFunctionId, RiemannFunction> = {
  square: { label: "x²", f: (x) => x * x, F: (x) => x ** 3 / 3, roots: [0], x: [-2, 2], y: [-0.6, 4.4], symmetry: 2 },
  cube: { label: "x³", f: (x) => x ** 3, F: (x) => x ** 4 / 4, roots: [0], x: [-1.6, 1.6], y: [-4.2, 4.2], symmetry: 1 },
  root: { label: "√x", f: (x) => Math.sqrt(Math.max(0, x)), F: (x) => (2 / 3) * Math.max(0, x) ** 1.5, roots: [], x: [0, 4], y: [-0.4, 2.4], symmetry: 0 },
  sine: { label: "sin x", f: Math.sin, F: (x) => -Math.cos(x), roots: [-TWO_PI, -Math.PI, 0, Math.PI, TWO_PI], x: [-TWO_PI, TWO_PI], y: [-1.4, 1.4], symmetry: 1 },
  exp: { label: "eˣ", f: Math.exp, F: Math.exp, roots: [], x: [-2, 2], y: [-0.8, 7.8], symmetry: 0 },
  recip: { label: "1/x", f: (x) => 1 / x, F: Math.log, roots: [], x: [0.25, 4], y: [-0.4, 4.4], symmetry: 0 },
};

export interface RiemannPair {
  label: string;
  /** The two curves, f and g, and antiderivatives of each. */
  fLabel: string;
  gLabel: string;
  f(x: number): number;
  g(x: number): number;
  F(x: number): number;
  G(x: number): number;
  /** The region runs between the curves from a to b, where they meet. */
  a: number;
  b: number;
  /** Where the curves cross strictly between a and b. */
  crossings: readonly number[];
  x: readonly [number, number];
  y: readonly [number, number];
}

export type RiemannPairId = "line-square" | "parabola-line" | "line-cube";
export const RIEMANN_PAIR_ORDER: readonly RiemannPairId[] = ["line-square", "parabola-line", "line-cube"];

export const RIEMANN_PAIRS: Record<RiemannPairId, RiemannPair> = {
  "line-square": {
    label: "y = x and y = x²",
    fLabel: "y = x",
    gLabel: "y = x²",
    f: (x) => x,
    g: (x) => x * x,
    F: (x) => (x * x) / 2,
    G: (x) => x ** 3 / 3,
    a: 0,
    b: 1,
    crossings: [],
    x: [-0.3, 1.3],
    y: [-0.3, 1.5],
  },
  "parabola-line": {
    label: "y = x + 2 and y = x²",
    fLabel: "y = x + 2",
    gLabel: "y = x²",
    f: (x) => x + 2,
    g: (x) => x * x,
    F: (x) => (x * x) / 2 + 2 * x,
    G: (x) => x ** 3 / 3,
    a: -1,
    b: 2,
    crossings: [],
    x: [-1.6, 2.6],
    y: [-0.6, 5.2],
  },
  "line-cube": {
    label: "y = x and y = x³",
    fLabel: "y = x",
    gLabel: "y = x³",
    f: (x) => x,
    g: (x) => x ** 3,
    F: (x) => (x * x) / 2,
    G: (x) => x ** 4 / 4,
    a: -1,
    b: 1,
    crossings: [0],
    x: [-1.45, 1.45],
    y: [-1.6, 1.6],
  },
};

export const RIEMANN_N_MAX = 200;
/** While playing, the number of strips doubles every this many seconds, up to the cap. */
export const RIEMANN_DOUBLE_EVERY = 0.8;

export interface RiemannStrip {
  x0: number;
  x1: number;
  /** f at the two edges, and the height the rule uses. */
  h0: number;
  h1: number;
  height: number;
}

/** The n strips of [a, b] under the given rule. Δx is negative when b < a. */
export function riemannStrips(f: (x: number) => number, a: number, b: number, n: number, rule: RiemannRule): RiemannStrip[] {
  const count = Math.max(1, Math.round(n));
  const dx = (b - a) / count;
  const strips: RiemannStrip[] = [];
  for (let i = 0; i < count; i++) {
    const x0 = a + i * dx;
    const x1 = a + (i + 1) * dx;
    const h0 = f(x0);
    const h1 = f(x1);
    const height = rule === "left" ? h0 : rule === "right" ? h1 : rule === "mid" ? f((x0 + x1) / 2) : (h0 + h1) / 2;
    strips.push({ x0, x1, h0, h1, height });
  }
  return strips;
}

/** Σ height · Δx over the strips. */
export function riemannSum(f: (x: number) => number, a: number, b: number, n: number, rule: RiemannRule): number {
  const count = Math.max(1, Math.round(n));
  const dx = (b - a) / count;
  let total = 0;
  for (const strip of riemannStrips(f, a, b, count, rule)) total += strip.height * dx;
  return total;
}

/** The exact pieces of ∫ f over [lo, hi] between consecutive zeros of f (lo ≤ hi). */
function pieces(F: (x: number) => number, zeros: readonly number[], lo: number, hi: number): number[] {
  const cuts = [lo, ...zeros.filter((z) => z > lo && z < hi), hi];
  const out: number[] = [];
  for (let i = 0; i < cuts.length - 1; i++) out.push(F(cuts[i + 1]!) - F(cuts[i]!));
  return out;
}

export type RiemannParams = { fn: RiemannFunctionId; rule: RiemannRule; pair: RiemannPairId };

export interface RiemannState {
  /** The number of strips, 1 to 200. */
  readonly n: number;
  /** The limits of integration, and the point where the interval is split. */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  /** Seconds since n last doubled while playing. */
  readonly clock: number;
}

export type RiemannResults = {
  fn: number;
  rule: number;
  n: number;
  a: number;
  b: number;
  c: number;
  /** Δx = (b − a)/n: negative when the limits run right to left. */
  dx: number;
  sum: number;
  exact: number;
  error: number;
  absError: number;
  /** 1 an over-estimate, −1 an under-estimate, 0 exact. */
  estimate: number;
  leftSum: number;
  rightSum: number;
  midSum: number;
  trapSum: number;
  /** |error at n| ÷ |error at 2n|: about 2 for left and right, 4 for midpoint and trapezium. 0 when the error vanishes. */
  errorRatio: number;
  /** The strips above the axis and below it (the latter negative), each counted with |Δx|. */
  aboveSum: number;
  belowSum: number;
  stripArea: number;
  /** The exact area above the axis and below it (negative) between the limits, and the total shaded. */
  aboveExact: number;
  belowExact: number;
  geometric: number;
  /** ∫ₐᶜ and ∫ᶜᵇ, which add to ∫ₐᵇ; and ∫ᵇₐ = −∫ₐᵇ. */
  partLeft: number;
  partRight: number;
  reversed: number;
  /** 1 odd, 2 even, 0 neither. */
  symmetry: number;
  /** 1 when the limits are −a and a. */
  symmetric: number;
  pair: number;
  pairA: number;
  pairB: number;
  /** Σ |f − g| · |Δx| over the strips between the curves. */
  pairSum: number;
  /** The exact area between the curves, ∫ |f − g| dx. */
  pairArea: number;
  /** ∫ (f − g) dx without asking which is on top. */
  pairSigned: number;
  pairError: number;
  crossings: number;
};

const OUTPUTS = [
  "fn", "rule", "n", "a", "b", "c", "dx", "sum", "exact", "error", "absError", "estimate",
  "leftSum", "rightSum", "midSum", "trapSum", "errorRatio",
  "aboveSum", "belowSum", "stripArea", "aboveExact", "belowExact", "geometric",
  "partLeft", "partRight", "reversed", "symmetry", "symmetric",
  "pair", "pairA", "pairB", "pairSum", "pairArea", "pairSigned", "pairError", "crossings",
] as const satisfies readonly (keyof RiemannResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Rounds away −0 and floating dust, so an exact zero reads as 0. */
const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
/** The range every limit control spans; each function's window lies inside it. */
const LIMIT_RANGE = 6.5;

const fnOf = (params: RiemannParams) => (RIEMANN_FUNCTION_ORDER.includes(params.fn) ? params.fn : "square");
const ruleOf = (params: RiemannParams) => (RIEMANN_RULE_ORDER.includes(params.rule) ? params.rule : "left");
const pairOf = (params: RiemannParams) => (RIEMANN_PAIR_ORDER.includes(params.pair) ? params.pair : "line-square");
const stripsOf = (n: number) => clamp(Math.round(Number.isFinite(n) ? n : 1), 1, RIEMANN_N_MAX);

export const riemannModel: SimulationModel<RiemannState, RiemannParams, RiemannResults> = {
  id: "riemann",
  defaultParams: { fn: "square", rule: "left", pair: "line-square" },
  outputs: OUTPUTS,
  stateVariables: ["n", "a", "b", "c"],

  initialize() {
    return { n: 4, a: 0, b: 2, c: 1, clock: 0 };
  },

  /** Play doubles the number of strips every 0.8 s, up to 200. */
  advance(state, dt) {
    let n = stripsOf(state.n);
    let clock = (state.clock || 0) + Math.max(0, dt);
    while (clock >= RIEMANN_DOUBLE_EVERY && n < RIEMANN_N_MAX) {
      n = Math.min(RIEMANN_N_MAX, n * 2);
      clock -= RIEMANN_DOUBLE_EVERY;
    }
    return { ...state, n, clock: n >= RIEMANN_N_MAX ? 0 : clock };
  },

  /** A step forward doubles n; a step back halves it. */
  step(state, _params, sign) {
    const n = stripsOf(state.n);
    return { ...state, n: stripsOf(sign > 0 ? n * 2 : n / 2), clock: 0 };
  },

  derive(state, params) {
    const fnId = fnOf(params);
    const fn = RIEMANN_FUNCTIONS[fnId];
    const ruleId = ruleOf(params);
    const n = stripsOf(state.n);
    const a = clamp(state.a, fn.x[0], fn.x[1]);
    const b = clamp(state.b, fn.x[0], fn.x[1]);
    const c = clamp(state.c, fn.x[0], fn.x[1]);
    const dx = (b - a) / n;

    const sums = Object.fromEntries(RIEMANN_RULE_ORDER.map((r) => [r, riemannSum(fn.f, a, b, n, r)])) as Record<RiemannRule, number>;
    const sum = sums[ruleId];
    const exact = fn.F(b) - fn.F(a);
    const error = sum - exact;
    const doubled = riemannSum(fn.f, a, b, 2 * n, ruleId) - exact;
    const tolerance = 1e-9 * Math.max(1, Math.abs(exact));

    let aboveSum = 0;
    let belowSum = 0;
    for (const strip of riemannStrips(fn.f, a, b, n, ruleId)) {
      const piece = strip.height * Math.abs(dx);
      if (piece > 0) aboveSum += piece;
      else belowSum += piece;
    }
    const exactPieces = pieces(fn.F, fn.roots, Math.min(a, b), Math.max(a, b));
    const aboveExact = exactPieces.filter((p) => p > 0).reduce((s, p) => s + p, 0);
    const belowExact = exactPieces.filter((p) => p < 0).reduce((s, p) => s + p, 0);

    const pairId = pairOf(params);
    const pair = RIEMANN_PAIRS[pairId];
    const gap = (x: number) => pair.f(x) - pair.g(x);
    const Gap = (x: number) => pair.F(x) - pair.G(x);
    const pairDx = (pair.b - pair.a) / n;
    let pairSum = 0;
    for (const strip of riemannStrips(gap, pair.a, pair.b, n, ruleId)) {
      const height = ruleId === "trap" ? (Math.abs(strip.h0) + Math.abs(strip.h1)) / 2 : Math.abs(strip.height);
      pairSum += height * Math.abs(pairDx);
    }
    const pairArea = pieces(Gap, pair.crossings, pair.a, pair.b).reduce((s, p) => s + Math.abs(p), 0);

    return {
      fn: RIEMANN_FUNCTION_ORDER.indexOf(fnId),
      rule: RIEMANN_RULE_ORDER.indexOf(ruleId),
      n,
      a: tidy(a),
      b: tidy(b),
      c: tidy(c),
      dx: tidy(dx),
      sum: tidy(sum),
      exact: tidy(exact),
      error: tidy(error),
      absError: tidy(Math.abs(error)),
      estimate: Math.abs(error) <= tolerance ? 0 : Math.sign(error),
      leftSum: tidy(sums.left),
      rightSum: tidy(sums.right),
      midSum: tidy(sums.mid),
      trapSum: tidy(sums.trap),
      errorRatio: Math.abs(doubled) <= tolerance || Math.abs(error) <= tolerance ? 0 : Math.abs(error) / Math.abs(doubled),
      aboveSum: tidy(aboveSum),
      belowSum: tidy(belowSum),
      stripArea: tidy(aboveSum - belowSum),
      aboveExact: tidy(aboveExact),
      belowExact: tidy(belowExact),
      geometric: tidy(aboveExact - belowExact),
      partLeft: tidy(fn.F(c) - fn.F(a)),
      partRight: tidy(fn.F(b) - fn.F(c)),
      reversed: tidy(fn.F(a) - fn.F(b)),
      symmetry: fn.symmetry,
      symmetric: Math.abs(a + b) < 1e-9 && a !== b ? 1 : 0,
      pair: RIEMANN_PAIR_ORDER.indexOf(pairId),
      pairA: pair.a,
      pairB: pair.b,
      pairSum: tidy(pairSum),
      pairArea: tidy(pairArea),
      pairSigned: tidy(Gap(pair.b) - Gap(pair.a)),
      pairError: tidy(pairSum - pairArea),
      crossings: pair.crossings.length,
    };
  },

  getVariable(state, id) {
    return id === "n" || id === "a" || id === "b" || id === "c" ? state[id] : undefined;
  },

  setVariable(state, id, value, params) {
    if (!Number.isFinite(value)) return state;
    const fn = RIEMANN_FUNCTIONS[fnOf(params ?? riemannModel.defaultParams)];
    const limit = (v: number) => clamp(clamp(v, -LIMIT_RANGE, LIMIT_RANGE), fn.x[0], fn.x[1]);
    switch (id) {
      case "n": return { ...state, n: stripsOf(value), clock: 0 };
      case "a": return { ...state, a: limit(value) };
      case "b": return { ...state, b: limit(value) };
      case "c": return { ...state, c: limit(value) };
      default: return state;
    }
  },
};
