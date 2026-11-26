import type { SimulationModel } from "@ise/science-engine";

/**
 * Real numbers, patterns and quadratic graphs, for classes 6 to 10.
 *
 * Factors: every whole number above 1 is a product of primes in exactly one
 * way, apart from order (the fundamental theorem of arithmetic). From the
 * prime powers of two numbers, the HCF takes each prime the fewest times it
 * appears and the LCM the most times, so HCF × LCM = the product of the two.
 *
 * Roots: the square root spiral. A right triangle with legs √k and 1 has
 * hypotenuse √(k + 1), so triangle after triangle builds √2, √3, √4 … and a
 * compass swings each one down onto the number line. √k is rational only
 * when k is a perfect square; otherwise its decimal never ends or repeats.
 *
 * Patterns: rows of matchstick shapes grow by the same number of sticks each
 * time (2n + 1 triangles, 3n + 1 squares, 5n + 1 houses), while dot squares
 * (n²) and dot triangles (n(n + 1)/2) grow faster and faster.
 *
 * Tiles: x² tiles, x tiles and unit tiles. Adding two expressions joins tiles
 * of the same kind only; a positive and a negative tile of one kind make a
 * zero pair and cancel.
 *
 * Parabola: y = ax² + bx + c. Its zeroes are where it meets the x-axis — two,
 * one or none, as b² − 4ac is positive, zero or negative — and they add to
 * −b/a and multiply to c/a.
 *
 * Progression: an AP a, a + d, a + 2d, …; its nth term is a + (n − 1)d and
 * the sum of n terms is n/2 × (first + last).
 *
 * Every value is exact or a direct formula, checked by hand in the tests.
 */

export type PatternsSticks = "triangles" | "squares" | "houses";
export const PATTERNS_STICKS_ORDER: readonly PatternsSticks[] = ["triangles", "squares", "houses"];
/** Sticks needed for n shapes in a row: growth × n + 1. */
export const PATTERNS_STICKS: Record<PatternsSticks, { label: string; growth: number; start: number }> = {
  triangles: { label: "a row of triangles", growth: 2, start: 1 },
  squares: { label: "a row of squares", growth: 3, start: 1 },
  houses: { label: "a row of houses", growth: 5, start: 1 },
};

export type PatternsOp = "add" | "subtract";

/** Control ranges, shared with the concept and the tests. */
export const PATTERNS_NUMBER_RANGE = [2, 120] as const;
export const PATTERNS_K_RANGE = [1, 16] as const;
export const PATTERNS_N_RANGE = [1, 20] as const;
export const PATTERNS_TILE_RANGE = [-4, 4] as const;
export const PATTERNS_QA_RANGE = [-3, 3] as const;
export const PATTERNS_QBC_RANGE = [-8, 8] as const;
export const PATTERNS_AP_A_RANGE = [-10, 20] as const;
export const PATTERNS_AP_D_RANGE = [-5, 5] as const;

/** The prime factors of a whole number ≥ 2, smallest first, repeated as often as they divide it. */
export function patternsPrimeFactors(value: number): number[] {
  let rest = Math.round(Math.abs(value));
  const out: number[] = [];
  if (rest < 2) return out;
  for (let p = 2; p * p <= rest; p++) {
    while (rest % p === 0) {
      out.push(p);
      rest /= p;
    }
  }
  if (rest > 1) out.push(rest);
  return out;
}

/** Prime → how many times it divides the number. */
export function patternsPrimePowers(value: number): Map<number, number> {
  const powers = new Map<number, number>();
  for (const p of patternsPrimeFactors(value)) powers.set(p, (powers.get(p) ?? 0) + 1);
  return powers;
}

const SUPERSCRIPT = ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"];
const sup = (n: number) => String(n).split("").map((d) => SUPERSCRIPT[Number(d)]).join("");

/** "2² × 3 × 5" for 60. A prime is written as itself. */
export function patternsPowerForm(value: number): string {
  const powers = [...patternsPrimePowers(value)];
  if (powers.length === 0) return String(Math.round(value));
  return powers.map(([p, e]) => (e === 1 ? String(p) : `${p}${sup(e)}`)).join(" × ");
}

export function patternsHcf(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) [x, y] = [y, x % y];
  return x;
}

export function patternsLcm(a: number, b: number): number {
  const h = patternsHcf(a, b);
  return h === 0 ? 0 : Math.abs(Math.round(a) * Math.round(b)) / h;
}

/** The corners of the square root spiral: P₁ = (1, 0), and each next point one unit along the perpendicular, so |Pⱼ| = √j. */
export function patternsSpiral(k: number): [number, number][] {
  const points: [number, number][] = [[1, 0]];
  for (let j = 1; j < k; j++) {
    const [x, y] = points[j - 1]!;
    const r = Math.hypot(x, y);
    points.push([x - y / r, y + x / r]);
  }
  return points;
}

/** "x² − 3x − 4": a polynomial in x from its coefficients, highest power first; "0" when all vanish. */
export function patternsPolynomial(a: number, b: number, c: number): string {
  const terms: string[] = [];
  const coeff = (v: number) => {
    const m = Math.abs(v);
    return m === 1 ? "" : String(m);
  };
  const push = (v: number, body: string) => {
    if (v === 0) return;
    const sign = v < 0 ? "−" : "+";
    if (terms.length === 0) terms.push(`${v < 0 ? "−" : ""}${body}`);
    else terms.push(`${sign} ${body}`);
  };
  push(a, `${coeff(a)}x²`);
  push(b, `${coeff(b)}x`);
  push(c, String(Math.abs(c)));
  return terms.length ? terms.join(" ") : "0";
}

export type PatternsParams = { sticks: PatternsSticks; op: PatternsOp };

export interface PatternsState {
  /** The two numbers to factorise. */
  readonly num1: number;
  readonly num2: number;
  /** The spiral reaches √k. */
  readonly k: number;
  /** Term number, for the stick and dot patterns and the AP. */
  readonly n: number;
  /** Tiles of the first and second expressions: x², x and units. */
  readonly x2a: number;
  readonly xa: number;
  readonly ua: number;
  readonly x2b: number;
  readonly xb: number;
  readonly ub: number;
  /** y = qa·x² + qb·x + qc. */
  readonly qa: number;
  readonly qb: number;
  readonly qc: number;
  /** The AP's first term and common difference. */
  readonly apA: number;
  readonly apD: number;
}

export type PatternsResults = {
  num1: number;
  num2: number;
  hcf: number;
  lcm: number;
  product: number;
  hcfLcm: number;
  factorCount1: number;
  factorCount2: number;
  isPrime1: number;
  isPrime2: number;
  largestPrime1: number;
  coprime: number;
  k: number;
  root: number;
  isRational: number;
  below: number;
  above: number;
  sticks: number;
  n: number;
  term: number;
  nextTerm: number;
  growth: number;
  start: number;
  squareDots: number;
  triangleDots: number;
  squareGrowth: number;
  triangleGrowth: number;
  op: number;
  x2a: number;
  xa: number;
  ua: number;
  x2b: number;
  xb: number;
  ub: number;
  x2bSigned: number;
  xbSigned: number;
  ubSigned: number;
  rx2: number;
  rx: number;
  ru: number;
  resultTerms: number;
  zeroPairs: number;
  pAt2: number;
  qAt2: number;
  resultAt2: number;
  qa: number;
  qb: number;
  qc: number;
  disc: number;
  zeroCount: number;
  zero1: number;
  zero2: number;
  sumOfZeroes: number;
  productOfZeroes: number;
  vertexX: number;
  vertexY: number;
  opensUp: number;
  isQuadratic: number;
  apA: number;
  apD: number;
  nLess: number;
  nthTerm: number;
  apSum: number;
  firstPlusLast: number;
};

const OUTPUTS = [
  "num1", "num2", "hcf", "lcm", "product", "hcfLcm", "factorCount1", "factorCount2", "isPrime1", "isPrime2", "largestPrime1", "coprime",
  "k", "root", "isRational", "below", "above",
  "sticks", "n", "term", "nextTerm", "growth", "start", "squareDots", "triangleDots", "squareGrowth", "triangleGrowth",
  "op", "x2a", "xa", "ua", "x2b", "xb", "ub", "x2bSigned", "xbSigned", "ubSigned", "rx2", "rx", "ru", "resultTerms", "zeroPairs", "pAt2", "qAt2", "resultAt2",
  "qa", "qb", "qc", "disc", "zeroCount", "zero1", "zero2", "sumOfZeroes", "productOfZeroes", "vertexX", "vertexY", "opensUp", "isQuadratic",
  "apA", "apD", "nLess", "nthTerm", "apSum", "firstPlusLast",
] as const satisfies readonly (keyof PatternsResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
/** Whole numbers for counted things; during Play n and k run on continuously, and count whole steps. */
const whole = (v: number, range: readonly [number, number]) => clamp(Math.round(v), range[0], range[1]);
const counted = (v: number, range: readonly [number, number]) => clamp(Math.floor(v + 1e-9), range[0], range[1]);
/** Coefficients snap to halves. */
const half = (v: number, range: readonly [number, number]) => clamp(Math.round(v * 2) / 2, range[0], range[1]);
/** Turns −0 into 0. */
const z = (v: number) => v || 0;
/** Play adds one term every this many seconds. */
const TERM_TIME = 0.8;

const sticksOf = (params: PatternsParams) => (PATTERNS_STICKS_ORDER.includes(params.sticks) ? params.sticks : "squares");

export const patternsModel: SimulationModel<PatternsState, PatternsParams, PatternsResults> = {
  id: "patterns",
  defaultParams: { sticks: "squares", op: "add" },
  outputs: OUTPUTS,
  stateVariables: ["num1", "num2", "k", "n", "x2a", "xa", "ua", "x2b", "xb", "ub", "qa", "qb", "qc", "apA", "apD"],

  initialize() {
    return { num1: 60, num2: 84, k: 2, n: 4, x2a: 1, xa: 2, ua: 3, x2b: 1, xb: -1, ub: -2, qa: 1, qb: -3, qc: -4, apA: 3, apD: 4 };
  },

  /** Play grows the patterns, the AP and the spiral by one term at a time, and stops at the end. */
  advance(state, dt) {
    return {
      ...state,
      n: clamp(state.n + dt / TERM_TIME, PATTERNS_N_RANGE[0], PATTERNS_N_RANGE[1]),
      k: clamp(state.k + dt / TERM_TIME, PATTERNS_K_RANGE[0], PATTERNS_K_RANGE[1]),
    };
  },

  step(state, _params, sign) {
    return {
      ...state,
      n: counted(counted(state.n, PATTERNS_N_RANGE) + sign, PATTERNS_N_RANGE),
      k: counted(counted(state.k, PATTERNS_K_RANGE) + sign, PATTERNS_K_RANGE),
    };
  },

  derive(state, params) {
    // Factors.
    const num1 = whole(state.num1, PATTERNS_NUMBER_RANGE);
    const num2 = whole(state.num2, PATTERNS_NUMBER_RANGE);
    const f1 = patternsPrimeFactors(num1);
    const f2 = patternsPrimeFactors(num2);
    const hcf = patternsHcf(num1, num2);
    const lcm = patternsLcm(num1, num2);

    // Roots.
    const k = counted(state.k, PATTERNS_K_RANGE);
    const root = Math.sqrt(k);
    const below = Math.floor(root + 1e-9);
    const isRational = below * below === k ? 1 : 0;

    // Patterns.
    const n = counted(state.n, PATTERNS_N_RANGE);
    const sticksId = sticksOf(params);
    const sticks = PATTERNS_STICKS[sticksId];
    const term = sticks.growth * n + sticks.start;

    // Tiles.
    const x2a = whole(state.x2a, PATTERNS_TILE_RANGE);
    const xa = whole(state.xa, PATTERNS_TILE_RANGE);
    const ua = whole(state.ua, PATTERNS_TILE_RANGE);
    const x2b = whole(state.x2b, PATTERNS_TILE_RANGE);
    const xb = whole(state.xb, PATTERNS_TILE_RANGE);
    const ub = whole(state.ub, PATTERNS_TILE_RANGE);
    const subtract = params.op === "subtract";
    const sign = subtract ? -1 : 1;
    const x2bSigned = z(sign * x2b);
    const xbSigned = z(sign * xb);
    const ubSigned = z(sign * ub);
    const rx2 = x2a + x2bSigned;
    const rx = xa + xbSigned;
    const ru = ua + ubSigned;
    const pairs = (p: number, q: number) => (p * q < 0 ? Math.min(Math.abs(p), Math.abs(q)) : 0);

    // Parabola.
    const qa = half(state.qa, PATTERNS_QA_RANGE);
    const qb = whole(state.qb, PATTERNS_QBC_RANGE);
    const qc = whole(state.qc, PATTERNS_QBC_RANGE);
    const quadratic = qa !== 0;
    const disc = qb * qb - 4 * qa * qc;
    let zeroCount = 0;
    let zero1 = 0;
    let zero2 = 0;
    if (quadratic) {
      if (disc > 1e-9) {
        const s = Math.sqrt(disc);
        const r1 = (-qb - s) / (2 * qa);
        const r2 = (-qb + s) / (2 * qa);
        zeroCount = 2;
        zero1 = Math.min(r1, r2);
        zero2 = Math.max(r1, r2);
      } else if (Math.abs(disc) <= 1e-9) {
        zeroCount = 1;
        zero1 = zero2 = -qb / (2 * qa);
      }
    } else if (qb !== 0) {
      // a = 0 leaves a straight line, bx + c, with one zero.
      zeroCount = 1;
      zero1 = zero2 = -qc / qb;
    }

    // Arithmetic progression.
    const apA = whole(state.apA, PATTERNS_AP_A_RANGE);
    const apD = whole(state.apD, PATTERNS_AP_D_RANGE);
    const nthTerm = apA + (n - 1) * apD;

    return {
      num1,
      num2,
      hcf,
      lcm,
      product: num1 * num2,
      hcfLcm: hcf * lcm,
      factorCount1: f1.length,
      factorCount2: f2.length,
      isPrime1: f1.length === 1 ? 1 : 0,
      isPrime2: f2.length === 1 ? 1 : 0,
      largestPrime1: f1[f1.length - 1] ?? 0,
      coprime: hcf === 1 ? 1 : 0,
      k,
      root,
      isRational,
      below,
      above: isRational ? below : below + 1,
      sticks: PATTERNS_STICKS_ORDER.indexOf(sticksId),
      n,
      term,
      nextTerm: term + sticks.growth,
      growth: sticks.growth,
      start: sticks.start,
      squareDots: n * n,
      triangleDots: (n * (n + 1)) / 2,
      squareGrowth: 2 * n + 1,
      triangleGrowth: n + 1,
      op: subtract ? 1 : 0,
      x2a,
      xa,
      ua,
      x2b,
      xb,
      ub,
      x2bSigned,
      xbSigned,
      ubSigned,
      rx2: z(rx2),
      rx: z(rx),
      ru: z(ru),
      resultTerms: [rx2, rx, ru].filter((v) => v !== 0).length,
      zeroPairs: pairs(x2a, x2bSigned) + pairs(xa, xbSigned) + pairs(ua, ubSigned),
      pAt2: 4 * x2a + 2 * xa + ua,
      qAt2: 4 * x2b + 2 * xb + ub,
      resultAt2: z(4 * rx2 + 2 * rx + ru),
      qa,
      qb,
      qc,
      disc: z(disc),
      zeroCount,
      zero1: z(zero1),
      zero2: z(zero2),
      sumOfZeroes: quadratic ? z(-qb / qa) : 0,
      productOfZeroes: quadratic ? z(qc / qa) : 0,
      vertexX: quadratic ? z(-qb / (2 * qa)) : 0,
      vertexY: quadratic ? z(qc - (qb * qb) / (4 * qa)) : qc,
      opensUp: qa > 0 ? 1 : 0,
      isQuadratic: quadratic ? 1 : 0,
      apA,
      apD,
      nLess: n - 1,
      nthTerm,
      apSum: (n / 2) * (apA + nthTerm),
      firstPlusLast: apA + nthTerm,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof PatternsState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "num1": return { ...state, num1: whole(value, PATTERNS_NUMBER_RANGE) };
      case "num2": return { ...state, num2: whole(value, PATTERNS_NUMBER_RANGE) };
      case "k": return { ...state, k: whole(value, PATTERNS_K_RANGE) };
      case "n": return { ...state, n: whole(value, PATTERNS_N_RANGE) };
      case "x2a":
      case "xa":
      case "ua":
      case "x2b":
      case "xb":
      case "ub":
        return { ...state, [id]: whole(value, PATTERNS_TILE_RANGE) };
      case "qa": return { ...state, qa: half(value, PATTERNS_QA_RANGE) };
      case "qb": return { ...state, qb: whole(value, PATTERNS_QBC_RANGE) };
      case "qc": return { ...state, qc: whole(value, PATTERNS_QBC_RANGE) };
      case "apA": return { ...state, apA: whole(value, PATTERNS_AP_A_RANGE) };
      case "apD": return { ...state, apD: whole(value, PATTERNS_AP_D_RANGE) };
      default: return state;
    }
  },
};
