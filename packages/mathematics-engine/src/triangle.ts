import type { SimulationModel } from "@ise/science-engine";

/**
 * A right triangle for class 10: Pythagoras, and the three trig ratios.
 *
 * The base `a` runs along the ground from the angle θ to the right angle; the
 * height `b` stands up from the right angle. The square on the hypotenuse
 * holds exactly the squares on the other two sides, c² = a² + b². Seen from
 * θ, the height is the opposite side and the base the adjacent one, so
 * sin θ = b/c, cos θ = a/c and tan θ = b/a — ratios that depend only on the
 * angle, which is what lets us find a tower's height from its shadow.
 */

export const MIN_LEG = 0.5;
export const MAX_LEG = 20;

/** The angles whose ratios are learnt by heart, degrees. */
export const SPECIAL_ANGLES: readonly number[] = [30, 45, 60];

export type TriangleParams = {
  /** Which way Play sweeps: raising the height or stretching the base. */
  sweep: "height" | "base";
};

export interface TriangleState {
  /** Base: the side next to θ, along the ground. */
  readonly a: number;
  /** Height: the side opposite θ. */
  readonly b: number;
}

export type TriangleResults = {
  a: number;
  b: number;
  c: number;
  area: number;
  perimeter: number;
  theta: number;
  /** The third angle, 90° − θ. */
  other: number;
  sin: number;
  cos: number;
  tan: number;
  squareA: number;
  squareB: number;
  squareC: number;
  /** sin²θ + cos²θ — always 1. */
  identity: number;
  /** 1 when the hypotenuse is a whole number: a Pythagorean triple if the legs are whole too. */
  whole: number;
  /** The special angle θ is within half a degree of, or 0. */
  special: number;
};

const clampLeg = (x: number) => Math.min(MAX_LEG, Math.max(MIN_LEG, x));
const round = (x: number) => Math.round(x * 1e9) / 1e9;

const OUTPUTS = [
  "a", "b", "c", "area", "perimeter", "theta", "other", "sin", "cos", "tan",
  "squareA", "squareB", "squareC", "identity", "whole", "special",
] as const satisfies readonly (keyof TriangleResults)[];

export const triangleModel: SimulationModel<TriangleState, TriangleParams, TriangleResults> = {
  id: "triangle",
  defaultParams: { sweep: "height" },
  outputs: OUTPUTS,
  stateVariables: ["a", "b"],

  initialize() {
    return { a: 4, b: 3 };
  },

  /** Play raises the height (or stretches the base) and starts again from the bottom. */
  advance(state, dt, params) {
    const key = params.sweep === "base" ? "a" : "b";
    const next = state[key] + 1.5 * dt;
    return { ...state, [key]: next > 12 ? 1 : next };
  },

  step(state, params, sign) {
    const key = params.sweep === "base" ? "a" : "b";
    return { ...state, [key]: clampLeg(Math.round(state[key]) + sign) };
  },

  derive(state) {
    const a = clampLeg(state.a);
    const b = clampLeg(state.b);
    const c = Math.hypot(a, b);
    const theta = (Math.atan2(b, a) * 180) / Math.PI;
    const sin = b / c;
    const cos = a / c;
    const special = SPECIAL_ANGLES.find((s) => Math.abs(theta - s) <= 0.5) ?? 0;
    return {
      a,
      b,
      c,
      area: (a * b) / 2,
      perimeter: a + b + c,
      theta,
      other: 90 - theta,
      sin,
      cos,
      tan: b / a,
      squareA: a * a,
      squareB: b * b,
      squareC: round(c * c),
      identity: round(sin * sin + cos * cos),
      whole: Math.abs(c - Math.round(c)) < 1e-9 ? 1 : 0,
      special,
    };
  },

  getVariable(state, id) {
    return id === "a" ? state.a : id === "b" ? state.b : undefined;
  },

  setVariable(state, id, value) {
    if (id === "a") return { ...state, a: clampLeg(value) };
    if (id === "b") return { ...state, b: clampLeg(value) };
    return state;
  },
};
