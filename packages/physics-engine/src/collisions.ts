import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Two carts on a frictionless track, and what happens when they meet.
 *
 * The collision itself is solved algebraically rather than stepped through,
 * so the moment of impact is exact and the velocities afterwards come
 * straight from the two rules every question uses: momentum is conserved, and
 * the coefficient of restitution fixes how much of the approach speed comes
 * back as separation speed.
 */

export type CollisionParams = {
  /** Mass of the left cart, kg. */
  m1: number;
  /** Mass of the right cart, kg. */
  m2: number;
  /** Starting velocity of the left cart, m/s. Positive is to the right. */
  u1: number;
  /** Starting velocity of the right cart, m/s. */
  u2: number;
  /**
   * Coefficient of restitution: 1 is perfectly elastic, 0 means they stick
   * together, and anything between loses some kinetic energy as heat.
   */
  restitution: number;
  /** How far apart they start, m. */
  gap: number;
};

export interface CollisionState {
  /** Seconds since the carts were released. */
  readonly t: number;
}

export type CollisionResults = {
  t: number;
  /** Position of each cart's centre, m. */
  x1: number;
  x2: number;
  /** Velocity of each cart now. */
  v1: number;
  v2: number;
  m1: number;
  m2: number;
  u1: number;
  u2: number;
  restitution: number;
  /** When they meet; Infinity when they never do. */
  collisionTime: number;
  /** 1 once the collision has happened. */
  collided: number;
  /** Velocities after the collision. */
  v1After: number;
  v2After: number;
  /** Total momentum now — and it never changes. */
  momentum: number;
  momentumBefore: number;
  /** Kinetic energy now, and before the collision. */
  kinetic: number;
  kineticBefore: number;
  /** Energy lost in the collision, which is zero only when e = 1. */
  energyLost: number;
  /** Impulse delivered to the right cart: m₂(v₂ − u₂). */
  impulse: number;
  /** Speed they approach at before, and separate at after. */
  approachSpeed: number;
  separationSpeed: number;
};

/** Longest run the simulation follows, in seconds. */
export const COLLISION_LIMIT = 6;
/** Half-length of a cart, m — they meet when their edges touch. */
export const CART_HALF = 0.35;

/** Velocities after the impact, from conservation of momentum and the restitution rule. */
export function velocitiesAfter(p: CollisionParams): { v1: number; v2: number } {
  const { m1, m2, u1, u2, restitution: e } = p;
  const total = m1 + m2;
  const v1 = (m1 * u1 + m2 * u2 - m2 * e * (u1 - u2)) / total;
  const v2 = (m1 * u1 + m2 * u2 + m1 * e * (u1 - u2)) / total;
  return { v1, v2 };
}

/** When the gap between the carts closes. Infinity if it never does. */
export function collisionTime(p: CollisionParams): number {
  const closing = p.u1 - p.u2;
  if (closing <= 1e-9) return Number.POSITIVE_INFINITY;
  const t = p.gap / closing;
  return t >= 0 ? t : Number.POSITIVE_INFINITY;
}

const START_X1 = -2;

const OUTPUTS = [
  "t",
  "x1",
  "x2",
  "v1",
  "v2",
  "m1",
  "m2",
  "u1",
  "u2",
  "restitution",
  "collisionTime",
  "collided",
  "v1After",
  "v2After",
  "momentum",
  "momentumBefore",
  "kinetic",
  "kineticBefore",
  "energyLost",
  "impulse",
  "approachSpeed",
  "separationSpeed",
] as const satisfies readonly (keyof CollisionResults)[];

export const collisionModel: SimulationModel<CollisionState, CollisionParams, CollisionResults> = {
  id: "collisions",
  defaultParams: { m1: 2, m2: 1, u1: 3, u2: 0, restitution: 1, gap: 4 },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  advance(state, dt) {
    return { t: Math.min(COLLISION_LIMIT, state.t + dt) };
  },

  step(state, _params, sign) {
    return { t: Math.max(0, Math.min(COLLISION_LIMIT, state.t + sign * 0.25)) };
  },

  derive(state, params) {
    const { m1, m2, u1, u2 } = params;
    const t = state.t;
    const impact = collisionTime(params);
    const after = velocitiesAfter(params);
    const collided = t >= impact;

    const v1 = collided ? after.v1 : u1;
    const v2 = collided ? after.v2 : u2;
    // Before impact each cart runs at its own speed; after, from where it was hit.
    const meeting = Number.isFinite(impact) ? impact : 0;
    const x1 = collided ? START_X1 + u1 * meeting + after.v1 * (t - meeting) : START_X1 + u1 * t;
    const x2 = collided
      ? START_X1 + params.gap + u2 * meeting + after.v2 * (t - meeting)
      : START_X1 + params.gap + u2 * t;

    const momentumBefore = m1 * u1 + m2 * u2;
    const kineticBefore = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
    const kineticAfter = 0.5 * m1 * after.v1 * after.v1 + 0.5 * m2 * after.v2 * after.v2;
    return {
      t,
      x1: snapZero(x1),
      x2: snapZero(x2),
      v1: snapZero(v1),
      v2: snapZero(v2),
      m1,
      m2,
      u1,
      u2,
      restitution: params.restitution,
      collisionTime: impact,
      collided: collided ? 1 : 0,
      v1After: snapZero(after.v1),
      v2After: snapZero(after.v2),
      momentum: snapZero(m1 * v1 + m2 * v2),
      momentumBefore: snapZero(momentumBefore),
      kinetic: 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2,
      kineticBefore,
      energyLost: Math.max(0, kineticBefore - kineticAfter),
      impulse: snapZero(m2 * (after.v2 - u2)),
      approachSpeed: Math.max(0, u1 - u2),
      separationSpeed: Math.max(0, after.v2 - after.v1),
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    return id === "t" ? { t: Math.max(0, Math.min(COLLISION_LIMIT, value)) } : state;
  },
};
