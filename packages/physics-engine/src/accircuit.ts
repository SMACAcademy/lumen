import type { SimulationModel } from "@ise/science-engine";

/**
 * Alternating current and electromagnetic waves (class 12, NCERT ch. 7 and 8).
 *
 * The source: v = v_m sin ωt, with v_m = √2 · V_rms. India's mains, 230 V rms
 * at 50 Hz, peaks at about 325 V.
 *
 * One element at a time: in a resistor the current keeps step with the
 * voltage; in an ideal inductor it lags by 90° (X_L = ωL); in an ideal
 * capacitor it leads by 90° (X_C = 1/ωC) — "ELI the ICE man".
 *
 * The series LCR circuit: Z = √(R² + (X_L − X_C)²), I_rms = V_rms / Z, and the
 * voltage leads the current by φ with tan φ = (X_L − X_C)/R. Here φ is the
 * angle by which the voltage leads the current, so i = i_m sin(ωt − φ). NCERT
 * writes i = i_m sin(ωt + φ) with tan φ = (X_C − X_L)/R: the same physics with
 * the sign of φ turned round. At f₀ = 1/(2π√LC) the reactances cancel, Z = R
 * and the current peaks; the sharpness is Q = ω₀L/R and the bandwidth
 * (between the half-power frequencies) is R/(2πL) in hertz.
 *
 * Power: P = V_rms I_rms cos φ, and cos φ = R/Z. In a pure L or C, cos φ = 0:
 * the current flows but no average power is taken — wattless current. The
 * wattless part of any current is I_rms sin φ.
 *
 * An ideal transformer: V_s/V_p = N_s/N_p, and with no losses I_p V_p = I_s V_s.
 * The secondary drives a load equal to R. To show why power is sent at high
 * voltage, 10 kW is imagined sent along a 2 Ω line at the secondary voltage:
 * the line current is P/V_s and the heat lost is I²r.
 *
 * LC oscillations: a capacitor charged to 10 V and connected across the coil.
 * Charge q = q₀ cos ω₀t, energy sloshes between the capacitor (q²/2C) and the
 * coil (Li²/2) at ω₀ = 1/√LC, the total staying ½CV₀². Ideal: no resistance.
 *
 * Displacement current: between the plates of a charging capacitor no charge
 * crosses, but the electric flux changes, and ε₀ dΦ_E/dt equals the current in
 * the wires.
 *
 * Electromagnetic waves: E and B at right angles to each other and to the
 * direction of travel, in step, with E₀/B₀ = c = 1/√(μ₀ε₀) = 3 × 10⁸ m/s in
 * vacuum. The average energy density is ½ε₀E₀², the intensity I = ½ε₀cE₀²,
 * and the radiation pressure on a surface that absorbs it all is I/c. The
 * spectrum is split by wavelength with NCERT's boundaries (Table 8.1).
 *
 * Every animation runs on one slowed-down clock, θ: Play advances θ at
 * 2 rad per second of screen time whatever the real frequency, so 50 Hz and
 * 10¹⁵ Hz can both be watched.
 */

export type AcCircuitKind = "R" | "L" | "C" | "LCR";
export const AC_CIRCUIT_ORDER: readonly AcCircuitKind[] = ["R", "L", "C", "LCR"];
export const AC_CIRCUIT_LABELS: Record<AcCircuitKind, string> = {
  R: "Resistor alone",
  L: "Inductor alone",
  C: "Capacitor alone",
  LCR: "Series LCR",
};

/** Permittivity and permeability of free space, and the speed of light (NCERT values). */
export const AC_EPSILON0 = 8.854e-12;
export const AC_MU0 = 4 * Math.PI * 1e-7;
export const AC_LIGHT_SPEED = 3e8;

/** Play turns θ at this rate (rad per second of screen time). */
export const AC_VISUAL_RATE = 2;
/** θ wraps after two cycles, so the traces show two. */
export const AC_THETA_WRAP = 4 * Math.PI;
/** Within this many hertz of f₀ counts as at resonance (the frequency slider moves in 1 Hz steps). */
export const AC_RESONANCE_WINDOW = 1;
/** The capacitor of the LC circuit starts charged to this voltage, V. */
export const AC_LC_VOLTAGE = 10;
/** The power imagined sent along a transmission line, W, and the line's resistance, Ω. */
export const AC_LINE_POWER = 10000;
export const AC_LINE_RESISTANCE = 2;

/** Each band of the spectrum, shortest wavelength first, up to (not including) `upTo` = log₁₀(λ/m). */
export interface EmBand {
  id: string;
  label: string;
  short: string;
  upTo: number;
  source: string;
  use: string;
}

export const EM_BANDS: readonly EmBand[] = [
  { id: "gamma", label: "Gamma rays", short: "γ", upTo: -12, source: "radioactive nuclei", use: "treating cancer" },
  { id: "xray", label: "X-rays", short: "X-ray", upTo: -9, source: "X-ray tubes", use: "seeing bones" },
  { id: "uv", label: "Ultraviolet", short: "UV", upTo: Math.log10(400e-9), source: "the Sun, arc lamps", use: "killing germs in water" },
  { id: "visible", label: "Visible light", short: "visible", upTo: Math.log10(700e-9), source: "the Sun, lamps", use: "seeing" },
  { id: "infrared", label: "Infrared", short: "IR", upTo: -3, source: "warm bodies", use: "TV remotes, night vision" },
  { id: "microwave", label: "Microwaves", short: "micro", upTo: -1, source: "magnetrons", use: "radar, ovens, Wi-Fi" },
  { id: "radio", label: "Radio waves", short: "radio", upTo: Number.POSITIVE_INFINITY, source: "aerials carrying AC", use: "radio and TV" },
];

/** Index into EM_BANDS for a wavelength of 10^exp metres. */
export function emBandOf(exp: number): number {
  const i = EM_BANDS.findIndex((b) => exp < b.upTo);
  return i < 0 ? EM_BANDS.length - 1 : i;
}

/** The limits of each slider, also enforced by setVariable. */
export const AC_LIMITS = {
  vrms: [10, 240],
  freq: [10, 2000],
  resistance: [1, 200],
  inductance: [10, 1000],
  capacitance: [1, 100],
  np: [50, 1000],
  ns: [10, 2000],
  lambdaExp: [-14, 3],
  e0: [1, 1000],
  theta: [0, AC_THETA_WRAP],
} as const satisfies Record<string, readonly [number, number]>;

export type AcParams = { circuit: AcCircuitKind };

export interface AcState {
  /** Supply rms voltage, V (also the transformer's primary voltage). */
  readonly vrms: number;
  /** Supply frequency, Hz. */
  readonly freq: number;
  /** Resistance, Ω (also the transformer's load). */
  readonly resistance: number;
  /** Inductance, mH. */
  readonly inductance: number;
  /** Capacitance, µF. */
  readonly capacitance: number;
  /** Primary and secondary turns. */
  readonly np: number;
  readonly ns: number;
  /** Wavelength as a power of ten: λ = 10^lambdaExp m. */
  readonly lambdaExp: number;
  /** Peak electric field of the wave, V/m. */
  readonly e0: number;
  /** The slowed-down clock: ωt for the AC circuit, ω₀t for the LC circuit, the wave's phase. */
  readonly theta: number;
}

export type AcResults = {
  circuit: number;
  vrms: number;
  vpeak: number;
  freq: number;
  omega: number;
  resistance: number;
  inductance: number;
  capacitance: number;
  xl: number;
  xc: number;
  z: number;
  /** Angle by which the voltage leads the current, rad. */
  phase: number;
  /** 1 the current lags the voltage, −1 it leads, 0 in step. */
  lagLead: number;
  irms: number;
  ipeak: number;
  /** rms voltages across R, L and C. */
  vr: number;
  vl: number;
  vc: number;
  power: number;
  powerFactor: number;
  wattless: number;
  f0: number;
  q: number;
  bandwidth: number;
  atResonance: number;
  theta: number;
  /** Instantaneous supply voltage, current and power. */
  v: number;
  i: number;
  p: number;
  np: number;
  ns: number;
  turnsRatio: number;
  vs: number;
  is: number;
  ip: number;
  transformerPower: number;
  /** 1 step-up, −1 step-down, 0 neither. */
  stepUp: number;
  lineCurrent: number;
  /** Percentage of the 10 kW lost in the line, capped at 100. */
  lineLoss: number;
  lcPeriod: number;
  lcEnergy: number;
  lcElectric: number;
  lcMagnetic: number;
  /** Share of the LC energy in the capacitor, 0–1. */
  lcShare: number;
  /** Charge on the LC capacitor, µC, and the current in the coil, A. */
  lcCharge: number;
  lcCurrent: number;
  /** rms displacement current between the capacitor plates, A (0 with no capacitor). */
  dispCurrent: number;
  /** Peak rate of change of electric flux between the plates, V m/s. */
  fluxRate: number;
  /** Instantaneous voltage across the capacitor, V. */
  vcap: number;
  lambdaExp: number;
  wavelength: number;
  emFreq: number;
  band: number;
  speed: number;
  cFromConstants: number;
  e0: number;
  /** Peak magnetic field, µT. */
  b0: number;
  energyDensity: number;
  intensity: number;
  pressure: number;
};

const OUTPUTS = [
  "circuit", "vrms", "vpeak", "freq", "omega", "resistance", "inductance", "capacitance",
  "xl", "xc", "z", "phase", "lagLead", "irms", "ipeak", "vr", "vl", "vc",
  "power", "powerFactor", "wattless", "f0", "q", "bandwidth", "atResonance",
  "theta", "v", "i", "p",
  "np", "ns", "turnsRatio", "vs", "is", "ip", "transformerPower", "stepUp", "lineCurrent", "lineLoss",
  "lcPeriod", "lcEnergy", "lcElectric", "lcMagnetic", "lcShare", "lcCharge", "lcCurrent",
  "dispCurrent", "fluxRate", "vcap",
  "lambdaExp", "wavelength", "emFreq", "band", "speed", "cFromConstants", "e0", "b0", "energyDensity", "intensity", "pressure",
] as const satisfies readonly (keyof AcResults)[];

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
const limit = (key: keyof typeof AC_LIMITS, v: number) => clamp(v, AC_LIMITS[key][0], AC_LIMITS[key][1]);
const z0 = (v: number) => v || 0;

const circuitOf = (params: AcParams): AcCircuitKind => (AC_CIRCUIT_ORDER.includes(params.circuit) ? params.circuit : "L");

/** Resonant frequency, Hz, of an inductance in mH and a capacitance in µF. */
export function acResonantFrequency(inductanceMh: number, capacitanceUf: number): number {
  return 1 / (2 * Math.PI * Math.sqrt(inductanceMh * 1e-3 * capacitanceUf * 1e-6));
}

/** rms current through a series LCR circuit at frequency f (Hz); L in mH, C in µF. */
export function acCurrentAt(f: number, vrms: number, resistance: number, inductanceMh: number, capacitanceUf: number): number {
  const w = 2 * Math.PI * Math.max(f, 1e-9);
  const x = w * inductanceMh * 1e-3 - 1 / (w * capacitanceUf * 1e-6);
  return vrms / Math.hypot(resistance, x);
}

export const acCircuitModel: SimulationModel<AcState, AcParams, AcResults> = {
  id: "accircuit",
  defaultParams: { circuit: "L" },
  outputs: OUTPUTS,
  stateVariables: ["vrms", "freq", "resistance", "inductance", "capacitance", "np", "ns", "lambdaExp", "e0", "theta"],

  initialize() {
    return { vrms: 230, freq: 50, resistance: 100, inductance: 100, capacitance: 10, np: 1000, ns: 50, lambdaExp: -6.27, e0: 100, theta: 0 };
  },

  /** Play turns the slowed-down clock; it wraps after two cycles. */
  advance(state, dt) {
    const theta = state.theta + AC_VISUAL_RATE * dt;
    return { ...state, theta: theta >= AC_THETA_WRAP ? theta % AC_THETA_WRAP : theta };
  },

  step(state, _params, sign) {
    return { ...state, freq: limit("freq", Math.round(state.freq / 10) * 10 + 10 * sign) };
  },

  derive(state, params) {
    const kind = circuitOf(params);
    const vrms = limit("vrms", state.vrms);
    const f = limit("freq", state.freq);
    const R = limit("resistance", state.resistance);
    const Lmh = limit("inductance", state.inductance);
    const Cuf = limit("capacitance", state.capacitance);
    const L = Lmh * 1e-3;
    const C = Cuf * 1e-6;
    const omega = 2 * Math.PI * f;
    const xl = omega * L;
    const xc = 1 / (omega * C);
    const f0 = acResonantFrequency(Lmh, Cuf);
    const atResonance = kind === "LCR" && Math.abs(f - f0) <= AC_RESONANCE_WINDOW ? 1 : 0;

    let z: number;
    let phase: number;
    let powerFactor: number;
    let lagLead: number;
    switch (kind) {
      case "R":
        [z, phase, powerFactor, lagLead] = [R, 0, 1, 0];
        break;
      case "L":
        [z, phase, powerFactor, lagLead] = [xl, Math.PI / 2, 0, 1];
        break;
      case "C":
        [z, phase, powerFactor, lagLead] = [xc, -Math.PI / 2, 0, -1];
        break;
      default:
        z = Math.hypot(R, xl - xc);
        phase = Math.atan2(xl - xc, R);
        powerFactor = R / z;
        lagLead = atResonance ? 0 : Math.sign(xl - xc);
    }
    const irms = vrms / z;
    const vpeak = Math.SQRT2 * vrms;
    const ipeak = Math.SQRT2 * irms;
    const has = (part: "R" | "L" | "C") => kind === part || kind === "LCR";
    const vr = has("R") ? irms * R : 0;
    const vl = has("L") ? irms * xl : 0;
    const vc = has("C") ? irms * xc : 0;

    const theta = clamp(state.theta, 0, AC_THETA_WRAP);
    const v = vpeak * Math.sin(theta);
    const i = ipeak * Math.sin(theta - phase);
    // The capacitor's voltage lags the current through it by 90°.
    const vcap = has("C") ? ipeak * xc * Math.sin(theta - phase - Math.PI / 2) : 0;

    const np = limit("np", state.np);
    const ns = limit("ns", state.ns);
    const vs = (vrms * ns) / np;
    const is = vs / R;
    const ip = (is * ns) / np;
    const lineCurrent = AC_LINE_POWER / vs;
    const lineLoss = Math.min(100, ((lineCurrent * lineCurrent * AC_LINE_RESISTANCE) / AC_LINE_POWER) * 100);

    const w0 = 1 / Math.sqrt(L * C);
    const q0 = C * AC_LC_VOLTAGE;
    const lcEnergy = 0.5 * C * AC_LC_VOLTAGE * AC_LC_VOLTAGE;
    const share = Math.cos(theta) ** 2;

    const lambdaExp = limit("lambdaExp", state.lambdaExp);
    const wavelength = 10 ** lambdaExp;
    const e0 = limit("e0", state.e0);
    const energyDensity = 0.5 * AC_EPSILON0 * e0 * e0;
    const intensity = energyDensity * AC_LIGHT_SPEED;

    return {
      circuit: AC_CIRCUIT_ORDER.indexOf(kind),
      vrms,
      vpeak,
      freq: f,
      omega,
      resistance: R,
      inductance: Lmh,
      capacitance: Cuf,
      xl,
      xc,
      z,
      phase: z0(phase),
      lagLead: z0(lagLead),
      irms,
      ipeak,
      vr,
      vl,
      vc,
      power: vrms * irms * powerFactor,
      powerFactor,
      wattless: irms * Math.abs(Math.sin(phase)),
      f0,
      q: (2 * Math.PI * f0 * L) / R,
      bandwidth: R / (2 * Math.PI * L),
      atResonance,
      theta,
      v: z0(v),
      i: z0(i),
      p: z0(v * i),
      np,
      ns,
      turnsRatio: ns / np,
      vs,
      is,
      ip,
      transformerPower: vs * is,
      stepUp: Math.sign(ns - np),
      lineCurrent,
      lineLoss,
      lcPeriod: (2 * Math.PI) / w0,
      lcEnergy,
      lcElectric: lcEnergy * share,
      lcMagnetic: lcEnergy * (1 - share),
      lcShare: share,
      lcCharge: z0(q0 * Math.cos(theta) * 1e6),
      lcCurrent: z0(-q0 * w0 * Math.sin(theta)),
      dispCurrent: has("C") ? irms : 0,
      fluxRate: has("C") ? ipeak / AC_EPSILON0 : 0,
      vcap: z0(vcap),
      lambdaExp,
      wavelength,
      emFreq: AC_LIGHT_SPEED / wavelength,
      band: emBandOf(lambdaExp),
      speed: AC_LIGHT_SPEED,
      cFromConstants: 1 / Math.sqrt(AC_MU0 * AC_EPSILON0),
      e0,
      b0: (e0 / AC_LIGHT_SPEED) * 1e6,
      energyDensity,
      intensity,
      pressure: intensity / AC_LIGHT_SPEED,
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof AcState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in AC_LIMITS)) return state;
    return { ...state, [id]: limit(id as keyof typeof AC_LIMITS, value) };
  },
};
