import type { SimulationModel } from "@ise/science-engine";

/**
 * Straight lines on the coordinate plane, for class 9 and 10.
 *
 * A point (x, y) sits on the plane. The line y = mx + c climbs m for every
 * step right and crosses the y-axis at c; a point is on it exactly when its
 * coordinates make the equation true. A second line y = m₂x + c₂ meets the
 * first once — the solution of the pair — unless the two have the same
 * slope: then they are parallel and never meet, or they are the same line
 * and meet everywhere.
 */

export const PLANE_LIMIT = 8;
export const MAX_SLOPE = 5;

export type LineParams = {
  /** Play walks the point along the first line. */
  walk: "line" | "free";
};

export interface LineState {
  readonly m: number;
  readonly c: number;
  readonly m2: number;
  readonly c2: number;
  readonly x: number;
  readonly y: number;
}

export type LineResults = {
  m: number;
  c: number;
  m2: number;
  c2: number;
  x: number;
  y: number;
  /** The first line's height at the point's x: m·x + c. */
  lineY: number;
  onLine: number;
  onLine2: number;
  /** Where the first line crosses the x-axis, or 0 when it never does. */
  xIntercept: number;
  hasXIntercept: number;
  parallel: number;
  /** Solutions of the pair: 1 one, 0 none (parallel), 2 infinitely many (the same line). */
  solutions: number;
  meetX: number;
  meetY: number;
  /** 1–4, or 0 on an axis. */
  quadrant: number;
};

const EPS = 1e-9;
const clampTo = (v: number, lim: number) => Math.min(lim, Math.max(-lim, v));
const clean = (v: number) => (Math.abs(v) < EPS ? 0 : Math.round(v * 1e9) / 1e9);

export function pointQuadrant(x: number, y: number): number {
  if (Math.abs(x) < EPS || Math.abs(y) < EPS) return 0;
  return x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;
}

const OUTPUTS = [
  "m", "c", "m2", "c2", "x", "y", "lineY", "onLine", "onLine2", "xIntercept", "hasXIntercept",
  "parallel", "solutions", "meetX", "meetY", "quadrant",
] as const satisfies readonly (keyof LineResults)[];

const KEYS = ["m", "c", "m2", "c2", "x", "y"] as const;
type Key = (typeof KEYS)[number];
const limitOf = (key: Key) => (key === "m" || key === "m2" ? MAX_SLOPE : PLANE_LIMIT);

export const lineModel: SimulationModel<LineState, LineParams, LineResults> = {
  id: "line",
  defaultParams: { walk: "line" },
  outputs: OUTPUTS,
  stateVariables: KEYS,

  initialize() {
    return { m: 1, c: 1, m2: -1, c2: 5, x: 1, y: 2 };
  },

  /** Play walks the point along the first line, left to right, and round again. */
  advance(state, dt, params) {
    let x = state.x + 1.5 * dt;
    if (x > PLANE_LIMIT) x = -PLANE_LIMIT;
    const y = params.walk === "line" ? clampTo(state.m * x + state.c, PLANE_LIMIT) : state.y;
    return { ...state, x, y };
  },

  step(state, _params, sign) {
    return { ...state, x: clampTo(Math.round(state.x) + sign, PLANE_LIMIT) };
  },

  derive(state) {
    const { m, c, m2, c2 } = state;
    const x = clampTo(state.x, PLANE_LIMIT);
    const y = clampTo(state.y, PLANE_LIMIT);
    const parallel = Math.abs(m - m2) < EPS;
    const same = parallel && Math.abs(c - c2) < EPS;
    const meetX = parallel ? 0 : (c2 - c) / (m - m2);
    const hasX = Math.abs(m) > EPS;
    return {
      m,
      c,
      m2,
      c2,
      x,
      y,
      lineY: clean(m * x + c),
      onLine: Math.abs(y - (m * x + c)) < EPS ? 1 : 0,
      onLine2: Math.abs(y - (m2 * x + c2)) < EPS ? 1 : 0,
      xIntercept: hasX ? clean(-c / m) : 0,
      hasXIntercept: hasX || Math.abs(c) < EPS ? 1 : 0,
      parallel: parallel ? 1 : 0,
      solutions: same ? 2 : parallel ? 0 : 1,
      meetX: clean(meetX),
      meetY: parallel ? 0 : clean(m * meetX + c),
      quadrant: pointQuadrant(x, y),
    };
  },

  getVariable(state, id) {
    return (KEYS as readonly string[]).includes(id) ? state[id as Key] : undefined;
  },

  setVariable(state, id, value) {
    if (!(KEYS as readonly string[]).includes(id)) return state;
    const key = id as Key;
    return { ...state, [key]: clampTo(value, limitOf(key)) };
  },
};
