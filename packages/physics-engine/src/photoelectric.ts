import type { SimulationModel } from "@ise/science-engine";

/**
 * Dual nature of radiation and matter (NCERT class 12, chapter 11).
 *
 * A photocell: light of one wavelength falls on a metal plate (the emitter)
 * in a vacuum tube, and a second plate (the collector) is held at a chosen
 * potential. Light comes in photons of energy E = hν = hc/λ and momentum
 * p = h/λ. One photon gives all its energy to one electron; the electron
 * needs at least the work function φ to leave the metal, so nothing comes
 * out below the threshold frequency ν₀ = φ/h however bright the light. Above
 * it the fastest electrons leave with K_max = hν − φ (Einstein's equation),
 * and a collector at −V₀ with eV₀ = K_max just stops them all. Brighter light
 * means more photons, so more electrons and a bigger saturation current, but
 * the same V₀. V₀ against ν is a straight line of slope h/e that meets the
 * ν axis at ν₀ — the way Millikan measured h.
 *
 * Matter has a wavelength too: an electron accelerated through V volts has
 * λ = h/√(2meV) ≈ 1.227/√V nm. Davisson and Germer fired 54 eV electrons at
 * a nickel crystal and found a strong scattered beam at 50°.
 *
 * Modelling choices (said in the concept text as well):
 * - Work functions are NCERT's table of work functions.
 * - One electron leaves for every 100 photons above the threshold (a quantum
 *   efficiency of 1%, a round model value); real metals vary with frequency.
 * - The emitted electrons' kinetic energies are spread evenly from 0 to
 *   K_max, so the current falls in a straight line from saturation at V = 0
 *   to zero at −V₀. Every electron that leaves is collected once V ≥ 0.
 * - Davisson–Germer: the peak angle follows the surface-grating rule
 *   D sin θ = λ with nickel's row spacing D = 0.215 nm; the shape of the
 *   intensity-against-angle curve (a smooth background plus a bump whose
 *   height is greatest at 54 V) is a model shape, not measured data.
 */

/** Planck's constant (J s), the electron's charge (C), the speed of light (m/s) and the electron's mass (kg), as NCERT uses them. */
export const PHOTO_H = 6.63e-34;
export const PHOTO_E = 1.6e-19;
export const PHOTO_C = 3e8;
export const PHOTO_ME = 9.11e-31;
/** hc in eV nm (≈ 1240). */
export const PHOTO_HC_EV_NM = (PHOTO_H * PHOTO_C) / PHOTO_E / 1e-9;
/** h/e in V s, the slope of V₀ against ν. */
export const PHOTO_H_OVER_E = PHOTO_H / PHOTO_E;
/** One electron per this many photons above the threshold (a 1% quantum efficiency). */
export const PHOTO_PHOTONS_PER_ELECTRON = 100;
/** Spacing of the rows of atoms on the nickel surface, nm. */
export const PHOTO_NI_SPACING = 0.215;
/** The voltage at which the Davisson–Germer bump is strongest, V. */
export const PHOTO_DG_VOLTAGE = 54;

export type PhotoMetal = "cs" | "k" | "na" | "ca" | "cu" | "pt";
export const PHOTO_METAL_ORDER: readonly PhotoMetal[] = ["cs", "k", "na", "ca", "cu", "pt"];
/** Work functions, eV — NCERT's table of work functions. */
export const PHOTO_METALS: Record<PhotoMetal, { label: string; symbol: string; workFunction: number }> = {
  cs: { label: "Caesium", symbol: "Cs", workFunction: 2.14 },
  k: { label: "Potassium", symbol: "K", workFunction: 2.3 },
  na: { label: "Sodium", symbol: "Na", workFunction: 2.75 },
  ca: { label: "Calcium", symbol: "Ca", workFunction: 3.2 },
  cu: { label: "Copper", symbol: "Cu", workFunction: 4.65 },
  pt: { label: "Platinum", symbol: "Pt", workFunction: 5.65 },
};

/** Control ranges: wavelength (nm), frequency (THz), light power (mW), collector potential (V), accelerating voltage (V), detector angle (°). */
export const PHOTO_WAVELENGTH_RANGE = [150, 750] as const;
export const PHOTO_FREQUENCY_RANGE = [400, 2000] as const;
export const PHOTO_POWER_RANGE = [0, 2] as const;
export const PHOTO_COLLECTOR_RANGE = [-8, 4] as const;
export const PHOTO_ACCEL_RANGE = [10, 150] as const;
export const PHOTO_DETECTOR_RANGE = [10, 90] as const;
/** The animation loops every this many seconds. */
export const PHOTO_LOOP = 2;

export type PhotoelectricParams = { metal: PhotoMetal };

export interface PhotoelectricState {
  /** Wavelength of the light, nm. */
  readonly wavelength: number;
  /** Power of the light falling on the metal, mW. */
  readonly power: number;
  /** Potential of the collector relative to the emitter, V. */
  readonly collector: number;
  /** Voltage accelerating the Davisson–Germer electrons, V. */
  readonly accel: number;
  /** Detector angle from the incident electron beam, degrees. */
  readonly detector: number;
  /** Animation time, s. */
  readonly t: number;
}

export type PhotoelectricResults = {
  metal: number;
  workFunction: number;
  wavelength: number;
  /** THz. */
  frequency: number;
  /** eV, and in units of 10⁻¹⁹ J. */
  photonEnergy: number;
  photonEnergyJ: number;
  /** Units of 10⁻²⁷ kg m/s. */
  photonMomentum: number;
  thresholdFrequency: number;
  thresholdWavelength: number;
  /** 1 when hν ≥ φ, so electrons come out. */
  emits: number;
  kMax: number;
  stoppingPotential: number;
  /** km/s. */
  vMax: number;
  power: number;
  /** Units of 10¹⁵ photons per second. */
  photonFlux: number;
  /** µA. */
  saturationCurrent: number;
  collector: number;
  /** −collector: the retarding potential, V. */
  retarding: number;
  /** µA. */
  current: number;
  /** Fraction of the emitted electrons that reach the collector. */
  collected: number;
  /** Units of 10⁻¹⁵ V s, and 10⁻³⁴ J s. */
  hOverE: number;
  planck: number;
  accel: number;
  /** nm. */
  electronWavelength: number;
  /** Units of 10⁻²⁴ kg m/s. */
  electronMomentum: number;
  hasPeak: number;
  /** Degrees; 0 when λ > D and there is no peak. */
  peakAngle: number;
  /** Height of the bump at this voltage, 0–1. */
  peakHeight: number;
  detector: number;
  /** Relative counts at the detector, 0–100. */
  detectorReading: number;
  /** D sin θ at the detector angle, nm. */
  gratingWavelength: number;
  t: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const DEG = Math.PI / 180;

/** Photon energy in eV for a wavelength in nm: hc/λ. */
export function photoPhotonEnergy(nm: number): number {
  return PHOTO_HC_EV_NM / nm;
}

/** Frequency (THz) of light of wavelength `nm`, and back. */
export function photoFrequencyOf(nm: number): number {
  return PHOTO_C / (nm * 1e-9) / 1e12;
}
export function photoWavelengthOf(thz: number): number {
  return PHOTO_C / (thz * 1e12) / 1e-9;
}

/** Threshold frequency ν₀ = φ/h, THz, for a work function in eV. */
export function photoThresholdFrequency(phi: number): number {
  return (phi * PHOTO_E) / PHOTO_H / 1e12;
}

/** De Broglie wavelength (nm) of an electron accelerated through `volts`: h/√(2meV). */
export function photoElectronWavelength(volts: number): number {
  return PHOTO_H / Math.sqrt(2 * PHOTO_ME * PHOTO_E * volts) / 1e-9;
}

/** Davisson–Germer peak angle (degrees) for an electron wavelength in nm, or 0 if λ > D. */
export function photoPeakAngle(lambda: number): number {
  return lambda > 0 && lambda <= PHOTO_NI_SPACING ? Math.asin(lambda / PHOTO_NI_SPACING) / DEG : 0;
}

/** Height of the Davisson–Germer bump at a voltage: a model shape, greatest at 54 V. */
export function photoPeakHeight(volts: number): number {
  return 0.55 * Math.exp(-(((volts - PHOTO_DG_VOLTAGE) / 8) ** 2));
}

/** Relative scattered intensity (0–100) at an angle (degrees) for electrons accelerated through `volts`. A model shape. */
export function photoScatter(volts: number, angle: number): number {
  const background = 0.25 + 0.25 * Math.cos(angle * DEG);
  const peak = photoPeakAngle(photoElectronWavelength(volts));
  const bump = peak > 0 ? photoPeakHeight(volts) * Math.exp(-(((angle - peak) / 6) ** 2)) : 0;
  return 100 * (background + bump);
}

/** Photocurrent (µA) at a collector potential, given the saturation current and the stopping potential. */
export function photoCurrentAt(saturation: number, stopping: number, collector: number): number {
  if (saturation <= 0) return 0;
  if (collector >= 0) return saturation;
  if (stopping <= 0) return 0;
  return saturation * Math.max(0, 1 + collector / stopping);
}

const metalOf = (params: PhotoelectricParams): PhotoMetal => (PHOTO_METAL_ORDER.includes(params.metal) ? params.metal : "cs");

const OUTPUTS = [
  "metal", "workFunction", "wavelength", "frequency", "photonEnergy", "photonEnergyJ", "photonMomentum",
  "thresholdFrequency", "thresholdWavelength", "emits", "kMax", "stoppingPotential", "vMax",
  "power", "photonFlux", "saturationCurrent", "collector", "retarding", "current", "collected", "hOverE", "planck",
  "accel", "electronWavelength", "electronMomentum", "hasPeak", "peakAngle", "peakHeight", "detector", "detectorReading", "gratingWavelength", "t",
] as const satisfies readonly (keyof PhotoelectricResults)[];

const clampWavelength = (nm: number) => clamp(nm, PHOTO_WAVELENGTH_RANGE[0], PHOTO_WAVELENGTH_RANGE[1]);

export const photoelectricModel: SimulationModel<PhotoelectricState, PhotoelectricParams, PhotoelectricResults> = {
  id: "photoelectric",
  defaultParams: { metal: "cs" },
  outputs: OUTPUTS,
  stateVariables: ["wavelength", "frequency", "power", "collector", "accel", "detector", "t"],

  initialize() {
    return { wavelength: 400, power: 1, collector: 0, accel: 54, detector: 30, t: 0 };
  },

  /** Play runs the electrons (and photons) across; the picture loops. */
  advance(state, dt) {
    const t = state.t + dt;
    return { ...state, t: t >= PHOTO_LOOP ? t % PHOTO_LOOP : Math.max(0, t) };
  },

  step(state, _params, sign) {
    return { ...state, wavelength: clampWavelength(Math.round(state.wavelength / 10) * 10 + 10 * sign) };
  },

  derive(state, params) {
    const metalId = metalOf(params);
    const phi = PHOTO_METALS[metalId].workFunction;
    const lambda = clampWavelength(state.wavelength);
    const nu = photoFrequencyOf(lambda);
    const energy = photoPhotonEnergy(lambda);
    const emits = energy >= phi ? 1 : 0;
    const kMax = emits ? energy - phi : 0;
    const power = clamp(state.power, PHOTO_POWER_RANGE[0], PHOTO_POWER_RANGE[1]);
    // Photons per second N = P / hν, with P in W and hν in J.
    const flux = (power * 1e-3) / (energy * PHOTO_E);
    const saturation = emits ? ((flux / PHOTO_PHOTONS_PER_ELECTRON) * PHOTO_E) / 1e-6 : 0;
    const collector = clamp(state.collector, PHOTO_COLLECTOR_RANGE[0], PHOTO_COLLECTOR_RANGE[1]);
    const current = photoCurrentAt(saturation, kMax, collector);

    const accel = clamp(state.accel, PHOTO_ACCEL_RANGE[0], PHOTO_ACCEL_RANGE[1]);
    const eLambda = photoElectronWavelength(accel);
    const peakAngle = photoPeakAngle(eLambda);
    const detector = clamp(state.detector, PHOTO_DETECTOR_RANGE[0], PHOTO_DETECTOR_RANGE[1]);
    return {
      metal: PHOTO_METAL_ORDER.indexOf(metalId),
      workFunction: phi,
      wavelength: lambda,
      frequency: nu,
      photonEnergy: energy,
      photonEnergyJ: (energy * PHOTO_E) / 1e-19,
      photonMomentum: PHOTO_H / (lambda * 1e-9) / 1e-27,
      thresholdFrequency: photoThresholdFrequency(phi),
      thresholdWavelength: PHOTO_HC_EV_NM / phi,
      emits,
      kMax,
      stoppingPotential: kMax,
      vMax: Math.sqrt((2 * kMax * PHOTO_E) / PHOTO_ME) / 1000,
      power,
      photonFlux: flux / 1e15,
      saturationCurrent: saturation,
      collector,
      retarding: -collector || 0,
      current,
      collected: saturation > 0 ? current / saturation : 0,
      hOverE: PHOTO_H_OVER_E / 1e-15,
      planck: PHOTO_H / 1e-34,
      accel,
      electronWavelength: eLambda,
      electronMomentum: Math.sqrt(2 * PHOTO_ME * PHOTO_E * accel) / 1e-24,
      hasPeak: peakAngle > 0 ? 1 : 0,
      peakAngle,
      peakHeight: peakAngle > 0 ? photoPeakHeight(accel) : 0,
      detector,
      detectorReading: photoScatter(accel, detector),
      gratingWavelength: PHOTO_NI_SPACING * Math.sin(detector * DEG),
      t: clamp(state.t, 0, PHOTO_LOOP),
    };
  },

  getVariable(state, id) {
    if (id === "frequency") return photoFrequencyOf(clampWavelength(state.wavelength));
    return id in state ? state[id as keyof PhotoelectricState] : undefined;
  },

  setVariable(state, id, value) {
    switch (id) {
      case "wavelength": return { ...state, wavelength: clampWavelength(value) };
      case "frequency": return { ...state, wavelength: clampWavelength(photoWavelengthOf(clamp(value, PHOTO_FREQUENCY_RANGE[0], PHOTO_FREQUENCY_RANGE[1]))) };
      case "power": return { ...state, power: clamp(value, PHOTO_POWER_RANGE[0], PHOTO_POWER_RANGE[1]) };
      case "collector": return { ...state, collector: clamp(value, PHOTO_COLLECTOR_RANGE[0], PHOTO_COLLECTOR_RANGE[1]) };
      case "accel": return { ...state, accel: clamp(value, PHOTO_ACCEL_RANGE[0], PHOTO_ACCEL_RANGE[1]) };
      case "detector": return { ...state, detector: clamp(value, PHOTO_DETECTOR_RANGE[0], PHOTO_DETECTOR_RANGE[1]) };
      case "t": return { ...state, t: clamp(value, 0, PHOTO_LOOP) };
      default: return state;
    }
  },
};
