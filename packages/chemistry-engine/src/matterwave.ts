import type { SimulationModel } from "@ise/science-engine";

/**
 * Two steps on the way from Thomson's atom to the quantum one.
 *
 * Rutherford: fire alpha particles at a thin foil. A few bounce back, which
 * a spread-out positive charge could never do — the charge must sit in a
 * tiny nucleus. For an alpha of kinetic energy E aimed at a bare nucleus of
 * charge Z:
 *
 *   d = 2Ze² / 4πε₀E              closest approach head-on (e²/4πε₀ = 1.44 MeV fm)
 *   tan(θ/2) = d / 2b             deflection for impact parameter b
 *
 * The electrons' screening and repeated scattering in the foil are ignored.
 * Thomson's atom is here for contrast: the same alpha crossing charge spread
 * through a 1 Å sphere is turned by no more than about d/R.
 *
 * De Broglie and Heisenberg: every moving thing has a wavelength, λ = h/mv,
 * and its position and velocity cannot both be sharp, Δx·mΔv ≥ h/4π. Both
 * matter for an electron and are far too small to notice for a ball.
 * Speeds stop at 10^7.5 m/s, where λ = h/mv is still a fair approximation.
 */

export const PLANCK_H = 6.626e-34;
const ELECTRON_VOLT = 1.602e-19;
/** e²/4πε₀, in MeV fm. */
export const COULOMB_MEV_FM = 1.44;
/** The radius of Thomson's atom, in fm (1 Å). */
export const THOMSON_RADIUS_FM = 1e5;

export interface MatterParticle {
  name: string;
  /** Mass, kg. */
  mass: number;
}

export type MatterParticleId = "electron" | "proton" | "alpha" | "buckyball" | "dust" | "ball";
export const MATTER_PARTICLE_ORDER: readonly MatterParticleId[] = ["electron", "proton", "alpha", "buckyball", "dust", "ball"];
export const MATTER_PARTICLES: Record<MatterParticleId, MatterParticle> = {
  electron: { name: "electron", mass: 9.109e-31 },
  proton: { name: "proton", mass: 1.673e-27 },
  alpha: { name: "alpha particle", mass: 6.645e-27 },
  buckyball: { name: "C₆₀ molecule", mass: 1.197e-24 },
  dust: { name: "dust speck (1 µg)", mass: 1e-9 },
  ball: { name: "cricket ball (150 g)", mass: 0.15 },
};

export interface ScatterTarget {
  symbol: string;
  name: string;
  Z: number;
}

export type ScatterTargetId = "gold" | "silver" | "copper" | "aluminium";
export const SCATTER_TARGET_ORDER: readonly ScatterTargetId[] = ["gold", "silver", "copper", "aluminium"];
export const SCATTER_TARGETS: Record<ScatterTargetId, ScatterTarget> = {
  gold: { symbol: "Au", name: "Gold", Z: 79 },
  silver: { symbol: "Ag", name: "Silver", Z: 47 },
  copper: { symbol: "Cu", name: "Copper", Z: 29 },
  aluminium: { symbol: "Al", name: "Aluminium", Z: 13 },
};

export type AtomModelId = "nuclear" | "pudding";
export const ATOM_MODEL_ORDER: readonly AtomModelId[] = ["nuclear", "pudding"];

/** λ = h/mv, in metres. */
export function deBroglieWavelength(mass: number, speed: number): number {
  return PLANCK_H / (mass * speed);
}

/** The least spread in velocity, m/s, for a particle pinned down to Δx metres. */
export function minVelocitySpread(mass: number, dx: number): number {
  return PLANCK_H / (4 * Math.PI * mass * dx);
}

/** Distance of closest approach, fm, for an alpha of `energy` MeV aimed straight at a nucleus of charge Z. */
export function closestApproach(Z: number, energy: number): number {
  return (2 * Z * COULOMB_MEV_FM) / energy;
}

/** Deflection in degrees for impact parameter b, given the head-on closest approach d (same units). */
export function scatteringAngle(b: number, d: number): number {
  if (Math.abs(b) < 1e-12) return 180;
  return (2 * Math.atan(d / (2 * Math.abs(b))) * 180) / Math.PI;
}

/**
 * The path of an alpha past a nucleus at the origin, coming from the left
 * along y = b. Lengths are in the units of d. The alpha is started ten times
 * further off than `extent`, where it is still on its straight line, and
 * the part of its path within `extent` is returned.
 */
export function alphaPath(b: number, d: number, extent = 600): [number, number][] {
  let x = -10 * extent;
  let y = b;
  // Speed 1 far away, so slightly less here, part-way up the hill.
  let vx = Math.sqrt(Math.max(0, 1 - d / Math.hypot(x, y)));
  let vy = 0;
  const accel = (px: number, py: number): [number, number] => {
    const r = Math.max(1e-6, Math.hypot(px, py));
    const a = d / (2 * r * r * r);
    return [a * px, a * py];
  };
  const points: [number, number][] = [];
  let [ax, ay] = accel(x, y);
  for (let i = 0; i < 40000; i++) {
    const dt = Math.max(0.05, Math.hypot(x, y) / 40);
    x += vx * dt + 0.5 * ax * dt * dt;
    y += vy * dt + 0.5 * ay * dt * dt;
    const [nx, ny] = accel(x, y);
    vx += 0.5 * (ax + nx) * dt;
    vy += 0.5 * (ay + ny) * dt;
    ax = nx;
    ay = ny;
    const r = Math.hypot(x, y);
    if (r <= extent * 1.01) points.push([x, y]);
    else if (points.length > 0) break;
  }
  return points;
}

export type MatterWaveParams = { particle: MatterParticleId; target: ScatterTargetId; atomModel: AtomModelId };

export interface MatterWaveState {
  /** log₁₀ of the speed in m/s. */
  readonly logSpeed: number;
  /** log₁₀ of the position uncertainty in m. */
  readonly logDx: number;
  /** Impact parameter, fm. */
  readonly impact: number;
  /** Alpha kinetic energy, MeV. */
  readonly energy: number;
}

export type MatterWaveResults = {
  particle: number;
  logMass: number;
  logSpeed: number;
  speed: number;
  logMomentum: number;
  /** λ in metres, its log, and in picometres. */
  wavelength: number;
  logWavelength: number;
  wavelengthPm: number;
  /** 1 when λ is at least a picometre — long enough to diffract from a crystal. */
  wavelike: number;
  kineticEV: number;
  logDx: number;
  /** Least velocity spread: its log (m/s) and in km/s. */
  logDv: number;
  dvKmPerS: number;
  target: number;
  protons: number;
  atomModel: number;
  energy: number;
  impact: number;
  /** Head-on distance of closest approach, fm. */
  closest: number;
  /** Deflection, degrees, and how close this alpha gets, fm. */
  deflection: number;
  minDistance: number;
  /** 1 when the alpha is turned through more than 90°. */
  backscatter: number;
};

const OUTPUTS = [
  "particle", "logMass", "logSpeed", "speed", "logMomentum", "wavelength", "logWavelength", "wavelengthPm", "wavelike", "kineticEV",
  "logDx", "logDv", "dvKmPerS", "target", "protons", "atomModel", "energy", "impact", "closest", "deflection", "minDistance", "backscatter",
] as const satisfies readonly (keyof MatterWaveResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Fire alphas from this wide a miss, fm, closing in at this many fm a second. */
const WIDEST = 200;
const CLOSING = 25;

export const matterWaveModel: SimulationModel<MatterWaveState, MatterWaveParams, MatterWaveResults> = {
  id: "matterwave",
  defaultParams: { particle: "electron", target: "gold", atomModel: "nuclear" },
  outputs: OUTPUTS,
  stateVariables: ["logSpeed", "logDx", "impact", "energy"],

  initialize() {
    return { logSpeed: 6, logDx: -10, impact: 100, energy: 5.5 };
  },

  /** Play aims closer and closer, then starts again from a wide miss. */
  advance(state, dt) {
    const next = state.impact - CLOSING * dt;
    return { ...state, impact: next < 0 ? WIDEST : next };
  },

  step(state, _params, sign) {
    return { ...state, impact: clamp(Math.round(state.impact / 10) * 10 - 10 * sign, 0, WIDEST) };
  },

  derive(state, params) {
    const particle = MATTER_PARTICLES[params.particle] ?? MATTER_PARTICLES.electron;
    const logSpeed = clamp(state.logSpeed, 0, 7.5);
    const speed = 10 ** logSpeed;
    const wavelength = deBroglieWavelength(particle.mass, speed);
    const logDx = clamp(state.logDx, -15, -3);
    const dv = minVelocitySpread(particle.mass, 10 ** logDx);

    const target = SCATTER_TARGETS[params.target] ?? SCATTER_TARGETS.gold;
    const pudding = params.atomModel === "pudding";
    const energy = clamp(state.energy, 2, 10);
    const impact = clamp(state.impact, 0, WIDEST);
    const closest = closestApproach(target.Z, energy);
    const deflection = pudding ? ((closest / THOMSON_RADIUS_FM) * 180) / Math.PI : scatteringAngle(impact, closest);
    const half = (deflection * Math.PI) / 360;
    return {
      particle: Math.max(0, MATTER_PARTICLE_ORDER.indexOf(params.particle)),
      logMass: Math.log10(particle.mass),
      logSpeed,
      speed,
      logMomentum: Math.log10(particle.mass * speed),
      wavelength,
      logWavelength: Math.log10(wavelength),
      wavelengthPm: wavelength * 1e12,
      wavelike: wavelength >= 1e-12 ? 1 : 0,
      kineticEV: (0.5 * particle.mass * speed * speed) / ELECTRON_VOLT,
      logDx,
      logDv: Math.log10(dv),
      dvKmPerS: dv / 1000,
      target: Math.max(0, SCATTER_TARGET_ORDER.indexOf(params.target)),
      protons: target.Z,
      atomModel: pudding ? 1 : 0,
      energy,
      impact,
      closest,
      deflection,
      minDistance: pudding ? impact : (closest / 2) * (1 + 1 / Math.sin(half)),
      backscatter: deflection > 90 ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof MatterWaveState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "logSpeed": return { ...state, logSpeed: clamp(value, 0, 7.5) };
      case "logDx": return { ...state, logDx: clamp(value, -15, -3) };
      case "impact": return { ...state, impact: clamp(value, 0, WIDEST) };
      case "energy": return { ...state, energy: clamp(value, 2, 10) };
      default: return state;
    }
  },
};
