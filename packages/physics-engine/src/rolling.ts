import type { SimulationModel } from "@ise/science-engine";

/**
 * Rigid bodies that roll, and rigid bodies that stay put (NCERT class 11,
 * "Systems of Particles and Rotational Motion").
 *
 * Axes: the moment of inertia of a rod, ring, disc or sphere about an axis
 * through its centre, and about a parallel axis a distance d away,
 * I = I_cm + Md². For a flat body lying in the x–y plane, the axis
 * perpendicular to the plane has I_z = I_x + I_y.
 *
 * Rolling: a ring, a hollow sphere, a disc and a solid sphere let go from rest
 * on the same incline. Rolling without slipping, a = g sin θ / (1 + k²/R²) and
 * the speed at the bottom is v = √(2gh / (1 + k²/R²)): the more of the mass
 * sits far from the centre, the more of the energy goes into spin and the
 * slower the body. Static friction f = mg sin θ · (k²/R²)/(1 + k²/R²) does
 * the spinning; if μ is less than tan θ · k²/(k² + R²) it cannot, and the
 * body slips: then a = g(sin θ − μ cos θ) and friction μmg cos θ spins it.
 *
 * Combined motion: a wheel moving at v with spin ω. A point on the rim moves
 * at v_cm + ω × r, so the top goes at v + ωR and the contact point at v − ωR.
 * Rolling is when the contact point is at rest, v = ωR. On rough level
 * ground, friction turns a sliding or spinning wheel into a rolling one; it
 * keeps the angular momentum about the contact point, so it ends at
 * v = (v₀ + (k²/R²)·Rω₀) / (1 + k²/R²).
 *
 * Equilibrium: a see-saw on its centre (the principle of moments), a uniform
 * ladder against a smooth wall, and a couple. ΣF = 0 and Στ = 0.
 *
 * g = 9.8 m/s² throughout.
 */

export const ROLL_G = 9.8;

// ── Moments of inertia ────────────────────────────────────────────────────────

export type RollBodyShape = "rod" | "ring" | "disc" | "sphere";
export const ROLL_BODY_ORDER: readonly RollBodyShape[] = ["rod", "ring", "disc", "sphere"];
export const ROLL_BODY_LABELS: Record<RollBodyShape, string> = { rod: "Rod", ring: "Ring", disc: "Disc", sphere: "Solid sphere" };

/** "z": through the centre, perpendicular to the plane of the body. "y": through the centre, in its plane. */
export type RollAxis = "z" | "y";
export const ROLL_AXIS_ORDER: readonly RollAxis[] = ["z", "y"];

/**
 * Moments of inertia about the three axes through the centre. The rod (length
 * `size`) lies along x; the ring and disc (radius `size`) lie in the x–y
 * plane. A sphere has the same value about every diameter.
 */
export function rollBodyInertia(shape: RollBodyShape, mass: number, size: number): { ix: number; iy: number; iz: number } {
  const mr2 = mass * size * size;
  switch (shape) {
    case "rod":
      return { ix: 0, iy: mr2 / 12, iz: mr2 / 12 };
    case "ring":
      return { ix: mr2 / 2, iy: mr2 / 2, iz: mr2 };
    case "disc":
      return { ix: mr2 / 4, iy: mr2 / 4, iz: mr2 / 2 };
    case "sphere":
      return { ix: 0.4 * mr2, iy: 0.4 * mr2, iz: 0.4 * mr2 };
  }
}

/** How far the edge of the body is from its centre: the radius, or half the rod. */
export function rollBodyHalf(shape: RollBodyShape, size: number): number {
  return shape === "rod" ? size / 2 : size;
}

// ── Rollers ───────────────────────────────────────────────────────────────────

export type RollerId = "ring" | "hollow" | "disc" | "solid";
/** Slowest to fastest when they all roll. */
export const ROLLER_ORDER: readonly RollerId[] = ["ring", "hollow", "disc", "solid"];
/** k²/R² for each roller: a ring (or hollow cylinder), a hollow sphere, a disc (or solid cylinder), a solid sphere. */
export const ROLLERS: Record<RollerId, { label: string; beta: number }> = {
  ring: { label: "Ring", beta: 1 },
  hollow: { label: "Hollow sphere", beta: 2 / 3 },
  disc: { label: "Disc", beta: 1 / 2 },
  solid: { label: "Solid sphere", beta: 2 / 5 },
};

export interface RollDown {
  /** Acceleration of the centre down the slope, m/s². */
  accel: number;
  /** Angular acceleration × radius, m/s²: equal to accel when it rolls. */
  spinAccel: number;
  /** 1 rolling without slipping, 0 slipping. */
  rolls: boolean;
  /** The least μ that lets it roll. */
  muNeeded: number;
  /** Friction on the body per kilogram, N/kg. */
  frictionPerKg: number;
}

/** A body with k²/R² = beta let go on an incline of angle theta (rad) with friction coefficient mu. */
export function rollDownIncline(beta: number, theta: number, mu: number): RollDown {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const muNeeded = (Math.tan(theta) * beta) / (1 + beta);
  if (mu >= muNeeded - 1e-12) {
    const accel = (ROLL_G * sin) / (1 + beta);
    return { accel, spinAccel: accel, rolls: true, muNeeded, frictionPerKg: (ROLL_G * sin * beta) / (1 + beta) };
  }
  return { accel: ROLL_G * (sin - mu * cos), spinAccel: (mu * ROLL_G * cos) / beta, rolls: false, muNeeded, frictionPerKg: mu * ROLL_G * cos };
}

/** Time for a body to run the whole slope from rest, s. */
export function rollTimeToBottom(beta: number, theta: number, mu: number, height: number): number {
  const length = height / Math.sin(theta);
  return Math.sqrt((2 * length) / rollDownIncline(beta, theta, mu).accel);
}

// ── Equilibrium ───────────────────────────────────────────────────────────────

export type RollScene = "seesaw" | "ladder" | "couple";
export const ROLL_SCENE_ORDER: readonly RollScene[] = ["seesaw", "ladder", "couple"];
/** The see-saw: a uniform 4 m plank of 10 kg on a pivot at its middle. */
export const ROLL_BEAM_HALF = 2;
export const ROLL_BEAM_MASS = 10;
/** The ladder: 3 m long, 20 kg, uniform, against a smooth wall (NCERT's example). */
export const ROLL_LADDER_LENGTH = 3;
export const ROLL_LADDER_MASS = 20;
/** Torques smaller than this, N m, count as balanced. */
export const ROLL_BALANCE_TOLERANCE = 0.1;

// ── The model ─────────────────────────────────────────────────────────────────

export type RollingParams = {
  shape: RollBodyShape;
  axis: RollAxis;
  /** Mass of the body, the roller or the wheel, kg. */
  mass: number;
  /** Radius of the body (the rod's length), the roller or the wheel, m. */
  radius: number;
  roller: RollerId;
  /** Slope of the incline, rad. */
  angle: number;
  /** Height the roller starts from, m. */
  height: number;
  /** Coefficient of friction: incline, ground, or floor under the ladder. */
  mu: number;
  scene: RollScene;
  /** Loads on the see-saw (kg) and their distances from the pivot (m); in a couple, where the two forces act. */
  m1: number;
  x1: number;
  m2: number;
  x2: number;
  /** Distance of the ladder's foot from the wall, m. */
  foot: number;
  /** Each force of the couple, N. */
  force: number;
};

export interface RollingState {
  /** How far the parallel axis is from the centre, m. */
  readonly offset: number;
  /** Time since the rollers were let go, s. */
  readonly t: number;
  /** The wheel on level ground: speed of its centre (m/s), spin (rad/s, clockwise = forwards), the marked point's angle from the top (rad), and where it is (m). */
  readonly vcm: number;
  readonly omega: number;
  readonly phi: number;
  readonly x: number;
}

export type RollingResults = {
  /** The inputs, as used (clamped to their controls). */
  mass: number;
  radius: number;
  half: number;
  angle: number;
  height: number;
  mu: number;
  m1: number;
  x1: number;
  m2: number;
  x2: number;
  foot: number;
  force: number;
  shape: number;
  axis: number;
  ix: number;
  iy: number;
  iz: number;
  planar: number;
  perpSum: number;
  iCentre: number;
  offset: number;
  shift: number;
  iShifted: number;
  gyration: number;
  atEdge: number;
  inertiaRatio: number;

  roller: number;
  beta: number;
  slope: number;
  accel: number;
  muNeeded: number;
  slips: number;
  friction: number;
  vBottom: number;
  tBottom: number;
  t: number;
  s: number;
  v: number;
  spin: number;
  contactSpeed: number;
  keTrans: number;
  keRot: number;
  keTotal: number;
  rotPercent: number;
  potential: number;
  heat: number;
  finished: number;
  raceOver: number;
  first: number;

  vcm: number;
  omega: number;
  wheelSlip: number;
  topSpeed: number;
  wheelRolls: number;
  phi: number;
  pointVx: number;
  pointVy: number;
  pointSpeed: number;
  contactDistance: number;
  settleSpeed: number;
  wheelX: number;

  scene: number;
  torqueLeft: number;
  torqueRight: number;
  netTorque: number;
  tilt: number;
  pivotForce: number;
  cgX: number;
  ladderHeight: number;
  wallForce: number;
  floorNormal: number;
  floorFriction: number;
  ladderMuNeeded: number;
  floorForce: number;
  stands: number;
  coupleTorque: number;
  netForce: number;
  balanced: number;
};

const OUTPUTS = [
  "mass", "radius", "half", "angle", "height", "mu", "m1", "x1", "m2", "x2", "foot", "force",
  "shape", "axis", "ix", "iy", "iz", "planar", "perpSum", "iCentre", "offset", "shift", "iShifted", "gyration", "atEdge", "inertiaRatio",
  "roller", "beta", "slope", "accel", "muNeeded", "slips", "friction", "vBottom", "tBottom", "t", "s", "v", "spin", "contactSpeed",
  "keTrans", "keRot", "keTotal", "rotPercent", "potential", "heat", "finished", "raceOver", "first",
  "vcm", "omega", "wheelSlip", "topSpeed", "wheelRolls", "phi", "pointVx", "pointVy", "pointSpeed", "contactDistance", "settleSpeed", "wheelX",
  "scene", "torqueLeft", "torqueRight", "netTorque", "tilt", "pivotForce", "cgX", "ladderHeight", "wallForce", "floorNormal", "floorFriction",
  "ladderMuNeeded", "floorForce", "stands", "coupleTorque", "netForce", "balanced",
] as const satisfies readonly (keyof RollingResults)[];

const DEG = Math.PI / 180;
const TWO_PI = 2 * Math.PI;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const zero = (v: number) => v || 0;

/** The controls' ranges; derive and setVariable keep everything inside them. */
export const ROLL_LIMITS = {
  mass: [0.5, 10],
  radius: [0.1, 1],
  offset: [0, 1],
  angle: [5 * DEG, 60 * DEG],
  height: [0.2, 3],
  mu: [0, 1],
  t: [0, 15],
  vcm: [0, 6],
  omega: [-20, 30],
  phi: [0, TWO_PI],
  m: [1, 60],
  arm: [0, ROLL_BEAM_HALF],
  foot: [0.5, 2.5],
  force: [1, 100],
} as const;
const L = ROLL_LIMITS;
/** Below this, the contact point counts as at rest. */
const ROLLING_SLIP = 0.05;
/** Where the wheel's position wraps round, m. */
const WHEEL_TRACK = 1000;

const shapeOf = (p: RollingParams): RollBodyShape => (ROLL_BODY_ORDER.includes(p.shape) ? p.shape : "disc");
const axisOf = (p: RollingParams): RollAxis => (ROLL_AXIS_ORDER.includes(p.axis) ? p.axis : "z");
const rollerOf = (p: RollingParams): RollerId => (ROLLER_ORDER.includes(p.roller) ? p.roller : "disc");
const sceneOf = (p: RollingParams): RollScene => (ROLL_SCENE_ORDER.includes(p.scene) ? p.scene : "seesaw");
const range = (v: number, [lo, hi]: readonly [number, number]) => clamp(v, lo, hi);

function inputs(p: RollingParams) {
  return {
    mass: range(p.mass, L.mass),
    radius: range(p.radius, L.radius),
    angle: range(p.angle, L.angle),
    height: range(p.height, L.height),
    mu: range(p.mu, L.mu),
  };
}

/** When the last roller reaches the bottom, s. */
function raceEnd(p: RollingParams): number {
  const { angle, height, mu } = inputs(p);
  return Math.max(...ROLLER_ORDER.map((id) => rollTimeToBottom(ROLLERS[id].beta, angle, mu, height)));
}

/** The wheel on rough level ground for dt: friction drives the contact point's slip to zero, then it rolls freely. */
function moveWheel(state: RollingState, dt: number, p: RollingParams): RollingState {
  const { radius: R, mu } = inputs(p);
  const beta = ROLLERS[rollerOf(p)].beta;
  let v = clamp(state.vcm, -100, 100);
  let w = clamp(state.omega, -1000, 1000);
  let x = state.x;
  let phi = state.phi;
  let left = dt;
  const slip = v - w * R;
  if (Math.abs(slip) > 1e-9 && mu > 0) {
    const sign = Math.sign(slip);
    const dv = -sign * mu * ROLL_G;
    const dw = (sign * mu * ROLL_G) / (beta * R);
    const tau = Math.min(dt, Math.abs(slip) / (mu * ROLL_G * (1 + 1 / beta)));
    x += v * tau + 0.5 * dv * tau * tau;
    phi += w * tau + 0.5 * dw * tau * tau;
    if (tau < dt) {
      // The slip has just reached zero: from here it rolls, keeping its angular momentum about the contact point.
      v = (v + beta * R * w) / (1 + beta);
      w = v / R;
    } else {
      v += dv * tau;
      w += dw * tau;
    }
    left = dt - tau;
  }
  x += v * left;
  phi += w * left;
  return {
    ...state,
    vcm: v,
    omega: w,
    x: ((x % WHEEL_TRACK) + WHEEL_TRACK) % WHEEL_TRACK,
    phi: ((phi % TWO_PI) + TWO_PI) % TWO_PI,
  };
}

export const rollingModel: SimulationModel<RollingState, RollingParams, RollingResults> = {
  id: "rolling",
  defaultParams: {
    shape: "disc",
    axis: "z",
    mass: 2,
    radius: 0.5,
    roller: "disc",
    angle: 30 * DEG,
    height: 1,
    mu: 0.4,
    scene: "seesaw",
    m1: 30,
    x1: 2,
    m2: 40,
    x2: 1,
    foot: 1,
    force: 20,
  },
  outputs: OUTPUTS,
  stateVariables: ["offset", "t", "vcm", "omega", "phi", "x"],

  initialize() {
    return { offset: 0, t: 0, vcm: 2, omega: 4, phi: 0, x: 0 };
  },

  /** Play lets the rollers go (and starts the race again a second after the last one is down), and runs the wheel on. */
  advance(state, dt, params) {
    const end = Math.min(raceEnd(params) + 1, L.t[1]);
    const t = clamp(state.t, L.t[0], L.t[1]) + dt;
    return { ...moveWheel(state, dt, params), t: t > end ? 0 : t };
  },

  step(state, params, sign) {
    if (sign > 0) return rollingModel.advance(state, 0.1, params);
    return { ...state, t: clamp(Math.round(state.t * 10) / 10 - 0.1, L.t[0], L.t[1]) };
  },

  derive(state, params) {
    const { mass: M, radius: R, angle, height, mu } = inputs(params);

    // Axes.
    const shapeId = shapeOf(params);
    const axisId = axisOf(params);
    const { ix, iy, iz } = rollBodyInertia(shapeId, M, R);
    const iCentre = axisId === "z" ? iz : iy;
    const d = range(state.offset, L.offset);
    const shift = M * d * d;
    const iShifted = iCentre + shift;

    // Rolling down the incline.
    const rollerId = rollerOf(params);
    const beta = ROLLERS[rollerId].beta;
    const down = rollDownIncline(beta, angle, mu);
    const slope = height / Math.sin(angle);
    const tBottom = Math.sqrt((2 * slope) / down.accel);
    const t = range(state.t, L.t);
    const running = Math.min(t, tBottom);
    const s = t >= tBottom ? slope : 0.5 * down.accel * running * running;
    const v = down.accel * running;
    const spinSpeed = down.spinAccel * running;
    const keTrans = 0.5 * M * v * v;
    const keRot = 0.5 * M * beta * spinSpeed * spinSpeed;
    const share = down.spinAccel / down.accel;
    const fallen = (s / slope) * height;
    const times = ROLLER_ORDER.map((id) => rollTimeToBottom(ROLLERS[id].beta, angle, mu, height));
    const first = times.indexOf(Math.min(...times));
    const lost = M * ROLL_G * fallen - keTrans - keRot;

    // The wheel on level ground.
    const wheelBeta = beta;
    const vcm = clamp(state.vcm, -100, 100);
    const omega = clamp(state.omega, -1000, 1000);
    const phi = ((range(state.phi, [-1e6, 1e6]) % TWO_PI) + TWO_PI) % TWO_PI;
    const wheelSlip = vcm - omega * R;
    const pointVx = vcm + omega * R * Math.cos(phi);
    const pointVy = -omega * R * Math.sin(phi);

    // Equilibrium.
    const sceneId = sceneOf(params);
    const m1 = range(params.m1, L.m);
    const m2 = range(params.m2, L.m);
    const x1 = range(params.x1, L.arm);
    const x2 = range(params.x2, L.arm);
    const force = range(params.force, L.force);
    const torqueLeft = m1 * ROLL_G * x1;
    const torqueRight = m2 * ROLL_G * x2;
    const seesawTorque = torqueLeft - torqueRight;
    const foot = range(params.foot, L.foot);
    const ladderHeight = Math.sqrt(ROLL_LADDER_LENGTH ** 2 - foot ** 2);
    const weight = ROLL_LADDER_MASS * ROLL_G;
    const wallForce = (weight * foot) / (2 * ladderHeight);
    const ladderMuNeeded = foot / (2 * ladderHeight);
    const stands = mu >= ladderMuNeeded - 1e-12;
    const floorFriction = stands ? wallForce : mu * weight;
    const coupleTorque = force * (x1 + x2);
    const netTorque = sceneId === "seesaw" ? seesawTorque : sceneId === "couple" ? -coupleTorque : 0;
    const netForce = sceneId === "ladder" ? wallForce - floorFriction : 0;

    return {
      mass: M,
      radius: R,
      half: rollBodyHalf(shapeId, R),
      angle,
      height,
      mu,
      m1,
      x1,
      m2,
      x2,
      foot,
      force,
      shape: ROLL_BODY_ORDER.indexOf(shapeId),
      axis: ROLL_AXIS_ORDER.indexOf(axisId),
      ix,
      iy,
      iz,
      planar: shapeId === "sphere" ? 0 : 1,
      perpSum: ix + iy,
      iCentre,
      offset: d,
      shift,
      iShifted,
      gyration: Math.sqrt(iShifted / M),
      atEdge: Math.abs(d - rollBodyHalf(shapeId, R)) <= 0.01 ? 1 : 0,
      inertiaRatio: iShifted / iCentre,

      roller: ROLLER_ORDER.indexOf(rollerId),
      beta,
      slope,
      accel: down.accel,
      muNeeded: down.muNeeded,
      slips: down.rolls ? 0 : 1,
      friction: M * down.frictionPerKg,
      vBottom: Math.sqrt(2 * down.accel * slope),
      tBottom,
      t,
      s,
      v,
      spin: spinSpeed / R,
      contactSpeed: zero(v - spinSpeed),
      keTrans,
      keRot,
      keTotal: keTrans + keRot,
      rotPercent: (100 * beta * share * share) / (1 + beta * share * share),
      potential: M * ROLL_G * height,
      heat: lost > 1e-9 ? lost : 0,
      finished: t >= tBottom ? 1 : 0,
      raceOver: t >= Math.max(...times) ? 1 : 0,
      first,

      vcm,
      omega,
      wheelSlip: zero(wheelSlip),
      topSpeed: vcm + omega * R,
      wheelRolls: Math.abs(wheelSlip) < ROLLING_SLIP ? 1 : 0,
      phi,
      pointVx: zero(pointVx),
      pointVy: zero(pointVy),
      pointSpeed: Math.hypot(pointVx, pointVy),
      contactDistance: R * Math.sqrt(Math.max(0, 2 + 2 * Math.cos(phi))),
      settleSpeed: zero((vcm + wheelBeta * R * omega) / (1 + wheelBeta)),
      wheelX: clamp(state.x, 0, WHEEL_TRACK),

      scene: ROLL_SCENE_ORDER.indexOf(sceneId),
      torqueLeft,
      torqueRight,
      netTorque: zero(netTorque),
      tilt: sceneId !== "seesaw" || Math.abs(seesawTorque) < ROLL_BALANCE_TOLERANCE ? 0 : Math.sign(seesawTorque),
      pivotForce: (m1 + m2 + ROLL_BEAM_MASS) * ROLL_G,
      cgX: zero((m2 * x2 - m1 * x1) / (m1 + m2 + ROLL_BEAM_MASS)),
      ladderHeight,
      wallForce,
      floorNormal: weight,
      floorFriction,
      ladderMuNeeded,
      floorForce: Math.hypot(weight, floorFriction),
      stands: stands ? 1 : 0,
      coupleTorque,
      netForce: zero(netForce),
      balanced: Math.abs(netTorque) < ROLL_BALANCE_TOLERANCE && Math.abs(netForce) < 1e-9 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof RollingState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "offset": return { ...state, offset: range(value, L.offset) };
      case "t": return { ...state, t: range(value, L.t) };
      case "vcm": return { ...state, vcm: range(value, L.vcm) };
      case "omega": return { ...state, omega: range(value, L.omega) };
      case "phi": return { ...state, phi: range(value, L.phi) };
      case "x": return { ...state, x: range(value, [0, WHEEL_TRACK]) };
      default: return state;
    }
  },
};
