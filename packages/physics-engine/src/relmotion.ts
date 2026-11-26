import type { SimulationModel } from "@ise/science-engine";

/**
 * Motion seen from more than one place, and motion that turns: the rest of
 * class 11 kinematics after the equations of motion and the plain projectile.
 *
 * Free fall: a ball thrown straight up at u from a height h₀. Taking up as
 * positive, a = −g all the way up, at the top and all the way down; v = u − gt
 * and the displacement is ut − ½gt². It stops rising at u/g, is back at the
 * launch level after 2u/g with the speed it was thrown at, and reaches the
 * ground with speed √(u² + 2gh₀). Acceleration is the slope of the v–t graph.
 * Air resistance is ignored.
 *
 * Two cars on a straight road: B's velocity relative to A is v_BA = v_B − v_A,
 * and the gap from A to B changes at exactly that rate.
 *
 * A changing acceleration: a = kt (a push that grows) or a = −kv (a drag
 * that weakens as the speed falls). The velocity is no longer u + at; it is
 * the area under the a–t graph, worked out here strip by strip, and the
 * position is the area under the v–t graph.
 *
 * A river: a boat that can do v_b in still water, heading at an angle
 * upstream of straight across, in a river flowing at v_r. Straight across
 * takes the least time (d/v_b) but drifts d·v_r/v_b downstream; heading
 * upstream at sin θ = v_r/v_b lands straight opposite. Rain: a person walking
 * at v_p through rain falling at v_rain sees it come at tan θ = v_p/v_rain
 * from the vertical, and tilts the umbrella forward by θ.
 *
 * A circle: a point going round a circle of radius r. At speed v it has
 * ω = v/r, period 2πr/v, and an acceleration v²/r = ω²r pointing to the
 * centre. If its speed also changes at a_t, that tangential part adds at
 * right angles, and the total is √(a_c² + a_t²).
 *
 * An incline: a projectile thrown at θ above the horizontal from the foot of
 * a slope at α. It lands a distance R = 2u² cos θ sin(θ − α)/(g cos² α) up
 * the slope, furthest when θ = 45° + α/2.
 */

export const REL_G = 9.8;
/** Play runs this long, then starts again, s. */
export const REL_LOOP = 12;
/** The crossing is played as a time-lapse lasting this long, s. */
export const REL_RIVER_PLAY = 10;
/** The changing-acceleration scene runs for this long, s. */
export const REL_PUSH_T = 6;

const DEG = Math.PI / 180;

/** Every state variable and the range it is held to (rad for angles). */
export const REL_RANGES = {
  t: [0, REL_LOOP],
  u: [0, 30],
  h0: [0, 50],
  vA: [-30, 30],
  vB: [-30, 30],
  gap: [0, 200],
  k: [0.1, 3],
  v0: [0, 20],
  width: [20, 200],
  vRiver: [0, 5],
  vBoat: [0.5, 8],
  heading: [-75 * DEG, 75 * DEG],
  vRain: [2, 40],
  vWalk: [-15, 15],
  vWind: [-15, 15],
  radius: [0.5, 5],
  omega: [0.2, 4],
  aT: [-2, 2],
  speed: [5, 30],
  launch: [5 * DEG, 85 * DEG],
  slope: [0, 40 * DEG],
} as const satisfies Record<string, readonly [number, number]>;

export type RelStateKey = keyof typeof REL_RANGES;
export type RelMotionState = { readonly [K in RelStateKey]: number };

/** "ramp": a = kt, a push that grows. "drag": a = −kv, a drag that fades as the speed falls. */
export type RelPush = "ramp" | "drag";
export type RelMotionParams = { push: RelPush };

export type RelMotionResults = {
  /** The clock, and the settings echoed for the drawing. */
  t: number;
  fallU: number;
  fallH0: number;
  carVA: number;
  carVB: number;
  carGap: number;
  pushK: number;
  pushV0: number;
  riverWidth: number;
  riverSpeed: number;
  boatSpeed: number;
  rainSpeed: number;
  walkSpeed: number;
  windSpeed: number;
  circR: number;
  incU: number;
  // Free fall
  fallT: number;
  fallY: number;
  fallV: number;
  fallA: number;
  fallSpeed: number;
  fallDisp: number;
  fallDistance: number;
  fallRising: number;
  fallLanded: number;
  tTop: number;
  hMax: number;
  tBack: number;
  tGround: number;
  vGround: number;
  // Two cars
  carT: number;
  xA: number;
  xB: number;
  vBA: number;
  relSpeed: number;
  separation: number;
  meets: number;
  tMeet: number;
  carsMet: number;
  // Changing acceleration
  push: number;
  pushT: number;
  pushA: number;
  pushAbsA: number;
  pushV: number;
  pushX: number;
  pushDv: number;
  pushArea: number;
  stopDistance: number;
  // River
  headingDeg: number;
  acrossSpeed: number;
  alongSpeed: number;
  groundSpeed: number;
  groundAngle: number;
  crossTime: number;
  drift: number;
  straight: number;
  canStraight: number;
  straightHeading: number;
  shortestTime: number;
  driftShortest: number;
  boatTime: number;
  boatAcross: number;
  boatAlong: number;
  boatLanded: number;
  // Rain
  rainRelX: number;
  rainRelY: number;
  rainRelSpeed: number;
  umbrellaAngle: number;
  // Circle
  circT: number;
  circSpeed: number;
  circOmega: number;
  ac: number;
  aTan: number;
  aNet: number;
  aAngle: number;
  period: number;
  phi: number;
  revs: number;
  circStopped: number;
  // Incline
  launchDeg: number;
  slopeDeg: number;
  incValid: number;
  incT: number;
  incR: number;
  incRmax: number;
  incBest: number;
  incAtBest: number;
  incHmax: number;
  incX: number;
  incY: number;
  incLanded: number;
};

const OUTPUTS = [
  "t", "fallU", "fallH0", "carVA", "carVB", "carGap", "pushK", "pushV0", "riverWidth", "riverSpeed", "boatSpeed", "rainSpeed", "walkSpeed", "windSpeed", "circR", "incU",
  "fallT", "fallY", "fallV", "fallA", "fallSpeed", "fallDisp", "fallDistance", "fallRising", "fallLanded", "tTop", "hMax", "tBack", "tGround", "vGround",
  "carT", "xA", "xB", "vBA", "relSpeed", "separation", "meets", "tMeet", "carsMet",
  "push", "pushT", "pushA", "pushAbsA", "pushV", "pushX", "pushDv", "pushArea", "stopDistance",
  "headingDeg", "acrossSpeed", "alongSpeed", "groundSpeed", "groundAngle", "crossTime", "drift", "straight", "canStraight", "straightHeading",
  "shortestTime", "driftShortest", "boatTime", "boatAcross", "boatAlong", "boatLanded",
  "rainRelX", "rainRelY", "rainRelSpeed", "umbrellaAngle",
  "circT", "circSpeed", "circOmega", "ac", "aTan", "aNet", "aAngle", "period", "phi", "revs", "circStopped",
  "launchDeg", "slopeDeg", "incValid", "incT", "incR", "incRmax", "incBest", "incAtBest", "incHmax", "incX", "incY", "incLanded",
] as const satisfies readonly (keyof RelMotionResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const held = (state: RelMotionState, key: RelStateKey) => clamp(Number.isFinite(state[key]) ? state[key] : REL_INITIAL[key], REL_RANGES[key][0], REL_RANGES[key][1]);
/** A straight-across landing within this fraction of the river's width counts as straight across. */
const STRAIGHT = 0.02;
/** Within this of the best angle on the incline counts as the best, degrees. */
const BEST_CLOSE = 0.6;

export const REL_INITIAL: RelMotionState = {
  t: 0,
  u: 20,
  h0: 0,
  vA: 20,
  vB: 15,
  gap: 50,
  k: 1,
  v0: 10,
  width: 100,
  vRiver: 2,
  vBoat: 4,
  heading: 0,
  vRain: 30,
  vWalk: 10,
  vWind: 0,
  radius: 2,
  omega: 1,
  aT: 0,
  speed: 20,
  launch: 60 * DEG,
  slope: 30 * DEG,
};

/** When a ball thrown up at u from h₀ reaches the ground, s (0 if it starts there at rest). */
export function relFallGroundTime(u: number, h0: number, g = REL_G): number {
  return (u + Math.sqrt(u * u + 2 * g * h0)) / g;
}

/** Range up an incline at α of a projectile thrown at θ above the horizontal (0 unless θ > α). */
export function relInclineRange(u: number, theta: number, alpha: number, g = REL_G): number {
  if (theta <= alpha) return 0;
  return (2 * u * u * Math.cos(theta) * Math.sin(theta - alpha)) / (g * Math.cos(alpha) ** 2);
}

/** Time of flight up the incline, s. */
export function relInclineFlightTime(u: number, theta: number, alpha: number, g = REL_G): number {
  if (theta <= alpha) return 0;
  return (2 * u * Math.sin(theta - alpha)) / (g * Math.cos(alpha));
}

/** The acceleration of the changing-acceleration scene at time t, for a = kt or a = −kv. */
export function relPushState(push: RelPush, k: number, v0: number, t: number): { a: number; v: number; x: number } {
  if (push === "drag") {
    const v = v0 * Math.exp(-k * t);
    return { a: -k * v, v, x: (v0 / k) * (1 - Math.exp(-k * t)) };
  }
  return { a: k * t, v: v0 + 0.5 * k * t * t, x: v0 * t + (k * t * t * t) / 6 };
}

/** The area under a–t from 0 to t, added up strip by strip (Simpson's rule). */
export function relAreaUnderA(push: RelPush, k: number, v0: number, t: number, strips = 120): number {
  if (t <= 0) return 0;
  const h = t / strips;
  let sum = 0;
  for (let i = 0; i <= strips; i++) {
    const weight = i === 0 || i === strips ? 1 : i % 2 === 1 ? 4 : 2;
    sum += weight * relPushState(push, k, v0, i * h).a;
  }
  return (sum * h) / 3;
}

const pushOf = (params: RelMotionParams): RelPush => (params.push === "drag" ? "drag" : "ramp");
const finite = (v: number) => (Number.isFinite(v) ? v || 0 : 0);

export const relmotionModel: SimulationModel<RelMotionState, RelMotionParams, RelMotionResults> = {
  id: "relmotion",
  defaultParams: { push: "ramp" },
  outputs: OUTPUTS,
  stateVariables: Object.keys(REL_RANGES),

  initialize() {
    return { ...REL_INITIAL };
  },

  /** Play runs the clock for every scene, and starts again after REL_LOOP seconds. */
  advance(state, dt) {
    const t = held(state, "t") + dt;
    return { ...state, t: t > REL_LOOP ? 0 : t };
  },

  step(state, _params, sign) {
    return { ...state, t: clamp(Math.round(held(state, "t") * 2) / 2 + 0.5 * sign, 0, REL_LOOP) };
  },

  derive(state, params) {
    const g = REL_G;
    const t = held(state, "t");

    // ── Free fall ────────────────────────────────────────────────────────
    const u = held(state, "u");
    const h0 = held(state, "h0");
    const tGround = u === 0 && h0 === 0 ? 0 : relFallGroundTime(u, h0);
    const fallLanded = t >= tGround ? 1 : 0;
    const tf = Math.min(t, tGround);
    const tTop = u / g;
    const vFlight = u - g * tf;
    const fallV = fallLanded ? 0 : vFlight;
    const fallY = fallLanded ? 0 : Math.max(0, h0 + u * tf - 0.5 * g * tf * tf);
    const fallDistance = tf <= tTop ? u * tf - 0.5 * g * tf * tf : (u * u) / (2 * g) + 0.5 * g * (tf - tTop) ** 2;

    // ── Two cars ─────────────────────────────────────────────────────────
    const vA = held(state, "vA");
    const vB = held(state, "vB");
    const gap = held(state, "gap");
    const vBA = vB - vA;
    const meets = gap === 0 || vBA < 0 ? 1 : 0;
    const tMeet = gap === 0 ? 0 : vBA < 0 ? gap / -vBA : 0;

    // ── Changing acceleration ────────────────────────────────────────────
    const push = pushOf(params);
    const k = held(state, "k");
    const v0 = held(state, "v0");
    const tp = Math.min(t, REL_PUSH_T);
    const now = relPushState(push, k, v0, tp);

    // ── River ────────────────────────────────────────────────────────────
    const width = held(state, "width");
    const vR = held(state, "vRiver");
    const vb = held(state, "vBoat");
    const heading = held(state, "heading");
    const across = vb * Math.cos(heading);
    const along = vR - vb * Math.sin(heading);
    const crossTime = width / across;
    const drift = along * crossTime;
    const canStraight = vR / vb <= Math.sin(REL_RANGES.heading[1]) + 1e-12 ? 1 : 0;
    const progress = Math.min(1, t / REL_RIVER_PLAY);
    const boatTime = progress * crossTime;

    // ── Rain ─────────────────────────────────────────────────────────────
    const vRain = held(state, "vRain");
    const vWalk = held(state, "vWalk");
    const vWind = held(state, "vWind");

    // ── Circle ───────────────────────────────────────────────────────────
    const r = held(state, "radius");
    const omega0 = held(state, "omega");
    const aT = held(state, "aT");
    const vc0 = omega0 * r;
    const tStop = aT < 0 ? vc0 / -aT : Number.POSITIVE_INFINITY;
    const moving = t < tStop;
    const circSpeed = moving ? vc0 + aT * t : 0;
    const arc = moving ? vc0 * t + 0.5 * aT * t * t : (vc0 * vc0) / (2 * -aT);
    const aTan = moving ? aT : 0;
    const ac = (circSpeed * circSpeed) / r;
    const phi = arc / r;

    // ── Incline ──────────────────────────────────────────────────────────
    const U = held(state, "speed");
    const theta = held(state, "launch");
    const alpha = held(state, "slope");
    const incValid = theta > alpha + 1e-9 ? 1 : 0;
    const incT = incValid ? relInclineFlightTime(U, theta, alpha) : 0;
    const incR = incValid ? relInclineRange(U, theta, alpha) : 0;
    const incBest = 45 + alpha / DEG / 2;
    const ti = Math.min(t, incT);

    const results: RelMotionResults = {
      t,
      fallU: u,
      fallH0: h0,
      carVA: vA,
      carVB: vB,
      carGap: gap,
      pushK: k,
      pushV0: v0,
      riverWidth: width,
      riverSpeed: vR,
      boatSpeed: vb,
      rainSpeed: vRain,
      walkSpeed: vWalk,
      windSpeed: vWind,
      circR: r,
      incU: U,

      fallT: tf,
      fallY,
      fallV,
      fallA: fallLanded ? 0 : -g,
      fallSpeed: Math.abs(fallV),
      fallDisp: fallY - h0,
      fallDistance: fallLanded ? (u * u) / (2 * g) + (u * u) / (2 * g) + h0 : fallDistance,
      fallRising: fallLanded ? 0 : fallV > 1e-9 ? 1 : fallV < -1e-9 ? -1 : 0,
      fallLanded,
      tTop,
      hMax: h0 + (u * u) / (2 * g),
      tBack: (2 * u) / g,
      tGround,
      vGround: Math.sqrt(u * u + 2 * g * h0),

      carT: t,
      xA: vA * t,
      xB: gap + vB * t,
      vBA,
      relSpeed: Math.abs(vBA),
      separation: gap + vBA * t,
      meets,
      tMeet,
      carsMet: meets && t >= tMeet ? 1 : 0,

      push: push === "drag" ? 1 : 0,
      pushT: tp,
      pushA: now.a,
      pushAbsA: Math.abs(now.a),
      pushV: now.v,
      pushX: now.x,
      pushDv: now.v - v0,
      pushArea: relAreaUnderA(push, k, v0, tp),
      stopDistance: push === "drag" ? v0 / k : 0,

      headingDeg: heading / DEG,
      acrossSpeed: across,
      alongSpeed: along,
      groundSpeed: Math.hypot(across, along),
      groundAngle: Math.atan2(along, across) / DEG,
      crossTime,
      drift,
      straight: Math.abs(drift) <= STRAIGHT * width ? 1 : 0,
      canStraight,
      straightHeading: canStraight ? Math.asin(vR / vb) / DEG : 0,
      shortestTime: width / vb,
      driftShortest: (width * vR) / vb,
      boatTime,
      boatAcross: across * boatTime,
      boatAlong: along * boatTime,
      boatLanded: progress >= 1 ? 1 : 0,

      rainRelX: vWind - vWalk,
      rainRelY: -vRain,
      rainRelSpeed: Math.hypot(vWind - vWalk, vRain),
      umbrellaAngle: Math.atan2(vWalk - vWind, vRain) / DEG,

      circT: t,
      circSpeed,
      circOmega: circSpeed / r,
      ac,
      aTan,
      aNet: Math.hypot(ac, aTan),
      aAngle: ac === 0 && aTan === 0 ? 0 : Math.atan2(Math.abs(aTan), ac) / DEG,
      period: circSpeed > 0 ? (2 * Math.PI * r) / circSpeed : 0,
      phi,
      revs: phi / (2 * Math.PI),
      circStopped: moving ? 0 : 1,

      launchDeg: theta / DEG,
      slopeDeg: alpha / DEG,
      incValid,
      incT,
      incR,
      incRmax: (U * U) / (g * (1 + Math.sin(alpha))),
      incBest,
      incAtBest: incValid && Math.abs(theta / DEG - incBest) <= BEST_CLOSE ? 1 : 0,
      incHmax: incValid ? (U * U * Math.sin(theta - alpha) ** 2) / (2 * g * Math.cos(alpha)) : 0,
      incX: U * Math.cos(theta) * ti,
      incY: incValid ? U * Math.sin(theta) * ti - 0.5 * g * ti * ti : 0,
      incLanded: incValid && t >= incT ? 1 : 0,
    };
    for (const key of OUTPUTS) results[key] = finite(results[key]);
    return results;
  },

  getVariable(state, id) {
    return id in REL_RANGES ? state[id as RelStateKey] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in REL_RANGES) || !Number.isFinite(value)) return state;
    const key = id as RelStateKey;
    return { ...state, [key]: clamp(value, REL_RANGES[key][0], REL_RANGES[key][1]) };
  },
};
