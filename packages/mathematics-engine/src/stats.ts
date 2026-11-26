import type { SimulationModel } from "@ise/science-engine";

/**
 * Statistics: the centre and spread of a set of numbers, and of data
 * grouped into classes (NCERT class 9–10 "Statistics", class 11 ch. 13).
 *
 * Marks: up to ten students' marks out of 20, drawn as a dot plot. The
 * mean is the balance point (the deviations from it add to zero), the
 * median the middle value once the marks are in order — for an even count,
 * the average of the two middle values — and the mode the tallest stack.
 * One student's mark is the one to drag: pull it far out and the mean
 * follows, while the median barely moves.
 *
 * Spread: the range (largest − smallest), the mean deviation about the
 * mean and about the median, Σ|x − a|/n, and the variance and standard
 * deviation in the population form NCERT class 11 uses: σ² = Σ(x − x̄)²/n.
 *
 * Change of scale: every mark becomes y = kx + c. The mean and median go
 * along (kx̄ + c); adding c moves the data without spreading it, so σ is
 * unchanged, while multiplying by k makes σ |k| times as large and σ² k²
 * times.
 *
 * Grouped: a frequency table with classes of equal width h, as a histogram.
 * The class mark xᵢ is the middle of a class. Mean directly, Σfᵢxᵢ/Σfᵢ, or
 * by the step-deviation method, x̄ = a + h·Σfᵢuᵢ/Σfᵢ with uᵢ = (xᵢ − a)/h,
 * which gives the same answer whichever class mark a is taken as the
 * assumed mean. Median l + ((n/2 − cf)/f)·h from the cumulative frequency,
 * mode l + ((f₁ − f₀)/(2f₁ − f₀ − f₂))·h from the modal class and its
 * neighbours (a missing neighbour counts as frequency 0), and the grouped
 * variance σ² = h²[Σfu²/N − (Σfu/N)²], treating every value in a class as
 * if it sat at the class mark.
 */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** A whole number in [lo, hi]; NaN becomes lo. */
const whole = (v: number, lo: number, hi: number) => clamp(Number.isFinite(v) ? Math.round(v) : lo, lo, hi);
/** No −0, and nothing that is only rounding error away from zero. */
const tidy = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v);

/** Marks are out of this; at most this many students; at least this many. */
export const STATS_MAX_MARK = 20;
export const STATS_MAX_COUNT = 10;
export const STATS_MIN_COUNT = 5;
/** The largest number of classes a frequency table has, and the largest frequency a bar can be dragged to. */
export const STATS_MAX_CLASSES = 7;
export const STATS_MAX_FREQUENCY = 20;
/** The window of the change of scale y = kx + c. */
export const STATS_SHIFT: readonly [number, number] = [-10, 10];
export const STATS_SCALE: readonly [number, number] = [-2, 3];

export interface StatsDataSet {
  label: string;
  /** The first mark is the student whose dot is picked out. */
  marks: readonly number[];
}

/** Marks out of 20. Every set's centre and spread is worked by hand in the tests. */
export const STATS_SETS: readonly StatsDataSet[] = [
  { label: "A class test", marks: [11, 6, 8, 9, 10, 11, 11, 13, 14, 17] },
  { label: "Eight marks", marks: [6, 7, 10, 12, 13, 4, 8, 12] },
  { label: "One far-out mark", marks: [20, 6, 6, 7, 7, 7, 8, 8, 9] },
  { label: "Bunched", marks: [10, 9, 9, 10, 10, 10, 10, 10, 11, 11] },
  { label: "Spread out", marks: [10, 2, 4, 6, 8, 10, 12, 14, 16, 18] },
];

export interface StatsTable {
  label: string;
  /** What is being counted, for the axis. */
  variable: string;
  /** Lower limit of the first class, and the class width h. */
  lower: number;
  width: number;
  frequencies: readonly number[];
  /** The class (1-based) whose mark is taken as the assumed mean a at the start. */
  assumed: number;
}

export const STATS_TABLES: readonly StatsTable[] = [
  { label: "Marks of 30 students", variable: "marks", lower: 10, width: 15, frequencies: [2, 3, 7, 6, 6, 6], assumed: 3 },
  { label: "Homework time of 50 students", variable: "minutes", lower: 0, width: 10, frequencies: [5, 8, 15, 12, 6, 4], assumed: 3 },
  { label: "Marks of 50 students", variable: "marks", lower: 30, width: 10, frequencies: [3, 7, 12, 15, 8, 3, 2], assumed: 4 },
];

export type StatsParams = Record<string, never>;

export interface StatsState {
  /** The data set last loaded; loading one replaces the marks and the count. */
  readonly set: number;
  /** How many of the marks are in the data. */
  readonly count: number;
  /** Ten marks; only the first `count` are used. */
  readonly marks: readonly number[];
  /** The change of scale y = kx + c. */
  readonly shift: number;
  readonly scale: number;
  /** The frequency table last loaded; loading one replaces the frequencies. */
  readonly table: number;
  /** Seven frequencies; only the table's classes are used. */
  readonly freq: readonly number[];
  /** The class (1-based) whose class mark is the assumed mean. */
  readonly assumed: number;
}

const MARK_KEYS = ["m1", "m2", "m3", "m4", "m5", "m6", "m7", "m8", "m9", "m10"] as const;
const FREQ_KEYS = ["f1", "f2", "f3", "f4", "f5", "f6", "f7"] as const;
const CF_KEYS = ["cf1", "cf2", "cf3", "cf4", "cf5", "cf6", "cf7"] as const;
type MarkKey = (typeof MARK_KEYS)[number];
type FreqKey = (typeof FREQ_KEYS)[number];
type CfKey = (typeof CF_KEYS)[number];

export type StatsResults = Record<MarkKey | FreqKey | CfKey, number> & {
  set: number;
  count: number;
  sum: number;
  mean: number;
  /** Σ(x − x̄): always zero — the mean is the balance point. */
  deviationSum: number;
  median: number;
  /** The smallest of the most frequent marks; 0 when there is no mode. */
  mode: number;
  modeFrequency: number;
  /** 0: no mode (every mark once); 1: one mode; 2: more than one. */
  modeKind: number;
  min: number;
  max: number;
  range: number;
  mdMean: number;
  mdMedian: number;
  variance: number;
  sd: number;
  /** The picked-out student's mark, and how far it is from the mean. */
  mark: number;
  markDeviation: number;
  shift: number;
  scale: number;
  newMean: number;
  newMedian: number;
  newRange: number;
  newVariance: number;
  newSd: number;
  table: number;
  classCount: number;
  classLower: number;
  classWidth: number;
  /** Σf. */
  total: number;
  /** 1 when every frequency is zero, so there is nothing to average. */
  empty: number;
  sumFx: number;
  groupedMean: number;
  assumed: number;
  assumedMean: number;
  sumFu: number;
  sumFu2: number;
  stepMean: number;
  groupedVariance: number;
  groupedSd: number;
  halfN: number;
  /** The median class (1-based), its lower limit, the cumulative frequency before it, and its frequency. */
  medianClass: number;
  medianLower: number;
  cfBefore: number;
  medianFreq: number;
  groupedMedian: number;
  /** The modal class (1-based) and f₀, f₁, f₂. */
  modalClass: number;
  modalLower: number;
  modeBefore: number;
  modalFreq: number;
  modeAfter: number;
  groupedMode: number;
};

const OUTPUTS = [
  "set", "count", ...MARK_KEYS, "sum", "mean", "deviationSum", "median", "mode", "modeFrequency", "modeKind", "min", "max", "range",
  "mdMean", "mdMedian", "variance", "sd", "mark", "markDeviation",
  "shift", "scale", "newMean", "newMedian", "newRange", "newVariance", "newSd",
  "table", "classCount", "classLower", "classWidth", ...FREQ_KEYS, ...CF_KEYS, "total", "empty", "sumFx", "groupedMean",
  "assumed", "assumedMean", "sumFu", "sumFu2", "stepMean", "groupedVariance", "groupedSd",
  "halfN", "medianClass", "medianLower", "cfBefore", "medianFreq", "groupedMedian",
  "modalClass", "modalLower", "modeBefore", "modalFreq", "modeAfter", "groupedMode",
] as const satisfies readonly (keyof StatsResults)[];

/** The middle of the sorted values; for an even count, the average of the two middle ones. */
export function statsMedian(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[half]! : (sorted[half - 1]! + sorted[half]!) / 2;
}

/** The most frequent value (the smallest, if several tie), how often it comes, and how many values tie. */
export function statsMode(values: readonly number[]): { mode: number; frequency: number; ties: number } {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let frequency = 0;
  for (const c of counts.values()) frequency = Math.max(frequency, c);
  const top = [...counts.entries()].filter(([, c]) => c === frequency).map(([v]) => v).sort((a, b) => a - b);
  return { mode: top[0] ?? 0, frequency, ties: top.length };
}

/** Population variance Σ(x − x̄)²/n, as NCERT class 11 defines it. */
export function statsVariance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
}

/** Mean deviation Σ|x − a|/n about a point a (the mean or the median). */
export function statsMeanDeviation(values: readonly number[], about: number): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + Math.abs(v - about), 0) / values.length;
}

export interface StatsGrouped {
  total: number;
  sumFx: number;
  mean: number;
  assumedMean: number;
  sumFu: number;
  sumFu2: number;
  stepMean: number;
  variance: number;
  cumulative: number[];
  medianClass: number;
  cfBefore: number;
  median: number;
  modalClass: number;
  f0: number;
  f1: number;
  f2: number;
  mode: number;
}

/**
 * Everything worked from a frequency table with equal classes: lower limit
 * of the first class, class width h, frequencies, and the class (1-based)
 * whose mark is the assumed mean.
 */
export function statsGrouped(lower: number, width: number, frequencies: readonly number[], assumed: number): StatsGrouped {
  const k = frequencies.length;
  const marks = frequencies.map((_, i) => lower + width * (i + 0.5));
  const total = frequencies.reduce((s, f) => s + f, 0);
  const sumFx = frequencies.reduce((s, f, i) => s + f * marks[i]!, 0);
  const a = marks[whole(assumed, 1, k) - 1]!;
  const u = marks.map((x) => (x - a) / width);
  const sumFu = frequencies.reduce((s, f, i) => s + f * u[i]!, 0);
  const sumFu2 = frequencies.reduce((s, f, i) => s + f * u[i]! ** 2, 0);
  const cumulative: number[] = [];
  frequencies.forEach((f, i) => cumulative.push((cumulative[i - 1] ?? 0) + f));
  if (total === 0) {
    return { total, sumFx, mean: 0, assumedMean: a, sumFu, sumFu2, stepMean: 0, variance: 0, cumulative, medianClass: 0, cfBefore: 0, median: 0, modalClass: 0, f0: 0, f1: 0, f2: 0, mode: 0 };
  }
  const mean = sumFx / total;
  const stepMean = a + (width * sumFu) / total;
  const variance = Math.max(0, width * width * (sumFu2 / total - (sumFu / total) ** 2));

  // The median class is the first whose cumulative frequency reaches n/2.
  const m = cumulative.findIndex((cf) => cf >= total / 2);
  const cfBefore = cumulative[m - 1] ?? 0;
  const median = lower + width * m + ((total / 2 - cfBefore) / frequencies[m]!) * width;

  // The modal class is the first with the largest frequency.
  const f1 = Math.max(...frequencies);
  const j = frequencies.indexOf(f1);
  const f0 = frequencies[j - 1] ?? 0;
  const f2 = frequencies[j + 1] ?? 0;
  const spread = 2 * f1 - f0 - f2;
  // Only when the modal class and both neighbours are level is there no crossing; then take the class mark.
  const mode = lower + width * j + (spread > 0 ? ((f1 - f0) / spread) * width : width / 2);

  return { total, sumFx, mean, assumedMean: a, sumFu, sumFu2, stepMean, variance, cumulative, medianClass: m + 1, cfBefore, median, modalClass: j + 1, f0, f1, f2, mode };
}

const setOf = (state: StatsState) => whole(state.set, 0, STATS_SETS.length - 1);
const tableOf = (state: StatsState) => STATS_TABLES[whole(state.table, 0, STATS_TABLES.length - 1)]!;

function loadSet(state: StatsState, index: number): StatsState {
  const set = whole(index, 0, STATS_SETS.length - 1);
  const source = STATS_SETS[set]!.marks;
  // Unused places keep the class-test marks, so raising the count brings back sensible values.
  const marks = Array.from({ length: STATS_MAX_COUNT }, (_, i) => source[i] ?? STATS_SETS[0]!.marks[i]!);
  return { ...state, set, count: source.length, marks };
}

function loadTable(state: StatsState, index: number): StatsState {
  const table = whole(index, 0, STATS_TABLES.length - 1);
  const source = STATS_TABLES[table]!;
  const freq = Array.from({ length: STATS_MAX_CLASSES }, (_, i) => source.frequencies[i] ?? 0);
  return { ...state, table, freq, assumed: source.assumed };
}

export const statsModel: SimulationModel<StatsState, StatsParams, StatsResults> = {
  id: "stats",
  defaultParams: {},
  outputs: OUTPUTS,
  stateVariables: ["set", "count", ...MARK_KEYS, "shift", "scale", "table", ...FREQ_KEYS, "assumed"],

  initialize() {
    const blank: StatsState = { set: 0, count: 0, marks: [], shift: 0, scale: 1, table: 0, freq: [], assumed: 1 };
    return loadTable(loadSet(blank, 0), 0);
  },

  /** Nothing runs on in time. */
  advance(state) {
    return state;
  },

  /** A step moves the picked-out student's mark by one. */
  step(state, _params, sign) {
    const marks = [...state.marks];
    marks[0] = whole((marks[0] ?? 0) + sign, 0, STATS_MAX_MARK);
    return { ...state, marks };
  },

  derive(state) {
    const count = whole(state.count, STATS_MIN_COUNT, STATS_MAX_COUNT);
    const marks = Array.from({ length: STATS_MAX_COUNT }, (_, i) => whole(state.marks[i] ?? 0, 0, STATS_MAX_MARK));
    const data = marks.slice(0, count);
    const sum = data.reduce((s, v) => s + v, 0);
    const mean = sum / count;
    const median = statsMedian(data);
    const modal = statsMode(data);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const variance = statsVariance(data);
    const sd = Math.sqrt(variance);

    const shift = clamp(Number.isFinite(state.shift) ? state.shift : 0, STATS_SHIFT[0], STATS_SHIFT[1]);
    const scale = clamp(Number.isFinite(state.scale) ? state.scale : 1, STATS_SCALE[0], STATS_SCALE[1]);

    const tableIndex = whole(state.table, 0, STATS_TABLES.length - 1);
    const table = tableOf(state);
    const k = table.frequencies.length;
    const freq = Array.from({ length: k }, (_, i) => whole(state.freq[i] ?? 0, 0, STATS_MAX_FREQUENCY));
    const assumed = whole(state.assumed, 1, k);
    const g = statsGrouped(table.lower, table.width, freq, assumed);

    const perMark = Object.fromEntries(MARK_KEYS.map((key, i) => [key, marks[i]!])) as Record<MarkKey, number>;
    const perFreq = Object.fromEntries(FREQ_KEYS.map((key, i) => [key, freq[i] ?? 0])) as Record<FreqKey, number>;
    const perCf = Object.fromEntries(CF_KEYS.map((key, i) => [key, i < k ? g.cumulative[i]! : 0])) as Record<CfKey, number>;

    return {
      set: setOf(state),
      count,
      ...perMark,
      sum,
      mean,
      deviationSum: tidy(data.reduce((s, v) => s + (v - mean), 0)),
      median,
      mode: modal.frequency > 1 ? modal.mode : 0,
      modeFrequency: modal.frequency,
      modeKind: modal.frequency <= 1 ? 0 : modal.ties === 1 ? 1 : 2,
      min,
      max,
      range: max - min,
      mdMean: statsMeanDeviation(data, mean),
      mdMedian: statsMeanDeviation(data, median),
      variance,
      sd,
      mark: marks[0]!,
      markDeviation: tidy(marks[0]! - mean),
      shift: tidy(shift),
      scale: tidy(scale),
      newMean: tidy(scale * mean + shift),
      newMedian: tidy(scale * median + shift),
      newRange: Math.abs(scale) * (max - min),
      newVariance: scale * scale * variance,
      newSd: Math.abs(scale) * sd,
      table: tableIndex,
      classCount: k,
      classLower: table.lower,
      classWidth: table.width,
      ...perFreq,
      ...perCf,
      total: g.total,
      empty: g.total === 0 ? 1 : 0,
      sumFx: g.sumFx,
      groupedMean: g.mean,
      assumed,
      assumedMean: g.assumedMean,
      sumFu: tidy(g.sumFu),
      sumFu2: g.sumFu2,
      stepMean: g.stepMean,
      groupedVariance: g.variance,
      groupedSd: Math.sqrt(g.variance),
      halfN: g.total / 2,
      medianClass: g.medianClass,
      medianLower: g.medianClass > 0 ? table.lower + table.width * (g.medianClass - 1) : 0,
      cfBefore: g.cfBefore,
      medianFreq: g.medianClass > 0 ? freq[g.medianClass - 1]! : 0,
      groupedMedian: g.median,
      modalClass: g.modalClass,
      modalLower: g.modalClass > 0 ? table.lower + table.width * (g.modalClass - 1) : 0,
      modeBefore: g.f0,
      modalFreq: g.f1,
      modeAfter: g.f2,
      groupedMode: g.mode,
    };
  },

  getVariable(state, id) {
    const m = (MARK_KEYS as readonly string[]).indexOf(id);
    if (m >= 0) return state.marks[m];
    const f = (FREQ_KEYS as readonly string[]).indexOf(id);
    if (f >= 0) return state.freq[f];
    switch (id) {
      case "set": return state.set;
      case "count": return state.count;
      case "shift": return state.shift;
      case "scale": return state.scale;
      case "table": return state.table;
      case "assumed": return state.assumed;
      default: return undefined;
    }
  },

  setVariable(state, id, value) {
    const m = (MARK_KEYS as readonly string[]).indexOf(id);
    if (m >= 0) {
      const marks = [...state.marks];
      marks[m] = whole(value, 0, STATS_MAX_MARK);
      return { ...state, marks };
    }
    const f = (FREQ_KEYS as readonly string[]).indexOf(id);
    if (f >= 0) {
      if (f >= tableOf(state).frequencies.length) return state;
      const freq = [...state.freq];
      freq[f] = whole(value, 0, STATS_MAX_FREQUENCY);
      return { ...state, freq };
    }
    switch (id) {
      case "set": return loadSet(state, value);
      case "count": return { ...state, count: whole(value, STATS_MIN_COUNT, STATS_MAX_COUNT) };
      case "shift": return { ...state, shift: clamp(Number.isFinite(value) ? value : 0, STATS_SHIFT[0], STATS_SHIFT[1]) };
      case "scale": return { ...state, scale: clamp(Number.isFinite(value) ? value : 1, STATS_SCALE[0], STATS_SCALE[1]) };
      case "table": return loadTable(state, value);
      case "assumed": return { ...state, assumed: whole(value, 1, tableOf(state).frequencies.length) };
      default: return state;
    }
  },
};
