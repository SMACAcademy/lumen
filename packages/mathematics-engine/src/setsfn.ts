import type { SimulationModel } from "@ise/science-engine";

/**
 * Sets, relations and functions (NCERT class 11 chapters 1–2, class 12
 * chapter 1), kept to sets small enough to draw every element.
 *
 * Sets: a universal set U = {1, …, 10} and two sets of consecutive numbers,
 * A = {1, …, a} and B, which starts so that it shares `common` elements with
 * A. Union, intersection, differences and complement are counted, so
 * n(A ∪ B) = n(A) + n(B) − n(A ∩ B) can be checked, and A has 2ⁿ⁽ᴬ⁾
 * subsets. A fixed three-set picture (A the even numbers, B the multiples
 * of 3, C = {1, …, 6}) shows the three-set count.
 *
 * Relations: a relation on {1, …, 5}, chosen from a list, with three
 * switches that add the fewest pairs needed to make it reflexive, then
 * symmetric, then transitive (in that order). The result is tested for each
 * property; an equivalence relation is split into its classes.
 *
 * Functions as arrows: A = {1, 2, 3, 4} into B = {1, …, n}. Each element of A
 * gets its arrow from a slider (0 means no arrow), and element 1 may be given
 * a second arrow — then the relation is not a function. A function is one-one
 * when no two arrows meet, onto when every element of B is hit. Counts of all
 * functions, one-one functions and onto functions from A to B are exact.
 *
 * Functions as graphs: x², x³, |x|, eˣ or sin x on a chosen domain into a
 * chosen codomain. The range is worked out exactly (an interval); the
 * function is one-one when every horizontal line meets the graph at most
 * once, onto when the range is the whole codomain, and invertible exactly
 * when it is both. A horizontal line y = k is counted against the graph.
 *
 * Composition: f and g from x + 1, 2x, x², −x on A = {−2, …, 2};
 * (g∘f)(x) = g(f(x)) against (f∘g)(x) = f(g(x)).
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** A whole number in [lo, hi]; NaN becomes lo. */
const whole = (v: number, lo: number, hi: number) => clamp(Number.isFinite(v) ? Math.round(v) : lo, lo, hi);
const flag = (b: boolean) => (b ? 1 : 0);

// ── Sets ─────────────────────────────────────────────────────────────────────

/** U = {1, …, 10}. Sets are bit masks: bit i stands for the element i (1 ≤ i ≤ 10). */
export const SETSFN_UNIVERSE = 10;
export const SETSFN_MAX_SET = 6;
const U_MASK = ((1 << (SETSFN_UNIVERSE + 1)) - 1) & ~1;

export function setsfnMask(elements: readonly number[]): number {
  return elements.reduce((m, e) => m | (1 << e), 0);
}

export function setsfnElements(mask: number): number[] {
  const out: number[] = [];
  for (let e = 1; e <= SETSFN_UNIVERSE; e++) if (mask & (1 << e)) out.push(e);
  return out;
}

export function setsfnCount(mask: number): number {
  return setsfnElements(mask).length;
}

export type SetsfnKind = "two" | "three";
export const SETSFN_KIND_ORDER: readonly SetsfnKind[] = ["two", "three"];

export type SetsfnOp = "union" | "intersection" | "aMinusB" | "bMinusA" | "complementA";
export const SETSFN_OP_ORDER: readonly SetsfnOp[] = ["union", "intersection", "aMinusB", "bMinusA", "complementA"];
export const SETSFN_OP_LABELS: Record<SetsfnOp, { two: string; three: string }> = {
  union: { two: "A ∪ B", three: "A ∪ B ∪ C" },
  intersection: { two: "A ∩ B", three: "A ∩ B ∩ C" },
  aMinusB: { two: "A − B", three: "A − B" },
  bMinusA: { two: "B − A", three: "B − A" },
  complementA: { two: "A′", three: "A′" },
};

/** The three-set picture: A the even numbers, B the multiples of 3, C = {1, …, 6}, all in U. */
export const SETSFN_THREE = {
  a: setsfnMask([2, 4, 6, 8, 10]),
  b: setsfnMask([3, 6, 9]),
  c: setsfnMask([1, 2, 3, 4, 5, 6]),
} as const;

export interface SetsfnSets {
  a: number;
  b: number;
  /** Zero (the empty mask) in the two-set picture. */
  c: number;
  /** The elements shared by A and B, once clamped so that A ∪ B fits in U. */
  common: number;
}

/** A = {1, …, a}; B is b consecutive numbers starting so that `common` of them are in A. */
export function setsfnTwoSets(a: number, b: number, common: number): SetsfnSets {
  const na = whole(a, 0, SETSFN_MAX_SET);
  const nb = whole(b, 0, SETSFN_MAX_SET);
  const shared = whole(common, Math.max(0, na + nb - SETSFN_UNIVERSE), Math.min(na, nb));
  const A = Array.from({ length: na }, (_, i) => i + 1);
  const start = na - shared + 1;
  const B = Array.from({ length: nb }, (_, i) => start + i);
  return { a: setsfnMask(A), b: setsfnMask(B), c: 0, common: shared };
}

export function setsfnShaded(sets: SetsfnSets, op: SetsfnOp, kind: SetsfnKind): number {
  const { a, b, c } = sets;
  switch (op) {
    case "union":
      return kind === "three" ? a | b | c : a | b;
    case "intersection":
      return kind === "three" ? a & b & c : a & b;
    case "aMinusB":
      return a & ~b;
    case "bMinusA":
      return b & ~a;
    case "complementA":
      return U_MASK & ~a;
  }
}

// ── Relations ────────────────────────────────────────────────────────────────

/** Relations are on X = {1, …, 5}; a relation is a 5 × 5 table, row a, column b true when (a, b) is in it. */
export const SETSFN_X = 5;
export type SetsfnRelation = "identity" | "le" | "lt" | "divides" | "near" | "succ" | "sum6" | "parity" | "mod3" | "chain" | "empty";
export const SETSFN_RELATION_ORDER: readonly SetsfnRelation[] = ["identity", "le", "lt", "divides", "near", "succ", "sum6", "parity", "mod3", "chain", "empty"];
export const SETSFN_RELATIONS: Record<SetsfnRelation, { label: string; holds(a: number, b: number): boolean }> = {
  identity: { label: "a = b", holds: (a, b) => a === b },
  le: { label: "a ≤ b", holds: (a, b) => a <= b },
  lt: { label: "a < b", holds: (a, b) => a < b },
  divides: { label: "a divides b", holds: (a, b) => b % a === 0 },
  near: { label: "|a − b| ≤ 1", holds: (a, b) => Math.abs(a - b) <= 1 },
  succ: { label: "b = a + 1", holds: (a, b) => b === a + 1 },
  sum6: { label: "a + b = 6", holds: (a, b) => a + b === 6 },
  parity: { label: "a − b is even", holds: (a, b) => (a - b) % 2 === 0 },
  mod3: { label: "a − b divisible by 3", holds: (a, b) => (a - b) % 3 === 0 },
  chain: { label: "{(1, 2), (2, 3), (4, 5)}", holds: (a, b) => (a === 1 && b === 2) || (a === 2 && b === 3) || (a === 4 && b === 5) },
  empty: { label: "the empty relation", holds: () => false },
};

export type SetsfnTable = boolean[][];

/** Row and column 0 stand for the element 1. */
export function setsfnRelationTable(id: SetsfnRelation): SetsfnTable {
  const rel = SETSFN_RELATIONS[id];
  return Array.from({ length: SETSFN_X }, (_, i) => Array.from({ length: SETSFN_X }, (_, j) => rel.holds(i + 1, j + 1)));
}

/** Add the pairs needed for each property switched on: reflexive first, then symmetric, then transitive. */
export function setsfnClose(table: SetsfnTable, reflexive: boolean, symmetric: boolean, transitive: boolean): SetsfnTable {
  const t = table.map((row) => [...row]);
  const n = t.length;
  if (reflexive) for (let i = 0; i < n; i++) t[i]![i] = true;
  if (symmetric) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (t[i]![j]) t[j]![i] = true;
  if (transitive) {
    // Warshall: after pass k, (i, j) is in whenever a chain through 1, …, k joins them.
    for (let k = 0; k < n; k++) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (t[i]![k] && t[k]![j]) t[i]![j] = true;
  }
  return t;
}

export function setsfnProperties(t: SetsfnTable) {
  const n = t.length;
  let reflexive = true;
  let symmetric = true;
  let transitive = true;
  let pairs = 0;
  for (let i = 0; i < n; i++) {
    if (!t[i]![i]) reflexive = false;
    for (let j = 0; j < n; j++) {
      if (!t[i]![j]) continue;
      pairs++;
      if (!t[j]![i]) symmetric = false;
      for (let k = 0; k < n; k++) if (t[j]![k] && !t[i]![k]) transitive = false;
    }
  }
  return { pairs, reflexive, symmetric, transitive, equivalence: reflexive && symmetric && transitive };
}

/** The classes of an equivalence relation, each listed in ascending order (empty when it is not one). */
export function setsfnClasses(t: SetsfnTable): number[][] {
  if (!setsfnProperties(t).equivalence) return [];
  const seen = new Set<number>();
  const classes: number[][] = [];
  for (let i = 0; i < t.length; i++) {
    if (seen.has(i)) continue;
    const cls: number[] = [];
    for (let j = 0; j < t.length; j++) if (t[i]![j]) {
      cls.push(j + 1);
      seen.add(j);
    }
    classes.push(cls);
  }
  return classes;
}

// ── Functions as arrows ──────────────────────────────────────────────────────

/** A = {1, 2, 3, 4}; B = {1, …, n} with 2 ≤ n ≤ 5. */
export const SETSFN_DOMAIN_SIZE = 4;
export const SETSFN_CODOMAIN_MAX = 5;

export function setsfnBinomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let out = 1;
  for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

/** Functions from an m-set to an n-set: all of them, the one-one ones, and the onto ones. */
export function setsfnFunctionCounts(m: number, n: number) {
  let oneOne = 1;
  for (let i = 0; i < m; i++) oneOne *= Math.max(0, n - i);
  let onto = 0;
  // Inclusion–exclusion over the elements of B that are missed.
  for (let k = 0; k <= n; k++) onto += (k % 2 === 0 ? 1 : -1) * setsfnBinomial(n, k) * (n - k) ** m;
  return { all: n ** m, oneOne: oneOne || 0, onto: onto || 0 };
}

// ── Functions as graphs ──────────────────────────────────────────────────────

export interface SetsfnInterval {
  lo: number;
  hi: number;
  loOpen: boolean;
  hiOpen: boolean;
}

const interval = (lo: number, hi: number, loOpen = false, hiOpen = false): SetsfnInterval => ({
  lo,
  hi,
  loOpen: loOpen || lo === -Infinity,
  hiOpen: hiOpen || hi === Infinity,
});

export function setsfnContains(s: SetsfnInterval, v: number): boolean {
  const above = s.loOpen ? v > s.lo : v >= s.lo;
  const below = s.hiOpen ? v < s.hi : v <= s.hi;
  return above && below;
}

/** Whether every point of `inner` is in `outer`. */
export function setsfnSubset(inner: SetsfnInterval, outer: SetsfnInterval): boolean {
  const lo = inner.lo > outer.lo || (inner.lo === outer.lo && (!outer.loOpen || inner.loOpen));
  const hi = inner.hi < outer.hi || (inner.hi === outer.hi && (!outer.hiOpen || inner.hiOpen));
  return lo && hi;
}

export const setsfnSameInterval = (s: SetsfnInterval, t: SetsfnInterval) => setsfnSubset(s, t) && setsfnSubset(t, s);

export type SetsfnDomain = "all" | "nonneg" | "principal";
export const SETSFN_DOMAIN_ORDER: readonly SetsfnDomain[] = ["all", "nonneg", "principal"];
export const SETSFN_DOMAINS: Record<SetsfnDomain, { label: string; set: SetsfnInterval }> = {
  all: { label: "ℝ", set: interval(-Infinity, Infinity) },
  nonneg: { label: "[0, ∞)", set: interval(0, Infinity) },
  principal: { label: "[−π/2, π/2]", set: interval(-Math.PI / 2, Math.PI / 2) },
};

export type SetsfnCodomain = "all" | "nonneg" | "positive" | "unit";
export const SETSFN_CODOMAIN_ORDER: readonly SetsfnCodomain[] = ["all", "nonneg", "positive", "unit"];
export const SETSFN_CODOMAINS: Record<SetsfnCodomain, { label: string; set: SetsfnInterval }> = {
  all: { label: "ℝ", set: interval(-Infinity, Infinity) },
  nonneg: { label: "[0, ∞)", set: interval(0, Infinity) },
  positive: { label: "(0, ∞)", set: interval(0, Infinity, true) },
  unit: { label: "[−1, 1]", set: interval(-1, 1) },
};

export type SetsfnCurve = "square" | "cube" | "abs" | "exp" | "sine";
export const SETSFN_CURVE_ORDER: readonly SetsfnCurve[] = ["square", "cube", "abs", "exp", "sine"];

export interface SetsfnCurveSpec {
  label: string;
  /** The inverse's name, for where the function is a bijection. */
  inverse: string;
  f(x: number): number;
  /** The range on each domain, worked by hand. */
  range: Record<SetsfnDomain, SetsfnInterval>;
  /** One-one on each domain: increasing or decreasing throughout. */
  oneOne: Record<SetsfnDomain, boolean>;
  /** Every x in the domain with f(x) = k, or "many" for infinitely many. */
  solve(k: number, domain: SetsfnInterval): number[] | "many";
}

const HALF_PI = Math.PI / 2;
const inDomain = (xs: number[], d: SetsfnInterval) => [...new Set(xs)].filter((x) => setsfnContains(d, x));

export const SETSFN_CURVES: Record<SetsfnCurve, SetsfnCurveSpec> = {
  square: {
    label: "x²",
    inverse: "√x",
    f: (x) => x * x,
    range: { all: interval(0, Infinity), nonneg: interval(0, Infinity), principal: interval(0, HALF_PI * HALF_PI) },
    oneOne: { all: false, nonneg: true, principal: false },
    solve: (k, d) => (k < 0 ? [] : inDomain([-Math.sqrt(k), Math.sqrt(k)], d)),
  },
  cube: {
    label: "x³",
    inverse: "∛x",
    f: (x) => x ** 3,
    range: { all: interval(-Infinity, Infinity), nonneg: interval(0, Infinity), principal: interval(-(HALF_PI ** 3), HALF_PI ** 3) },
    oneOne: { all: true, nonneg: true, principal: true },
    solve: (k, d) => inDomain([Math.cbrt(k)], d),
  },
  abs: {
    label: "|x|",
    inverse: "x",
    f: (x) => Math.abs(x),
    range: { all: interval(0, Infinity), nonneg: interval(0, Infinity), principal: interval(0, HALF_PI) },
    oneOne: { all: false, nonneg: true, principal: false },
    solve: (k, d) => (k < 0 ? [] : inDomain([-k, k], d)),
  },
  exp: {
    label: "eˣ",
    inverse: "ln x",
    f: (x) => Math.exp(x),
    range: { all: interval(0, Infinity, true), nonneg: interval(1, Infinity), principal: interval(Math.exp(-HALF_PI), Math.exp(HALF_PI)) },
    oneOne: { all: true, nonneg: true, principal: true },
    solve: (k, d) => (k <= 0 ? [] : inDomain([Math.log(k)], d)),
  },
  sine: {
    label: "sin x",
    inverse: "sin⁻¹ x",
    f: (x) => Math.sin(x),
    range: { all: interval(-1, 1), nonneg: interval(-1, 1), principal: interval(-1, 1) },
    oneOne: { all: false, nonneg: false, principal: true },
    solve: (k, d) => {
      if (Math.abs(k) > 1) return [];
      // On [−π/2, π/2] sine rises once through every value; on [0, ∞) or ℝ it takes each value again every 2π.
      if (d.lo === -HALF_PI && d.hi === HALF_PI) return [Math.asin(k)];
      return "many";
    },
  },
};

// ── Composition ──────────────────────────────────────────────────────────────

export type SetsfnRule = "plus1" | "double" | "square" | "negate";
export const SETSFN_RULE_ORDER: readonly SetsfnRule[] = ["plus1", "double", "square", "negate"];
export const SETSFN_RULES: Record<SetsfnRule, { label: string; of(x: number): number }> = {
  plus1: { label: "x + 1", of: (x) => x + 1 },
  double: { label: "2x", of: (x) => 2 * x },
  square: { label: "x²", of: (x) => x * x },
  negate: { label: "−x", of: (x) => -x || 0 },
};
/** The inputs of the composition picture, A = {−2, …, 2}. */
export const SETSFN_INPUTS: readonly number[] = [-2, -1, 0, 1, 2];

// ── The model ────────────────────────────────────────────────────────────────

export type SetsFnParams = {
  sets: SetsfnKind;
  op: SetsfnOp;
  relation: SetsfnRelation;
  curve: SetsfnCurve;
  domain: SetsfnDomain;
  codomain: SetsfnCodomain;
  fRule: SetsfnRule;
  gRule: SetsfnRule;
};

export interface SetsFnState {
  /** Sizes of A and B and their overlap (two-set picture). */
  readonly a: number;
  readonly b: number;
  readonly common: number;
  /** Closure switches, 0 or 1. */
  readonly addR: number;
  readonly addS: number;
  readonly addT: number;
  /** The arrow from each element of A (0: none), a second arrow from 1 (0: none), and n(B). */
  readonly f1: number;
  readonly f2: number;
  readonly f3: number;
  readonly f4: number;
  readonly extra: number;
  readonly nCod: number;
  /** Height of the horizontal line. */
  readonly k: number;
  /** Input of the composition. */
  readonly x: number;
}

export type SetsFnResults = {
  sets: number;
  op: number;
  nU: number;
  nA: number;
  nB: number;
  nC: number;
  nAB: number;
  nAC: number;
  nBC: number;
  nAuB: number;
  nAminusB: number;
  nBminusA: number;
  nCompA: number;
  /** All the sets shown: their union and their common part (A, B in the two-set picture). */
  nAll: number;
  nAllCommon: number;
  nShaded: number;
  powerA: number;
  subsetBA: number;
  subsetAB: number;
  disjoint: number;
  relation: number;
  pairs: number;
  added: number;
  /** The closure switches as applied, 0 or 1. */
  addR: number;
  addS: number;
  addT: number;
  reflexive: number;
  symmetric: number;
  transitive: number;
  equivalence: number;
  classes: number;
  img1: number;
  img2: number;
  img3: number;
  img4: number;
  /** The second arrow from 1, or 0 when there is none (or it lands where the first does). */
  extraImg: number;
  codomainSize: number;
  noImage: number;
  twoImages: number;
  isFunction: number;
  rangeSize: number;
  oneOne: number;
  onto: number;
  bijective: number;
  functionsCount: number;
  oneOneCount: number;
  ontoCount: number;
  curve: number;
  domain: number;
  codomain: number;
  k: number;
  /** How often y = k meets the graph: 0, 1, 2, or 3 for infinitely many. */
  crossings: number;
  grValid: number;
  grOneOne: number;
  grOnto: number;
  grBijective: number;
  kInRange: number;
  kInCodomain: number;
  fRule: number;
  gRule: number;
  x: number;
  fx: number;
  gx: number;
  gfx: number;
  fgx: number;
  sameHere: number;
  commute: number;
  fOneOne: number;
  fImageSize: number;
};

const OUTPUTS = [
  "sets", "op", "nU", "nA", "nB", "nC", "nAB", "nAC", "nBC", "nAuB", "nAminusB", "nBminusA", "nCompA", "nAll", "nAllCommon", "nShaded", "powerA", "subsetBA", "subsetAB", "disjoint",
  "relation", "pairs", "added", "addR", "addS", "addT", "reflexive", "symmetric", "transitive", "equivalence", "classes",
  "img1", "img2", "img3", "img4", "extraImg", "codomainSize", "noImage", "twoImages", "isFunction", "rangeSize", "oneOne", "onto", "bijective", "functionsCount", "oneOneCount", "ontoCount",
  "curve", "domain", "codomain", "k", "crossings", "grValid", "grOneOne", "grOnto", "grBijective", "kInRange", "kInCodomain",
  "fRule", "gRule", "x", "fx", "gx", "gfx", "fgx", "sameHere", "commute", "fOneOne", "fImageSize",
] as const satisfies readonly (keyof SetsFnResults)[];

const pick = <T extends string>(order: readonly T[], value: unknown, fallback: T): T => (order.includes(value as T) ? (value as T) : fallback);

/** The two- or three-set picture for these params and state. */
export function setsfnPicture(state: Pick<SetsFnState, "a" | "b" | "common">, kind: SetsfnKind): SetsfnSets {
  if (kind === "three") return { ...SETSFN_THREE, common: setsfnCount(SETSFN_THREE.a & SETSFN_THREE.b) };
  return setsfnTwoSets(state.a, state.b, state.common);
}

/** The relation after the switched-on closures. */
export function setsfnRelationNow(id: SetsfnRelation, state: Pick<SetsFnState, "addR" | "addS" | "addT">): SetsfnTable {
  return setsfnClose(setsfnRelationTable(id), whole(state.addR, 0, 1) === 1, whole(state.addS, 0, 1) === 1, whole(state.addT, 0, 1) === 1);
}

/** The arrows of the A → B picture: each element's image (0 for none), and the second arrow from 1 (0 for none). */
export function setsfnArrows(state: Pick<SetsFnState, "f1" | "f2" | "f3" | "f4" | "extra" | "nCod">) {
  const n = whole(state.nCod, 2, SETSFN_CODOMAIN_MAX);
  const image = (v: number) => {
    const w = whole(v, 0, SETSFN_CODOMAIN_MAX);
    return w === 0 ? 0 : Math.min(w, n);
  };
  const images = [image(state.f1), image(state.f2), image(state.f3), image(state.f4)];
  let second = image(state.extra);
  // A second arrow from 1 when 1 has no first one is simply its arrow; one landing on the first is the same arrow.
  if (images[0] === 0) [images[0], second] = [second, 0];
  return { n, images, extra: second === images[0] ? 0 : second };
}

const LIMITS = {
  a: [0, SETSFN_MAX_SET], b: [0, SETSFN_MAX_SET], common: [0, SETSFN_MAX_SET],
  addR: [0, 1], addS: [0, 1], addT: [0, 1],
  f1: [0, SETSFN_CODOMAIN_MAX], f2: [0, SETSFN_CODOMAIN_MAX], f3: [0, SETSFN_CODOMAIN_MAX], f4: [0, SETSFN_CODOMAIN_MAX], extra: [0, SETSFN_CODOMAIN_MAX],
  nCod: [2, SETSFN_CODOMAIN_MAX],
  k: [-2.5, 3.5],
  x: [-2, 2],
} as const satisfies Record<keyof SetsFnState, readonly [number, number]>;

export const SETSFN_LIMITS = LIMITS;

export const setsFnModel: SimulationModel<SetsFnState, SetsFnParams, SetsFnResults> = {
  id: "setsfn",
  defaultParams: { sets: "two", op: "union", relation: "near", curve: "square", domain: "all", codomain: "all", fRule: "square", gRule: "plus1" },
  outputs: OUTPUTS,
  stateVariables: ["a", "b", "common", "addR", "addS", "addT", "f1", "f2", "f3", "f4", "extra", "nCod", "k", "x"],

  initialize() {
    return { a: 4, b: 5, common: 2, addR: 0, addS: 0, addT: 0, f1: 2, f2: 3, f3: 3, f4: 5, extra: 0, nCod: 5, k: 1, x: 1 };
  },

  /** Nothing here moves with time. */
  advance(state) {
    return state;
  },

  /** Step the composition's input through A. */
  step(state, _params, sign) {
    return { ...state, x: whole(state.x + sign, LIMITS.x[0], LIMITS.x[1]) };
  },

  derive(state, params) {
    // Sets.
    const kind = pick(SETSFN_KIND_ORDER, params.sets, "two");
    const op = pick(SETSFN_OP_ORDER, params.op, "union");
    const s = setsfnPicture(state, kind);
    const n = setsfnCount;
    const all = kind === "three" ? s.a | s.b | s.c : s.a | s.b;
    const allCommon = kind === "three" ? s.a & s.b & s.c : s.a & s.b;

    // Relations.
    const relationId = pick(SETSFN_RELATION_ORDER, params.relation, "near");
    const base = setsfnProperties(setsfnRelationTable(relationId));
    const table = setsfnRelationNow(relationId, state);
    const props = setsfnProperties(table);

    // Functions as arrows.
    const arrows = setsfnArrows(state);
    const noImage = arrows.images.filter((v) => v === 0).length;
    const twoImages = arrows.extra !== 0 ? 1 : 0;
    const isFunction = noImage === 0 && twoImages === 0;
    const hit = new Set([...arrows.images, arrows.extra].filter((v) => v !== 0));
    const counts = setsfnFunctionCounts(SETSFN_DOMAIN_SIZE, arrows.n);

    // Functions as graphs.
    const curveId = pick(SETSFN_CURVE_ORDER, params.curve, "square");
    const domainId = pick(SETSFN_DOMAIN_ORDER, params.domain, "all");
    const codomainId = pick(SETSFN_CODOMAIN_ORDER, params.codomain, "all");
    const curve = SETSFN_CURVES[curveId];
    const range = curve.range[domainId];
    const codomain = SETSFN_CODOMAINS[codomainId].set;
    const k = Math.round(clamp(Number.isFinite(state.k) ? state.k : 0, LIMITS.k[0], LIMITS.k[1]) * 100) / 100 || 0;
    const roots = curve.solve(k, SETSFN_DOMAINS[domainId].set);
    const grValid = setsfnSubset(range, codomain);
    const grOneOne = curve.oneOne[domainId];
    const grOnto = grValid && setsfnSameInterval(range, codomain);

    // Composition.
    const fId = pick(SETSFN_RULE_ORDER, params.fRule, "square");
    const gId = pick(SETSFN_RULE_ORDER, params.gRule, "plus1");
    const f = SETSFN_RULES[fId].of;
    const g = SETSFN_RULES[gId].of;
    const x = whole(state.x, LIMITS.x[0], LIMITS.x[1]);
    const fImage = new Set(SETSFN_INPUTS.map(f));

    return {
      sets: SETSFN_KIND_ORDER.indexOf(kind),
      op: SETSFN_OP_ORDER.indexOf(op),
      nU: SETSFN_UNIVERSE,
      nA: n(s.a),
      nB: n(s.b),
      nC: n(s.c),
      nAB: n(s.a & s.b),
      nAC: n(s.a & s.c),
      nBC: n(s.b & s.c),
      nAuB: n(s.a | s.b),
      nAminusB: n(s.a & ~s.b),
      nBminusA: n(s.b & ~s.a),
      nCompA: n(U_MASK & ~s.a),
      nAll: n(all),
      nAllCommon: n(allCommon),
      nShaded: n(setsfnShaded(s, op, kind)),
      powerA: 2 ** n(s.a),
      subsetBA: flag((s.b & ~s.a) === 0),
      subsetAB: flag((s.a & ~s.b) === 0),
      disjoint: flag((s.a & s.b) === 0),
      relation: SETSFN_RELATION_ORDER.indexOf(relationId),
      pairs: props.pairs,
      added: props.pairs - base.pairs,
      addR: whole(state.addR, 0, 1),
      addS: whole(state.addS, 0, 1),
      addT: whole(state.addT, 0, 1),
      reflexive: flag(props.reflexive),
      symmetric: flag(props.symmetric),
      transitive: flag(props.transitive),
      equivalence: flag(props.equivalence),
      classes: setsfnClasses(table).length,
      img1: arrows.images[0]!,
      img2: arrows.images[1]!,
      img3: arrows.images[2]!,
      img4: arrows.images[3]!,
      extraImg: arrows.extra,
      codomainSize: arrows.n,
      noImage,
      twoImages,
      isFunction: flag(isFunction),
      rangeSize: hit.size,
      oneOne: flag(isFunction && hit.size === SETSFN_DOMAIN_SIZE),
      onto: flag(isFunction && hit.size === arrows.n),
      bijective: flag(isFunction && hit.size === SETSFN_DOMAIN_SIZE && hit.size === arrows.n),
      functionsCount: counts.all,
      oneOneCount: counts.oneOne,
      ontoCount: counts.onto,
      curve: SETSFN_CURVE_ORDER.indexOf(curveId),
      domain: SETSFN_DOMAIN_ORDER.indexOf(domainId),
      codomain: SETSFN_CODOMAIN_ORDER.indexOf(codomainId),
      k,
      crossings: roots === "many" ? 3 : Math.min(roots.length, 3),
      grValid: flag(grValid),
      grOneOne: flag(grOneOne),
      grOnto: flag(grOnto),
      grBijective: flag(grValid && grOneOne && grOnto),
      kInRange: flag(setsfnContains(range, k)),
      kInCodomain: flag(setsfnContains(codomain, k)),
      fRule: SETSFN_RULE_ORDER.indexOf(fId),
      gRule: SETSFN_RULE_ORDER.indexOf(gId),
      x,
      fx: f(x),
      gx: g(x),
      gfx: g(f(x)),
      fgx: f(g(x)),
      sameHere: flag(g(f(x)) === f(g(x))),
      commute: flag(SETSFN_INPUTS.every((t) => g(f(t)) === f(g(t)))),
      fOneOne: flag(fImage.size === SETSFN_INPUTS.length),
      fImageSize: fImage.size,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof SetsFnState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in LIMITS)) return state;
    const [lo, hi] = LIMITS[id as keyof SetsFnState];
    const v = id === "k" ? clamp(Number.isFinite(value) ? value : 0, lo, hi) : whole(value, lo, hi);
    return { ...state, [id]: v };
  },
};
