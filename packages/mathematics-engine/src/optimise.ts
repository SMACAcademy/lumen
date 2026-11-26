import type { SimulationModel } from "@ise/science-engine";

/**
 * What derivatives are for.
 *
 * Design: a quantity to make as big or as small as possible, written as a
 * function of one measurement. The best choice is where its slope is zero —
 * the open box cut from a square sheet, the fence against a wall, the can of
 * least metal.
 *
 * Rising and falling: the sign of f′ says where a curve climbs and where it
 * drops; where the sign changes is a turning point. The tangent at a point
 * has slope f′, and the normal −1/f′.
 *
 * Mean value: between any two points of a smooth curve there is a place
 * where the tangent is parallel to the chord joining them.
 *
 * Rates: two changing quantities tied by one equation. Differentiate the
 * equation with respect to time and one rate gives the other — the ladder
 * sliding down a wall, the balloon being blown up, the ripple spreading.
 *
 * Every derivative and every best value below is exact, entered by hand and
 * checked in the tests.
 */

export interface DesignProblem {
  label: string;
  /** What x measures, what the other dimension is, and what is being optimised. */
  xName: string;
  otherName: string;
  valueName: string;
  unit: string;
  x: readonly [number, number];
  y: readonly [number, number];
  f(x: number): number;
  df(x: number): number;
  d2f(x: number): number;
  other(x: number): number;
  best: number;
  maximum: boolean;
}

export type DesignProblemId = "box" | "fence" | "can";
export const DESIGN_PROBLEM_ORDER: readonly DesignProblemId[] = ["box", "fence", "can"];
/** The sheet's side (cm), the fence's length (m) and the can's volume (cm³). */
export const SHEET = 12;
export const FENCE = 40;
export const CAN_VOLUME = 1000;

export const DESIGN_PROBLEMS: Record<DesignProblemId, DesignProblem> = {
  box: {
    label: "Open box from a 12 cm square",
    xName: "cut x",
    otherName: "base side",
    valueName: "volume",
    unit: "cm³",
    x: [0.2, 5.8],
    y: [0, 140],
    f: (x) => x * (SHEET - 2 * x) ** 2,
    df: (x) => (SHEET - 2 * x) * (SHEET - 6 * x),
    d2f: (x) => 24 * x - 96,
    other: (x) => SHEET - 2 * x,
    best: 2,
    maximum: true,
  },
  fence: {
    label: "40 m of fence against a wall",
    xName: "width x",
    otherName: "length",
    valueName: "area",
    unit: "m²",
    x: [1, 19],
    y: [0, 220],
    f: (x) => x * (FENCE - 2 * x),
    df: (x) => FENCE - 4 * x,
    d2f: () => -4,
    other: (x) => FENCE - 2 * x,
    best: 10,
    maximum: true,
  },
  can: {
    label: "A 1000 cm³ can of least metal",
    xName: "radius r",
    otherName: "height",
    valueName: "surface",
    unit: "cm²",
    x: [2, 12],
    y: [0, 1100],
    f: (r) => 2 * Math.PI * r * r + (2 * CAN_VOLUME) / r,
    df: (r) => 4 * Math.PI * r - (2 * CAN_VOLUME) / (r * r),
    d2f: (r) => 4 * Math.PI + (4 * CAN_VOLUME) / (r * r * r),
    other: (r) => CAN_VOLUME / (Math.PI * r * r),
    best: Math.cbrt(CAN_VOLUME / (2 * Math.PI)),
    maximum: false,
  },
};

export interface StudyCurve {
  label: string;
  f(x: number): number;
  df(x: number): number;
  d2f(x: number): number;
  x: readonly [number, number];
  y: readonly [number, number];
  /** Where f′ = 0 inside the window, ascending. */
  critical: readonly number[];
}

export type StudyCurveId = "cubic" | "quartic" | "wave";
export const STUDY_CURVE_ORDER: readonly StudyCurveId[] = ["cubic", "quartic", "wave"];
export const STUDY_CURVES: Record<StudyCurveId, StudyCurve> = {
  cubic: { label: "x³ − 3x", f: (x) => x ** 3 - 3 * x, df: (x) => 3 * x * x - 3, d2f: (x) => 6 * x, x: [-2.5, 2.5], y: [-6, 6], critical: [-1, 1] },
  quartic: { label: "x⁴/4 − 2x²", f: (x) => x ** 4 / 4 - 2 * x * x, df: (x) => x ** 3 - 4 * x, d2f: (x) => 3 * x * x - 4, x: [-3.2, 3.2], y: [-5, 6], critical: [-2, 0, 2] },
  wave: {
    label: "sin x + x/2",
    f: (x) => Math.sin(x) + x / 2,
    df: (x) => Math.cos(x) + 0.5,
    d2f: (x) => -Math.sin(x),
    x: [-6.5, 6.5],
    y: [-4.5, 4.5],
    critical: [(-4 * Math.PI) / 3, (-2 * Math.PI) / 3, (2 * Math.PI) / 3, (4 * Math.PI) / 3],
  },
};

export interface RateScene {
  label: string;
  /** The driven measurement, its window, and how fast it is driven. */
  size: readonly [number, number];
  /** The linked quantity and its rate, for a given size. */
  linked(size: number): number;
  linkedRate(size: number): number;
  /** How the size itself moves on, t seconds later. */
  later(size: number, dt: number): number;
}

export type RateSceneId = "ladder" | "balloon" | "ripple";
export const RATE_SCENE_ORDER: readonly RateSceneId[] = ["ladder", "balloon", "ripple"];
export const LADDER = 5;
/** The foot is pulled out at 1 m/s; the balloon filled at 100 cm³/s; the ripple spreads at 0.5 m/s. */
export const FOOT_SPEED = 1;
export const FILL_RATE = 100;
export const RIPPLE_SPEED = 0.5;

export const RATE_SCENES: Record<RateSceneId, RateScene> = {
  ladder: {
    label: "A 5 m ladder, its foot pulled out at 1 m/s",
    size: [0.5, 4.8],
    linked: (x) => Math.sqrt(LADDER * LADDER - x * x),
    linkedRate: (x) => (-x * FOOT_SPEED) / Math.sqrt(LADDER * LADDER - x * x),
    later: (x, dt) => x + FOOT_SPEED * dt,
  },
  balloon: {
    label: "A balloon filled at 100 cm³/s",
    size: [1, 10],
    linked: (r) => (4 / 3) * Math.PI * r ** 3,
    linkedRate: (r) => FILL_RATE / (4 * Math.PI * r * r),
    later: (r, dt) => Math.cbrt(r ** 3 + (3 * FILL_RATE * dt) / (4 * Math.PI)),
  },
  ripple: {
    label: "A ripple spreading at 0.5 m/s",
    size: [0.5, 10],
    linked: (r) => Math.PI * r * r,
    linkedRate: (r) => 2 * Math.PI * r * RIPPLE_SPEED,
    later: (r, dt) => r + RIPPLE_SPEED * dt,
  },
};

export type OptimiseParams = { problem: DesignProblemId; curve: StudyCurveId; scene: RateSceneId };

export interface OptimiseState {
  /** The design measurement. */
  readonly x: number;
  /** The point on the study curve, and the ends of the chord. */
  readonly px: number;
  readonly a: number;
  readonly b: number;
  /** The driven measurement of the rates scene. */
  readonly size: number;
}

export type OptimiseResults = {
  problem: number;
  x: number;
  other: number;
  value: number;
  slope: number;
  second: number;
  best: number;
  bestValue: number;
  atBest: number;
  isMaximum: number;
  curve: number;
  px: number;
  py: number;
  curveSlope: number;
  curveSecond: number;
  /** 1 rising, −1 falling, 0 flat (|f′| < 0.05). */
  rising: number;
  /** At a flat point: 1 a maximum, 2 a minimum; 0 elsewhere. */
  turning: number;
  /** The tangent is y = curveSlope·x + tangentIntercept; the normal's slope is −1/f′ (0 where it is vertical). */
  tangentIntercept: number;
  normalSlope: number;
  a: number;
  b: number;
  chordSlope: number;
  /** 1 when the point lies between a and b and its tangent is parallel to the chord. */
  parallel: number;
  scene: number;
  size: number;
  linked: number;
  linkedRate: number;
  linkedSpeed: number;
};

const OUTPUTS = [
  "problem", "x", "other", "value", "slope", "second", "best", "bestValue", "atBest", "isMaximum",
  "curve", "px", "py", "curveSlope", "curveSecond", "rising", "turning", "tangentIntercept", "normalSlope", "a", "b", "chordSlope", "parallel",
  "scene", "size", "linked", "linkedRate", "linkedSpeed",
] as const satisfies readonly (keyof OptimiseResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Within this of the best measurement counts as having found it; slopes smaller than FLAT count as zero. */
const CLOSE = 0.06;
const FLAT = 0.05;

const problemOf = (params: OptimiseParams) => (DESIGN_PROBLEM_ORDER.includes(params.problem) ? params.problem : "box");
const curveOf = (params: OptimiseParams) => (STUDY_CURVE_ORDER.includes(params.curve) ? params.curve : "cubic");
const sceneOf = (params: OptimiseParams) => (RATE_SCENE_ORDER.includes(params.scene) ? params.scene : "ladder");

export const optimiseModel: SimulationModel<OptimiseState, OptimiseParams, OptimiseResults> = {
  id: "optimise",
  defaultParams: { problem: "box", curve: "cubic", scene: "ladder" },
  outputs: OUTPUTS,
  stateVariables: ["x", "px", "a", "b", "size"],

  initialize() {
    return { x: 1, px: -2, a: 0, b: 2, size: 1 };
  },

  /** Play runs the rates scene on in time, and stops at the end of its window. */
  advance(state, dt, params) {
    const scene = RATE_SCENES[sceneOf(params)];
    return { ...state, size: clamp(scene.later(clamp(state.size, scene.size[0], scene.size[1]), dt), scene.size[0], scene.size[1]) };
  },

  step(state, params, sign) {
    const scene = RATE_SCENES[sceneOf(params)];
    return { ...state, size: clamp(Math.round(state.size * 2) / 2 + 0.5 * sign, scene.size[0], scene.size[1]) };
  },

  derive(state, params) {
    const problemId = problemOf(params);
    const problem = DESIGN_PROBLEMS[problemId];
    const x = clamp(state.x, problem.x[0], problem.x[1]);

    const curveId = curveOf(params);
    const curve = STUDY_CURVES[curveId];
    const px = clamp(state.px, curve.x[0], curve.x[1]);
    const py = curve.f(px);
    const m = curve.df(px);
    const bend = curve.d2f(px);
    const flat = Math.abs(m) < FLAT;
    const a = clamp(Math.min(state.a, state.b), curve.x[0], curve.x[1]);
    const b = clamp(Math.max(state.a, state.b), curve.x[0], curve.x[1]);
    const chordSlope = b - a < 1e-9 ? curve.df(a) : (curve.f(b) - curve.f(a)) / (b - a);

    const sceneId = sceneOf(params);
    const scene = RATE_SCENES[sceneId];
    const size = clamp(state.size, scene.size[0], scene.size[1]);
    const linkedRate = scene.linkedRate(size);
    return {
      problem: DESIGN_PROBLEM_ORDER.indexOf(problemId),
      x,
      other: problem.other(x),
      value: problem.f(x),
      slope: problem.df(x),
      second: problem.d2f(x),
      best: problem.best,
      bestValue: problem.f(problem.best),
      atBest: Math.abs(x - problem.best) <= CLOSE ? 1 : 0,
      isMaximum: problem.maximum ? 1 : 0,
      curve: STUDY_CURVE_ORDER.indexOf(curveId),
      px,
      py,
      curveSlope: m,
      curveSecond: bend,
      rising: flat ? 0 : Math.sign(m),
      turning: !flat ? 0 : bend < 0 ? 1 : bend > 0 ? 2 : 0,
      tangentIntercept: py - m * px,
      normalSlope: Math.abs(m) < 1e-9 ? 0 : -1 / m,
      a,
      b,
      chordSlope,
      parallel: px > a && px < b && Math.abs(m - chordSlope) < FLAT ? 1 : 0,
      scene: RATE_SCENE_ORDER.indexOf(sceneId),
      size,
      linked: scene.linked(size),
      linkedRate,
      linkedSpeed: Math.abs(linkedRate),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof OptimiseState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "x": return { ...state, x: clamp(value, 0.2, 19) };
      case "px": return { ...state, px: clamp(value, -6.5, 6.5) };
      case "a": return { ...state, a: clamp(value, -6.5, 6.5) };
      case "b": return { ...state, b: clamp(value, -6.5, 6.5) };
      case "size": return { ...state, size: clamp(value, 0.5, 10) };
      default: return state;
    }
  },
};
