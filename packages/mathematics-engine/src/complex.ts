import type { SimulationModel } from "@ise/science-engine";

/**
 * Complex numbers and quadratic equations (NCERT class 11, chapter 4, and JEE).
 *
 * Argand plane: z = a + ib is the point (a, b). Its modulus |z| = √(a² + b²)
 * is its distance from 0; its principal argument is the angle from the
 * positive real axis, taken in (−π, π] — so a point in the third quadrant has
 * a negative argument, and a negative real number has argument +π. The
 * conjugate z̄ = a − ib is the reflection in the real axis; i·z = −b + ia is
 * z turned a quarter turn anticlockwise. Play turns z about 0 without
 * changing its length (the sliders stop at ±4, but a turned z may reach 4√2).
 *
 * Algebra: a second number w = c + id. Sum and difference go tip to tail like
 * vectors. The product multiplies the moduli and adds the arguments (then,
 * if the sum has left (−π, π], 2π is added or taken away to bring it back).
 * The quotient divides the moduli and subtracts the arguments.
 *
 * Roots of unity: the n solutions of zⁿ = 1 are cos(2πk/n) + i sin(2πk/n),
 * the corners of a regular n-gon on the unit circle. They add up to 0 and
 * multiply to (−1)ⁿ⁻¹. ω = the first of them; ωᵐ goes round the polygon and
 * comes back to 1 when m reaches n.
 *
 * Quadratics: ax² + bx + c with discriminant D = b² − 4ac. D > 0: two real
 * roots, where the parabola cuts the x-axis. D = 0: one repeated root, where
 * it touches. D < 0: no real roots — the parabola misses the axis — and the
 * roots are the conjugate pair (−b ± i√(−D)) / 2a. Always α + β = −b/a and
 * αβ = c/a. For a number k: k lies between the roots exactly when a·f(k) < 0;
 * both roots exceed k exactly when D ≥ 0, a·f(k) > 0 and −b/2a > k.
 *
 * Every number is computed exactly from its formula; the tests check them
 * against values worked by hand.
 */

export type ComplexOp = "add" | "subtract" | "multiply" | "divide";
export const COMPLEX_OP_ORDER: readonly ComplexOp[] = ["add", "subtract", "multiply", "divide"];
/** The symbol for each operation, in COMPLEX_OP_ORDER. */
export const COMPLEX_OP_SYMBOLS: readonly string[] = ["+", "−", "×", "÷"];

export type ComplexParams = { op: ComplexOp };

export interface ComplexState {
  /** z = a + ib. */
  readonly a: number;
  readonly b: number;
  /** w = c + id. */
  readonly c: number;
  readonly d: number;
  /** Roots of unity: how many, and which power of ω. */
  readonly n: number;
  readonly m: number;
  /** The quadratic qa·x² + qb·x + qc, and the number k its roots are compared with. */
  readonly qa: number;
  readonly qb: number;
  readonly qc: number;
  readonly k: number;
}

export type ComplexResults = {
  re: number;
  im: number;
  modulus: number;
  /** Principal argument of z, rad, in (−π, π]; 0 for z = 0 (see isZero). */
  arg: number;
  argDeg: number;
  /** 1–4, or 0 on an axis. */
  quadrant: number;
  isZero: number;
  conjRe: number;
  conjIm: number;
  conjArgDeg: number;
  /** z·z̄ = |z|², always real. */
  zzBar: number;
  iRe: number;
  iIm: number;
  iArgDeg: number;
  /** 1/z = z̄ / |z|²; 0 when z = 0. */
  recipRe: number;
  recipIm: number;

  wRe: number;
  wIm: number;
  modulus2: number;
  arg2: number;
  arg2Deg: number;
  op: number;
  /** The chosen operation's result z ∘ w; NaN when dividing by w = 0. */
  resultRe: number;
  resultIm: number;
  resultModulus: number;
  resultArgDeg: number;
  /** 0 only when dividing by w = 0. */
  resultDefined: number;
  sumRe: number;
  sumIm: number;
  diffRe: number;
  diffIm: number;
  /** |z − w|: the distance between the two points. */
  distance: number;
  prodRe: number;
  prodIm: number;
  prodModulus: number;
  prodArg: number;
  prodArgDeg: number;
  /** arg z + arg w, before any 2π is taken off. */
  argSumDeg: number;
  /** The whole number of turns k in arg(zw) = arg z + arg w + 2kπ. */
  argTurns: number;
  quotRe: number;
  quotIm: number;
  quotModulus: number;

  n: number;
  /** The angle between neighbouring roots, 360°/n. */
  rootAngleDeg: number;
  omegaRe: number;
  omegaIm: number;
  rootSumRe: number;
  rootSumIm: number;
  /** Product of all n roots: (−1)ⁿ⁻¹. */
  rootProduct: number;
  m: number;
  /** ωᵐ, and m reduced mod n. */
  powerRe: number;
  powerIm: number;
  mModN: number;

  qa: number;
  qb: number;
  qc: number;
  isQuadratic: number;
  disc: number;
  /** 0 two real roots, 1 one repeated root, 2 a complex pair, 3 not a quadratic. */
  rootKind: number;
  realRoots: number;
  /** α is the smaller real root, or p + iq (q > 0); β the larger, or p − iq. */
  alphaRe: number;
  alphaIm: number;
  betaRe: number;
  betaIm: number;
  rootSum: number;
  rootProduct2: number;
  vertexX: number;
  vertexY: number;
  k: number;
  fk: number;
  /** a·f(k): negative exactly when k lies between the roots. */
  afk: number;
  /** 0 no real roots, 1 k is a root, 2 k below both, 3 k between, 4 k above both, 5 not a quadratic. */
  kLocation: number;
  /** Where f(x) > 0 (positiveSet) and f(x) < 0 (negativeSet): 0 every x, 1 outside the roots, 2 between them, 3 no x, 4 every x but the vertex, 5 not a quadratic. */
  positiveSet: number;
  negativeSet: number;
};

const OUTPUTS = [
  "re", "im", "modulus", "arg", "argDeg", "quadrant", "isZero", "conjRe", "conjIm", "conjArgDeg", "zzBar", "iRe", "iIm", "iArgDeg", "recipRe", "recipIm",
  "wRe", "wIm", "modulus2", "arg2", "arg2Deg", "op", "resultRe", "resultIm", "resultModulus", "resultArgDeg", "resultDefined",
  "sumRe", "sumIm", "diffRe", "diffIm", "distance", "prodRe", "prodIm", "prodModulus", "prodArg", "prodArgDeg", "argSumDeg", "argTurns", "quotRe", "quotIm", "quotModulus",
  "n", "rootAngleDeg", "omegaRe", "omegaIm", "rootSumRe", "rootSumIm", "rootProduct", "m", "powerRe", "powerIm", "mModN",
  "qa", "qb", "qc", "isQuadratic", "disc", "rootKind", "realRoots", "alphaRe", "alphaIm", "betaRe", "betaIm", "rootSum", "rootProduct2", "vertexX", "vertexY",
  "k", "fk", "afk", "kLocation", "positiveSet", "negativeSet",
] as const satisfies readonly (keyof ComplexResults)[];

/** Slider limits, shared with the renderer and the concept. */
export const COMPLEX_LIMIT = 4;
/** Play may turn a corner of the slider square onto an axis, so z itself may reach 4√2. */
export const COMPLEX_REACH = COMPLEX_LIMIT * Math.SQRT2;
export const COMPLEX_N: readonly [number, number] = [2, 12];
export const COMPLEX_M: readonly [number, number] = [0, 12];
export const QUADRATIC_A = 3;
export const QUADRATIC_BC = 6;
export const QUADRATIC_K = 5;
/** Play turns z about 0 at this rate, rad/s: multiplying by e^{iθ} as θ grows. */
export const COMPLEX_TURN_RATE = Math.PI / 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Rounding noise and −0 become 0. */
const tidy = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);
const DEG = 180 / Math.PI;
const EPS = 1e-9;

/** The principal argument of a + ib, in (−π, π]. A negative real number gets +π, never −π; 0 gets 0. */
export function principalArgument(re: number, im: number): number {
  const x = tidy(re);
  const y = tidy(im);
  if (x === 0 && y === 0) return 0;
  return Math.atan2(y, x);
}

export function complexQuadrant(re: number, im: number): number {
  const x = tidy(re);
  const y = tidy(im);
  if (x === 0 || y === 0) return 0;
  if (y > 0) return x > 0 ? 1 : 2;
  return x < 0 ? 3 : 4;
}

/** The roots of ax² + bx + c (a ≠ 0): the smaller real root first, or p + iq then p − iq with q > 0. */
export function quadraticRoots(a: number, b: number, c: number) {
  const D = b * b - 4 * a * c;
  const p = -b / (2 * a);
  if (D > EPS) {
    const s = Math.sqrt(D) / (2 * Math.abs(a));
    return { D, kind: 0, alpha: [tidy(p - s), 0] as const, beta: [tidy(p + s), 0] as const };
  }
  if (D >= -EPS) return { D: 0, kind: 1, alpha: [tidy(p), 0] as const, beta: [tidy(p), 0] as const };
  const q = Math.sqrt(-D) / (2 * Math.abs(a));
  return { D, kind: 2, alpha: [tidy(p), q] as const, beta: [tidy(p), -q] as const };
}

const opOf = (params: ComplexParams) => (COMPLEX_OP_ORDER.includes(params.op) ? params.op : "add");

export const complexModel: SimulationModel<ComplexState, ComplexParams, ComplexResults> = {
  id: "complex",
  defaultParams: { op: "add" },
  outputs: OUTPUTS,
  stateVariables: ["a", "b", "c", "d", "n", "m", "qa", "qb", "qc", "k"],

  initialize() {
    return { a: 3, b: 2, c: 1, d: 2, n: 5, m: 1, qa: 1, qb: -2, qc: -3, k: 0 };
  },

  /** Play turns z about the origin: z·e^{iθ}, with θ growing at π/4 rad/s. */
  advance(state, dt) {
    const t = COMPLEX_TURN_RATE * dt;
    const cos = Math.cos(t);
    const sin = Math.sin(t);
    return {
      ...state,
      a: tidy(clamp(state.a * cos - state.b * sin, -COMPLEX_REACH, COMPLEX_REACH)),
      b: tidy(clamp(state.a * sin + state.b * cos, -COMPLEX_REACH, COMPLEX_REACH)),
    };
  },

  /** A step multiplies z by i (forward) or by −i (back): a quarter turn. */
  step(state, _params, sign) {
    return sign > 0 ? { ...state, a: tidy(-state.b), b: tidy(state.a) } : { ...state, a: tidy(state.b), b: tidy(-state.a) };
  },

  derive(state, params) {
    const L = COMPLEX_LIMIT;
    const a = tidy(clamp(state.a, -COMPLEX_REACH, COMPLEX_REACH));
    const b = tidy(clamp(state.b, -COMPLEX_REACH, COMPLEX_REACH));
    const c = tidy(clamp(state.c, -L, L));
    const d = tidy(clamp(state.d, -L, L));

    const modulus = Math.hypot(a, b);
    const arg = principalArgument(a, b);
    const isZero = modulus < EPS ? 1 : 0;
    const modulus2 = Math.hypot(c, d);
    const arg2 = principalArgument(c, d);

    const prodRe = tidy(a * c - b * d);
    const prodIm = tidy(a * d + b * c);
    const prodArg = principalArgument(prodRe, prodIm);
    const both = isZero === 0 && modulus2 >= EPS;
    // Only meaningful when neither factor is 0; otherwise the product is 0 and has no angle.
    const argTurns = both ? Math.round((prodArg - (arg + arg2)) / (2 * Math.PI)) : 0;

    const w2 = c * c + d * d;
    const divisible = w2 >= EPS;
    const quotRe = divisible ? tidy((a * c + b * d) / w2) : 0;
    const quotIm = divisible ? tidy((b * c - a * d) / w2) : 0;
    const z2 = a * a + b * b;

    const op = opOf(params);
    // z ÷ 0 has no answer: NaN, which the lab shows as "undefined" (never 0).
    const result: readonly [number, number] =
      op === "add" ? [tidy(a + c), tidy(b + d)] : op === "subtract" ? [tidy(a - c), tidy(b - d)] : op === "multiply" ? [prodRe, prodIm] : divisible ? [quotRe, quotIm] : [Number.NaN, Number.NaN];

    // Roots of unity, added and multiplied one by one.
    const n = Math.round(clamp(state.n, COMPLEX_N[0], COMPLEX_N[1]));
    const m = Math.round(clamp(state.m, COMPLEX_M[0], COMPLEX_M[1]));
    let sumRe = 0;
    let sumIm = 0;
    let productRe = 1;
    let productIm = 0;
    for (let j = 0; j < n; j++) {
      const t = (2 * Math.PI * j) / n;
      const [cr, ci] = [Math.cos(t), Math.sin(t)];
      sumRe += cr;
      sumIm += ci;
      [productRe, productIm] = [productRe * cr - productIm * ci, productRe * ci + productIm * cr];
    }
    const power = (2 * Math.PI * (m % n)) / n;

    // The quadratic.
    const qa = clamp(state.qa, -QUADRATIC_A, QUADRATIC_A) || 0;
    const qb = clamp(state.qb, -QUADRATIC_BC, QUADRATIC_BC) || 0;
    const qc = clamp(state.qc, -QUADRATIC_BC, QUADRATIC_BC) || 0;
    const k = clamp(state.k, -QUADRATIC_K, QUADRATIC_K) || 0;
    const disc = qb * qb - 4 * qa * qc;
    const fk = tidy(qa * k * k + qb * k + qc);
    const quadratic = Math.abs(qa) >= EPS;
    let quad = {
      rootKind: 3, realRoots: 0, alphaRe: 0, alphaIm: 0, betaRe: 0, betaIm: 0, rootSum: 0, rootProduct2: 0, vertexX: 0, vertexY: 0, kLocation: 5, positiveSet: 5, negativeSet: 5,
    };
    if (quadratic) {
      const roots = quadraticRoots(qa, qb, qc);
      const [ar, ai] = roots.alpha;
      const [br, bi] = roots.beta;
      const kLocation =
        roots.kind === 2 ? 0 : Math.abs(fk) < EPS ? 1 : k < ar ? 2 : k > br ? 4 : 3;
      // Where the sign of f is the sign of a, and where it is the opposite.
      const sameAsA = roots.kind === 0 ? 1 : roots.kind === 1 ? 4 : 0;
      const oppositeToA = roots.kind === 0 ? 2 : 3;
      quad = {
        rootKind: roots.kind,
        realRoots: roots.kind === 0 ? 2 : roots.kind === 1 ? 1 : 0,
        alphaRe: ar,
        alphaIm: ai,
        betaRe: br,
        betaIm: bi,
        // Worked from the roots themselves, so α + β = −b/a and αβ = c/a are things to check, not assume.
        rootSum: tidy(ar + br),
        rootProduct2: tidy(ar * br - ai * bi),
        vertexX: tidy(-qb / (2 * qa)),
        vertexY: tidy(-disc / (4 * qa)),
        kLocation,
        positiveSet: qa > 0 ? sameAsA : oppositeToA,
        negativeSet: qa > 0 ? oppositeToA : sameAsA,
      };
    }

    return {
      re: a,
      im: b,
      modulus,
      arg,
      argDeg: tidy(arg * DEG),
      quadrant: complexQuadrant(a, b),
      isZero,
      conjRe: a,
      conjIm: tidy(-b),
      conjArgDeg: tidy(principalArgument(a, -b) * DEG),
      zzBar: tidy(z2),
      iRe: tidy(-b),
      iIm: a,
      iArgDeg: tidy(principalArgument(-b, a) * DEG),
      recipRe: isZero ? 0 : tidy(a / z2),
      recipIm: isZero ? 0 : tidy(-b / z2),

      wRe: c,
      wIm: d,
      modulus2,
      arg2,
      arg2Deg: tidy(arg2 * DEG),
      op: COMPLEX_OP_ORDER.indexOf(op),
      resultRe: result[0],
      resultIm: result[1],
      resultModulus: Math.hypot(result[0], result[1]),
      resultArgDeg: tidy(principalArgument(result[0], result[1]) * DEG),
      resultDefined: op === "divide" && !divisible ? 0 : 1,
      sumRe: tidy(a + c),
      sumIm: tidy(b + d),
      diffRe: tidy(a - c),
      diffIm: tidy(b - d),
      distance: Math.hypot(a - c, b - d),
      prodRe,
      prodIm,
      prodModulus: Math.hypot(prodRe, prodIm),
      prodArg,
      prodArgDeg: tidy(prodArg * DEG),
      argSumDeg: tidy((arg + arg2) * DEG),
      argTurns: argTurns || 0,
      quotRe,
      quotIm,
      quotModulus: divisible ? modulus / modulus2 : 0,

      n,
      rootAngleDeg: 360 / n,
      omegaRe: tidy(Math.cos((2 * Math.PI) / n)),
      omegaIm: tidy(Math.sin((2 * Math.PI) / n)),
      rootSumRe: tidy(sumRe),
      rootSumIm: tidy(sumIm),
      rootProduct: tidy(productRe),
      m,
      powerRe: tidy(Math.cos(power)),
      powerIm: tidy(Math.sin(power)),
      mModN: m % n,

      qa,
      qb,
      qc,
      isQuadratic: quadratic ? 1 : 0,
      disc,
      ...quad,
      k,
      fk,
      afk: tidy(qa * fk),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof ComplexState] : undefined;
  },

  setVariable(state, id, value) {
    const L = COMPLEX_LIMIT;
    switch (id) {
      case "a":
      case "b":
      case "c":
      case "d":
        return { ...state, [id]: tidy(clamp(value, -L, L)) };
      case "n": return { ...state, n: Math.round(clamp(value, COMPLEX_N[0], COMPLEX_N[1])) };
      case "m": return { ...state, m: Math.round(clamp(value, COMPLEX_M[0], COMPLEX_M[1])) };
      case "qa": return { ...state, qa: clamp(value, -QUADRATIC_A, QUADRATIC_A) || 0 };
      case "qb": return { ...state, qb: clamp(value, -QUADRATIC_BC, QUADRATIC_BC) || 0 };
      case "qc": return { ...state, qc: clamp(value, -QUADRATIC_BC, QUADRATIC_BC) || 0 };
      case "k": return { ...state, k: clamp(value, -QUADRATIC_K, QUADRATIC_K) || 0 };
      default: return state;
    }
  },
};
