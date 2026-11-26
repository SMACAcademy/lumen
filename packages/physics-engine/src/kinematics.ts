import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Straight-line motion with constant acceleration: the first physics model,
 * and the one the rest of mechanics is built on.
 *
 * The learner sets the launch velocity u and the acceleration a, then scrubs
 * or plays time. Everything else — position, velocity, distance travelled,
 * the turning point — is derived here, so the track, the three graphs and the
 * marking can never disagree.
 */

export type KinematicsParams = {
  /** Velocity at t = 0, m/s. */
  u: number;
  /** Constant acceleration, m/s². */
  a: number;
  /** Position at t = 0, m. */
  x0: number;
  /** Seconds between the ghost markers left behind on the track. */
  strobe: number;
};

export interface KinematicsState {
  /** Seconds since the start of the run. */
  readonly t: number;
}

export type MotionPhase = "at rest" | "steady" | "speeding up" | "slowing down" | "turning";

export type KinematicsResults = {
  t: number;
  x: number;
  v: number;
  a: number;
  u: number;
  x0: number;
  /** Seconds between ghost markers, so the drawing can place them. */
  strobe: number;
  speed: number;
  /** x − x₀: how far from the start, with direction. */
  displacement: number;
  /** Path length actually travelled, which differs once the body turns round. */
  distance: number;
  /** displacement / t, the average over the whole run so far. */
  avgVelocity: number;
  /** Time at which the velocity changes sign, or NaN if it never does. */
  turningTime: number;
  /** Extremes over the whole run, so a view can be scaled to fit the motion. */
  xMin: number;
  xMax: number;
  vMin: number;
  vMax: number;
  phase: MotionPhase;
};

/** Length of one run. Time is the trace coordinate, so this is fixed. */
export const T_MAX = 6;

const EPS = 1e-9;

export function positionAt(p: { u: number; a: number; x0: number }, t: number): number {
  return p.x0 + p.u * t + 0.5 * p.a * t * t;
}

export function velocityAt(p: { u: number; a: number }, t: number): number {
  return p.u + p.a * t;
}

/** When the velocity passes through zero, if that happens during the run. */
export function turningPoint(p: { u: number; a: number }): number {
  if (Math.abs(p.a) < EPS) return Number.NaN;
  const t = -p.u / p.a;
  return t > EPS && t < T_MAX ? t : Number.NaN;
}

/**
 * Path length travelled up to `t`. Once the body turns round, the two legs are
 * added rather than cancelling — which is exactly the distance-versus-
 * displacement lesson.
 */
export function distanceTravelled(p: { u: number; a: number; x0: number }, t: number): number {
  const turn = turningPoint(p);
  const end = positionAt(p, t);
  if (Number.isNaN(turn) || t <= turn) return Math.abs(end - p.x0);
  const apex = positionAt(p, turn);
  return Math.abs(apex - p.x0) + Math.abs(end - apex);
}

function extremes(p: { u: number; a: number; x0: number }): { xMin: number; xMax: number } {
  const candidates = [positionAt(p, 0), positionAt(p, T_MAX)];
  const turn = turningPoint(p);
  if (!Number.isNaN(turn)) candidates.push(positionAt(p, turn));
  return { xMin: Math.min(...candidates), xMax: Math.max(...candidates) };
}

function phaseOf(v: number, a: number): MotionPhase {
  if (Math.abs(v) < 1e-6) return Math.abs(a) < EPS ? "at rest" : "turning";
  if (Math.abs(a) < EPS) return "steady";
  return v * a > 0 ? "speeding up" : "slowing down";
}

const OUTPUTS = [
  "t",
  "x",
  "v",
  "a",
  "u",
  "x0",
  "strobe",
  "speed",
  "displacement",
  "distance",
  "avgVelocity",
  "turningTime",
  "xMin",
  "xMax",
  "vMin",
  "vMax",
  "phase",
] as const satisfies readonly (keyof KinematicsResults)[];

const clampTime = (t: number) => Math.min(T_MAX, Math.max(0, t));

export const kinematicsModel: SimulationModel<KinematicsState, KinematicsParams, KinematicsResults> = {
  id: "kinematics-1d",
  defaultParams: { u: 4, a: -1, x0: 0, strobe: 0.5 },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Time runs forward and stops at the end of the run. */
  advance(state, dt) {
    return { t: clampTime(state.t + dt) };
  },

  /** Steps land on whole strobe intervals, so the ghosts line up. */
  step(state, params, sign) {
    const grid = Math.max(0.1, params.strobe);
    const next = sign > 0 ? Math.floor(state.t / grid + 1e-9) + 1 : Math.ceil(state.t / grid - 1e-9) - 1;
    return { t: clampTime(next * grid) };
  },

  derive(state, params) {
    const { u, a, x0 } = params;
    const t = state.t;
    const x = positionAt(params, t);
    const v = velocityAt(params, t);
    const { xMin, xMax } = extremes(params);
    const vStart = u;
    const vEnd = velocityAt(params, T_MAX);
    return {
      t,
      x: snapZero(x),
      v: snapZero(v),
      a,
      u,
      x0,
      strobe: params.strobe,
      speed: Math.abs(snapZero(v)),
      displacement: snapZero(x - x0),
      distance: distanceTravelled(params, t),
      avgVelocity: t > EPS ? snapZero((x - x0) / t) : 0,
      turningTime: turningPoint(params),
      xMin,
      xMax,
      vMin: Math.min(vStart, vEnd),
      vMax: Math.max(vStart, vEnd),
      phase: phaseOf(snapZero(v), a),
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    return id === "t" ? { t: clampTime(value) } : state;
  },

  trace: {
    coordinate: (state) => state.t,
    // Slightly more than the run, so t = T_MAX stays inside the first period.
    period: T_MAX + 1e-6,
    channels: ["x", "v", "a"],
    sample: (t, params) => ({ x: positionAt(params, t), v: velocityAt(params, t), a: params.a }),
    // A different launch is a different journey: the recorded graphs are stale.
    resetOn: ["u", "a", "x0"],
  },
};
