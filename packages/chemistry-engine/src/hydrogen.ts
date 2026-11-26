import type { SimulationModel } from "@ise/science-engine";
import { snapZero } from "@ise/units";

/**
 * The Bohr atom and the hydrogen spectrum.
 *
 * An electron drops from one allowed level to a lower one and the difference
 * in energy leaves as a single photon. Everything the chapter asks for is one
 * formula read three ways:
 *
 *   1/λ = R_H · Z² · (1/n₁² − 1/n₂²)
 *
 * The wavelength, the photon's energy, its frequency and which series it
 * belongs to are all derived from that; nothing is looked up in a table, so
 * He⁺ and Li²⁺ come for free.
 */

export type SpeciesId = "H" | "He+" | "Li2+";

export interface Species {
  id: SpeciesId;
  label: string;
  /** Nuclear charge: the whole difference between these atoms, as far as Bohr is concerned. */
  Z: number;
}

export const SPECIES: Record<SpeciesId, Species> = {
  H: { id: "H", label: "Hydrogen (H)", Z: 1 },
  "He+": { id: "He+", label: "Helium ion (He⁺)", Z: 2 },
  "Li2+": { id: "Li2+", label: "Lithium ion (Li²⁺)", Z: 3 },
};

/** The Rydberg constant for hydrogen, in cm⁻¹ — the value NCERT quotes. */
export const RYDBERG_CM = 109677;
/** Planck's constant times the speed of light, in eV·nm, so E = HC / λ. */
export const HC_EV_NM = 1239.84198;
/** The Bohr radius, in picometres, and the ground-state speed, in km/s. */
export const BOHR_RADIUS_PM = 52.9;
export const BOHR_SPEED_KMS = 2188;

/** The highest level the lab offers. Above it the levels crowd together towards zero. */
export const MAX_LEVEL = 6;

/** How long one emission takes to play out, in seconds: the electron circles, drops, and the photon flies. */
export const CYCLE = 3;
/** When in the cycle the electron drops. */
export const JUMP_AT = 1;

/** Series, numbered by the level the electron lands on. */
export const SERIES_NAMES = ["", "Lyman", "Balmer", "Paschen", "Brackett", "Pfund"] as const;

/** Where a wavelength falls: ultraviolet, visible, or infrared. */
export const REGION = { ultraviolet: 0, visible: 1, infrared: 2 } as const;
export const VISIBLE_NM: readonly [number, number] = [380, 750];

export type HydrogenParams = {
  species: SpeciesId;
};

export interface HydrogenState {
  /** The level the electron starts in, n₂. */
  readonly upper: number;
  /** The level it drops to, n₁. */
  readonly lower: number;
  /** Seconds into the current emission cycle. */
  readonly t: number;
}

export type HydrogenResults = {
  Z: number;
  upper: number;
  lower: number;
  /** Energies of the two levels, in eV: E_n = −13.6 Z²/n². */
  energyUpper: number;
  energyLower: number;
  /** The photon's energy, in eV. */
  photonEnergy: number;
  /** Its wavelength, in nm; its frequency, in THz; and its wavenumber, in cm⁻¹. */
  wavelength: number;
  frequency: number;
  wavenumber: number;
  /** Which series: the lower level, 1 Lyman … 5 Pfund. */
  series: number;
  /** 0 ultraviolet, 1 visible, 2 infrared; and 1 when you could see it. */
  region: number;
  visible: number;
  /** The shortest wavelength this series can reach — an electron falling from infinity. */
  seriesLimit: number;
  /** Orbit radii, in pm, and how many times bigger the upper orbit is. */
  radiusUpper: number;
  radiusLower: number;
  radiusRatio: number;
  /** The electron's speed in the lower orbit, in km/s. */
  speedLower: number;
  /** Energy to pull the electron right out of the lower level, and out of the ground state, in eV. */
  ionisationFromLower: number;
  ionisationEnergy: number;
  /** Where the animation is: 0 before the drop, rising to 1 as the photon leaves. */
  photonProgress: number;
  /** 1 once the electron has dropped in this cycle. */
  dropped: number;
  /** The electron's angle round its orbit, in radians. */
  electronAngle: number;
};

export function speciesOf(params: HydrogenParams): Species {
  return SPECIES[params.species] ?? SPECIES.H;
}

/** Energy of level n, in eV. */
export function levelEnergy(n: number, Z = 1): number {
  return -((HC_EV_NM * RYDBERG_CM) / 1e7) * (Z * Z) / (n * n);
}

/** The wavenumber of the n₂ → n₁ line, in cm⁻¹. */
export function lineWavenumber(upper: number, lower: number, Z = 1): number {
  return RYDBERG_CM * Z * Z * (1 / (lower * lower) - 1 / (upper * upper));
}

/** The wavelength of the n₂ → n₁ line, in nm. */
export function lineWavelength(upper: number, lower: number, Z = 1): number {
  return 1e7 / lineWavenumber(upper, lower, Z);
}

export function regionOf(wavelength: number): number {
  if (wavelength < VISIBLE_NM[0]) return REGION.ultraviolet;
  if (wavelength > VISIBLE_NM[1]) return REGION.infrared;
  return REGION.visible;
}

/** Keeps the two levels whole numbers, in range, and the upper one above the lower one. */
export function normaliseLevels(upper: number, lower: number, moved: "upper" | "lower"): { upper: number; lower: number } {
  let u = Math.round(Math.min(MAX_LEVEL, Math.max(2, upper)));
  let l = Math.round(Math.min(MAX_LEVEL - 1, Math.max(1, lower)));
  if (u <= l) {
    // Whichever level the learner moved wins, and the other gets out of its way.
    if (moved === "upper") l = u - 1;
    else u = l + 1;
  }
  return { upper: u, lower: l };
}

const OUTPUTS = [
  "Z",
  "upper",
  "lower",
  "energyUpper",
  "energyLower",
  "photonEnergy",
  "wavelength",
  "frequency",
  "wavenumber",
  "series",
  "region",
  "visible",
  "seriesLimit",
  "radiusUpper",
  "radiusLower",
  "radiusRatio",
  "speedLower",
  "ionisationFromLower",
  "ionisationEnergy",
  "photonProgress",
  "dropped",
  "electronAngle",
] as const satisfies readonly (keyof HydrogenResults)[];

export const hydrogenModel: SimulationModel<HydrogenState, HydrogenParams, HydrogenResults> = {
  id: "hydrogen",
  defaultParams: { species: "H" },
  outputs: OUTPUTS,
  stateVariables: ["upper", "lower"],

  initialize() {
    return { upper: 3, lower: 2, t: 0 };
  },

  /** Play runs the emission over and over: circle, drop, photon away. */
  advance(state, dt) {
    return { ...state, t: (state.t + dt) % CYCLE };
  },

  /** A step moves the upper level, which is the question most problems ask. */
  step(state, _params, sign) {
    return { ...state, ...normaliseLevels(state.upper + sign, state.lower, "upper"), t: 0 };
  },

  derive(state, params) {
    const { Z } = speciesOf(params);
    const { upper, lower } = normaliseLevels(state.upper, state.lower, "upper");
    const energyUpper = levelEnergy(upper, Z);
    const energyLower = levelEnergy(lower, Z);
    const wavenumber = lineWavenumber(upper, lower, Z);
    const wavelength = 1e7 / wavenumber;
    const region = regionOf(wavelength);
    const t = ((state.t % CYCLE) + CYCLE) % CYCLE;
    // The electron goes round faster in a lower orbit. The true ratio, ω ∝ Z²/n³,
    // would make the ground state a blur, so the drawing softens it to 1/n^1.5.
    const n = t < JUMP_AT ? upper : lower;
    return {
      Z,
      upper,
      lower,
      energyUpper,
      energyLower,
      photonEnergy: energyUpper - energyLower,
      wavelength,
      frequency: (2.99792458e8 / (wavelength * 1e-9)) / 1e12,
      wavenumber,
      series: lower,
      region,
      visible: region === REGION.visible ? 1 : 0,
      seriesLimit: 1e7 / (RYDBERG_CM * Z * Z / (lower * lower)),
      radiusUpper: (BOHR_RADIUS_PM * upper * upper) / Z,
      radiusLower: (BOHR_RADIUS_PM * lower * lower) / Z,
      radiusRatio: (upper * upper) / (lower * lower),
      speedLower: (BOHR_SPEED_KMS * Z) / lower,
      ionisationFromLower: snapZero(-energyLower),
      ionisationEnergy: -levelEnergy(1, Z),
      photonProgress: t < JUMP_AT ? 0 : (t - JUMP_AT) / (CYCLE - JUMP_AT),
      dropped: t < JUMP_AT ? 0 : 1,
      electronAngle: (2 * Math.PI * 1.6 * t) / n ** 1.5,
    };
  },

  getVariable(state, id) {
    if (id === "upper") return state.upper;
    if (id === "lower") return state.lower;
    return undefined;
  },

  setVariable(state, id, value) {
    if (id === "upper") return { ...state, ...normaliseLevels(value, state.lower, "upper"), t: 0 };
    if (id === "lower") return { ...state, ...normaliseLevels(state.upper, value, "lower"), t: 0 };
    return state;
  },
};
