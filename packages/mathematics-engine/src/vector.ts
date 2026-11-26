import type { SimulationModel, StepSign } from "@ise/science-engine";
import { normalizeRadians, radToDeg, shortestAngleDelta, snapZero } from "@ise/units";
import { type Quadrant, type RotationDirection, cosOf, directionSign, referenceAngleOf, sinOf, snappedStep } from "./unit-circle";

/**
 * A 2D vector in polar form (r, θ) with its Cartesian components
 * vₓ = r cos θ and v_y = r sin θ. Either description can be written; the
 * other follows. This is the same projection as the unit circle, scaled by r —
 * and exactly how a launch velocity splits in projectile motion.
 *
 * Three further views share the same arrow A = (r, θ):
 *
 * - Adding: a second vector B (magnitude b, direction θ_B) added tip to tail,
 *   or as the diagonal of the parallelogram on A and B. With φ the angle
 *   between them, |A + B| = √(A² + B² + 2AB cos φ). Subtracting adds −B:
 *   |A − B| = √(A² + B² − 2AB cos φ).
 * - Resolving along chosen axes: axes x′, y′ turned through α. The parts of A
 *   along them are r cos(θ − α) and r sin(θ − α). On a slope at angle α the
 *   weight mg (g = 9.8 m/s², straight down) splits into mg sin α down the
 *   slope and mg cos α into it.
 * - Rates of change: while playing, A is a position vector turning at ω
 *   (r in metres, t in seconds). Its velocity is perpendicular to it, of size
 *   rω, and its acceleration points back to the centre, of size rω². Over a
 *   finite Δt the chord |Δr|/Δt = 2r sin(ωΔt/2)/Δt falls short of rω and
 *   reaches it as Δt → 0.
 */

export type VectorParams = {
  /** Rotation speed while playing, rad/s. */
  omega: number;
  direction: RotationDirection;
  stepSize: number;
  initialMagnitude: number;
  initialTheta: number;
  /** Add B to A, or subtract it (add −B). */
  operation: VectorOperation;
  /** The finite time step of the chord Δr/Δt, s. */
  deltaT: number;
};

export type VectorOperation = "add" | "subtract";

/** g, m/s², as NCERT uses it. */
export const VECTOR_G = 9.8;

/** Ranges of the added state: B's size and direction, the axes' tilt α, and the mass on the slope. */
export const VECTOR_LIMITS = {
  b: [0, 4],
  bTheta: [0, 2 * Math.PI],
  tilt: [0, Math.PI / 2],
  mass: [0.5, 10],
} as const satisfies Record<string, readonly [number, number]>;

export interface VectorState {
  readonly r: number;
  /** Unwrapped angle, rad. */
  readonly theta: number;
  readonly time: number;
  /** The second vector B (adding view): magnitude and direction, rad. Defaults 3 and 90°. */
  readonly b?: number;
  readonly bTheta?: number;
  /** The tilt α of the chosen axes, or of the slope, rad. Default 30°. */
  readonly tilt?: number;
  /** The mass on the slope, kg. Default 2. */
  readonly mass?: number;
}

export type VectorResults = {
  vx: number;
  vy: number;
  magnitude: number;
  theta: number;
  thetaNorm: number;
  thetaDeg: number;
  quadrant: Quadrant;
  referenceAngle: number;
  cosTheta: number;
  sinTheta: number;
  /** vₓ / r and v_y / r — undefined (NaN) for the zero vector. */
  vxOverR: number;
  vyOverR: number;
  sumSquares: number;
  rSquared: number;
  time: number;
} & VectorExtraResults;

/** The adding, resolving and rates-of-change outputs. */
export type VectorExtraResults = {
  /** Adding: B, the angle φ between A and B, and the resultant R = A + B (or A − B). */
  bMagnitude: number;
  bThetaDeg: number;
  bx: number;
  by: number;
  angleBetween: number;
  angleBetweenDeg: number;
  /** 0 add, 1 subtract. */
  operation: number;
  resX: number;
  resY: number;
  resultant: number;
  /** √(A² + B² ± 2AB cos φ) — equal to |R|. */
  resultantFormula: number;
  /** Direction of R from the +x axis, 0 to 360°. */
  resultantDeg: number;
  /** Angle from A round to R, −180° to 180° (positive anticlockwise). */
  resultantFromADeg: number;

  /** Resolving along axes turned through α: the parts of A along x′ and y′. */
  tiltDeg: number;
  alongAxis: number;
  acrossAxis: number;
  /** The weight on a slope at α, and its two parts, N. */
  mass: number;
  weight: number;
  downSlope: number;
  intoSlope: number;

  /** Rates of change of the position vector A turning at ω. */
  speed: number;
  velX: number;
  velY: number;
  accX: number;
  accY: number;
  accMagnitude: number;
  deltaT: number;
  /** |Δr| over the finite Δt, and |Δr|/Δt and |Δv|/Δt. */
  chordLength: number;
  chordRate: number;
  deltaVRate: number;
  /** Angle between r and v (90°), and between r and a (180°); 0 when either is zero. */
  angleRVDeg: number;
  angleRADeg: number;
};

/** Components of a vector given in polar form — the single place they are computed. */
export function componentsOf(r: number, theta: number): { vx: number; vy: number } {
  return { vx: snapZero(r * cosOf(theta), 1e-12), vy: snapZero(r * sinOf(theta), 1e-12) };
}

function fromComponents(state: VectorState, vx: number, vy: number): VectorState {
  const r = Math.hypot(vx, vy);
  // The zero vector has no direction: keep the previous angle so θ doesn't jump.
  if (r < 1e-12) return { ...state, r: 0 };
  return { ...state, r, theta: state.theta + shortestAngleDelta(state.theta, Math.atan2(vy, vx)) };
}

const clampTo = (value: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, value));
const tidy = (value: number) => snapZero(value, 1e-12) || 0;
/** Angle from (ax, ay) round to (bx, by), −π to π; 0 if either is the zero vector. */
const angleFrom = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax, ay) < 1e-12 || Math.hypot(bx, by) < 1e-12 ? 0 : Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
const DEFAULT_B = 3;
const DEFAULT_B_THETA = Math.PI / 2;
const DEFAULT_TILT = Math.PI / 6;
const DEFAULT_MASS = 2;

/** The added state with its defaults filled in and its ranges applied. */
export function vectorExtras(state: VectorState): { b: number; bTheta: number; tilt: number; mass: number } {
  return {
    b: clampTo(state.b ?? DEFAULT_B, VECTOR_LIMITS.b),
    bTheta: clampTo(state.bTheta ?? DEFAULT_B_THETA, VECTOR_LIMITS.bTheta),
    tilt: clampTo(state.tilt ?? DEFAULT_TILT, VECTOR_LIMITS.tilt),
    mass: clampTo(state.mass ?? DEFAULT_MASS, VECTOR_LIMITS.mass),
  };
}

/** B from its components: magnitude held within its range, direction in [0, 2π). Keeps the old direction for the zero vector. */
function bFromComponents(state: VectorState, bx: number, by: number): VectorState {
  const b = Math.hypot(bx, by);
  if (b < 1e-12) return { ...state, b: 0 };
  return { ...state, b: clampTo(b, VECTOR_LIMITS.b), bTheta: normalizeRadians(Math.atan2(by, bx)) };
}

/** Adding, resolving and rates of change, from A = (vₓ, v_y) and the added state. */
function deriveExtras(state: VectorState, params: VectorParams, vx: number, vy: number): VectorExtraResults {
  const r = state.r;
  const { b, bTheta, tilt, mass } = vectorExtras(state);

  // ── Adding: R = A + B, or A + (−B) ──
  const subtract = params.operation === "subtract";
  const sign = subtract ? -1 : 1;
  const B = componentsOf(b, bTheta);
  const resX = tidy(vx + sign * B.vx);
  const resY = tidy(vy + sign * B.vy);
  const resultant = Math.hypot(resX, resY);
  const between = Math.abs(angleFrom(vx, vy, B.vx, B.vy));
  const formula = Math.sqrt(Math.max(0, r * r + b * b + 2 * sign * r * b * Math.cos(between)));

  // ── Resolving along axes turned through α ──
  const along = componentsOf(r, state.theta - tilt);
  const weight = mass * VECTOR_G;

  // ── Rates of change: A turning at ω (signed by the direction of turn) ──
  const w = directionSign(params.direction) * (Number.isFinite(params.omega) ? params.omega : 0);
  const speed = r * Math.abs(w);
  const velX = tidy(-w * vy);
  const velY = tidy(w * vx);
  const accX = tidy(-w * w * vx);
  const accY = tidy(-w * w * vy);
  const dt = Number.isFinite(params.deltaT) && params.deltaT > 0 ? params.deltaT : 0;
  const half = Math.abs(Math.sin((w * dt) / 2));

  return {
    bMagnitude: b,
    bThetaDeg: tidy(radToDeg(bTheta)),
    bx: B.vx,
    by: B.vy,
    angleBetween: tidy(between),
    angleBetweenDeg: tidy(radToDeg(between)),
    operation: subtract ? 1 : 0,
    resX,
    resY,
    resultant,
    resultantFormula: formula,
    resultantDeg: resultant < 1e-12 ? 0 : tidy(radToDeg(normalizeRadians(Math.atan2(resY, resX)))),
    resultantFromADeg: tidy(radToDeg(angleFrom(vx, vy, resX, resY))),
    tiltDeg: tidy(radToDeg(tilt)),
    alongAxis: along.vx || 0,
    acrossAxis: along.vy || 0,
    mass,
    weight,
    downSlope: tidy(weight * Math.sin(tilt)),
    intoSlope: tidy(weight * Math.cos(tilt)),
    speed,
    velX,
    velY,
    accX,
    accY,
    accMagnitude: r * w * w,
    deltaT: dt,
    chordLength: tidy(2 * r * half),
    chordRate: dt > 0 ? tidy((2 * r * half) / dt) : speed,
    deltaVRate: dt > 0 ? tidy((2 * speed * half) / dt) : r * w * w,
    angleRVDeg: tidy(Math.abs(radToDeg(angleFrom(vx, vy, velX, velY)))),
    angleRADeg: tidy(Math.abs(radToDeg(angleFrom(vx, vy, accX, accY)))),
  };
}

const OUTPUTS = [
  "vx",
  "vy",
  "magnitude",
  "theta",
  "thetaNorm",
  "thetaDeg",
  "quadrant",
  "referenceAngle",
  "cosTheta",
  "sinTheta",
  "vxOverR",
  "vyOverR",
  "sumSquares",
  "rSquared",
  "time",
  "bMagnitude",
  "bThetaDeg",
  "bx",
  "by",
  "angleBetween",
  "angleBetweenDeg",
  "operation",
  "resX",
  "resY",
  "resultant",
  "resultantFormula",
  "resultantDeg",
  "resultantFromADeg",
  "tiltDeg",
  "alongAxis",
  "acrossAxis",
  "mass",
  "weight",
  "downSlope",
  "intoSlope",
  "speed",
  "velX",
  "velY",
  "accX",
  "accY",
  "accMagnitude",
  "deltaT",
  "chordLength",
  "chordRate",
  "deltaVRate",
  "angleRVDeg",
  "angleRADeg",
] as const satisfies readonly (keyof VectorResults)[];

export const vectorModel: SimulationModel<VectorState, VectorParams, VectorResults> = {
  id: "vector-2d",
  defaultParams: {
    omega: Math.PI / 6,
    direction: "ccw",
    stepSize: Math.PI / 12,
    initialMagnitude: 4,
    initialTheta: Math.PI / 6,
    operation: "add",
    deltaT: 0.5,
  },
  outputs: OUTPUTS,
  stateVariables: ["magnitude", "theta", "vx", "vy", "b", "bTheta", "bx", "by", "tilt", "mass"],

  initialize(params) {
    return { r: params.initialMagnitude, theta: params.initialTheta, time: 0, b: DEFAULT_B, bTheta: DEFAULT_B_THETA, tilt: DEFAULT_TILT, mass: DEFAULT_MASS };
  },

  advance(state, dt, params) {
    return { ...state, theta: state.theta + directionSign(params.direction) * params.omega * dt, time: state.time + dt };
  },

  step(state, params, sign) {
    const effective = (sign * directionSign(params.direction)) as StepSign;
    return { ...state, theta: snappedStep(state.theta, params.stepSize, effective) };
  },

  derive(state, params) {
    const { r, theta } = state;
    const { vx, vy } = componentsOf(r, theta);
    const cosTheta = cosOf(theta);
    const sinTheta = sinOf(theta);
    const thetaNorm = normalizeRadians(theta);
    const quadrant: Quadrant = r === 0 || vx === 0 || vy === 0 ? 0 : vy > 0 ? (vx > 0 ? 1 : 2) : vx < 0 ? 3 : 4;
    return {
      vx,
      vy,
      magnitude: r,
      theta,
      thetaNorm,
      thetaDeg: radToDeg(thetaNorm),
      quadrant,
      referenceAngle: referenceAngleOf(theta),
      cosTheta,
      sinTheta,
      vxOverR: r > 0 ? vx / r : Number.NaN,
      vyOverR: r > 0 ? vy / r : Number.NaN,
      sumSquares: vx * vx + vy * vy,
      rSquared: r * r,
      time: state.time,
      ...deriveExtras(state, params, vx, vy),
    };
  },

  getVariable(state, id) {
    switch (id) {
      case "magnitude":
        return state.r;
      case "theta":
        return normalizeRadians(state.theta);
      case "vx":
        return componentsOf(state.r, state.theta).vx;
      case "vy":
        return componentsOf(state.r, state.theta).vy;
      case "b":
      case "bTheta":
      case "tilt":
      case "mass":
        return vectorExtras(state)[id];
      case "bx":
      case "by": {
        const { b, bTheta } = vectorExtras(state);
        const B = componentsOf(b, bTheta);
        return id === "bx" ? B.vx : B.vy;
      }
      default:
        return undefined;
    }
  },

  setVariable(state, id, value) {
    const { vx, vy } = componentsOf(state.r, state.theta);
    switch (id) {
      case "magnitude":
        return { ...state, r: Math.max(0, value) };
      case "theta":
        return { ...state, theta: state.theta + shortestAngleDelta(state.theta, value) };
      case "vx":
        return fromComponents(state, value, vy);
      case "vy":
        return fromComponents(state, vx, value);
      case "b":
      case "bTheta":
      case "tilt":
      case "mass":
        return Number.isFinite(value) ? { ...state, ...vectorExtras(state), [id]: clampTo(value, VECTOR_LIMITS[id]) } : state;
      case "bx":
      case "by": {
        if (!Number.isFinite(value)) return state;
        const extras = vectorExtras(state);
        const B = componentsOf(extras.b, extras.bTheta);
        const next = clampTo(value, [-VECTOR_LIMITS.b[1], VECTOR_LIMITS.b[1]]);
        return bFromComponents({ ...state, ...extras }, id === "bx" ? next : B.vx, id === "by" ? next : B.vy);
      }
      default:
        return state;
    }
  },
};
