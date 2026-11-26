import type { SimulationModel, StepSign } from "@ise/science-engine";
import { TAU, normalizeRadians, radToDeg, revolutions, shortestAngleDelta, snapZero } from "@ise/units";

/**
 * Unit circle model: a point rotating uniformly around a circle of radius r.
 * Its horizontal projection is r·cos θ and its vertical projection is r·sin θ.
 * This is the single source of truth for every trigonometric value in the lab.
 */

export type RotationDirection = "ccw" | "cw";

export type UnitCircleParams = {
  /** Angular speed ω in rad/s (always positive; direction is separate). */
  omega: number;
  direction: RotationDirection;
  /** Discrete step size in rad. */
  stepSize: number;
  /** Starting angle in rad, used by initialize/reset. */
  initialTheta: number;
  /** Circle radius (1 for the unit circle). */
  radius: number;
};

export interface UnitCircleState {
  /** Unwrapped angle in rad — continuous across revolutions. */
  readonly theta: number;
  /** Simulated seconds elapsed while playing. */
  readonly time: number;
}

/** 0 means the point lies on an axis (quadrantal angle). */
export type Quadrant = 0 | 1 | 2 | 3 | 4;

export type UnitCircleResults = {
  /** Unwrapped angle, rad. */
  theta: number;
  /** Angle wrapped into [0, 2π), rad. */
  thetaNorm: number;
  /** Angle wrapped into [0, 360), degrees. */
  thetaDeg: number;
  revolutions: number;
  sin: number;
  cos: number;
  /** NaN where tan θ is undefined (cos θ = 0). */
  tan: number;
  /** Point coordinates: x = r cos θ, y = r sin θ. */
  x: number;
  y: number;
  radius: number;
  quadrant: Quadrant;
  /** Acute angle to the x-axis, rad. */
  referenceAngle: number;
  /** sin²θ + cos²θ, computed from the rounded-to-noise values. */
  identity: number;
  time: number;
};

const EPS = 1e-12;

export function directionSign(direction: RotationDirection): StepSign {
  return direction === "ccw" ? 1 : -1;
}

export function sinOf(theta: number): number {
  return snapZero(Math.sin(theta), EPS);
}

export function cosOf(theta: number): number {
  return snapZero(Math.cos(theta), EPS);
}

export function tanOf(theta: number): number {
  const c = cosOf(theta);
  return c === 0 ? Number.NaN : sinOf(theta) / c;
}

export function quadrantOf(theta: number): Quadrant {
  const s = sinOf(theta);
  const c = cosOf(theta);
  if (s === 0 || c === 0) return 0;
  if (s > 0) return c > 0 ? 1 : 2;
  return c < 0 ? 3 : 4;
}

export function referenceAngleOf(theta: number): number {
  const t = normalizeRadians(theta);
  if (t <= Math.PI / 2) return t;
  if (t <= Math.PI) return Math.PI - t;
  if (t <= (3 * Math.PI) / 2) return t - Math.PI;
  return TAU - t;
}

/** Next multiple of `step` strictly beyond `theta` in the given direction. */
export function snappedStep(theta: number, step: number, sign: StepSign): number {
  if (step <= 0) return theta;
  const k = theta / step;
  const index = sign > 0 ? Math.floor(k + 1e-9) + 1 : Math.ceil(k - 1e-9) - 1;
  return index * step;
}

const OUTPUTS = [
  "theta",
  "thetaNorm",
  "thetaDeg",
  "revolutions",
  "sin",
  "cos",
  "tan",
  "x",
  "y",
  "radius",
  "quadrant",
  "referenceAngle",
  "identity",
  "time",
] as const satisfies readonly (keyof UnitCircleResults)[];

export const unitCircleModel: SimulationModel<UnitCircleState, UnitCircleParams, UnitCircleResults> = {
  id: "unit-circle",
  defaultParams: {
    omega: Math.PI / 4, // 45°/s — one revolution in 8 s
    direction: "ccw",
    stepSize: Math.PI / 12, // 15°
    initialTheta: 0,
    radius: 1,
  },
  outputs: OUTPUTS,
  stateVariables: ["theta"],

  initialize(params) {
    return { theta: params.initialTheta, time: 0 };
  },

  advance(state, dt, params) {
    return {
      theta: state.theta + directionSign(params.direction) * params.omega * dt,
      time: state.time + dt,
    };
  },

  step(state, params, sign) {
    const effective = (sign * directionSign(params.direction)) as StepSign;
    return { ...state, theta: snappedStep(state.theta, params.stepSize, effective) };
  },

  derive(state, params) {
    const { theta, time } = state;
    const r = params.radius;
    const sin = sinOf(theta);
    const cos = cosOf(theta);
    const thetaNorm = normalizeRadians(theta);
    return {
      theta,
      thetaNorm,
      thetaDeg: radToDeg(thetaNorm),
      revolutions: revolutions(theta),
      sin,
      cos,
      tan: tanOf(theta),
      x: r * cos,
      y: r * sin,
      radius: r,
      quadrant: quadrantOf(theta),
      referenceAngle: referenceAngleOf(theta),
      identity: sin * sin + cos * cos,
      time,
    };
  },

  getVariable(state, id) {
    return id === "theta" ? normalizeRadians(state.theta) : undefined;
  },

  /**
   * Setting θ moves to the nearest equivalent angle, so dragging the point
   * across 0° continues smoothly into the next revolution instead of sweeping
   * backwards around the whole circle. Continuous slider drags produce small
   * steps and therefore still sweep exactly the path the learner dragged.
   */
  setVariable(state, id, value) {
    if (id !== "theta") return state;
    return { ...state, theta: state.theta + shortestAngleDelta(state.theta, value) };
  },

  trace: {
    coordinate: (state) => state.theta,
    period: TAU,
    channels: ["sin", "cos"],
    sample: (theta) => ({ sin: sinOf(theta), cos: cosOf(theta) }),
  },
};
