import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A block on a surface: push it, tilt the surface, change the friction, and
 * Newton's second law decides the rest.
 *
 * Everything is resolved along and perpendicular to the surface, because that
 * is how the problem is always set up on paper. Friction is the interesting
 * part: while the block is still, it takes whatever value holds the block
 * there, up to μs·N — so "no motion" is a result, not a special case.
 */

export type ForcesParams = {
  /** Mass of the block, kg. */
  mass: number;
  /** Applied force along the surface, N. Positive points up the slope. */
  applied: number;
  /** Surface tilt above the horizontal, in radians. */
  incline: number;
  /** Coefficient of static friction. */
  muStatic: number;
  /** Coefficient of kinetic friction (never above the static one). */
  muKinetic: number;
  /** Gravity, m/s². */
  g: number;
};

export interface ForcesState {
  /** Distance travelled along the surface, m. */
  readonly s: number;
  /** Velocity along the surface, m/s. Positive points up the slope. */
  readonly v: number;
  readonly time: number;
}

export type MotionState = "still" | "on the verge" | "sliding up" | "sliding down";

export type ForcesResults = {
  s: number;
  v: number;
  speed: number;
  a: number;
  time: number;
  mass: number;
  incline: number;
  g: number;
  /** Weight, mg. */
  weight: number;
  /** Component of the weight along the slope, pulling the block down it. */
  weightAlong: number;
  /** Component of the weight pressing into the surface. */
  weightInto: number;
  /** Normal force from the surface. */
  normal: number;
  applied: number;
  /** Friction acting now, signed along the slope. */
  friction: number;
  /** The most friction this surface can offer while the block is still. */
  maxStatic: number;
  /** Resultant force along the slope. */
  netForce: number;
  /** What the block is doing. */
  motion: MotionState;
  /** True while friction alone is holding the block still. */
  held: number;
  /** Tilt at which the block would start to slip on its own, in radians. */
  slipAngle: number;
};

const EPS = 1e-9;
/** Below this speed the block counts as stationary for the friction test. */
const STILL = 1e-4;

export function normalForce(p: ForcesParams): number {
  return p.mass * p.g * Math.cos(p.incline);
}

/** Friction and the resulting acceleration, from the state of motion. */
export function frictionAndAcceleration(p: ForcesParams, v: number): { friction: number; a: number; motion: MotionState } {
  const normal = normalForce(p);
  const alongWithoutFriction = p.applied - p.mass * p.g * Math.sin(p.incline);
  const maxStatic = p.muStatic * normal;

  if (Math.abs(v) <= STILL) {
    // Static: friction matches whatever would otherwise move the block.
    if (Math.abs(alongWithoutFriction) <= maxStatic + EPS) {
      const onTheVerge = maxStatic - Math.abs(alongWithoutFriction) < 0.05 * Math.max(1, maxStatic);
      return { friction: -alongWithoutFriction, a: 0, motion: onTheVerge ? "on the verge" : "still" };
    }
    // It breaks away: kinetic friction opposes the direction it is about to go.
    const direction = Math.sign(alongWithoutFriction);
    const friction = -direction * p.muKinetic * normal;
    const a = (alongWithoutFriction + friction) / p.mass;
    return { friction, a, motion: a > 0 ? "sliding up" : "sliding down" };
  }

  const friction = -Math.sign(v) * p.muKinetic * normal;
  return { friction, a: (alongWithoutFriction + friction) / p.mass, motion: v > 0 ? "sliding up" : "sliding down" };
}

/** The tilt at which a block left alone begins to slide: tan θ = μs. */
export function slipAngle(p: { muStatic: number }): number {
  return Math.atan(p.muStatic);
}

const OUTPUTS = [
  "s",
  "v",
  "speed",
  "a",
  "time",
  "mass",
  "incline",
  "g",
  "weight",
  "weightAlong",
  "weightInto",
  "normal",
  "applied",
  "friction",
  "maxStatic",
  "netForce",
  "motion",
  "held",
  "slipAngle",
] as const satisfies readonly (keyof ForcesResults)[];

/** How far along the surface the block may travel before it is stopped. */
export const TRACK_LIMIT = 6;

export const forcesModel: SimulationModel<ForcesState, ForcesParams, ForcesResults> = {
  id: "forces-block",
  defaultParams: { mass: 2, applied: 0, incline: 0, muStatic: 0.4, muKinetic: 0.3, g: 9.8 },
  outputs: OUTPUTS,
  stateVariables: ["s", "v"],

  initialize() {
    return { s: 0, v: 0, time: 0 };
  },

  advance(state, dt, params) {
    const { a } = frictionAndAcceleration(params, state.v);
    let v = state.v + a * dt;
    // Friction can stop a block, but it cannot drag it back the other way.
    if (Math.abs(state.v) > STILL && Math.sign(v) !== Math.sign(state.v)) {
      const stopped = frictionAndAcceleration(params, 0);
      if (stopped.a === 0) v = 0;
    }
    const s = Math.max(-TRACK_LIMIT, Math.min(TRACK_LIMIT, state.s + v * dt));
    const stuckAtEnd = Math.abs(s) >= TRACK_LIMIT - EPS;
    return { s, v: stuckAtEnd ? 0 : v, time: state.time + dt };
  },

  /** Stepping nudges the block along the surface without giving it a velocity. */
  step(state, _params, sign) {
    return { ...state, s: Math.max(-TRACK_LIMIT, Math.min(TRACK_LIMIT, state.s + sign * 0.25)), v: 0 };
  },

  derive(state, params) {
    const { friction, a, motion } = frictionAndAcceleration(params, state.v);
    const normal = normalForce(params);
    const weightAlong = -params.mass * params.g * Math.sin(params.incline);
    return {
      s: state.s,
      v: snapZero(state.v),
      speed: Math.abs(snapZero(state.v)),
      a: snapZero(a),
      time: state.time,
      mass: params.mass,
      incline: params.incline,
      g: params.g,
      weight: params.mass * params.g,
      weightAlong: snapZero(weightAlong),
      weightInto: normal,
      normal,
      applied: params.applied,
      friction: snapZero(friction),
      maxStatic: params.muStatic * normal,
      netForce: snapZero(params.applied + weightAlong + friction),
      motion,
      held: Math.abs(state.v) <= STILL && Math.abs(a) < EPS ? 1 : 0,
      slipAngle: slipAngle(params),
    };
  },

  getVariable(state, id) {
    return id === "s" ? state.s : id === "v" ? state.v : undefined;
  },

  setVariable(state, id, value) {
    if (id === "s") return { ...state, s: Math.max(-TRACK_LIMIT, Math.min(TRACK_LIMIT, value)), v: 0 };
    if (id === "v") return { ...state, v: value };
    return state;
  },
};
