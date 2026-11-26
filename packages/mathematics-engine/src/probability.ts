import type { SimulationModel } from "@ise/science-engine";

/**
 * Chance made precise.
 *
 * Outcomes: two fair dice make 36 equally likely ordered pairs. An event is
 * a set of those pairs, and its probability is how many it holds over 36 —
 * classical probability, P(E) = n(E)/n(S).
 *
 * Either: two events A and B on the same grid. Counting the cells of
 * A ∪ B counts the overlap twice, so P(A ∪ B) = P(A) + P(B) − P(A ∩ B).
 * Events with no cell in common are mutually exclusive.
 *
 * Given: once B is known to have happened, only B's cells remain, so
 * P(A|B) = n(A ∩ B)/n(B) = P(A ∩ B)/P(B). A and B are independent when
 * knowing B leaves the chance of A unchanged: P(A ∩ B) = P(A)·P(B), tested
 * exactly on the counts as 36·n(A ∩ B) = n(A)·n(B).
 *
 * Bayes: a test for a disease, as natural frequencies out of 1000 people.
 * Total probability gives P(+) = P(D)P(+|D) + P(D′)P(+|D′), and Bayes'
 * theorem P(D|+) = P(D)P(+|D)/P(+). The counts are expected counts, so they
 * can be fractional.
 *
 * Distribution: a random variable's probabilities as bars, with its mean
 * Σx·P and variance Σx²·P − μ² — the sum or the larger of two dice, or the
 * number of successes in n independent trials, the binomial distribution
 * P(X = r) = ⁿCᵣ pʳ qⁿ⁻ʳ with mean np and variance npq. Play repeats the
 * experiment with a seeded random generator, so the same number of trials
 * always gives the same histogram, and it settles onto the bars.
 */

export type ProbabilityEventId = "sum" | "atLeast" | "doubles" | "firstEven" | "six";
export const PROBABILITY_EVENT_ORDER: readonly ProbabilityEventId[] = ["sum", "atLeast", "doubles", "firstEven", "six"];

/** Whether the throw (first, second) lies in the event; k is the event's sum where it has one. */
export function probabilityEventHolds(id: ProbabilityEventId, first: number, second: number, k: number): boolean {
  switch (id) {
    case "sum": return first + second === k;
    case "atLeast": return first + second >= k;
    case "doubles": return first === second;
    case "firstEven": return first % 2 === 0;
    case "six": return first === 6 || second === 6;
  }
}

/** A short name for the event, for drawings. */
export function probabilityEventLabel(id: ProbabilityEventId, k: number): string {
  switch (id) {
    case "sum": return `sum = ${k}`;
    case "atLeast": return `sum ≥ ${k}`;
    case "doubles": return "a double";
    case "firstEven": return "1st die even";
    case "six": return "a six";
  }
}

/** Population the disease test is drawn on, as natural frequencies. */
export const PROBABILITY_POPULATION = 1000;

export type ProbabilityDistId = "binomial" | "diceSum" | "diceMax";
export const PROBABILITY_DIST_ORDER: readonly ProbabilityDistId[] = ["binomial", "diceSum", "diceMax"];
export const PROBABILITY_N_MAX = 10;
export const PROBABILITY_R_MAX = 12;
export const PROBABILITY_TRIALS_MAX = 2000;
/** Trials added per second of Play. */
export const PROBABILITY_TRIAL_RATE = 200;
const SEED = 20261119;

/** ⁿCᵣ, exact for the small n used here. */
export function probabilityChoose(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let out = 1;
  for (let k = 1; k <= Math.min(r, n - r); k++) out = (out * (n - k + 1)) / k;
  return Math.round(out);
}

/** P(X = r) for X ~ B(n, p). */
export function probabilityBinomial(n: number, r: number, p: number): number {
  if (r < 0 || r > n) return 0;
  return probabilityChoose(n, r) * p ** r * (1 - p) ** (n - r);
}

export interface ProbabilityDistribution {
  /** The smallest value X takes; probs[i] is P(X = min + i). */
  min: number;
  probs: number[];
}

export function probabilityDistribution(dist: ProbabilityDistId, n: number, p: number): ProbabilityDistribution {
  if (dist === "diceSum") return { min: 2, probs: Array.from({ length: 11 }, (_, i) => (6 - Math.abs(i + 2 - 7)) / 36) };
  if (dist === "diceMax") return { min: 1, probs: Array.from({ length: 6 }, (_, i) => (2 * (i + 1) - 1) / 36) };
  return { min: 0, probs: Array.from({ length: n + 1 }, (_, r) => probabilityBinomial(n, r, p)) };
}

/** A small seeded generator (mulberry32), so a simulation can be replayed exactly. */
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let memo: { key: string; counts: number[] } | null = null;

/**
 * Repeat the experiment `trials` times and count each value of X, aligned
 * with probabilityDistribution's `probs`. Binomial: toss n coins that land
 * "success" with chance p. Dice: throw two dice and add, or take the larger.
 */
export function probabilitySimulate(dist: ProbabilityDistId, n: number, p: number, trials: number): number[] {
  const key = `${dist}|${n}|${p}|${trials}`;
  if (memo?.key === key) return [...memo.counts];
  const { min, probs } = probabilityDistribution(dist, n, p);
  const counts = probs.map(() => 0);
  const random = generator(SEED);
  const die = () => Math.min(6, Math.floor(random() * 6) + 1);
  for (let i = 0; i < trials; i++) {
    let x = 0;
    if (dist === "binomial") {
      for (let k = 0; k < n; k++) if (random() < p) x++;
    } else {
      const a = die();
      const b = die();
      x = dist === "diceSum" ? a + b : Math.max(a, b);
    }
    counts[x - min]!++;
  }
  memo = { key, counts };
  return [...counts];
}

export type ProbabilityParams = { eventA: ProbabilityEventId; eventB: ProbabilityEventId; dist: ProbabilityDistId };

export interface ProbabilityState {
  /** The sums used by events A and B. */
  readonly s: number;
  readonly t: number;
  /** P(D), P(+|D) and P(+|D′) of the disease test. */
  readonly prevalence: number;
  readonly sensitivity: number;
  readonly falsePositive: number;
  /** Trials and chance of success of the binomial, the value r asked about, and trials simulated. */
  readonly n: number;
  readonly p: number;
  readonly r: number;
  readonly trials: number;
}

export type ProbabilityResults = {
  eventA: number;
  eventB: number;
  s: number;
  t: number;
  countA: number;
  countB: number;
  countBoth: number;
  countEither: number;
  pA: number;
  pB: number;
  pBoth: number;
  pEither: number;
  pAgivenB: number;
  pBgivenA: number;
  productAB: number;
  /** 1 when P(A ∩ B) = P(A)·P(B) exactly. */
  independent: number;
  /** 1 when A and B share no outcome. */
  exclusive: number;
  prevalence: number;
  sensitivity: number;
  falsePositive: number;
  sick: number;
  healthy: number;
  truePositives: number;
  falseNegatives: number;
  falsePositives: number;
  trueNegatives: number;
  positives: number;
  pPositive: number;
  posterior: number;
  dist: number;
  n: number;
  p: number;
  r: number;
  xMin: number;
  xMax: number;
  mean: number;
  variance: number;
  sd: number;
  pAt: number;
  pAtMost: number;
  pAtLeast: number;
  /** The most likely value (the smaller one when two tie). */
  modeValue: number;
  trials: number;
  simMean: number;
  simAt: number;
  /** The largest gap between a simulated relative frequency and its exact probability. */
  maxGap: number;
};

const OUTPUTS = [
  "eventA", "eventB", "s", "t", "countA", "countB", "countBoth", "countEither", "pA", "pB", "pBoth", "pEither", "pAgivenB", "pBgivenA", "productAB", "independent", "exclusive",
  "prevalence", "sensitivity", "falsePositive", "sick", "healthy", "truePositives", "falseNegatives", "falsePositives", "trueNegatives", "positives", "pPositive", "posterior",
  "dist", "n", "p", "r", "xMin", "xMax", "mean", "variance", "sd", "pAt", "pAtMost", "pAtLeast", "modeValue", "trials", "simMean", "simAt", "maxGap",
] as const satisfies readonly (keyof ProbabilityResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const whole = (v: number, lo: number, hi: number) => clamp(Math.round(Number.isFinite(v) ? v : lo), lo, hi);
/** Clean off floating-point dust (49.00000000000001 → 49). */
const tidy = (v: number) => Math.round(v * 1e9) / 1e9 || 0;

const eventOf = (id: unknown): ProbabilityEventId => (PROBABILITY_EVENT_ORDER.includes(id as ProbabilityEventId) ? (id as ProbabilityEventId) : "sum");
const distOf = (id: unknown): ProbabilityDistId => (PROBABILITY_DIST_ORDER.includes(id as ProbabilityDistId) ? (id as ProbabilityDistId) : "binomial");

const LIMITS = {
  s: [2, 12],
  t: [2, 12],
  prevalence: [0.005, 0.5],
  sensitivity: [0.5, 1],
  falsePositive: [0, 0.3],
  n: [1, PROBABILITY_N_MAX],
  p: [0, 1],
  r: [0, PROBABILITY_R_MAX],
  trials: [0, PROBABILITY_TRIALS_MAX],
} as const satisfies Record<keyof ProbabilityState, readonly [number, number]>;

const WHOLE = new Set<keyof ProbabilityState>(["s", "t", "n", "r"]);

export const probabilityModel: SimulationModel<ProbabilityState, ProbabilityParams, ProbabilityResults> = {
  id: "probability",
  defaultParams: { eventA: "sum", eventB: "atLeast", dist: "binomial" },
  outputs: OUTPUTS,
  stateVariables: ["s", "t", "prevalence", "sensitivity", "falsePositive", "n", "p", "r", "trials"],

  initialize() {
    return { s: 7, t: 10, prevalence: 0.02, sensitivity: 0.9, falsePositive: 0.05, n: 4, p: 0.5, r: 2, trials: 0 };
  },

  /** Play repeats the experiment, a steady number of trials a second, up to the limit. */
  advance(state, dt) {
    return { ...state, trials: clamp(state.trials + PROBABILITY_TRIAL_RATE * dt, 0, PROBABILITY_TRIALS_MAX) };
  },

  step(state, _params, sign) {
    return { ...state, trials: clamp(Math.round(state.trials / 100) * 100 + 100 * sign, 0, PROBABILITY_TRIALS_MAX) };
  },

  derive(state, params) {
    // ── Two dice ──
    const eventA = eventOf(params.eventA);
    const eventB = eventOf(params.eventB);
    const s = whole(state.s, 2, 12);
    const t = whole(state.t, 2, 12);
    let countA = 0;
    let countB = 0;
    let countBoth = 0;
    for (let first = 1; first <= 6; first++) {
      for (let second = 1; second <= 6; second++) {
        const a = probabilityEventHolds(eventA, first, second, s);
        const b = probabilityEventHolds(eventB, first, second, t);
        if (a) countA++;
        if (b) countB++;
        if (a && b) countBoth++;
      }
    }
    const countEither = countA + countB - countBoth;

    // ── The disease test ──
    const prevalence = clamp(state.prevalence, ...LIMITS.prevalence);
    const sensitivity = clamp(state.sensitivity, ...LIMITS.sensitivity);
    const falsePositive = clamp(state.falsePositive, ...LIMITS.falsePositive);
    const sick = tidy(PROBABILITY_POPULATION * prevalence);
    const healthy = tidy(PROBABILITY_POPULATION - sick);
    const truePositives = tidy(sick * sensitivity);
    const falsePositives = tidy(healthy * falsePositive);
    const pPositive = prevalence * sensitivity + (1 - prevalence) * falsePositive;

    // ── A random variable ──
    const distId = distOf(params.dist);
    const n = whole(state.n, ...LIMITS.n);
    const p = clamp(state.p, 0, 1);
    const r = whole(state.r, ...LIMITS.r);
    const trials = Math.floor(clamp(state.trials, 0, PROBABILITY_TRIALS_MAX));
    const { min, probs } = probabilityDistribution(distId, n, p);
    const at = (x: number) => probs[x - min] ?? 0;
    let mean = 0;
    let square = 0;
    let pAtMost = 0;
    let modeValue = min;
    probs.forEach((q, i) => {
      const x = min + i;
      mean += x * q;
      square += x * x * q;
      if (x <= r) pAtMost += q;
      if (q > at(modeValue) + 1e-12) modeValue = x;
    });
    const variance = Math.max(0, square - mean * mean);
    const counts = probabilitySimulate(distId, n, p, trials);
    const simMean = trials > 0 ? counts.reduce((sum, c, i) => sum + (min + i) * c, 0) / trials : 0;
    const maxGap = probs.reduce((gap, q, i) => Math.max(gap, Math.abs((trials > 0 ? counts[i]! / trials : 0) - q)), 0);

    return {
      eventA: PROBABILITY_EVENT_ORDER.indexOf(eventA),
      eventB: PROBABILITY_EVENT_ORDER.indexOf(eventB),
      s,
      t,
      countA,
      countB,
      countBoth,
      countEither,
      pA: countA / 36,
      pB: countB / 36,
      pBoth: countBoth / 36,
      pEither: countEither / 36,
      pAgivenB: countB > 0 ? countBoth / countB : 0,
      pBgivenA: countA > 0 ? countBoth / countA : 0,
      productAB: (countA * countB) / 1296,
      independent: 36 * countBoth === countA * countB ? 1 : 0,
      exclusive: countBoth === 0 ? 1 : 0,
      prevalence,
      sensitivity,
      falsePositive,
      sick,
      healthy,
      truePositives,
      falseNegatives: tidy(sick - truePositives),
      falsePositives,
      trueNegatives: tidy(healthy - falsePositives),
      positives: tidy(truePositives + falsePositives),
      pPositive: tidy(pPositive),
      posterior: pPositive > 0 ? (prevalence * sensitivity) / pPositive : 0,
      dist: PROBABILITY_DIST_ORDER.indexOf(distId),
      n,
      p,
      r,
      xMin: min,
      xMax: min + probs.length - 1,
      mean: tidy(mean),
      variance: tidy(variance),
      sd: Math.sqrt(tidy(variance)),
      pAt: at(r),
      pAtMost: tidy(Math.min(1, pAtMost)),
      pAtLeast: tidy(Math.min(1, Math.max(0, 1 - pAtMost + at(r)))),
      modeValue,
      trials,
      simMean,
      simAt: trials > 0 ? (counts[r - min] ?? 0) / trials : 0,
      maxGap,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof ProbabilityState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in LIMITS)) return state;
    const key = id as keyof ProbabilityState;
    const [lo, hi] = LIMITS[key];
    return { ...state, [key]: WHOLE.has(key) ? whole(value, lo, hi) : clamp(value, lo, hi) };
  },
};
