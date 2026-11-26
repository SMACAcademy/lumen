import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Energy accounting for a block on a slope — the same block as the forces
 * lab, now with the books kept.
 *
 * Kinetic energy is what it has; potential energy is what the height owes it;
 * friction turns the difference into heat that never comes back. Every
 * quantity here is derived from the same state, so the ledger always balances
 * and the work–energy theorem can be checked rather than asserted.
 */

export type EnergyParams = {
  mass: number;
  /** Steady push along the slope, N. Positive points up the slope. */
  applied: number;
  /** Slope above the horizontal, in radians. */
  incline: number;
  /** Coefficient of kinetic friction. */
  muKinetic: number;
  g: number;
  /** Speed it starts with, up the slope, m/s. */
  v0: number;
};

export interface EnergyState {
  /** Distance along the slope from the start, m. */
  readonly s: number;
  /** Velocity along the slope, m/s. */
  readonly v: number;
  /** Path length actually covered, m — what friction charges for. */
  readonly path: number;
  /**
   * Mechanical energy this journey began with. A launch starts with ½mv₀²;
   * a block placed by hand starts with whatever its height is worth. Keeping
   * it in the state is what lets the ledger balance either way.
   */
  readonly startEnergy: number;
  readonly time: number;
}

export type EnergyResults = {
  s: number;
  v: number;
  speed: number;
  time: number;
  path: number;
  mass: number;
  incline: number;
  g: number;
  applied: number;
  /** Height gained above the starting point, m. */
  height: number;
  /** ½mv² now. */
  kinetic: number;
  /** ½mv₀² at the start. */
  kineticStart: number;
  /** mgh, measured from the starting height. */
  potential: number;
  /** Kinetic + potential. */
  mechanical: number;
  /** Mechanical energy it started with. */
  mechanicalStart: number;
  /** Work done by the push: F·s. */
  workApplied: number;
  /** Work done by gravity: −mgh. */
  workGravity: number;
  /** Work done by friction — always negative, and it becomes heat. */
  workFriction: number;
  /** Energy turned into heat, which never comes back. */
  heat: number;
  /** Total work done on the block by every force. */
  netWork: number;
  /** Instantaneous power of the push, F·v. */
  power: number;
  /** How far the books are from balancing; it should stay at zero. */
  balance: number;
};

/** Length of the track either side of the start, m. */
export const ENERGY_TRACK_LIMIT = 8;

const EPS = 1e-9;

export function energyNormalForce(p: EnergyParams): number {
  return p.mass * p.g * Math.cos(p.incline);
}

/** Acceleration along the slope, with friction opposing the motion. */
export function accelerationAt(p: EnergyParams, v: number): number {
  const along = p.applied - p.mass * p.g * Math.sin(p.incline);
  const friction = Math.abs(v) < 1e-4 ? 0 : -Math.sign(v) * p.muKinetic * energyNormalForce(p);
  if (Math.abs(v) < 1e-4) {
    // At rest: friction holds as much as it can before anything moves.
    const grip = p.muKinetic * energyNormalForce(p);
    if (Math.abs(along) <= grip + EPS) return 0;
    return (along - Math.sign(along) * grip) / p.mass;
  }
  return (along + friction) / p.mass;
}

const OUTPUTS = [
  "s",
  "v",
  "speed",
  "time",
  "path",
  "mass",
  "incline",
  "g",
  "applied",
  "height",
  "kinetic",
  "kineticStart",
  "potential",
  "mechanical",
  "mechanicalStart",
  "workApplied",
  "workGravity",
  "workFriction",
  "heat",
  "netWork",
  "power",
  "balance",
] as const satisfies readonly (keyof EnergyResults)[];

export const energyModel: SimulationModel<EnergyState, EnergyParams, EnergyResults> = {
  id: "energy-track",
  defaultParams: { mass: 2, applied: 0, incline: Math.PI / 9, muKinetic: 0, g: 9.8, v0: 6 },
  outputs: OUTPUTS,
  stateVariables: ["s", "v"],

  initialize(params) {
    return { s: 0, v: params.v0, path: 0, startEnergy: 0.5 * params.mass * params.v0 * params.v0, time: 0 };
  },

  advance(state, dt, params) {
    const a = accelerationAt(params, state.v);
    let v = state.v + a * dt;
    // Friction can bring a block to rest, but never drag it backwards.
    if (Math.abs(state.v) > 1e-4 && Math.sign(v) !== Math.sign(state.v) && accelerationAt(params, 0) === 0) v = 0;
    // s += vt + ½at² — exact while the acceleration holds steady, so the
    // energy ledger does not drift over a long run.
    const advanced = state.s + state.v * dt + 0.5 * a * dt * dt;
    const s = Math.max(-ENERGY_TRACK_LIMIT, Math.min(ENERGY_TRACK_LIMIT, advanced));
    const moved = Math.abs(s - state.s);
    const atEnd = Math.abs(s) >= ENERGY_TRACK_LIMIT - EPS;
    return { ...state, s, v: atEnd ? 0 : v, path: state.path + moved, time: state.time + dt };
  },

  step(state, params, sign) {
    return energyModel.setVariable(state, "s", state.s + sign * 0.5, params);
  },

  derive(state, params) {
    const { mass, g, incline, applied, muKinetic, v0 } = params;
    const height = state.s * Math.sin(incline);
    const kinetic = 0.5 * mass * state.v * state.v;
    const kineticStart = 0.5 * mass * v0 * v0;
    const startEnergy = state.startEnergy;
    const potential = mass * g * height;
    const heat = muKinetic * energyNormalForce(params) * state.path;
    const workApplied = applied * state.s;
    const workGravity = -potential;
    return {
      s: state.s,
      v: snapZero(state.v),
      speed: Math.abs(snapZero(state.v)),
      time: state.time,
      path: state.path,
      mass,
      incline,
      g,
      applied,
      height: snapZero(height),
      kinetic,
      kineticStart,
      potential: snapZero(potential),
      mechanical: kinetic + potential,
      mechanicalStart: startEnergy,
      workApplied: snapZero(workApplied),
      workGravity: snapZero(workGravity),
      workFriction: -heat,
      heat,
      netWork: snapZero(workApplied + workGravity - heat),
      power: snapZero(applied * state.v),
      // Conservation: everything it has now, plus what friction took, should
      // equal what it started with plus the work the push has put in.
      balance: snapZero(kinetic + potential + heat - (startEnergy + workApplied)),
    };
  },

  getVariable(state, id) {
    return id === "s" ? state.s : id === "v" ? state.v : undefined;
  },

  setVariable(state, id, value, params) {
    // Placing the block by hand starts a fresh journey: it is set down at
    // rest, the old path is spent, and the ledger restarts from its height.
    if (id === "s") {
      const s = Math.max(-ENERGY_TRACK_LIMIT, Math.min(ENERGY_TRACK_LIMIT, value));
      const height = s * Math.sin(params.incline);
      return { s, v: 0, path: 0, startEnergy: params.mass * params.g * height, time: 0 };
    }
    if (id === "v") {
      return { ...state, v: value, startEnergy: 0.5 * params.mass * value * value + params.mass * params.g * state.s * Math.sin(params.incline) };
    }
    return state;
  },
};
