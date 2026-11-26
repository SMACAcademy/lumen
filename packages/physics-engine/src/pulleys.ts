import type { SimulationModel } from "@ise/science-engine";

/**
 * Connected bodies and accelerating frames — the second half of NCERT class 11
 * chapter 4, "Laws of motion".
 *
 * Strings: three rigs, each released from rest when Play is pressed.
 *   • Atwood machine: m₁ and m₂ hang either side of one fixed pulley.
 *       a = (m₁ − m₂)g / (m₁ + m₂), T = 2m₁m₂g / (m₁ + m₂).
 *   • Table: m₁ on a horizontal table (friction coefficient μ), pulled by m₂
 *     hanging over a pulley at the edge. It moves only if m₂g > μm₁g; then
 *       a = (m₂ − μm₁)g / (m₁ + m₂), T = m₁m₂g(1 + μ) / (m₁ + m₂).
 *     μ is used for both static and kinetic friction (one coefficient).
 *   • Movable pulley: m₁ hangs from a string over a fixed pulley; the string
 *     runs down round a movable pulley carrying m₂ and up to the ceiling.
 *     When m₁ falls x the movable pulley rises x/2, so a₁ = 2a₂ and
 *       a₁ = 2(2m₁ − m₂)g / (4m₁ + m₂), T = 3m₁m₂g / (4m₁ + m₂).
 *   Strings and pulleys are massless and the pulleys frictionless.
 *
 * Lift: a person of mass M on a bathroom scale in a lift accelerating at a
 * (upwards positive). N = M(g + a); the scale reads N/g. In free fall,
 * a = −g, N = 0: weightless.
 *
 * Car: a bob hanging in a car that accelerates at a. Seen from the ground the
 * string's tension gives the bob its acceleration; seen from inside, a pseudo
 * force −ma balances it. Either way tan θ = a/g and T = m√(g² + a²).
 *
 * Banking: a 1000 kg car rounds a curve of radius r banked at θ with
 * friction coefficient μ. With friction f down the slope (towards the centre)
 * and normal force N,
 *   N sin θ + f cos θ = mv²/r,  N cos θ − f sin θ = mg,
 * so f = m(v²/r · cos θ − g sin θ) and N = m(g cos θ + v²/r · sin θ). It holds
 * the road while |f| ≤ μN. No friction is needed at v₀ = √(rg tan θ); the
 * limits are v_max = √(rg(μ + tan θ)/(1 − μ tan θ)) and
 * v_min = √(rg(tan θ − μ)/(1 + μ tan θ)) (zero when tan θ ≤ μ).
 *
 * Conical pendulum: a 0.5 kg bob on a string of length L sweeps a horizontal
 * circle with the string at θ to the vertical. r = L sin θ, tan θ = v²/rg,
 * period 2π√(L cos θ / g), tension mg / cos θ.
 */

export const PULLEY_G = 9.8;
/** How far a released block may travel before it reaches the pulley or the floor, m. */
export const PULLEY_TRAVEL = 1.5;
/** The banked-road car and the pendulum bobs. */
export const PULLEY_CAR_MASS = 1000;
export const PULLEY_BOB_MASS = 0.5;
/** Play is never longer than this, s. */
const T_MAX = 600;

export type PulleyRig = "atwood" | "table" | "movable";
export const PULLEY_RIG_ORDER: readonly PulleyRig[] = ["atwood", "table", "movable"];

export type PulleyView = "ground" | "car";
export const PULLEY_VIEW_ORDER: readonly PulleyView[] = ["ground", "car"];

export type PulleysParams = {
  rig: PulleyRig;
  /** The two blocks, kg. */
  m1: number;
  m2: number;
  /** Friction coefficient between block 1 and the table. */
  mu: number;
  /** The person in the lift, kg, and the lift's acceleration, m/s² (upwards positive). */
  personMass: number;
  liftAccel: number;
  /** The car's forward acceleration, m/s², and the frame it is seen from. */
  carAccel: number;
  view: PulleyView;
  /** The banked curve: radius m, bank angle rad, friction coefficient, car speed m/s. */
  radius: number;
  bank: number;
  roadMu: number;
  speed: number;
  /** The conical pendulum: string length m, angle from the vertical rad. */
  stringLength: number;
  coneAngle: number;
};

export interface PulleysState {
  /** Time since release, s. */
  readonly t: number;
}

export type PulleysResults = {
  rig: number;
  m1: number;
  m2: number;
  mu: number;
  /** Signed acceleration of block 1 along its forward direction (Atwood and movable: down; table: towards the pulley). */
  accel: number;
  /** Size of each block's acceleration, m/s². */
  a1: number;
  a2: number;
  tension: number;
  weight1: number;
  weight2: number;
  /** Table only: the normal force on block 1 and the friction acting on it. */
  tableNormal: number;
  friction: number;
  /** 1 once released the blocks move; 0 balanced or held by friction. */
  moves: number;
  /** 1 forwards (m₁ falls, or for the table m₂ falls), −1 backwards, 0 still. */
  direction: number;
  t: number;
  /** How far each block has moved since release, m. */
  travel1: number;
  travel2: number;
  speed1: number;
  speed2: number;
  arrived: number;

  personMass: number;
  liftAccel: number;
  personWeight: number;
  liftNormal: number;
  /** What the scale shows, kg. */
  scaleReading: number;
  /** 1 heavier, 0 normal, −1 lighter, −2 weightless. */
  feel: number;

  carAccel: number;
  inCarFrame: number;
  /** The string's tilt from the vertical, rad. */
  tilt: number;
  pseudoForce: number;
  bobTension: number;
  bobWeight: number;

  radius: number;
  bank: number;
  roadMu: number;
  speed: number;
  idealSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  /** m v² / r, N. */
  centripetal: number;
  /** Friction the road must give, N: positive down the slope (towards the centre), negative up it. */
  frictionNeeded: number;
  roadNormal: number;
  muNeeded: number;
  safe: number;
  /** 1 skids outwards (too fast), −1 slides inwards (too slow), 0 holds the road. */
  skid: number;

  stringLength: number;
  coneAngle: number;
  coneRadius: number;
  bobSpeed: number;
  conePeriod: number;
  coneTension: number;
  /** Where the bob is round its circle, rad. */
  phase: number;
};

const OUTPUTS = [
  "rig", "m1", "m2", "mu", "accel", "a1", "a2", "tension", "weight1", "weight2", "tableNormal", "friction",
  "moves", "direction", "t", "travel1", "travel2", "speed1", "speed2", "arrived",
  "personMass", "liftAccel", "personWeight", "liftNormal", "scaleReading", "feel",
  "carAccel", "inCarFrame", "tilt", "pseudoForce", "bobTension", "bobWeight",
  "radius", "bank", "roadMu", "speed", "idealSpeed", "maxSpeed", "minSpeed", "centripetal", "frictionNeeded", "roadNormal", "muNeeded", "safe", "skid",
  "stringLength", "coneAngle", "coneRadius", "bobSpeed", "conePeriod", "coneTension", "phase",
] as const satisfies readonly (keyof PulleysResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const z = (v: number) => v || 0;
const deg = (d: number) => (d * Math.PI) / 180;

/** The control ranges, so derive never sees a value the sliders could not give. */
export const PULLEY_LIMITS = {
  mass: [0.5, 10],
  mu: [0, 1],
  personMass: [20, 120],
  liftAccel: [-PULLEY_G, 5],
  carAccel: [0, 10],
  radius: [10, 200],
  bank: [0, deg(40)],
  roadMu: [0, 1],
  speed: [0, 50],
  stringLength: [0.2, 2],
  coneAngle: [deg(5), deg(80)],
} as const;

export interface PulleyRigMotion {
  /** Signed acceleration of block 1 (forwards positive) and block 2's along its own forward direction. */
  accel: number;
  accel2: number;
  tension: number;
  friction: number;
  tableNormal: number;
}

/** Acceleration and tension of a rig, from the masses alone. */
export function pulleyRigMotion(rig: PulleyRig, m1: number, m2: number, mu = 0, g = PULLEY_G): PulleyRigMotion {
  if (rig === "table") {
    const normal = m1 * g;
    const pull = m2 * g;
    if (pull <= mu * normal + 1e-9) return { accel: 0, accel2: 0, tension: pull, friction: pull, tableNormal: normal };
    const a = ((m2 - mu * m1) * g) / (m1 + m2);
    return { accel: a, accel2: a, tension: (m1 * m2 * g * (1 + mu)) / (m1 + m2), friction: mu * normal, tableNormal: normal };
  }
  if (rig === "movable") {
    const a1 = (2 * (2 * m1 - m2) * g) / (4 * m1 + m2);
    return { accel: z(a1), accel2: z(a1 / 2), tension: (3 * m1 * m2 * g) / (4 * m1 + m2), friction: 0, tableNormal: 0 };
  }
  const a = ((m1 - m2) * g) / (m1 + m2);
  return { accel: z(a), accel2: z(a), tension: (2 * m1 * m2 * g) / (m1 + m2), friction: 0, tableNormal: 0 };
}

/** The normal force on a person of mass m in a lift accelerating at a (upwards positive). */
export function liftNormalForce(m: number, a: number, g = PULLEY_G): number {
  return Math.max(0, m * (g + a));
}

/** Friction and normal force a car of mass m needs on a banked curve. */
export function bankedRoadForces(m: number, v: number, r: number, theta: number, g = PULLEY_G): { friction: number; normal: number } {
  const c = (v * v) / r;
  return { friction: z(m * (c * Math.cos(theta) - g * Math.sin(theta))), normal: m * (g * Math.cos(theta) + c * Math.sin(theta)) };
}

/** The speed at which a banked curve needs no friction at all: √(rg tan θ). */
export function bankIdealSpeed(r: number, theta: number, g = PULLEY_G): number {
  return Math.sqrt(r * g * Math.tan(theta));
}

/** The fastest a car can take the curve without skidding outwards. Infinite when μ tan θ ≥ 1. */
export function bankMaxSpeed(r: number, theta: number, mu: number, g = PULLEY_G): number {
  const t = Math.tan(theta);
  const below = 1 - mu * t;
  return below <= 0 ? Infinity : Math.sqrt((r * g * (mu + t)) / below);
}

/** The slowest a car can take the curve without sliding down it. Zero when tan θ ≤ μ. */
export function bankMinSpeed(r: number, theta: number, mu: number, g = PULLEY_G): number {
  const t = Math.tan(theta);
  return t <= mu ? 0 : Math.sqrt((r * g * (t - mu)) / (1 + mu * t));
}

/** Period of a conical pendulum: 2π√(L cos θ / g). */
export function conicalPeriod(length: number, theta: number, g = PULLEY_G): number {
  return 2 * Math.PI * Math.sqrt((length * Math.cos(theta)) / g);
}

const rigOf = (p: PulleysParams): PulleyRig => (PULLEY_RIG_ORDER.includes(p.rig) ? p.rig : "atwood");

export const pulleysModel: SimulationModel<PulleysState, PulleysParams, PulleysResults> = {
  id: "pulleys",
  defaultParams: {
    rig: "atwood",
    m1: 3,
    m2: 2,
    mu: 0,
    personMass: 50,
    liftAccel: 0,
    carAccel: 3,
    view: "ground",
    radius: 50,
    bank: deg(15),
    roadMu: 0.3,
    speed: 15,
    stringLength: 1,
    coneAngle: deg(30),
  },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Play releases the blocks (they stop when they reach the pulley or floor) and swings the conical pendulum round. */
  advance(state, dt) {
    return { t: clamp(state.t + dt, 0, T_MAX) };
  },

  step(state, _params, sign) {
    return { t: clamp(Math.round(state.t * 10) / 10 + 0.1 * sign, 0, T_MAX) };
  },

  derive(state, params) {
    const g = PULLEY_G;
    const L = PULLEY_LIMITS;
    const rig = rigOf(params);
    const m1 = clamp(params.m1, L.mass[0], L.mass[1]);
    const m2 = clamp(params.m2, L.mass[0], L.mass[1]);
    const mu = clamp(params.mu, L.mu[0], L.mu[1]);
    const motion = pulleyRigMotion(rig, m1, m2, rig === "table" ? mu : 0, g);
    const t = clamp(state.t, 0, T_MAX);
    const a1 = Math.abs(motion.accel);
    const a2 = Math.abs(motion.accel2);
    const moves = a1 > 1e-9 ? 1 : 0;
    // Block 1 runs until it has gone the full travel (block 2 only half as far on the movable pulley).
    const tEnd = moves ? Math.sqrt((2 * PULLEY_TRAVEL) / a1) : Infinity;
    const running = Math.min(t, tEnd);
    const travel1 = 0.5 * a1 * running * running;
    const arrived = moves && t >= tEnd ? 1 : 0;

    const personMass = clamp(params.personMass, L.personMass[0], L.personMass[1]);
    const liftAccel = z(clamp(params.liftAccel, L.liftAccel[0], L.liftAccel[1]));
    const liftNormal = liftNormalForce(personMass, liftAccel, g);
    const weightless = liftNormal < 1e-6;
    const feel = weightless ? -2 : liftAccel > 1e-9 ? 1 : liftAccel < -1e-9 ? -1 : 0;

    const carAccel = clamp(params.carAccel, L.carAccel[0], L.carAccel[1]);

    const radius = clamp(params.radius, L.radius[0], L.radius[1]);
    const bank = clamp(params.bank, L.bank[0], L.bank[1]);
    const roadMu = clamp(params.roadMu, L.roadMu[0], L.roadMu[1]);
    const speed = clamp(params.speed, L.speed[0], L.speed[1]);
    const road = bankedRoadForces(PULLEY_CAR_MASS, speed, radius, bank, g);
    const grip = roadMu * road.normal;
    const safe = Math.abs(road.friction) <= grip * (1 + 1e-9) + 1e-9 ? 1 : 0;

    const stringLength = clamp(params.stringLength, L.stringLength[0], L.stringLength[1]);
    const coneAngle = clamp(params.coneAngle, L.coneAngle[0], L.coneAngle[1]);
    const coneRadius = stringLength * Math.sin(coneAngle);
    const conePeriod = conicalPeriod(stringLength, coneAngle, g);

    return {
      rig: PULLEY_RIG_ORDER.indexOf(rig),
      m1,
      m2,
      mu,
      accel: motion.accel,
      a1,
      a2,
      tension: motion.tension,
      weight1: m1 * g,
      weight2: m2 * g,
      tableNormal: motion.tableNormal,
      friction: motion.friction,
      moves,
      direction: moves ? Math.sign(motion.accel) : 0,
      t,
      travel1,
      travel2: rig === "movable" ? travel1 / 2 : travel1,
      speed1: arrived ? 0 : a1 * running,
      speed2: arrived ? 0 : a2 * running,
      arrived,

      personMass,
      liftAccel,
      personWeight: personMass * g,
      liftNormal,
      scaleReading: liftNormal / g,
      feel,

      carAccel,
      inCarFrame: params.view === "car" ? 1 : 0,
      tilt: Math.atan2(carAccel, g),
      pseudoForce: PULLEY_BOB_MASS * carAccel,
      bobTension: PULLEY_BOB_MASS * Math.hypot(g, carAccel),
      bobWeight: PULLEY_BOB_MASS * g,

      radius,
      bank,
      roadMu,
      speed,
      idealSpeed: bankIdealSpeed(radius, bank, g),
      // Within the control ranges μ tan θ ≤ tan 40° < 1, so the limit is always finite.
      maxSpeed: Math.min(1e6, bankMaxSpeed(radius, bank, roadMu, g)),
      minSpeed: bankMinSpeed(radius, bank, roadMu, g),
      centripetal: (PULLEY_CAR_MASS * speed * speed) / radius,
      frictionNeeded: road.friction,
      roadNormal: road.normal,
      muNeeded: Math.abs(road.friction) / road.normal,
      safe,
      skid: safe ? 0 : road.friction > 0 ? 1 : -1,

      stringLength,
      coneAngle,
      coneRadius,
      bobSpeed: Math.sqrt(coneRadius * g * Math.tan(coneAngle)),
      conePeriod,
      coneTension: (PULLEY_BOB_MASS * g) / Math.cos(coneAngle),
      phase: ((2 * Math.PI * t) / conePeriod) % (2 * Math.PI),
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    return id === "t" ? { t: clamp(value, 0, T_MAX) } : state;
  },
};
