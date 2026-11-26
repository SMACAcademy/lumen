import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A rigid body on an axle: push it at the rim and it spins up.
 *
 * Every linear idea has a twin here — force becomes torque, mass becomes
 * moment of inertia, momentum becomes angular momentum — and the point of the
 * model is that the twin depends on *where* the mass sits, not just how much
 * of it there is.
 */

export type BodyShape = "disc" | "ring" | "rod" | "sphere" | "shell";

/** Moment of inertia as a fraction of mR², about the axis through the centre. */
export const SHAPE_FACTOR: Readonly<Record<BodyShape, number>> = {
  /** Solid disc or cylinder: ½mR². */
  disc: 0.5,
  /** Ring or hoop, all the mass at the rim: mR². */
  ring: 1,
  /** Rod of length 2R about its centre: ⅓mR². */
  rod: 1 / 3,
  /** Solid sphere: ⅖mR². */
  sphere: 0.4,
  /** Thin spherical shell: ⅔mR². */
  shell: 2 / 3,
};

export type RotationParams = {
  shape: BodyShape;
  /** Mass of the body, kg. */
  mass: number;
  /** Outer radius, m. */
  radius: number;
  /** Force applied at the rim, tangentially, N. */
  force: number;
  /** Where the force is applied, as a fraction of the radius. */
  leverFraction: number;
  /** Steady friction torque at the axle, N m. */
  axleFriction: number;
};

export interface RotationState {
  /** Angle turned, rad — unwrapped, so revolutions can be counted. */
  readonly theta: number;
  /** Angular velocity, rad/s. */
  readonly omega: number;
  readonly time: number;
}

export type RotationResults = {
  theta: number;
  omega: number;
  alpha: number;
  time: number;
  shape: string;
  mass: number;
  radius: number;
  force: number;
  /** Distance from the axle at which the force acts, m. */
  lever: number;
  leverFraction: number;
  /** Torque from the applied force, N m. */
  torque: number;
  axleFriction: number;
  /** Resultant torque once the axle's friction is taken off. */
  netTorque: number;
  /** Moment of inertia about the axle, kg m². */
  inertia: number;
  /** Radius of gyration: where a single point mass would have to sit. */
  gyration: number;
  /** Angular momentum, kg m²/s. */
  angularMomentum: number;
  /** Rotational kinetic energy, J. */
  kinetic: number;
  /** Speed of a point on the rim, m/s. */
  rimSpeed: number;
  /** Turns completed since the start. */
  revolutions: number;
};

const EPS = 1e-9;
/** Fastest the axle is allowed to spin, rad/s, so the drawing stays readable. */
export const MAX_OMEGA = 40;

export function momentOfInertia(p: { shape: BodyShape; mass: number; radius: number }): number {
  return SHAPE_FACTOR[p.shape] * p.mass * p.radius * p.radius;
}

export function torqueOf(p: RotationParams): number {
  return p.force * p.radius * p.leverFraction;
}

/** Angular acceleration, with axle friction opposing the spin. */
export function angularAcceleration(p: RotationParams, omega: number): number {
  const inertia = momentOfInertia(p);
  if (inertia < EPS) return 0;
  const driving = torqueOf(p);
  if (Math.abs(omega) < 1e-4) {
    // At rest the axle resists up to its friction torque before anything turns.
    if (Math.abs(driving) <= p.axleFriction + EPS) return 0;
    return (driving - Math.sign(driving) * p.axleFriction) / inertia;
  }
  return (driving - Math.sign(omega) * p.axleFriction) / inertia;
}

const OUTPUTS = [
  "theta",
  "omega",
  "alpha",
  "time",
  "shape",
  "mass",
  "radius",
  "force",
  "lever",
  "leverFraction",
  "torque",
  "axleFriction",
  "netTorque",
  "inertia",
  "gyration",
  "angularMomentum",
  "kinetic",
  "rimSpeed",
  "revolutions",
] as const satisfies readonly (keyof RotationResults)[];

export const rotationModel: SimulationModel<RotationState, RotationParams, RotationResults> = {
  id: "rotation",
  defaultParams: { shape: "disc", mass: 2, radius: 0.5, force: 4, leverFraction: 1, axleFriction: 0 },
  outputs: OUTPUTS,
  stateVariables: ["theta", "omega"],

  initialize() {
    return { theta: 0, omega: 0, time: 0 };
  },

  advance(state, dt, params) {
    const alpha = angularAcceleration(params, state.omega);
    let omega = state.omega + alpha * dt;
    // Friction can stop the wheel; it cannot drive it the other way.
    if (Math.abs(state.omega) > 1e-4 && Math.sign(omega) !== Math.sign(state.omega) && angularAcceleration(params, 0) === 0) {
      omega = 0;
    }
    // Once it is turning too slowly to matter and nothing is driving it, it has stopped.
    if (Math.abs(omega) < 1e-4 && angularAcceleration(params, 0) === 0) omega = 0;
    omega = Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, omega));
    return { theta: state.theta + state.omega * dt + 0.5 * alpha * dt * dt, omega, time: state.time + dt };
  },

  /** A step turns the body by a tenth of a revolution, without spinning it up. */
  step(state, _params, sign) {
    return { ...state, theta: state.theta + (sign * Math.PI) / 5, omega: 0 };
  },

  derive(state, params) {
    const inertia = momentOfInertia(params);
    const alpha = angularAcceleration(params, state.omega);
    const torque = torqueOf(params);
    return {
      theta: state.theta,
      omega: snapZero(state.omega),
      alpha: snapZero(alpha),
      time: state.time,
      shape: params.shape,
      mass: params.mass,
      radius: params.radius,
      force: params.force,
      lever: params.radius * params.leverFraction,
      leverFraction: params.leverFraction,
      torque: snapZero(torque),
      axleFriction: params.axleFriction,
      netTorque: snapZero(inertia * alpha),
      inertia,
      gyration: params.mass > EPS ? Math.sqrt(inertia / params.mass) : 0,
      angularMomentum: snapZero(inertia * state.omega),
      kinetic: 0.5 * inertia * state.omega * state.omega,
      rimSpeed: Math.abs(snapZero(state.omega)) * params.radius,
      revolutions: state.theta / (2 * Math.PI),
    };
  },

  getVariable(state, id) {
    return id === "theta" ? state.theta : id === "omega" ? state.omega : undefined;
  },

  setVariable(state, id, value) {
    if (id === "theta") return { ...state, theta: value };
    if (id === "omega") return { ...state, omega: Math.max(-MAX_OMEGA, Math.min(MAX_OMEGA, value)) };
    return state;
  },
};
