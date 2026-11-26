import type { SimulationModel } from "@ise/science-engine";

/**
 * Oscillations: a mass on a spring, a pendulum, and a twisting disc.
 *
 * A body pulled back towards its rest position with a force proportional to
 * how far it is out, F = −kx, moves in simple harmonic motion: its
 * displacement is the shadow of a point going steadily round a circle,
 * x = A cos(ωt + φ), with ω = √(k/m) for a spring. Its acceleration is
 * a = −ω²x, its speed v = ω√(A² − x²), and its energy ½kA² is handed back
 * and forth between kinetic and potential.
 *
 * Everything is computed at once, so each picture reads its own outputs:
 * - the spring (one spring, or two in series or parallel), with damping
 *   b: x = A e^(−bt/2m) cos(ω′t + φ), ω′ = √(k/m − b²/4m²);
 * - the same spring driven by F₀ cos ω_d t, in its steady state (the start-up
 *   transient has died away): amplitude F₀ / √(m²(ω² − ω_d²)² + ω_d²b²);
 * - a simple pendulum released from rest at θ₀. Its motion is computed
 *   exactly (Jacobi's elliptic sine), so at wide swings it really is slower
 *   than the small-angle T = 2π√(L/g);
 * - a torsion pendulum, T = 2π√(I/κ), or a uniform rod swinging from one end,
 *   a physical pendulum with T = 2π√(I/mgd) = 2π√(2L/3g) for small swings.
 */

export type ShmArrangement = "one" | "series" | "parallel";
export type ShmBody = "torsion" | "rod";

export const SHM_ARRANGEMENT_ORDER: readonly ShmArrangement[] = ["one", "series", "parallel"];
export const SHM_BODY_ORDER: readonly ShmBody[] = ["torsion", "rod"];

const DEG = Math.PI / 180;

/** The range of every number the lab can set, matching the concept's controls. */
export const SHM_RANGES = {
  mass: [0.1, 4],
  k: [5, 200],
  k2: [5, 200],
  amplitude: [0.01, 0.2],
  phase: [-Math.PI, Math.PI],
  damping: [0, 1],
  force: [0.1, 2],
  driveOmega: [1, 30],
  length: [0.1, 2.5],
  g: [1.6, 25],
  swing: [1 * DEG, 80 * DEG],
  kappa: [0.02, 1],
  inertia: [0.002, 0.05],
} as const satisfies Record<string, readonly [number, number]>;

/** Time runs from 0 to here, then the system is released again, s. */
export const SHM_TIME_MAX = 20;
/** A driven amplitude is shown no bigger than this, m: without damping it would grow without limit. */
export const SHM_DRIVEN_CAP = 0.3;

export type ShmParams = {
  arrangement: ShmArrangement;
  /** Mass on the spring (also the pendulum bob, which does not change its period), kg. */
  mass: number;
  /** Spring constant of the first spring, N/m. */
  k: number;
  /** Spring constant of the second spring, N/m (series and parallel only). */
  k2: number;
  /** Amplitude of the spring's oscillation, m. */
  amplitude: number;
  /** Phase constant φ, rad. */
  phase: number;
  /** Damping constant b, kg/s: the drag force is −bv. */
  damping: number;
  /** Amplitude F₀ of the driving force, N. */
  force: number;
  /** Driving angular frequency ω_d, rad/s. */
  driveOmega: number;
  /** Pendulum length (and the rod's length), m. */
  length: number;
  g: number;
  /** Angle the pendulum, rod or disc is released from, rad. */
  swing: number;
  body: ShmBody;
  /** Torsion constant κ of the wire, N m/rad. */
  kappa: number;
  /** Moment of inertia of the disc about the wire, kg m². */
  inertia: number;
};

export interface ShmState {
  /** Time since release, s. */
  readonly t: number;
}

export type ShmResults = {
  arrangement: number;
  body: number;
  mass: number;
  k: number;
  k2: number;
  kSeries: number;
  kParallel: number;
  kEff: number;
  amplitude: number;
  phase: number;
  omega: number;
  frequency: number;
  period: number;
  t: number;
  x: number;
  v: number;
  speed: number;
  a: number;
  vmax: number;
  amax: number;
  /** ω′t + φ, less whole turns, rad. */
  phaseNow: number;
  ke: number;
  pe: number;
  total: number;
  /** ½kA², the energy of the undamped oscillation, J. */
  energy: number;
  damping: number;
  gamma: number;
  omegaDamped: number;
  periodDamped: number;
  amplitudeNow: number;
  /** Time for the amplitude to halve, s (0 without damping). */
  halfLife: number;
  damped: number;
  overdamped: number;
  force: number;
  driveOmega: number;
  driveRatio: number;
  drivenAmplitude: number;
  drivenX: number;
  /** How far the displacement lags the driving force, rad (0 to π). */
  lag: number;
  resonanceOmega: number;
  peakAmplitude: number;
  resonance: number;
  runaway: number;
  length: number;
  g: number;
  swing: number;
  pendulumOmega: number;
  periodPendulum: number;
  periodExact: number;
  /** How much longer the true period is than 2π√(L/g), %. */
  swingError: number;
  theta: number;
  bobX: number;
  periodSquared: number;
  slope: number;
  time20: number;
  gMeasured: number;
  kappa: number;
  inertia: number;
  torsionPeriod: number;
  rodPeriod: number;
  angularPeriod: number;
  angularTheta: number;
};

const clamp = (v: number, [lo, hi]: readonly [number, number]) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
const zero = (v: number) => v || 0;

/** The arithmetic–geometric mean of a and b. */
export function shmAgm(a: number, b: number): number {
  for (let i = 0; i < 40 && Math.abs(a - b) > 1e-15 * Math.abs(a); i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
  return (a + b) / 2;
}

/** Jacobi's elliptic sine sn(u | m), by the arithmetic–geometric mean (Abramowitz and Stegun 16.4). */
export function shmJacobiSn(u: number, m: number): number {
  if (m < 1e-14) return Math.sin(u);
  const a = [1];
  const c = [Math.sqrt(m)];
  let b = Math.sqrt(1 - m);
  let n = 0;
  while (Math.abs(c[n]!) > 1e-15 && n < 30) {
    const an = a[n]!;
    a.push((an + b) / 2);
    c.push((an - b) / 2);
    b = Math.sqrt(an * b);
    n++;
  }
  let phi = 2 ** n * a[n]! * u;
  for (let i = n; i > 0; i--) phi = (phi + Math.asin((c[i]! / a[i]!) * Math.sin(phi))) / 2;
  return Math.sin(phi);
}

/** True period ÷ small-angle period for a pendulum released from θ₀: 1 / AGM(1, cos(θ₀/2)). */
export function shmLargeSwingFactor(theta0: number): number {
  return 1 / shmAgm(1, Math.cos(theta0 / 2));
}

/**
 * The angle of a pendulum released from rest at θ₀, exactly: sin(θ/2) = k·sn(K − ω₀t | k²),
 * with k = sin(θ₀/2) and ω₀ = √(g/L). For small θ₀ this is θ₀ cos ω₀t.
 */
export function shmPendulumTheta(theta0: number, omega0: number, t: number): number {
  const k = Math.sin(theta0 / 2);
  const quarter = Math.PI / (2 * shmAgm(1, Math.cos(theta0 / 2)));
  const s = shmJacobiSn(quarter - omega0 * t, k * k);
  return zero(2 * Math.asin(Math.max(-1, Math.min(1, k * s))));
}

/** x = A e^(−bt/2m) cos(ω′t + φ) for a spring of constant k, m. */
export function shmDampedX(amplitude: number, mass: number, k: number, b: number, phase: number, t: number): number {
  const gamma = b / (2 * mass);
  const w2 = k / mass - gamma * gamma;
  const w = w2 > 0 ? Math.sqrt(w2) : 0;
  return zero(amplitude * Math.exp(-gamma * t) * Math.cos(w * t + phase));
}

/** Steady-state amplitude of a driven, damped spring: F₀ / √(m²(ω² − ω_d²)² + ω_d²b²), capped. */
export function shmDrivenAmplitude(force: number, mass: number, k: number, b: number, driveOmega: number): number {
  const w2 = k / mass;
  const d = Math.sqrt(mass * mass * (w2 - driveOmega * driveOmega) ** 2 + driveOmega * driveOmega * b * b);
  return d > 0 ? Math.min(SHM_DRIVEN_CAP, force / d) : SHM_DRIVEN_CAP;
}

/** Every parameter pulled back into its range. */
export function shmClampParams(p: ShmParams): ShmParams {
  return {
    arrangement: SHM_ARRANGEMENT_ORDER.includes(p.arrangement) ? p.arrangement : "one",
    body: SHM_BODY_ORDER.includes(p.body) ? p.body : "torsion",
    mass: clamp(p.mass, SHM_RANGES.mass),
    k: clamp(p.k, SHM_RANGES.k),
    k2: clamp(p.k2, SHM_RANGES.k2),
    amplitude: clamp(p.amplitude, SHM_RANGES.amplitude),
    phase: clamp(p.phase, SHM_RANGES.phase),
    damping: clamp(p.damping, SHM_RANGES.damping),
    force: clamp(p.force, SHM_RANGES.force),
    driveOmega: clamp(p.driveOmega, SHM_RANGES.driveOmega),
    length: clamp(p.length, SHM_RANGES.length),
    g: clamp(p.g, SHM_RANGES.g),
    swing: clamp(p.swing, SHM_RANGES.swing),
    kappa: clamp(p.kappa, SHM_RANGES.kappa),
    inertia: clamp(p.inertia, SHM_RANGES.inertia),
  };
}

/** The effective spring constant: k, k₁k₂/(k₁ + k₂) in series, k₁ + k₂ in parallel. */
export function shmEffectiveK(arrangement: ShmArrangement, k: number, k2: number): number {
  return arrangement === "series" ? (k * k2) / (k + k2) : arrangement === "parallel" ? k + k2 : k;
}

const clampTime = (t: number) => (Number.isFinite(t) ? Math.min(SHM_TIME_MAX, Math.max(0, t)) : 0);
const TWO_PI = 2 * Math.PI;

const OUTPUTS = [
  "arrangement", "body", "mass", "k", "k2", "kSeries", "kParallel", "kEff", "amplitude", "phase",
  "omega", "frequency", "period", "t", "x", "v", "speed", "a", "vmax", "amax", "phaseNow",
  "ke", "pe", "total", "energy",
  "damping", "gamma", "omegaDamped", "periodDamped", "amplitudeNow", "halfLife", "damped", "overdamped",
  "force", "driveOmega", "driveRatio", "drivenAmplitude", "drivenX", "lag", "resonanceOmega", "peakAmplitude", "resonance", "runaway",
  "length", "g", "swing", "pendulumOmega", "periodPendulum", "periodExact", "swingError", "theta", "bobX",
  "periodSquared", "slope", "time20", "gMeasured",
  "kappa", "inertia", "torsionPeriod", "rodPeriod", "angularPeriod", "angularTheta",
] as const satisfies readonly (keyof ShmResults)[];

export const shmModel: SimulationModel<ShmState, ShmParams, ShmResults> = {
  id: "shm",
  defaultParams: {
    arrangement: "one",
    mass: 0.5,
    k: 50,
    k2: 50,
    amplitude: 0.1,
    phase: 0,
    damping: 0,
    force: 0.5,
    driveOmega: 5,
    length: 1,
    g: 9.8,
    swing: 10 * DEG,
    body: "torsion",
    kappa: 0.1,
    inertia: 0.01,
  },
  outputs: OUTPUTS,
  stateVariables: ["t"],

  initialize() {
    return { t: 0 };
  },

  /** Play lets time run; after SHM_TIME_MAX seconds everything is released again. */
  advance(state, dt) {
    const t = state.t + Math.max(0, dt);
    return { t: t > SHM_TIME_MAX ? t - SHM_TIME_MAX : t };
  },

  /** Steps a twelfth of the spring's period. */
  step(state, params, sign) {
    const p = shmClampParams(params);
    const w = Math.sqrt(shmEffectiveK(p.arrangement, p.k, p.k2) / p.mass);
    const dt = TWO_PI / w / 12;
    return { t: clampTime(Math.round(state.t / dt + sign) * dt) };
  },

  derive(state, params) {
    const p = shmClampParams(params);
    const t = clampTime(state.t);
    const { mass: m, amplitude: A, damping: b, phase } = p;

    // The spring.
    const kSeries = (p.k * p.k2) / (p.k + p.k2);
    const kParallel = p.k + p.k2;
    const kEff = shmEffectiveK(p.arrangement, p.k, p.k2);
    const omega = Math.sqrt(kEff / m);
    const period = TWO_PI / omega;
    const gamma = b / (2 * m);
    const w2 = omega * omega - gamma * gamma;
    const omegaDamped = w2 > 0 ? Math.sqrt(w2) : 0;
    const envelope = A * Math.exp(-gamma * t);
    const psi = omegaDamped * t + phase;
    const x = envelope * Math.cos(psi);
    const v = envelope * (-gamma * Math.cos(psi) - omegaDamped * Math.sin(psi));
    const a = -(kEff / m) * x - (b / m) * v;
    const ke = 0.5 * m * v * v;
    const pe = 0.5 * kEff * x * x;

    // The same spring, driven.
    const wd = p.driveOmega;
    const raw = p.force / Math.sqrt(m * m * (omega * omega - wd * wd) ** 2 + wd * wd * b * b);
    const runaway = !(raw <= SHM_DRIVEN_CAP);
    const drivenAmplitude = runaway ? SHM_DRIVEN_CAP : raw;
    const lag = Math.atan2(wd * b, m * (omega * omega - wd * wd));
    const r2 = omega * omega - (b * b) / (2 * m * m);
    const resonanceOmega = r2 > 0 ? Math.sqrt(r2) : 0;
    const peakAmplitude = shmDrivenAmplitude(p.force, m, kEff, b, resonanceOmega);

    // The pendulum.
    const pendulumOmega = Math.sqrt(p.g / p.length);
    const periodPendulum = TWO_PI / pendulumOmega;
    const periodExact = periodPendulum * shmLargeSwingFactor(p.swing);
    const theta = shmPendulumTheta(p.swing, pendulumOmega, t);

    // Angular SHM.
    const torsionPeriod = TWO_PI * Math.sqrt(p.inertia / p.kappa);
    const rodPeriod = TWO_PI * Math.sqrt((2 * p.length) / (3 * p.g));
    const rod = p.body === "rod";
    const angularTheta = rod
      ? shmPendulumTheta(p.swing, Math.sqrt((3 * p.g) / (2 * p.length)), t)
      : p.swing * Math.cos(Math.sqrt(p.kappa / p.inertia) * t);

    return {
      arrangement: SHM_ARRANGEMENT_ORDER.indexOf(p.arrangement),
      body: SHM_BODY_ORDER.indexOf(p.body),
      mass: m,
      k: p.k,
      k2: p.k2,
      kSeries,
      kParallel,
      kEff,
      amplitude: A,
      phase: zero(phase),
      omega,
      frequency: 1 / period,
      period,
      t,
      x: zero(x),
      v: zero(v),
      speed: Math.abs(v),
      a: zero(a),
      vmax: A * omega,
      amax: A * omega * omega,
      phaseNow: zero(((psi % TWO_PI) + TWO_PI) % TWO_PI),
      ke,
      pe,
      total: ke + pe,
      energy: 0.5 * kEff * A * A,
      damping: b,
      gamma,
      omegaDamped,
      periodDamped: omegaDamped > 0 ? TWO_PI / omegaDamped : 0,
      amplitudeNow: envelope,
      halfLife: b > 0 ? Math.LN2 / gamma : 0,
      damped: b > 0 ? 1 : 0,
      overdamped: w2 > 0 ? 0 : 1,
      force: p.force,
      driveOmega: wd,
      driveRatio: wd / omega,
      drivenAmplitude,
      drivenX: zero(drivenAmplitude * Math.cos(wd * t - lag)),
      lag,
      resonanceOmega,
      peakAmplitude,
      resonance: drivenAmplitude >= 0.95 * peakAmplitude ? 1 : 0,
      runaway: runaway ? 1 : 0,
      length: p.length,
      g: p.g,
      swing: p.swing,
      pendulumOmega,
      periodPendulum,
      periodExact,
      swingError: (periodExact / periodPendulum - 1) * 100,
      theta,
      bobX: zero(p.length * Math.sin(theta)),
      periodSquared: periodPendulum * periodPendulum,
      slope: (4 * Math.PI * Math.PI) / p.g,
      time20: 20 * periodExact,
      gMeasured: (4 * Math.PI * Math.PI * p.length) / (periodExact * periodExact),
      kappa: p.kappa,
      inertia: p.inertia,
      torsionPeriod,
      rodPeriod,
      angularPeriod: rod ? rodPeriod : torsionPeriod,
      angularTheta: zero(angularTheta),
    };
  },

  getVariable(state, id) {
    return id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    return id === "t" ? { t: clampTime(value) } : state;
  },
};
