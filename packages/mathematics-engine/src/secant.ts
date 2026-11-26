import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";
import { familyOf } from "./functions";

/**
 * Secant → tangent. P = (x, f(x)) is fixed; Q = (x + h, f(x + h)). The secant
 * slope Δy/Δx approaches the tangent slope f′(x) as h → 0. Playing shrinks h
 * geometrically, so the approach can be watched frame by frame.
 */

export type SecantParams = {
  /** Key into functionFamilies. */
  family: string;
  /** While playing, |h| shrinks by the factor e^(−rate·dt). */
  shrinkRate: number;
  /** Smallest |h| allowed (h = 0 is undefined: 0/0). */
  hMin: number;
  /** Largest |h|. */
  hMax: number;
};

export interface SecantState {
  readonly x0: number;
  readonly h: number;
  readonly time: number;
}

export type SecantResults = {
  family: string;
  formula: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  h: number;
  absH: number;
  dx: number;
  dy: number;
  secantSlope: number;
  tangentSlope: number;
  /** secantSlope − tangentSlope. */
  error: number;
  absError: number;
  time: number;
};

/** Slope of the secant from x to x + h — the single place it is computed. */
export function secantSlope(family: string, x: number, h: number): number {
  const fam = familyOf(family);
  return (fam.f(x + h) - fam.f(x)) / h;
}

function clampH(h: number, p: SecantParams): number {
  const sign = h < 0 ? -1 : 1;
  return sign * Math.min(p.hMax, Math.max(p.hMin, Math.abs(h)));
}

function clampX(x: number, p: SecantParams): number {
  const [lo, hi] = familyOf(p.family).view.x;
  return Math.min(hi - 0.25, Math.max(lo + 0.25, x));
}

/** The trace records h + H_SHIFT so the h-range starts at 0; graphs use offset −H_SHIFT. */
export const H_SHIFT = 2;

const OUTPUTS = [
  "family",
  "formula",
  "x0",
  "y0",
  "x1",
  "y1",
  "h",
  "absH",
  "dx",
  "dy",
  "secantSlope",
  "tangentSlope",
  "error",
  "absError",
  "time",
] as const satisfies readonly (keyof SecantResults)[];

export const secantModel: SimulationModel<SecantState, SecantParams, SecantResults> = {
  id: "secant-tangent",
  defaultParams: { family: "quadratic", shrinkRate: 0.9, hMin: 0.001, hMax: 2 },
  outputs: OUTPUTS,
  stateVariables: ["x0", "h"],

  initialize() {
    return { x0: 1, h: 1.5, time: 0 };
  },

  advance(state, dt, params) {
    return { ...state, h: clampH(state.h * Math.exp(-params.shrinkRate * dt), params), time: state.time + dt };
  },

  /** Step forward halves h (Q jumps halfway to P); step back doubles it. */
  step(state, params, sign) {
    return { ...state, h: clampH(sign > 0 ? state.h / 2 : state.h * 2, params) };
  },

  derive(state, params) {
    const fam = familyOf(params.family);
    const { x0, h } = state;
    const y0 = fam.f(x0);
    const x1 = x0 + h;
    const y1 = fam.f(x1);
    const secant = (y1 - y0) / h;
    const tangent = fam.df(x0);
    return {
      family: fam.id,
      formula: fam.label,
      x0,
      y0,
      x1,
      y1,
      h,
      absH: Math.abs(h),
      dx: h,
      dy: y1 - y0,
      secantSlope: secant,
      tangentSlope: snapZero(tangent),
      error: secant - tangent,
      absError: Math.abs(secant - tangent),
      time: state.time,
    };
  },

  getVariable(state, id) {
    return id === "x0" ? state.x0 : id === "h" ? state.h : undefined;
  },

  setVariable(state, id, value, params) {
    if (id === "x0") return { ...state, x0: clampX(value, params) };
    if (id === "h") return { ...state, h: clampH(value === 0 ? params.hMin : value, params) };
    return state;
  },

  trace: {
    coordinate: (state) => state.h + H_SHIFT,
    // Slightly more than the h-range so h = hMax stays in the same "revolution".
    period: 2 * H_SHIFT + 1e-6,
    channels: ["secantSlope"],
    sample: (c, params, state) => {
      const h = c - H_SHIFT;
      return { secantSlope: Math.abs(h) < 1e-9 ? familyOf(params.family).df(state.x0) : secantSlope(params.family, state.x0, h) };
    },
    // A new point P or a new curve makes the recorded slopes meaningless.
    resetOn: ["x0", "family"],
  },
};
