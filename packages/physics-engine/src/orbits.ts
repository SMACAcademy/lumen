import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * A satellite around a planet, under an inverse-square pull.
 *
 * The path is not stepped through and hoped for: the orbit's shape is worked
 * out from the launch as a conic section, so the ellipse drawn on screen is
 * the exact orbit, the period comes straight from Kepler's third law, and
 * "this launch escapes" is a fact about the energy rather than a guess.
 */

export type OrbitParams = {
  /** Planet mass, in Earth masses. */
  planetMass: number;
  /** Launch height above the surface, in planet radii. */
  launchHeight: number;
  /**
   * Launch speed as a fraction of the circular speed at that height: 1 gives
   * a circle, √2 escapes, less than 1 drops towards the planet.
   */
  speedFactor: number;
};

export interface OrbitState {
  /** Seconds since launch, in simulation time. */
  readonly t: number;
}

export type OrbitResults = {
  t: number;
  /** Where the satellite is, in planet radii from the centre. */
  x: number;
  y: number;
  /** Distance from the planet's centre, in planet radii. */
  r: number;
  /** Speed now, as a fraction of the circular speed at the launch height. */
  speed: number;
  planetMass: number;
  launchHeight: number;
  speedFactor: number;
  /** Launch distance from the centre, in planet radii. */
  launchRadius: number;
  /** Circular speed at the launch height, in the model's own units. */
  circularSpeed: number;
  /** Escape speed at the launch height. */
  escapeSpeed: number;
  /** Launch speed, in the same units. */
  launchSpeed: number;
  /** Shape of the orbit: 0 a circle, below 1 an ellipse, 1 or more an escape. */
  eccentricity: number;
  /** Semi-major axis, in planet radii; Infinity once it escapes. */
  semiMajor: number;
  /** Closest and furthest approach, in planet radii. */
  perigee: number;
  apogee: number;
  /** Orbital period in simulation seconds; Infinity for an escape. */
  period: number;
  /** Energy per kilogram: negative means bound, zero or more means gone. */
  specificEnergy: number;
  /** Angular momentum per kilogram — constant, which is Kepler's second law. */
  specificAngularMomentum: number;
  /** 1 when the launch escapes the planet for good. */
  escapes: number;
  /** 1 when the orbit dips into the planet: it would crash. */
  crashes: number;
  /** When the satellite hits the surface, in seconds; Infinity if it never does. */
  impactTime: number;
  /** Semi-latus rectum: the width of the conic at the focus, in planet radii. */
  semiLatusRectum: number;
  /** 1 when the launch point is the closest approach rather than the furthest. */
  launchAtPerigee: number;
};

/** Gravitational parameter for a one-Earth-mass planet, in these units. */
export const MU_EARTH = 1;
/**
 * How far out an escape is followed, in planet radii. A bound orbit has no
 * such limit — it repeats for ever, and so does the run.
 */
export const ESCAPE_REACH = 20;
/** Below this, an orbit is treated as parabolic rather than hyperbolic. */
const PARABOLIC = 1e-8;

function mu(p: OrbitParams): number {
  return MU_EARTH * p.planetMass;
}

/** Launch distance from the centre, in planet radii. */
export function launchRadius(p: OrbitParams): number {
  return 1 + p.launchHeight;
}

/** Speed needed for a circular orbit at that radius: √(μ/r). */
export function circularSpeed(p: OrbitParams): number {
  return Math.sqrt(mu(p) / launchRadius(p));
}

/** Speed needed to escape from that radius: √(2μ/r) — always √2 times the circular speed. */
export function escapeSpeed(p: OrbitParams): number {
  return Math.SQRT2 * circularSpeed(p);
}

/**
 * Which apse the launch point is. Faster than circular speed and it climbs
 * away from here, so the launch is the closest approach; slower and it falls
 * inwards, so the launch is the furthest.
 */
export function launchIsPerigee(p: OrbitParams): boolean {
  return p.speedFactor >= 1;
}

/**
 * The orbit's shape, from the launch. The satellite starts at the right of
 * the planet moving straight up, so the launch point is an apse: the orbit's
 * other apse follows from the energy.
 */
export function orbitOf(p: OrbitParams) {
  const r0 = launchRadius(p);
  const v0 = p.speedFactor * circularSpeed(p);
  const energy = (v0 * v0) / 2 - mu(p) / r0;
  const h = r0 * v0;
  const escapes = energy >= -1e-12;
  const semiMajor = escapes ? Number.POSITIVE_INFINITY : -mu(p) / (2 * energy);
  const eccentricity = Math.sqrt(Math.max(0, 1 + (2 * energy * h * h) / (mu(p) * mu(p))));
  const perigee = escapes ? (h * h) / mu(p) / (1 + eccentricity) : semiMajor * (1 - eccentricity);
  const apogee = escapes ? Number.POSITIVE_INFINITY : semiMajor * (1 + eccentricity);
  const period = escapes ? Number.POSITIVE_INFINITY : 2 * Math.PI * Math.sqrt(semiMajor ** 3 / mu(p));
  // The semi-latus rectum describes every conic, ellipse or escape alike.
  const semiLatusRectum = (h * h) / mu(p);
  return { r0, v0, energy, h, escapes, semiMajor, eccentricity, perigee, apogee, period, semiLatusRectum };
}

/**
 * When the satellite reaches the surface, if its orbit takes it there.
 *
 * A crash needs a perigee inside the planet, which only a launch slower than
 * circular speed gives — so the fall always starts from the apogee and the
 * crossing is found by running Kepler's equation forwards to r = 1.
 */
export function impactTime(p: OrbitParams): number {
  const orbit = orbitOf(p);
  if (orbit.escapes || orbit.perigee >= 1 || orbit.eccentricity <= 0) return Number.POSITIVE_INFINITY;
  const cosNu = (orbit.semiLatusRectum - 1) / orbit.eccentricity;
  if (Math.abs(cosNu) > 1) return Number.POSITIVE_INFINITY;
  // Leaving the apogee the true anomaly runs from π upwards, so take the
  // second of the two crossings of r = 1.
  const trueAnomaly = 2 * Math.PI - Math.acos(cosNu);
  const e = orbit.eccentricity;
  let eccentricAnomaly =
    2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(trueAnomaly / 2), Math.sqrt(1 + e) * Math.cos(trueAnomaly / 2));
  if (eccentricAnomaly < 0) eccentricAnomaly += 2 * Math.PI;
  const meanAnomaly = eccentricAnomaly - e * Math.sin(eccentricAnomaly);
  const launchMeanAnomaly = launchIsPerigee(p) ? 0 : Math.PI;
  return Math.max(0, (meanAnomaly - launchMeanAnomaly) / ((2 * Math.PI) / orbit.period));
}

/** Semi-major axis of an escaping orbit, counted positive. */
function hyperbolicAxis(p: OrbitParams): number {
  return mu(p) / (2 * orbitOf(p).energy);
}

/**
 * Where an escaping satellite is at time t, as a distance and a true anomaly
 * from the perigee it launched at.
 *
 * A hyperbola obeys Kepler's equation with sinh in place of sin, and the
 * knife-edge parabola has Barker's equation, which solves in closed form. So
 * an escape is as exact as an ellipse — no stepping, no drift.
 */
function escapeAt(p: OrbitParams, t: number): { r: number; trueAnomaly: number } {
  const orbit = orbitOf(p);
  const e = orbit.eccentricity;
  const gravity = mu(p);
  if (e <= 1 + PARABOLIC) {
    const q = orbit.semiLatusRectum;
    const meanAnomaly = Math.sqrt(gravity / q ** 3) * t;
    const root = Math.cbrt(3 * meanAnomaly + Math.sqrt(9 * meanAnomaly ** 2 + 1));
    const d = root - 1 / root;
    return { r: (q / 2) * (1 + d * d), trueAnomaly: 2 * Math.atan(d) };
  }
  const a = hyperbolicAxis(p);
  const meanAnomaly = Math.sqrt(gravity / a ** 3) * t;
  // A good first guess matters here: sinh grows fast enough to throw Newton off.
  let h = meanAnomaly > 1 ? Math.log((2 * meanAnomaly) / e + 1.8) : meanAnomaly / (e - 1);
  for (let i = 0; i < 20; i++) {
    const f = e * Math.sinh(h) - h - meanAnomaly;
    const df = e * Math.cosh(h) - 1;
    h -= f / Math.max(1e-12, df);
  }
  return {
    r: a * (e * Math.cosh(h) - 1),
    trueAnomaly: 2 * Math.atan2(Math.sqrt(e + 1) * Math.sinh(h / 2), Math.sqrt(e - 1) * Math.cosh(h / 2)),
  };
}

/**
 * How long the run lasts: until it hits the ground, or until an escape has
 * gone far enough that there is nothing left to watch. A bound orbit has no
 * end — it simply goes round again.
 */
export function runLimit(p: OrbitParams): number {
  const impact = impactTime(p);
  if (Number.isFinite(impact)) return impact;
  const orbit = orbitOf(p);
  if (!orbit.escapes) return Number.POSITIVE_INFINITY;
  const gravity = mu(p);
  if (orbit.eccentricity <= 1 + PARABOLIC) {
    const q = orbit.semiLatusRectum;
    const d = Math.sqrt(Math.max(0, (2 * ESCAPE_REACH) / q - 1));
    return (d + d ** 3 / 3) / (2 * Math.sqrt(gravity / q ** 3));
  }
  const a = hyperbolicAxis(p);
  const h = Math.acosh(Math.max(1, (ESCAPE_REACH / a + 1) / orbit.eccentricity));
  return (orbit.eccentricity * Math.sinh(h) - h) / Math.sqrt(gravity / a ** 3);
}

/**
 * Where the satellite is at time t. Kepler's equation is solved by a few
 * rounds of Newton's method, which converges in a handful of steps.
 */
export function positionAtTime(p: OrbitParams, t: number): { x: number; y: number; r: number; speed: number } {
  const orbit = orbitOf(p);
  const gravity = mu(p);
  const e = orbit.eccentricity;
  if (orbit.escapes) {
    // An escape leaves from its perigee and never turns back, so the conic is
    // solved the same way an ellipse is — with sinh in place of sin.
    const { r, trueAnomaly } = escapeAt(p, t);
    const speed = Math.sqrt(Math.max(0, gravity * (2 / r - (e > 1 + PARABOLIC ? -1 / hyperbolicAxis(p) : 0))));
    return { x: r * Math.cos(trueAnomaly), y: r * Math.sin(trueAnomaly), r, speed };
  }

  const { semiMajor: a, period } = orbit;
  const startAtPerigee = launchIsPerigee(p);
  const meanAnomaly = ((2 * Math.PI) / period) * t + (startAtPerigee ? 0 : Math.PI);
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 8; i++) {
    const f = eccentricAnomaly - e * Math.sin(eccentricAnomaly) - meanAnomaly;
    const df = 1 - e * Math.cos(eccentricAnomaly);
    eccentricAnomaly -= f / Math.max(1e-9, df);
  }
  const r = a * (1 - e * Math.cos(eccentricAnomaly));
  const trueAnomaly =
    2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eccentricAnomaly / 2), Math.sqrt(1 - e) * Math.cos(eccentricAnomaly / 2));
  // Orient the ellipse so the launch point sits on the positive x axis.
  const rotation = startAtPerigee ? 0 : Math.PI;
  const angle = trueAnomaly + rotation;
  const speed = Math.sqrt(Math.max(0, gravity * (2 / r - 1 / a)));
  return { x: r * Math.cos(angle), y: r * Math.sin(angle), r, speed };
}

const OUTPUTS = [
  "t",
  "x",
  "y",
  "r",
  "speed",
  "planetMass",
  "launchHeight",
  "speedFactor",
  "launchRadius",
  "circularSpeed",
  "escapeSpeed",
  "launchSpeed",
  "eccentricity",
  "semiMajor",
  "perigee",
  "apogee",
  "period",
  "specificEnergy",
  "specificAngularMomentum",
  "escapes",
  "crashes",
  "impactTime",
  "semiLatusRectum",
  "launchAtPerigee",
] as const satisfies readonly (keyof OrbitResults)[];

export const orbitModel: SimulationModel<OrbitState, OrbitParams, OrbitResults> = {
  id: "orbits",
  defaultParams: { planetMass: 1, launchHeight: 1, speedFactor: 1 },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  advance(state, dt, params) {
    const limit = runLimit(params);
    const next = state.t + dt;
    // A bound orbit repeats for ever, and the clock repeats with it; only a
    // crash or a departing escape brings the run to a stop.
    if (!Number.isFinite(limit)) return { t: next % orbitOf(params).period };
    return { t: Math.min(limit, next) };
  },

  /** A step moves a twelfth of an orbit, so the shape can be walked round. */
  step(state, params, sign) {
    const orbit = orbitOf(params);
    const stride = Number.isFinite(orbit.period) ? orbit.period / 12 : 1;
    const limit = runLimit(params);
    const next = state.t + sign * stride;
    // Stepping back from the launch goes round the far side, not nowhere.
    if (!Number.isFinite(limit)) return { t: ((next % orbit.period) + orbit.period) % orbit.period };
    return { t: Math.max(0, Math.min(limit, next)) };
  },

  derive(state, params) {
    const orbit = orbitOf(params);
    const limit = runLimit(params);
    // Once it has landed the clock stops with it, so every readout agrees.
    const t = Math.min(state.t, limit);
    const here = positionAtTime(params, t);
    const circular = circularSpeed(params);
    return {
      t,
      x: snapZero(here.x),
      y: snapZero(here.y),
      r: here.r,
      speed: here.speed / circular,
      planetMass: params.planetMass,
      launchHeight: params.launchHeight,
      speedFactor: params.speedFactor,
      launchRadius: orbit.r0,
      circularSpeed: circular,
      escapeSpeed: escapeSpeed(params),
      launchSpeed: orbit.v0,
      eccentricity: orbit.eccentricity,
      semiMajor: orbit.semiMajor,
      perigee: orbit.perigee,
      apogee: orbit.apogee,
      period: orbit.period,
      specificEnergy: snapZero(orbit.energy),
      specificAngularMomentum: orbit.h,
      escapes: orbit.escapes ? 1 : 0,
      // An orbit whose closest approach is inside the planet ends in a crash.
      crashes: !orbit.escapes && orbit.perigee < 1 ? 1 : 0,
      impactTime: impactTime(params),
      semiLatusRectum: orbit.semiLatusRectum,
      launchAtPerigee: launchIsPerigee(params) ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value, params) {
    if (id !== "t") return state;
    const limit = runLimit(params);
    if (!Number.isFinite(limit)) {
      const { period } = orbitOf(params);
      return { t: ((value % period) + period) % period };
    }
    return { t: Math.max(0, Math.min(limit, value)) };
  },
};
