import type { SimulationModel } from "@ise/science-engine";

/**
 * The fundamental theorem of calculus: the slope graph, run backwards.
 *
 * A vertical line sweeps along f from a starting point a. The area between
 * f and the axis, from a to the line at x, is collected as it goes and
 * plotted underneath as A(x) = ∫ₐˣ f(t) dt — area above the axis counts
 * positive, area below it negative. A climbs steeply where f is large,
 * levels off where f is zero and falls where f is negative: the slope of A
 * at x is f(x) itself.
 *
 * Moving a only adds a constant to A, so every A is one antiderivative
 * F(x) + C of f, with C = −F(a); and the area from a to b is F(b) − F(a).
 *
 * For a velocity–time graph the area so far is the displacement, the area
 * counted without sign is the distance travelled, and the slope of v is the
 * acceleration.
 *
 * Each integrand carries its exact derivative and one antiderivative,
 * entered by hand. The tests check them against numerical differences and
 * against a numerical sum of thin strips, which the model also reports.
 */

export interface AccumulateIntegrand {
  /** How f is shown to learners, and the antiderivative F used for A = F(x) − F(a). */
  label: string;
  antiderivativeLabel: string;
  f(x: number): number;
  /** f′ — for the velocity profile, the acceleration (at a corner, the value just after it). */
  df(x: number): number;
  F(x: number): number;
  /** Where f changes sign inside the window, ascending. */
  zeros: readonly number[];
  view: { x: readonly [number, number]; f: readonly [number, number]; area: readonly [number, number] };
}

export type AccumulateIntegrandId = "linear" | "square" | "cosine" | "exp" | "reciprocal" | "velocity";
export const ACCUMULATE_ORDER: readonly AccumulateIntegrandId[] = ["linear", "square", "cosine", "exp", "reciprocal", "velocity"];

const TWO_PI = 2 * Math.PI;

/**
 * The velocity profile, in m/s against t in s: from rest it gains 2 m/s each
 * second for 2 s, cruises at 4 m/s until t = 5 s, then loses 2 m/s each
 * second — stopping at t = 7 s, 20 m from the start, and reversing for the
 * last second to end 19 m out, having travelled 21 m.
 */
export const ACCUMULATE_VELOCITY = {
  /** The ends of the three segments, s. */
  accelerateUntil: 2,
  brakeFrom: 5,
  stopsAt: 7,
  end: 8,
  /** m/s² while speeding up and while braking; m/s while cruising. */
  acceleration: 2,
  cruise: 4,
  deceleration: -2,
} as const;

const velocity = (t: number) => (t < 2 ? 2 * t : t < 5 ? 4 : 14 - 2 * t);
const velocityF = (t: number) => (t < 2 ? t * t : t < 5 ? 4 * t - 4 : 14 * t - t * t - 29);
const velocityDf = (t: number) => (t < 2 ? 2 : t < 5 ? 0 : -2);

export const ACCUMULATE_INTEGRANDS: Record<AccumulateIntegrandId, AccumulateIntegrand> = {
  linear: {
    label: "2x",
    antiderivativeLabel: "x²",
    f: (x) => 2 * x,
    df: () => 2,
    F: (x) => x * x,
    zeros: [0],
    view: { x: [-2, 2], f: [-4.5, 4.5], area: [-4.5, 4.5] },
  },
  square: {
    label: "3x²",
    antiderivativeLabel: "x³",
    f: (x) => 3 * x * x,
    df: (x) => 6 * x,
    F: (x) => x * x * x,
    // 3x² touches zero at 0 but never changes sign.
    zeros: [],
    view: { x: [-1, 2], f: [-1, 12.5], area: [-3, 9.5] },
  },
  cosine: {
    label: "cos x",
    antiderivativeLabel: "sin x",
    f: (x) => Math.cos(x),
    df: (x) => -Math.sin(x),
    F: (x) => Math.sin(x),
    zeros: [Math.PI / 2, (3 * Math.PI) / 2],
    view: { x: [0, TWO_PI], f: [-1.6, 1.6], area: [-2.4, 2.4] },
  },
  exp: {
    label: "eˣ",
    antiderivativeLabel: "eˣ",
    f: (x) => Math.exp(x),
    df: (x) => Math.exp(x),
    F: (x) => Math.exp(x),
    zeros: [],
    view: { x: [-2, 2], f: [-0.5, 8], area: [-2, 8] },
  },
  reciprocal: {
    label: "1/x",
    antiderivativeLabel: "ln x",
    f: (x) => 1 / x,
    df: (x) => -1 / (x * x),
    F: (x) => Math.log(x),
    zeros: [],
    view: { x: [0.25, 5], f: [-0.5, 4.5], area: [-3.2, 3.2] },
  },
  velocity: {
    label: "v(t)",
    antiderivativeLabel: "s(t)",
    f: velocity,
    df: velocityDf,
    F: velocityF,
    zeros: [ACCUMULATE_VELOCITY.stopsAt],
    view: { x: [0, 8], f: [-3, 5], area: [-4, 22] },
  },
};

export type AccumulateParams = { function: AccumulateIntegrandId };

export interface AccumulateState {
  /** Where the sweep line is, and where the collecting started. */
  readonly x: number;
  readonly a: number;
}

export type AccumulateResults = {
  function: number;
  x: number;
  a: number;
  /** f(x): the height of the curve at the sweep line. */
  fx: number;
  /** A(x) = ∫ₐˣ f = F(x) − F(a), exact. */
  area: number;
  /** The same area as a midpoint sum of ACCUMULATE_STRIPS thin strips. */
  sum: number;
  /** The slope of the A graph at x, measured from A itself. */
  areaSlope: number;
  /** C in A(x) = F(x) + C: C = −F(a). */
  constant: number;
  /** F(x), the antiderivative with no constant added. */
  antiderivative: number;
  /** 1 A rising (f > 0), −1 falling (f < 0), 0 flat (|f| < 0.05). */
  rising: number;
  /** ∫ₐˣ |f|: the area counted without sign — the distance travelled for a v–t graph. */
  totalArea: number;
  /** f′(x): the slope of f — the acceleration for a v–t graph. */
  accel: number;
  /** How far across the window the sweep line is, 0 to 1. */
  progress: number;
};

const OUTPUTS = [
  "function", "x", "a", "fx", "area", "sum", "areaSlope", "constant", "antiderivative", "rising", "totalArea", "accel", "progress",
] as const satisfies readonly (keyof AccumulateResults)[];

/** The strips in the numerical sum. */
export const ACCUMULATE_STRIPS = 200;
/** Heights smaller than this count as zero. */
const FLAT = 0.05;
/** Play crosses the window in this many seconds (the velocity graph runs in real time). */
const SWEEP_TIME = 8;
/** The range control's ends: every window lies inside them. */
const CONTROL: readonly [number, number] = [-2, 8];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const integrandOf = (params: AccumulateParams) => (ACCUMULATE_ORDER.includes(params.function) ? params.function : "linear");

/** ∫ₐᵇ f by the midpoint rule; negative when b < a. */
export function accumulateSum(f: (x: number) => number, a: number, b: number, strips = ACCUMULATE_STRIPS): number {
  const dx = (b - a) / strips;
  let total = 0;
  for (let i = 0; i < strips; i++) total += f(a + (i + 0.5) * dx);
  return total * dx;
}

/** ∫ |f| between a and x, exactly, split where f changes sign. */
function unsignedArea(curve: AccumulateIntegrand, a: number, x: number): number {
  const lo = Math.min(a, x);
  const hi = Math.max(a, x);
  const cuts = [lo, ...curve.zeros.filter((z) => z > lo && z < hi), hi];
  let total = 0;
  for (let i = 1; i < cuts.length; i++) total += Math.abs(curve.F(cuts[i]!) - curve.F(cuts[i - 1]!));
  return total;
}

export const accumulateModel: SimulationModel<AccumulateState, AccumulateParams, AccumulateResults> = {
  id: "accumulate",
  defaultParams: { function: "linear" },
  outputs: OUTPUTS,
  stateVariables: ["x", "a"],

  /** The collecting starts at the left edge, with the line on it. */
  initialize(params) {
    const start = ACCUMULATE_INTEGRANDS[integrandOf(params)].view.x[0];
    return { x: start, a: start };
  },

  /** Play carries the line to the right-hand edge, collecting as it goes. */
  advance(state, dt, params) {
    const view = ACCUMULATE_INTEGRANDS[integrandOf(params)].view.x;
    return { ...state, x: clamp(clamp(state.x, view[0], view[1]) + ((view[1] - view[0]) / SWEEP_TIME) * dt, view[0], view[1]) };
  },

  step(state, params, sign) {
    const view = ACCUMULATE_INTEGRANDS[integrandOf(params)].view.x;
    return { ...state, x: clamp(state.x + (sign * (view[1] - view[0])) / 24, view[0], view[1]) };
  },

  derive(state, params) {
    const id = integrandOf(params);
    const curve = ACCUMULATE_INTEGRANDS[id];
    const [lo, hi] = curve.view.x;
    const x = clamp(state.x, lo, hi);
    const a = clamp(state.a, lo, hi);
    const fx = curve.f(x);
    // The slope of A = F − F(a), measured by a small central difference.
    const h = (hi - lo) * 1e-6;
    const areaSlope = (curve.F(x + h) - curve.F(a) - (curve.F(x - h) - curve.F(a))) / (2 * h);
    return {
      function: ACCUMULATE_ORDER.indexOf(id),
      x,
      a,
      fx: fx || 0,
      area: curve.F(x) - curve.F(a) || 0,
      sum: accumulateSum(curve.f, a, x) || 0,
      areaSlope: areaSlope || 0,
      constant: -curve.F(a) || 0,
      antiderivative: curve.F(x) || 0,
      rising: Math.abs(fx) < FLAT ? 0 : Math.sign(fx),
      totalArea: unsignedArea(curve, a, x),
      accel: curve.df(x) || 0,
      progress: (x - lo) / (hi - lo),
    };
  },

  getVariable(state, id) {
    return id === "x" ? state.x : id === "a" ? state.a : undefined;
  },

  /** Both are kept inside the current window (and so inside the control's range). */
  setVariable(state, id, value, params) {
    const view = ACCUMULATE_INTEGRANDS[integrandOf(params)].view.x;
    const next = clamp(clamp(value, CONTROL[0], CONTROL[1]), view[0], view[1]);
    if (id === "x") return { ...state, x: next };
    if (id === "a") return { ...state, a: next };
    return state;
  },
};
