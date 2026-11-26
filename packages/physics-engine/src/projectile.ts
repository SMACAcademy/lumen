import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * Projectile motion: constant velocity across, constant acceleration down.
 *
 * The whole chapter is that one sentence, so the model keeps the two motions
 * visibly separate — horizontal and vertical results are derived apart and
 * only combined where the physics combines them.
 */

export type ProjectileParams = {
  /** Launch speed, m/s. */
  u: number;
  /** Launch angle above the horizontal, in radians. */
  angle: number;
  /** Launch height above the ground, m. */
  h0: number;
  /** Gravity, m/s² (positive; it acts downwards). */
  g: number;
  /** Seconds between the ghosts left behind in flight. */
  strobe: number;
};

export interface ProjectileState {
  /** Seconds since launch. */
  readonly t: number;
}

export type ProjectileResults = {
  t: number;
  /** Horizontal distance from the launch point, m. */
  x: number;
  /** Height above the ground, m. */
  y: number;
  /** Horizontal velocity — constant for the whole flight. */
  vx: number;
  /** Vertical velocity — falls by g every second. */
  vy: number;
  speed: number;
  /** Direction of travel, in radians above the horizontal. */
  heading: number;
  u: number;
  angle: number;
  h0: number;
  g: number;
  strobe: number;
  /** Time at the top of the flight. */
  apexTime: number;
  /** Greatest height reached, above the ground. */
  maxHeight: number;
  /** How long the flight lasts, from launch to landing. */
  timeOfFlight: number;
  /** Horizontal distance covered by landing. */
  range: number;
  /** True once the projectile has landed. */
  landed: boolean;
  /** How much of the flight is done, 0 at launch and 1 on landing. */
  progress: number;
};

/** Longest flight the simulation follows, in seconds. */
export const FLIGHT_LIMIT = 8;

export function horizontalVelocity(p: { u: number; angle: number }): number {
  return p.u * Math.cos(p.angle);
}

export function verticalVelocity(p: { u: number; angle: number; g: number }, t: number): number {
  return p.u * Math.sin(p.angle) - p.g * t;
}

export function projectilePositionAt(p: ProjectileParams, t: number): { x: number; y: number } {
  return {
    x: horizontalVelocity(p) * t,
    y: p.h0 + p.u * Math.sin(p.angle) * t - 0.5 * p.g * t * t,
  };
}

/** When it comes back to the ground: the positive root of the height equation. */
export function timeOfFlight(p: ProjectileParams): number {
  const vy0 = p.u * Math.sin(p.angle);
  const discriminant = vy0 * vy0 + 2 * p.g * p.h0;
  if (p.g <= 0 || discriminant < 0) return FLIGHT_LIMIT;
  return Math.min(FLIGHT_LIMIT, (vy0 + Math.sqrt(discriminant)) / p.g);
}

export function apexTime(p: ProjectileParams): number {
  return p.g > 0 ? Math.max(0, Math.min(timeOfFlight(p), (p.u * Math.sin(p.angle)) / p.g)) : 0;
}

const OUTPUTS = [
  "t",
  "x",
  "y",
  "vx",
  "vy",
  "speed",
  "heading",
  "u",
  "angle",
  "h0",
  "g",
  "strobe",
  "apexTime",
  "maxHeight",
  "timeOfFlight",
  "range",
  "landed",
  "progress",
] as const satisfies readonly (keyof ProjectileResults)[];

export const projectileModel: SimulationModel<ProjectileState, ProjectileParams, ProjectileResults> = {
  id: "projectile",
  defaultParams: { u: 14, angle: Math.PI / 4, h0: 0, g: 9.8, strobe: 0.2 },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Flight stops at landing: nothing sensible happens underground. */
  advance(state, dt, params) {
    return { t: Math.min(timeOfFlight(params), state.t + dt) };
  },

  step(state, params, sign) {
    const grid = Math.max(0.05, params.strobe);
    const next = sign > 0 ? Math.floor(state.t / grid + 1e-9) + 1 : Math.ceil(state.t / grid - 1e-9) - 1;
    return { t: Math.max(0, Math.min(timeOfFlight(params), next * grid)) };
  },

  derive(state, params) {
    const flight = timeOfFlight(params);
    const t = Math.min(state.t, flight);
    const { x, y } = projectilePositionAt(params, t);
    const vx = horizontalVelocity(params);
    const vy = verticalVelocity(params, t);
    const apex = apexTime(params);
    return {
      t,
      x: snapZero(x),
      y: snapZero(Math.max(0, y)),
      vx: snapZero(vx),
      vy: snapZero(vy),
      speed: Math.hypot(vx, vy),
      heading: Math.atan2(vy, vx),
      u: params.u,
      angle: params.angle,
      h0: params.h0,
      g: params.g,
      strobe: params.strobe,
      apexTime: apex,
      maxHeight: projectilePositionAt(params, apex).y,
      timeOfFlight: flight,
      range: projectilePositionAt(params, flight).x,
      landed: t >= flight - 1e-9,
      progress: flight > 0 ? Math.min(1, t / flight) : 0,
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value, params) {
    return id === "t" ? { t: Math.max(0, Math.min(timeOfFlight(params), value)) } : state;
  },
};
