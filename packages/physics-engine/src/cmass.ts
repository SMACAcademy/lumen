import type { SimulationModel } from "@ise/science-engine";

/**
 * Systems of particles, and energy beyond the straight line — eight small
 * scenes on one clock.
 *
 * Rod: three masses on a light 1 m rod. The centre of mass is the
 * mass-weighted average position, x_cm = Σmx / Σm: the point it balances on.
 *
 * Shell: a shell bursts at the top of its flight into two pieces, pushed
 * apart horizontally. The burst is internal, so the centre of mass carries on
 * along the old parabola and lands where the whole shell would have — as long
 * as the pieces are in the air together (here they land together, because the
 * burst gives them no vertical velocity).
 *
 * Pucks: a puck slides into a resting one off-centre on smooth ice. The
 * impulse acts along the line joining the centres at contact, so only that
 * component of the velocity changes; the coefficient of restitution e fixes
 * the separation speed along that line. Momentum is conserved in x and in y.
 *
 * Rocket: a 1000 kg rocket ejects fuel at a steady rate, the exhaust leaving
 * at speed u relative to the rocket. Thrust = u·dm/dt, and with no gravity the
 * speed is v = u ln(m₀/m). With gravity on it is a vertical launch near the
 * Earth: g = 9.8 m/s² constant, no air drag, v = u ln(m₀/m) − gt.
 *
 * Spring: F = −kx. The work done as the end moves from x₁ to x₂ is the area
 * under the force–displacement graph: by the spring −½k(x₂² − x₁²), by a hand
 * pulling it slowly the same with the sign turned round.
 *
 * Car: power is the rate of doing work, P = Fv. Climbing at a steady speed the
 * engine's force balances the weight's pull down the slope and the
 * resistance, so the power never changes. Speeding up from rest on a level
 * road under a constant force (no resistance), P = Fv grows with v, and the
 * average power so far is only half of it.
 *
 * Loop: a ball on a string whirled in a vertical circle. With speed v₀ at the
 * bottom it reaches the top only if v₀ ≥ √(5gr); the string goes slack where
 * the tension would turn negative, and the ball then falls inside the circle
 * on a parabola. When it loops, T_bottom − T_top = 6mg.
 *
 * Well: a 1 kg ball moving along x with potential energy
 * U(x) = 2(x² − 1)² J. Released from rest its energy E = U(x₀) is fixed; it
 * turns back where U = E. F = −dU/dx: zero at x = ±1 (minima, stable) and at
 * x = 0 (a maximum, unstable).
 */

export const CMASS_G = 9.8;
/** The rod's length, m: A sits at 0, C at the far end. */
export const CMASS_ROD = 1;
/** The clock stops here, s. */
export const CMASS_T_MAX = 20;
/** Radius of each puck, m, and how far puck 1's centre starts to the left of puck 2's. */
export const CMASS_PUCK_RADIUS = 0.1;
export const CMASS_PUCK_START = 1.2;
/** The rocket's mass at lift-off, kg. */
export const CMASS_ROCKET_MASS = 1000;
/** The well: U(x) = CMASS_WELL·(x² − 1)², in J with x in m, for a ball of CMASS_BALL_MASS kg. */
export const CMASS_WELL = 2;
export const CMASS_BALL_MASS = 1;

export type CmassGravity = "off" | "on";
export type CmassDrive = "steady" | "speeding";
export const CMASS_GRAVITY_ORDER: readonly CmassGravity[] = ["off", "on"];
export const CMASS_DRIVE_ORDER: readonly CmassDrive[] = ["steady", "speeding"];

export type CmassParams = {
  /** Whether the rocket feels the Earth's gravity. */
  gravity: CmassGravity;
  /** Climbing at a steady speed, or speeding up from rest. */
  drive: CmassDrive;
};

export interface CmassState {
  /** The clock, s. */
  readonly t: number;
  /** Masses on the rod, kg; B can slide (position xB, m). */
  readonly mA: number;
  readonly mB: number;
  readonly mC: number;
  readonly xB: number;
  /** The shell: launch speed (m/s), angle (rad), the share of its mass in piece 1, and piece 1's horizontal velocity just after the burst (m/s). */
  readonly shellSpeed: number;
  readonly shellAngle: number;
  readonly fragShare: number;
  readonly fragVelocity: number;
  /** The pucks: masses (kg), puck 1's speed (m/s), the offset b/(2R) = sin α, and the coefficient of restitution. */
  readonly puckM1: number;
  readonly puckM2: number;
  readonly puckU: number;
  readonly puckOffset: number;
  readonly puckE: number;
  /** The rocket: exhaust speed (m/s), burn rate (kg/s), fuel carried (kg). */
  readonly exhaust: number;
  readonly burnRate: number;
  readonly fuel: number;
  /** The spring: constant (N/m), and the end moved from x₁ to x₂ (m). */
  readonly springK: number;
  readonly springX1: number;
  readonly springX2: number;
  /** The car: mass (kg), slope (rad), steady speed (m/s), resistance (N), and the driving force when speeding up (N). */
  readonly carMass: number;
  readonly slope: number;
  readonly carSpeed: number;
  readonly resistance: number;
  readonly driveForce: number;
  /** The loop: speed at the bottom (m/s), radius (m), mass (kg). */
  readonly loopV0: number;
  readonly loopR: number;
  readonly loopMass: number;
  /** The well: where the ball is released from rest, m. */
  readonly ballX0: number;
}

type Key = keyof CmassState;
const deg = (d: number) => (d * Math.PI) / 180;

/** Each state variable's allowed range. */
export const CMASS_RANGES: Record<Key, readonly [number, number]> = {
  t: [0, CMASS_T_MAX],
  mA: [0.5, 4],
  mB: [0, 4],
  mC: [0.5, 4],
  xB: [0, CMASS_ROD],
  shellSpeed: [10, 30],
  shellAngle: [deg(15), deg(75)],
  fragShare: [0.1, 0.9],
  fragVelocity: [-20, 40],
  puckM1: [0.5, 4],
  puckM2: [0.5, 4],
  puckU: [1, 5],
  puckOffset: [0, 0.9],
  puckE: [0, 1],
  exhaust: [500, 3000],
  burnRate: [50, 200],
  fuel: [100, 900],
  springK: [50, 500],
  springX1: [-0.4, 0.4],
  springX2: [-0.4, 0.4],
  carMass: [500, 2000],
  slope: [0, deg(30)],
  carSpeed: [5, 30],
  resistance: [0, 2000],
  driveForce: [500, 5000],
  loopV0: [2, 10],
  loopR: [0.5, 2],
  loopMass: [0.1, 2],
  ballX0: [-1.7, 1.7],
};

const KEYS = Object.keys(CMASS_RANGES) as Key[];
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const within = (state: CmassState, key: Key) => {
  const [lo, hi] = CMASS_RANGES[key];
  const v = state[key];
  return clamp(Number.isFinite(v) ? v : lo, lo, hi);
};
/** Turns −0 (and rounding dust) into 0. */
const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);

// ── The rod ──────────────────────────────────────────────────────────────────

export function cmassRod(mA: number, mB: number, mC: number, xB: number) {
  const mass = mA + mB + mC;
  const moment = mB * xB + mC * CMASS_ROD;
  return { mass, moment, xcm: mass > 0 ? moment / mass : CMASS_ROD / 2 };
}

// ── The shell ────────────────────────────────────────────────────────────────

export function cmassShell(u: number, angle: number, share: number, v1: number, t: number) {
  const g = CMASS_G;
  const vx = u * Math.cos(angle);
  const vy = u * Math.sin(angle);
  const flight = (2 * vy) / g;
  const range = vx * flight;
  const height = (vy * vy) / (2 * g);
  const top = flight / 2;
  const xTop = range / 2;
  // Momentum across is the same just before and just after the burst.
  const v2 = (vx - share * v1) / (1 - share);
  const land1 = xTop + v1 * top;
  const land2 = xTop + v2 * top;
  const tt = clamp(t, 0, flight);
  const cmX = vx * tt;
  const cmY = Math.max(0, vy * tt - 0.5 * g * tt * tt);
  let f1x = cmX;
  let f2x = cmX;
  if (tt > top) {
    const tau = tt - top;
    f1x = xTop + v1 * tau;
    f2x = xTop + v2 * tau;
  }
  return {
    vx, vy, flight, range, height, xTop, v2, land1, land2,
    cmLand: share * land1 + (1 - share) * land2,
    cmX, cmY, f1x, f2x, fragY: cmY,
    exploded: t >= top ? 1 : 0,
    landed: t >= flight ? 1 : 0,
  };
}

// ── The pucks ────────────────────────────────────────────────────────────────

export function cmassPucks(m1: number, m2: number, u: number, offset: number, e: number, t: number) {
  const R = CMASS_PUCK_RADIUS;
  const s = clamp(offset, 0, 0.999);
  const c = Math.sqrt(1 - s * s);
  const alpha = Math.asin(s);
  // n points from puck 1's centre to puck 2's at contact; τ is at right angles to it.
  const n = [c, -s] as const;
  const tau = [s, c] as const;
  const un = u * c;
  const ut = u * s;
  const v1n = ((m1 - e * m2) * un) / (m1 + m2);
  const v2n = ((1 + e) * m1 * un) / (m1 + m2);
  const v1x = tidy(v1n * n[0] + ut * tau[0]);
  const v1y = tidy(v1n * n[1] + ut * tau[1]);
  const v2x = tidy(v2n * n[0]);
  const v2y = tidy(v2n * n[1]);
  const speed1 = Math.hypot(v1x, v1y);
  const speed2 = Math.hypot(v2x, v2y);
  const before = 0.5 * m1 * u * u;
  const after = 0.5 * m1 * speed1 * speed1 + 0.5 * m2 * speed2 * speed2;
  const lost = Math.max(0, tidy(before - after));
  const moving = (v: number) => v > 1e-9;
  let separation = 0;
  if (moving(speed1) && moving(speed2)) separation = Math.acos(clamp((v1x * v2x + v1y * v2y) / (speed1 * speed2), -1, 1));

  // Puck 1 starts CMASS_PUCK_START to the left, on the line y = 2R·sin α.
  const contactX = -2 * R * c;
  const contactY = 2 * R * s;
  const meet = (CMASS_PUCK_START + contactX) / u;
  const after_ = Math.max(0, t - meet);
  const hit = t >= meet;
  return {
    alpha, v1x, v1y, v2x, v2y, speed1, speed2,
    dir1: moving(speed1) ? Math.atan2(v1y, v1x) : 0,
    deflect2: moving(speed2) ? -Math.atan2(v2y, v2x) : 0,
    separation,
    pxBefore: m1 * u,
    pxAfter: tidy(m1 * v1x + m2 * v2x),
    pyAfter: tidy(m1 * v1y + m2 * v2y),
    keBefore: before,
    keAfter: after,
    keLost: lost,
    keLostPercent: before > 0 ? (100 * lost) / before : 0,
    meet,
    collided: hit ? 1 : 0,
    p1x: hit ? contactX + v1x * after_ : -CMASS_PUCK_START + u * t,
    p1y: hit ? contactY + v1y * after_ : contactY,
    p2x: hit ? v2x * after_ : 0,
    p2y: hit ? v2y * after_ : 0,
  };
}

// ── The rocket ───────────────────────────────────────────────────────────────

export function cmassRocket(u: number, rate: number, fuel: number, gravity: boolean, t: number) {
  const g = gravity ? CMASS_G : 0;
  const m0 = CMASS_ROCKET_MASS;
  const burn = fuel / rate;
  const thrust = u * rate;
  const during = (tau: number) => {
    const m = m0 - rate * tau;
    const ln = Math.log(m0 / m);
    return { m, v: u * ln - g * tau, h: u * (tau - (m / rate) * ln) - 0.5 * g * tau * tau };
  };
  const end = during(burn);
  let mass: number;
  let v: number;
  let h: number;
  let a: number;
  let landed = 0;
  if (t <= burn) {
    ({ m: mass, v, h } = during(t));
    a = thrust / mass - g;
  } else {
    const tau = t - burn;
    mass = end.m;
    v = end.v - g * tau;
    h = end.h + end.v * tau - 0.5 * g * tau * tau;
    a = -g;
    if (h < 0) {
      h = 0;
      v = 0;
      a = 0;
      landed = 1;
    }
  }
  return {
    mass, v: tidy(v), h: Math.max(0, h), a: tidy(a),
    thrust,
    burn,
    burnoutSpeed: end.v,
    massRatio: m0 / end.m,
    burning: t < burn ? 1 : 0,
    landed,
  };
}

// ── The spring ───────────────────────────────────────────────────────────────

export function cmassSpring(k: number, x1: number, x2: number) {
  const bySpring = tidy(-0.5 * k * (x2 * x2 - x1 * x1));
  return { force: tidy(-k * x2), bySpring, byHand: tidy(-bySpring), stored: 0.5 * k * x2 * x2 };
}

// ── The car ──────────────────────────────────────────────────────────────────

export function cmassCar(drive: CmassDrive, mass: number, slope: number, speed: number, resistance: number, force: number, t: number) {
  if (drive === "speeding") {
    const a = force / mass;
    const v = a * t;
    const power = force * v;
    return { force, v, a, power, average: power / 2, work: 0.5 * mass * v * v, climb: 0 };
  }
  const pull = mass * CMASS_G * Math.sin(slope) + resistance;
  const power = pull * speed;
  return { force: pull, v: speed, a: 0, power, average: power, work: power * t, climb: speed * Math.sin(slope) };
}

// ── The loop ─────────────────────────────────────────────────────────────────

/** 0: never rises above the centre and swings; 1: the string goes slack; 2: right round. */
export function cmassLoopFate(v0: number, r: number): number {
  const g = CMASS_G;
  if (v0 * v0 >= 5 * g * r - 1e-9) return 2;
  if (v0 * v0 > 2 * g * r) return 1;
  return 0;
}

export function cmassLoop(v0: number, r: number, m: number, t: number) {
  const g = CMASS_G;
  const fate = cmassLoopFate(v0, r);
  const leaveCos = (2 * g * r - v0 * v0) / (3 * g * r);
  const leaveAngle = fate === 1 ? Math.acos(leaveCos) : 0;
  const swing = fate === 0 ? Math.acos(clamp(1 - (v0 * v0) / (2 * g * r), -1, 1)) : 0;
  const top = fate === 2 ? Math.sqrt(Math.max(0, v0 * v0 - 4 * g * r)) : 0;
  const tBottom = (m * v0 * v0) / r + m * g;
  const tTop = fate === 2 ? tidy((m * top * top) / r - m * g) : 0;

  // On the string: φ″ = −(g/r) sin φ, φ measured from the bottom.
  const acc = (p: number) => -(g / r) * Math.sin(p);
  const h = 1 / 500;
  let phi = 0;
  let w = v0 / r;
  let time = 0;
  let slack = 0;
  let x = 0;
  let y = -r;
  let vx = v0;
  let vy = 0;
  while (time < t - 1e-12) {
    const dt = Math.min(h, t - time);
    const k1p = w, k1w = acc(phi);
    const k2p = w + (dt / 2) * k1w, k2w = acc(phi + (dt / 2) * k1p);
    const k3p = w + (dt / 2) * k2w, k3w = acc(phi + (dt / 2) * k2p);
    const k4p = w + dt * k3w, k4w = acc(phi + dt * k3p);
    const nphi = phi + (dt / 6) * (k1p + 2 * k2p + 2 * k3p + k4p);
    const nw = w + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w);
    if (fate === 1 && nphi >= leaveAngle) {
      // The string goes slack: from here the ball is a projectile.
      const leaveAt = time + (dt * (leaveAngle - phi)) / Math.max(1e-12, nphi - phi);
      const vl = Math.sqrt(Math.max(0, -g * r * leaveCos));
      const lx = r * Math.sin(leaveAngle);
      const ly = -r * leaveCos;
      const lvx = vl * leaveCos;
      const lvy = vl * Math.sin(leaveAngle);
      const at = (tau: number) => ({ x: lx + lvx * tau, y: ly + lvy * tau - 0.5 * g * tau * tau });
      // It falls inside the circle until the string jerks taut again; it is left there.
      let taut = 10;
      for (let tau = 0.01; tau < 10; tau += 0.001) {
        const p = at(tau);
        if (p.x * p.x + p.y * p.y >= r * r) {
          taut = tau;
          break;
        }
      }
      const tau = Math.min(t - leaveAt, taut);
      const p = at(tau);
      x = p.x;
      y = p.y;
      vx = lvx;
      vy = lvy - g * tau;
      phi = Math.atan2(x, -y);
      slack = 1;
      break;
    }
    phi = nphi;
    w = nw;
    time += dt;
    x = r * Math.sin(phi);
    y = -r * Math.cos(phi);
    vx = r * w * Math.cos(phi);
    vy = r * w * Math.sin(phi);
  }
  const speed = Math.hypot(vx, vy);
  const tension = slack ? 0 : Math.max(0, (m * speed * speed) / r + m * g * Math.cos(phi));
  return {
    fate,
    minBottom: Math.sqrt(5 * g * r),
    minTop: Math.sqrt(g * r),
    top,
    tBottom,
    tTop,
    tensionDiff: fate === 2 ? tBottom - tTop : 0,
    leaveAngle,
    leaveHeight: fate === 1 ? r * (1 - leaveCos) : 0,
    swing,
    phi: tidy(phi),
    x: tidy(x),
    y: tidy(y),
    speed,
    tension,
    slack,
  };
}

// ── The well ─────────────────────────────────────────────────────────────────

export const cmassWellU = (x: number) => CMASS_WELL * (x * x - 1) ** 2;
export const cmassWellForce = (x: number) => tidy(-4 * CMASS_WELL * x * (x * x - 1));

/** The turning points of a ball released from rest at x₀: where U = E on either side. */
export function cmassTurningPoints(x0: number): { left: number; right: number; crosses: number } {
  if (Math.abs(x0) < 1e-9) return { left: 0, right: 0, crosses: 0 };
  const E = cmassWellU(x0);
  const root = Math.sqrt(E / CMASS_WELL);
  const outer = Math.sqrt(1 + root);
  if (E >= CMASS_WELL - 1e-12) return { left: -outer, right: outer, crosses: 1 };
  const inner = Math.sqrt(Math.max(0, 1 - root));
  return x0 < 0 ? { left: -outer, right: -inner, crosses: 0 } : { left: inner, right: outer, crosses: 0 };
}

/** Within this of an equilibrium, m, the ball counts as placed on it. */
export const CMASS_EQUILIBRIUM_CLOSE = 0.03;

export function cmassWell(x0: number, t: number) {
  const m = CMASS_BALL_MASS;
  const acc = (x: number) => cmassWellForce(x) / m;
  const h = 1 / 400;
  let x = x0;
  let v = 0;
  let time = 0;
  while (time < t - 1e-12) {
    const dt = Math.min(h, t - time);
    const k1x = v, k1v = acc(x);
    const k2x = v + (dt / 2) * k1v, k2v = acc(x + (dt / 2) * k1x);
    const k3x = v + (dt / 2) * k2v, k3v = acc(x + (dt / 2) * k2x);
    const k4x = v + dt * k3v, k4v = acc(x + dt * k3x);
    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    time += dt;
  }
  const E = cmassWellU(x0);
  const U = cmassWellU(x);
  const turns = cmassTurningPoints(x0);
  const near = (target: number) => Math.abs(x0 - target) <= CMASS_EQUILIBRIUM_CLOSE;
  return {
    x: tidy(x),
    v: tidy(v),
    U,
    kinetic: Math.max(0, E - U),
    E,
    force: cmassWellForce(x),
    ...turns,
    equilibrium: near(-1) || near(1) ? 1 : near(0) ? 2 : 0,
  };
}

// ── The model ────────────────────────────────────────────────────────────────

export type CmassResults = {
  t: number;
  // Rod
  mA: number; mB: number; mC: number; xB: number;
  rodMass: number; rodMoment: number; xcm: number;
  // Shell
  shellRange: number; shellHeight: number; shellFlight: number; shellTop: number; shellVx: number;
  fragShare: number; fragVelocity: number; frag2Velocity: number;
  land1: number; land2: number; cmLand: number;
  cmX: number; cmY: number; frag1X: number; frag2X: number; fragY: number;
  shellExploded: number; shellLanded: number;
  // Pucks
  puckM1: number; puckM2: number; puckU: number; puckOffset: number; puckE: number;
  puckAlpha: number; puckV1x: number; puckV1y: number; puckV2x: number; puckV2y: number;
  puckV1: number; puckV2: number; puckDir1: number; puckDeflect2: number; puckSeparation: number;
  pxBefore: number; pxAfter: number; pyAfter: number;
  keBefore: number; keAfter: number; keLost: number; keLostPercent: number;
  puckMeet: number; puckCollided: number; puck1X: number; puck1Y: number; puck2X: number; puck2Y: number;
  // Rocket
  gravity: number; exhaust: number; burnRate: number; fuel: number;
  rocketMass: number; rocketSpeed: number; rocketHeight: number; rocketAccel: number;
  thrust: number; burnTime: number; burnoutSpeed: number; massRatio: number;
  rocketBurning: number; rocketBurnt: number; rocketLanded: number;
  // Spring
  springK: number; springX1: number; springX2: number;
  springForce: number; workSpring: number; workHand: number; springEnergy: number;
  // Car
  drive: number; carMass: number; slope: number; resistance: number; driveForce: number;
  carForce: number; carV: number; carAccel: number; carPower: number; carAvgPower: number; carWork: number; carClimb: number;
  // Loop
  loopV0: number; loopR: number; loopMass: number;
  loopFate: number; loopMinBottom: number; loopMinTop: number; loopTop: number;
  tensionBottom: number; tensionTop: number; tensionDiff: number;
  leaveAngle: number; leaveHeight: number; swingAngle: number;
  loopPhi: number; loopX: number; loopY: number; loopSpeed: number; loopTension: number; loopSlack: number;
  // Well
  ballX0: number; ballX: number; ballV: number; ballU: number; ballKE: number; ballEnergy: number;
  ballForce: number; turnLeft: number; turnRight: number; ballCrosses: number; ballEquilibrium: number;
};

const OUTPUTS = [
  "t",
  "mA", "mB", "mC", "xB", "rodMass", "rodMoment", "xcm",
  "shellRange", "shellHeight", "shellFlight", "shellTop", "shellVx", "fragShare", "fragVelocity", "frag2Velocity",
  "land1", "land2", "cmLand", "cmX", "cmY", "frag1X", "frag2X", "fragY", "shellExploded", "shellLanded",
  "puckM1", "puckM2", "puckU", "puckOffset", "puckE", "puckAlpha", "puckV1x", "puckV1y", "puckV2x", "puckV2y",
  "puckV1", "puckV2", "puckDir1", "puckDeflect2", "puckSeparation", "pxBefore", "pxAfter", "pyAfter",
  "keBefore", "keAfter", "keLost", "keLostPercent", "puckMeet", "puckCollided", "puck1X", "puck1Y", "puck2X", "puck2Y",
  "gravity", "exhaust", "burnRate", "fuel", "rocketMass", "rocketSpeed", "rocketHeight", "rocketAccel",
  "thrust", "burnTime", "burnoutSpeed", "massRatio", "rocketBurning", "rocketBurnt", "rocketLanded",
  "springK", "springX1", "springX2", "springForce", "workSpring", "workHand", "springEnergy",
  "drive", "carMass", "slope", "resistance", "driveForce", "carForce", "carV", "carAccel", "carPower", "carAvgPower", "carWork", "carClimb",
  "loopV0", "loopR", "loopMass", "loopFate", "loopMinBottom", "loopMinTop", "loopTop",
  "tensionBottom", "tensionTop", "tensionDiff", "leaveAngle", "leaveHeight", "swingAngle",
  "loopPhi", "loopX", "loopY", "loopSpeed", "loopTension", "loopSlack",
  "ballX0", "ballX", "ballV", "ballU", "ballKE", "ballEnergy", "ballForce", "turnLeft", "turnRight", "ballCrosses", "ballEquilibrium",
] as const satisfies readonly (keyof CmassResults)[];

export const CMASS_INITIAL: CmassState = {
  t: 0,
  mA: 1,
  mB: 2,
  mC: 1,
  xB: 0.3,
  shellSpeed: 20,
  shellAngle: deg(45),
  fragShare: 0.5,
  fragVelocity: 0,
  puckM1: 1,
  puckM2: 1,
  puckU: 2,
  puckOffset: 0.5,
  puckE: 1,
  exhaust: 2000,
  burnRate: 50,
  fuel: 500,
  springK: 200,
  springX1: 0,
  springX2: 0.2,
  carMass: 1000,
  slope: Math.asin(0.1),
  carSpeed: 20,
  resistance: 500,
  driveForce: 2000,
  loopV0: 8,
  loopR: 1,
  loopMass: 0.5,
  ballX0: -1.5,
};

const gravityOf = (params: CmassParams) => (params.gravity === "on" ? "on" : "off");
const driveOf = (params: CmassParams): CmassDrive => (params.drive === "speeding" ? "speeding" : "steady");

export const cmassModel: SimulationModel<CmassState, CmassParams, CmassResults> = {
  id: "cmass",
  defaultParams: { gravity: "off", drive: "steady" },
  outputs: OUTPUTS,
  stateVariables: KEYS,

  initialize() {
    return { ...CMASS_INITIAL };
  },

  /** Play runs the clock, which stops at CMASS_T_MAX. */
  advance(state, dt) {
    return { ...state, t: clamp(within(state, "t") + dt, 0, CMASS_T_MAX) };
  },

  step(state, _params, sign) {
    return { ...state, t: clamp(Math.round(within(state, "t") * 2) / 2 + 0.5 * sign, 0, CMASS_T_MAX) };
  },

  derive(state, params) {
    const v = (key: Key) => within(state, key);
    const t = v("t");
    const rod = cmassRod(v("mA"), v("mB"), v("mC"), v("xB"));
    const shell = cmassShell(v("shellSpeed"), v("shellAngle"), v("fragShare"), v("fragVelocity"), t);
    const pucks = cmassPucks(v("puckM1"), v("puckM2"), v("puckU"), v("puckOffset"), v("puckE"), t);
    const gravity = gravityOf(params);
    const rocket = cmassRocket(v("exhaust"), v("burnRate"), v("fuel"), gravity === "on", t);
    const spring = cmassSpring(v("springK"), v("springX1"), v("springX2"));
    const drive = driveOf(params);
    const car = cmassCar(drive, v("carMass"), v("slope"), v("carSpeed"), v("resistance"), v("driveForce"), t);
    const loop = cmassLoop(v("loopV0"), v("loopR"), v("loopMass"), t);
    const well = cmassWell(v("ballX0"), t);
    return {
      t,
      mA: v("mA"), mB: v("mB"), mC: v("mC"), xB: v("xB"),
      rodMass: rod.mass, rodMoment: rod.moment, xcm: rod.xcm,
      shellRange: shell.range, shellHeight: shell.height, shellFlight: shell.flight, shellTop: shell.xTop, shellVx: shell.vx,
      fragShare: v("fragShare"), fragVelocity: v("fragVelocity"), frag2Velocity: tidy(shell.v2),
      land1: tidy(shell.land1), land2: tidy(shell.land2), cmLand: tidy(shell.cmLand),
      cmX: shell.cmX, cmY: shell.cmY, frag1X: tidy(shell.f1x), frag2X: tidy(shell.f2x), fragY: shell.fragY,
      shellExploded: shell.exploded, shellLanded: shell.landed,
      puckM1: v("puckM1"), puckM2: v("puckM2"), puckU: v("puckU"), puckOffset: v("puckOffset"), puckE: v("puckE"),
      puckAlpha: pucks.alpha, puckV1x: pucks.v1x, puckV1y: pucks.v1y, puckV2x: pucks.v2x, puckV2y: pucks.v2y,
      puckV1: pucks.speed1, puckV2: pucks.speed2, puckDir1: tidy(pucks.dir1), puckDeflect2: tidy(pucks.deflect2), puckSeparation: pucks.separation,
      pxBefore: pucks.pxBefore, pxAfter: pucks.pxAfter, pyAfter: pucks.pyAfter,
      keBefore: pucks.keBefore, keAfter: pucks.keAfter, keLost: pucks.keLost, keLostPercent: pucks.keLostPercent,
      puckMeet: pucks.meet, puckCollided: pucks.collided,
      puck1X: tidy(pucks.p1x), puck1Y: tidy(pucks.p1y), puck2X: tidy(pucks.p2x), puck2Y: tidy(pucks.p2y),
      gravity: CMASS_GRAVITY_ORDER.indexOf(gravity), exhaust: v("exhaust"), burnRate: v("burnRate"), fuel: v("fuel"),
      rocketMass: rocket.mass, rocketSpeed: rocket.v, rocketHeight: rocket.h, rocketAccel: rocket.a,
      thrust: rocket.thrust / 1000, burnTime: rocket.burn, burnoutSpeed: rocket.burnoutSpeed, massRatio: rocket.massRatio,
      rocketBurning: rocket.burning, rocketBurnt: 1 - rocket.burning, rocketLanded: rocket.landed,
      springK: v("springK"), springX1: v("springX1"), springX2: v("springX2"),
      springForce: spring.force, workSpring: spring.bySpring, workHand: spring.byHand, springEnergy: spring.stored,
      drive: CMASS_DRIVE_ORDER.indexOf(drive), carMass: v("carMass"), slope: v("slope"), resistance: v("resistance"), driveForce: v("driveForce"),
      carForce: car.force, carV: car.v, carAccel: car.a, carPower: car.power / 1000, carAvgPower: car.average / 1000, carWork: car.work / 1000, carClimb: car.climb,
      loopV0: v("loopV0"), loopR: v("loopR"), loopMass: v("loopMass"),
      loopFate: loop.fate, loopMinBottom: loop.minBottom, loopMinTop: loop.minTop, loopTop: loop.top,
      tensionBottom: loop.tBottom, tensionTop: loop.tTop, tensionDiff: loop.tensionDiff,
      leaveAngle: loop.leaveAngle, leaveHeight: loop.leaveHeight, swingAngle: loop.swing,
      loopPhi: loop.phi, loopX: loop.x, loopY: loop.y, loopSpeed: loop.speed, loopTension: loop.tension, loopSlack: loop.slack,
      ballX0: v("ballX0"), ballX: well.x, ballV: well.v, ballU: well.U, ballKE: well.kinetic, ballEnergy: well.E,
      ballForce: well.force, turnLeft: tidy(well.left), turnRight: tidy(well.right), ballCrosses: well.crosses, ballEquilibrium: well.equilibrium,
    };
  },

  getVariable(state, id) {
    return id in CMASS_RANGES ? state[id as Key] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in CMASS_RANGES) || !Number.isFinite(value)) return state;
    const [lo, hi] = CMASS_RANGES[id as Key];
    return { ...state, [id]: clamp(value, lo, hi) };
  },
};
