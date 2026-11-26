import type { SimulationModel } from "@ise/science-engine";

/**
 * The derivative as a function.
 *
 * A point rides along a curve with its tangent. Underneath, the tangent's
 * slope is plotted at the same x, and it leaves a trail wherever the point
 * has been: the trail is the graph of the derivative. x² draws a straight
 * line, sin x draws cos x, eˣ draws itself.
 *
 * The slope's own slope is the second derivative. Where it is positive the
 * curve bends upward (the tangent turns anticlockwise as x grows), where it
 * is negative, downward; at a stationary point its sign tells a minimum from
 * a maximum.
 *
 * Each curve carries its exact first and second derivatives, entered by
 * hand and checked in the tests against numerical differences.
 */

export interface SlopeCurve {
  label: string;
  /** The derivative as shown to learners once the trail is complete. */
  slopeLabel: string;
  f(x: number, n: number): number;
  df(x: number, n: number): number;
  d2f(x: number, n: number): number;
  view: { x: readonly [number, number]; y: readonly [number, number]; slope: readonly [number, number] };
}

export type SlopeCurveId = "square" | "cubic" | "sine" | "cosine" | "exp" | "log" | "power";
export const SLOPE_CURVE_ORDER: readonly SlopeCurveId[] = ["square", "cubic", "sine", "cosine", "exp", "log", "power"];

const TWO_PI = 2 * Math.PI;

export const SLOPE_CURVES: Record<SlopeCurveId, SlopeCurve> = {
  square: { label: "x²", slopeLabel: "2x", f: (x) => x * x, df: (x) => 2 * x, d2f: () => 2, view: { x: [-3, 3], y: [-1, 9], slope: [-6.5, 6.5] } },
  cubic: {
    label: "x³/3 − x",
    slopeLabel: "x² − 1",
    f: (x) => (x * x * x) / 3 - x,
    df: (x) => x * x - 1,
    d2f: (x) => 2 * x,
    view: { x: [-3, 3], y: [-6.5, 6.5], slope: [-2, 8.5] },
  },
  sine: { label: "sin x", slopeLabel: "cos x", f: (x) => Math.sin(x), df: (x) => Math.cos(x), d2f: (x) => -Math.sin(x), view: { x: [-TWO_PI, TWO_PI], y: [-1.6, 1.6], slope: [-1.6, 1.6] } },
  cosine: { label: "cos x", slopeLabel: "−sin x", f: (x) => Math.cos(x), df: (x) => -Math.sin(x), d2f: (x) => -Math.cos(x), view: { x: [-TWO_PI, TWO_PI], y: [-1.6, 1.6], slope: [-1.6, 1.6] } },
  exp: { label: "eˣ", slopeLabel: "eˣ", f: (x) => Math.exp(x), df: (x) => Math.exp(x), d2f: (x) => Math.exp(x), view: { x: [-3, 2], y: [-0.5, 8], slope: [-0.5, 8] } },
  log: { label: "ln x", slopeLabel: "1/x", f: (x) => Math.log(x), df: (x) => 1 / x, d2f: (x) => -1 / (x * x), view: { x: [0.2, 6], y: [-2.5, 2.5], slope: [-0.5, 5.5] } },
  power: {
    label: "xⁿ",
    slopeLabel: "n·xⁿ⁻¹",
    f: (x, n) => x ** n,
    df: (x, n) => n * x ** (n - 1),
    d2f: (x, n) => (n < 2 ? 0 : n * (n - 1) * x ** (n - 2)),
    view: { x: [-2, 2], y: [-4, 8], slope: [-10, 10] },
  },
};

export type SlopeGraphParams = { function: SlopeCurveId };

export interface SlopeGraphState {
  readonly x: number;
  /** The power, for the xⁿ family. */
  readonly n: number;
  /** The stretch of x the point has visited, and the curve it was visited on. */
  readonly trailLo: number;
  readonly trailHi: number;
  readonly owner: SlopeCurveId;
}

export type SlopeGraphResults = {
  function: number;
  x: number;
  y: number;
  slope: number;
  second: number;
  /** 1 rising, −1 falling, 0 flat (|slope| < 0.05). */
  direction: number;
  stationary: number;
  /** 1 bending up, −1 bending down, 0 neither (|f″| < 0.05). */
  concavity: number;
  /** At a stationary point: 1 a maximum, 2 a minimum, 3 neither; 0 elsewhere. */
  turning: number;
  n: number;
  /** The slope at x = 1: for xⁿ, the power itself. */
  slopeAtOne: number;
  trailLo: number;
  trailHi: number;
  /** How much of the window the trail covers, 0 to 1. */
  coverage: number;
};

const OUTPUTS = [
  "function", "x", "y", "slope", "second", "direction", "stationary", "concavity", "turning", "n", "slopeAtOne", "trailLo", "trailHi", "coverage",
] as const satisfies readonly (keyof SlopeGraphResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Slopes and bendings smaller than this count as zero. */
const FLAT = 0.05;
/** A move of more than this fraction of the window is a jump, not a drag. */
const JUMP = 12;
/** Play crosses the window in this many seconds. */
const SWEEP_TIME = 8;

const curveOf = (params: SlopeGraphParams) => (SLOPE_CURVE_ORDER.includes(params.function) ? params.function : "square");
const powerOf = (state: SlopeGraphState) => clamp(Math.round(state.n), 1, 5);

/** The trail, or nothing but the point itself if it was laid on another curve. */
function trailOf(state: SlopeGraphState, id: SlopeCurveId, x: number, view: readonly [number, number]): [number, number] {
  if (state.owner !== id) return [x, x];
  return [clamp(Math.min(state.trailLo, x), view[0], view[1]), clamp(Math.max(state.trailHi, x), view[0], view[1])];
}

function moveTo(state: SlopeGraphState, x: number, params: SlopeGraphParams): SlopeGraphState {
  const id = curveOf(params);
  const view = SLOPE_CURVES[id].view.x;
  const next = clamp(x, view[0], view[1]);
  // On a new curve the trail starts again from where the point was.
  const from = state.owner === id ? state : { ...state, trailLo: clamp(state.x, view[0], view[1]), trailHi: clamp(state.x, view[0], view[1]) };
  return { ...state, x: next, trailLo: Math.min(from.trailLo, next), trailHi: Math.max(from.trailHi, next), owner: id };
}

export const slopeGraphModel: SimulationModel<SlopeGraphState, SlopeGraphParams, SlopeGraphResults> = {
  id: "slopegraph",
  defaultParams: { function: "square" },
  outputs: OUTPUTS,
  stateVariables: ["x", "n"],

  initialize(params) {
    const id = curveOf(params);
    const x = SLOPE_CURVES[id].view.x[0];
    return { x, n: 2, trailLo: x, trailHi: x, owner: id };
  },

  /** Play carries the point from wherever it is to the right-hand edge. */
  advance(state, dt, params) {
    const view = SLOPE_CURVES[curveOf(params)].view.x;
    return moveTo(state, clamp(state.x, view[0], view[1]) + ((view[1] - view[0]) / SWEEP_TIME) * dt, params);
  },

  step(state, params, sign) {
    const view = SLOPE_CURVES[curveOf(params)].view.x;
    return moveTo(state, state.x + (sign * (view[1] - view[0])) / 24, params);
  },

  derive(state, params) {
    const id = curveOf(params);
    const curve = SLOPE_CURVES[id];
    const n = powerOf(state);
    const x = clamp(state.x, curve.view.x[0], curve.view.x[1]);
    const slope = curve.df(x, n);
    const second = curve.d2f(x, n);
    const stationary = Math.abs(slope) < FLAT;
    const concavity = Math.abs(second) < FLAT ? 0 : Math.sign(second);
    const [trailLo, trailHi] = trailOf(state, id, x, curve.view.x);
    return {
      function: SLOPE_CURVE_ORDER.indexOf(id),
      x,
      y: curve.f(x, n),
      slope,
      second,
      direction: stationary ? 0 : Math.sign(slope),
      stationary: stationary ? 1 : 0,
      concavity,
      turning: !stationary ? 0 : concavity < 0 ? 1 : concavity > 0 ? 2 : 3,
      n,
      slopeAtOne: curve.df(1, n),
      trailLo,
      trailHi,
      coverage: (trailHi - trailLo) / (curve.view.x[1] - curve.view.x[0]),
    };
  },

  getVariable(state, id) {
    return id === "x" ? state.x : id === "n" ? state.n : undefined;
  },

  /** Dragging lays trail; a jump (a preset, or a level's starting point) starts it again from there. */
  setVariable(state, id, value, params) {
    if (id === "x") {
      const view = SLOPE_CURVES[curveOf(params)].view.x;
      const next = clamp(value, view[0], view[1]);
      if (Math.abs(next - state.x) > (view[1] - view[0]) / JUMP) return { ...state, x: next, trailLo: next, trailHi: next, owner: curveOf(params) };
      return moveTo(state, next, params);
    }
    // A new power is a new curve: the trail starts again.
    if (id === "n") return { ...state, n: clamp(Math.round(value), 1, 5), trailLo: state.x, trailHi: state.x };
    return state;
  },
};
