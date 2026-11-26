import type { SimulationModel } from "@ise/science-engine";

/**
 * Sequences and series (NCERT class 11, chapter 8, and JEE).
 *
 * Arithmetic progression: a, a + d, a + 2d, …; the nth term is
 * aₙ = a + (n − 1)d, and the sum Sₙ = n/2 · (2a + (n − 1)d) = n/2 · (a + l).
 * Gauss's picture: the terms and the same terms reversed pair off, every
 * pair adding to a + l.
 *
 * Geometric progression: a, ar, ar², …; Sₙ = a(rⁿ − 1)/(r − 1) for r ≠ 1
 * (and na for r = 1). For |r| < 1 the partial sums close in on a/(1 − r).
 *
 * Means of two positive numbers p and q: AM = (p + q)/2, GM = √(pq),
 * HM = 2pq/(p + q). AM ≥ GM ≥ HM, with equality only when p = q, and
 * GM² = AM · HM.
 *
 * Special series: Σk = n(n + 1)/2, Σk² = n(n + 1)(2n + 1)/6,
 * Σk³ = (n(n + 1)/2)².
 *
 * Arithmetico-geometric series: S = Σ k·rᵏ = r + 2r² + 3r³ + … + n rⁿ.
 * Multiply by r and subtract: (1 − r)S = r + r² + … + rⁿ − n rⁿ⁺¹, so
 * S = r(1 − rⁿ)/(1 − r)² − n rⁿ⁺¹/(1 − r); for |r| < 1, S∞ = r/(1 − r)².
 *
 * Every sum is added term by term (n is at most 20, so this is exact enough
 * and has no trouble at r = 1); the tests check each one against its
 * closed form. The number of terms is capped at 20 so that every term can
 * be drawn.
 */

/** The most terms the lab adds (and draws). */
export const SERIES_N_MAX = 20;
/** Squares drawn side by side for Σk²; beyond this many only the sum is shown. */
export const SERIES_SQUARES_DRAWN = 10;

export type SeriesPower = 1 | 2 | 3;
export type SeriesParams = { power: SeriesPower };

export interface SeriesState {
  /** First term and common difference of the AP; a is also the GP's first term. */
  readonly a: number;
  readonly d: number;
  /** Common ratio of the GP (and of the arithmetico-geometric series). */
  readonly r: number;
  /** Number of terms. */
  readonly n: number;
  /** Two positive numbers whose means are compared. */
  readonly p: number;
  readonly q: number;
  /** Time since the last term was added while playing (s). */
  readonly tick: number;
}

export type SeriesResults = {
  n: number;
  a: number;
  d: number;
  r: number;
  apTerm: number;
  apSum: number;
  /** a + l: what each of Gauss's pairs adds to. */
  apPair: number;
  gpTerm: number;
  gpSum: number;
  /** 1 when |r| < 1, so the GP (and Σ k·rᵏ) has a sum to infinity. */
  converges: number;
  /** a/(1 − r) when |r| < 1; NaN otherwise (there is no sum to infinity, and the lab shows "undefined", never 0). */
  gpLimit: number;
  /** How far Sₙ still is from the sum to infinity (NaN when there is none). */
  gpGap: number;
  p: number;
  q: number;
  am: number;
  gm: number;
  hm: number;
  /** AM − GM, never negative. */
  meansGap: number;
  /** 1 when p = q, the only case where AM = GM. */
  meansEqual: number;
  power: number;
  sumK: number;
  sumK2: number;
  sumK3: number;
  /** The special sum chosen by `power`. */
  special: number;
  /** Σ k·rᵏ for k = 1 … n. */
  agpSum: number;
  /** r/(1 − r)² when |r| < 1; NaN otherwise. */
  agpLimit: number;
  /** n·rⁿ⁺¹: the term left over after multiplying by r and subtracting. */
  agpTail: number;
};

const OUTPUTS = [
  "n", "a", "d", "r", "apTerm", "apSum", "apPair",
  "gpTerm", "gpSum", "converges", "gpLimit", "gpGap",
  "p", "q", "am", "gm", "hm", "meansGap", "meansEqual",
  "power", "sumK", "sumK2", "sumK3", "special",
  "agpSum", "agpLimit", "agpTail",
] as const satisfies readonly (keyof SeriesResults)[];

const RANGE = {
  a: [-10, 20],
  d: [-5, 5],
  r: [-2, 2],
  n: [1, SERIES_N_MAX],
  p: [0.5, 18],
  q: [0.5, 18],
} as const;

type Ranged = keyof typeof RANGE;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Slider values are snapped to hundredths, so r = 0.5 is exactly a half; −0 and NaN become 0. */
const tidy = (v: number) => Math.round(v * 100) / 100 || 0;
const fix = (id: Ranged, v: number) => {
  const [lo, hi] = RANGE[id];
  const value = Number.isFinite(v) ? v : lo;
  return id === "n" ? clamp(Math.round(value), lo, hi) : tidy(clamp(value, lo, hi));
};
/** Never −0, never NaN. */
const z = (v: number) => (Number.isFinite(v) ? v || 0 : 0);

/** The first n terms of the AP a, a + d, a + 2d, … */
export function seriesApTerms(a: number, d: number, n: number): number[] {
  return Array.from({ length: n }, (_, k) => z(a + k * d));
}

/** The first n terms of the GP a, ar, ar², … */
export function seriesGpTerms(a: number, r: number, n: number): number[] {
  return Array.from({ length: n }, (_, k) => z(a * r ** k));
}

/** The terms k·rᵏ, k = 1 … n, of the arithmetico-geometric series. */
export function seriesAgpTerms(r: number, n: number): number[] {
  return Array.from({ length: n }, (_, k) => z((k + 1) * r ** (k + 1)));
}

/** S₁, S₂, …, Sₙ. */
export function seriesPartialSums(terms: readonly number[]): number[] {
  let total = 0;
  return terms.map((t) => z((total += t)));
}

const sum = (terms: readonly number[]) => terms.reduce((s, t) => s + t, 0);

export const seriesModel: SimulationModel<SeriesState, SeriesParams, SeriesResults> = {
  id: "series",
  defaultParams: { power: 1 },
  outputs: OUTPUTS,
  stateVariables: ["a", "d", "r", "n", "p", "q"],

  initialize() {
    return { a: 2, d: 3, r: 0.5, n: 6, p: 2, q: 8, tick: 0 };
  },

  /** Play adds a term every half second, up to the cap. */
  advance(state, dt) {
    let n = fix("n", state.n);
    let tick = Math.max(0, state.tick) + dt;
    while (tick >= 0.5 && n < SERIES_N_MAX) {
      n += 1;
      tick -= 0.5;
    }
    return { ...state, n, tick: n >= SERIES_N_MAX ? 0 : tick };
  },

  step(state, _params, sign) {
    return { ...state, n: fix("n", state.n + sign), tick: 0 };
  },

  derive(state, params) {
    const n = fix("n", state.n);
    const a = fix("a", state.a);
    const d = fix("d", state.d);
    const r = fix("r", state.r);
    const p = fix("p", state.p);
    const q = fix("q", state.q);
    const power: SeriesPower = params.power === 2 || params.power === 3 ? params.power : 1;

    const ap = seriesApTerms(a, d, n);
    const gp = seriesGpTerms(a, r, n);
    const agp = seriesAgpTerms(r, n);
    const converges = Math.abs(r) < 1;
    const gpSum = sum(gp);
    // No sum to infinity for |r| ≥ 1: NaN, which the lab shows as "undefined" (0 would read as "the sum is 0").
    const gpLimit = converges ? z(a / (1 - r)) : Number.NaN;

    const am = (p + q) / 2;
    const gm = Math.sqrt(p * q);
    const hm = (2 * p * q) / (p + q);

    const sumK = (n * (n + 1)) / 2;
    const sumK2 = (n * (n + 1) * (2 * n + 1)) / 6;
    const sumK3 = sumK * sumK;

    return {
      n,
      a,
      d,
      r,
      apTerm: ap[n - 1]!,
      apSum: z(sum(ap)),
      apPair: z(a + ap[n - 1]!),
      gpTerm: gp[n - 1]!,
      gpSum: z(gpSum),
      converges: converges ? 1 : 0,
      gpLimit,
      gpGap: converges ? z(Math.abs(gpLimit - gpSum)) : Number.NaN,
      p,
      q,
      am,
      gm,
      hm,
      meansGap: z(Math.max(0, am - gm)),
      meansEqual: Math.abs(p - q) < 1e-9 ? 1 : 0,
      power,
      sumK,
      sumK2,
      sumK3,
      special: power === 1 ? sumK : power === 2 ? sumK2 : sumK3,
      agpSum: z(sum(agp)),
      agpLimit: converges ? z(r / (1 - r) ** 2) : Number.NaN,
      agpTail: z(n * r ** (n + 1)),
    };
  },

  getVariable(state, id) {
    return id in RANGE ? state[id as Ranged] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in RANGE)) return state;
    return { ...state, [id]: fix(id as Ranged, value), ...(id === "n" ? { tick: 0 } : {}) };
  },
};
