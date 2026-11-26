import type { SimulationModel } from "@ise/science-engine";

/**
 * Waves for class 11 (NCERT chapter 14): one string, one column of air.
 *
 * Travelling: a sine wave y = A sin(kx − ωt) runs along a stretched string at
 * v = √(T/μ). Every bit of string only moves up and down (transverse); in air
 * the particles swing back and forth along the direction of travel
 * (longitudinal). Either way v = fλ, k = 2π/λ and ω = 2πf.
 *
 * Sound speed: Newton took the squeezing to be isothermal, v = √(P/ρ), and got
 * 280 m/s at 0 °C. Laplace saw it is adiabatic, v = √(γP/ρ) = 331 m/s. With
 * ρ = PM/RT the pressure cancels: only the temperature matters.
 *
 * Superposition: two equal waves a phase φ apart add to one of amplitude
 * 2A|cos(φ/2)|. A pulse reflects from a fixed end upside down (a phase change
 * of π) and from a free end the right way up.
 *
 * Standing waves: a string fixed at both ends, or a pipe open at both ends,
 * has f = nv/2L for every n; a pipe closed at one end only the odd harmonics,
 * f = (2n − 1)v/4L. In the resonance-tube experiment the antinode sits a
 * little above the open end, by e ≈ 0.3d, so L + e = λ/4, 3λ/4, …
 *
 * Beats: two notes f₁ and f₂ swell and fade |f₁ − f₂| times a second.
 * Doppler: f′ = f(v + v_o)/(v − v_s), with v_o positive when the observer
 * moves towards the source and v_s positive when the source moves towards the
 * observer. Intensity: I = P/4πr², level β = 10 log₁₀(I/I₀), I₀ = 10⁻¹² W/m².
 *
 * The animation clock runs in slow motion: one shown cycle every two seconds,
 * whatever the real frequency.
 */

export type WaveMedium = "string" | "air";
export type WaveEnd = "fixed" | "free";
export type WaveSystem = "string" | "open" | "closed";

export const WAVE_MEDIUM_ORDER: readonly WaveMedium[] = ["string", "air"];
export const WAVE_END_ORDER: readonly WaveEnd[] = ["fixed", "free"];
export const WAVE_SYSTEM_ORDER: readonly WaveSystem[] = ["string", "open", "closed"];

/** Gas constant, J/(mol K); molar mass of dry air, kg/mol; its ratio of specific heats. */
export const WAVE_GAS_CONSTANT = 8.314;
export const WAVE_AIR_MOLAR_MASS = 0.02897;
export const WAVE_AIR_GAMMA = 1.4;
/** Threshold of hearing, W/m². */
export const WAVE_I0 = 1e-12;
/** End correction of a resonance tube, as a fraction of its inner diameter. */
export const WAVE_END_CORRECTION = 0.3;
/** A column within this of a resonance length (cm) resonates. */
export const WAVE_RESONANCE_WIDTH = 0.5;
/** Shown cycles per second of the slow-motion animation, and the clock's loop, s. */
export const WAVE_SHOWN_HZ = 0.5;
export const WAVE_CLOCK_LOOP = 12;
/** Time for the pulse to run out to the end of the string and back, s. */
export const WAVE_PULSE_LAP = 6;
/** Lengths of string and of air in view, m. */
export const WAVE_STRING_VIEW = 4;
export const WAVE_AIR_VIEW = 8;

/** The range of every control, in its stored unit. */
export const WAVE_LIMITS = {
  tension: [10, 400],
  density: [1, 40],
  frequency: [10, 1000],
  amplitude: [1, 20],
  temperature: [-20, 50],
  pressure: [50, 200],
  phaseDifference: [0, 360],
  length: [0.2, 2],
  harmonic: [1, 6],
  column: [5, 110],
  diameter: [1, 8],
  frequency2: [10, 1000],
  sourceSpeed: [-100, 100],
  observerSpeed: [-100, 100],
  power: [0.01, 10],
  distance: [1, 100],
  clock: [0, WAVE_CLOCK_LOOP],
} as const satisfies Record<string, readonly [number, number]>;

export type WaveMotionParams = {
  /** What the travelling wave runs along. */
  medium: WaveMedium;
  /** How the far end of the string is held, for the reflected pulse. */
  end: WaveEnd;
  /** What vibrates in a standing wave. */
  system: WaveSystem;
};

export interface WaveMotionState {
  /** Tension in the string, N. */
  readonly tension: number;
  /** Mass per unit length of the string, g/m. */
  readonly density: number;
  /** Frequency of the source, Hz. */
  readonly frequency: number;
  /** Amplitude, mm. */
  readonly amplitude: number;
  /** Air temperature, °C, and pressure, kPa. */
  readonly temperature: number;
  readonly pressure: number;
  /** Phase difference between the two superposed waves, degrees. */
  readonly phaseDifference: number;
  /** Length of the string or pipe, m, and which mode it vibrates in (1, 2, 3 …). */
  readonly length: number;
  readonly harmonic: number;
  /** Resonance tube: length of the air column, cm, and the tube's inner diameter, cm. */
  readonly column: number;
  readonly diameter: number;
  /** The second note, for beats, Hz. */
  readonly frequency2: number;
  /** Doppler: + towards the other, m/s. */
  readonly sourceSpeed: number;
  readonly observerSpeed: number;
  /** Sound power of the source, W, and the listener's distance from it, m. */
  readonly power: number;
  readonly distance: number;
  /** Slow-motion animation time, s. */
  readonly clock: number;
}

export type WaveMotionResults = {
  medium: number;
  transverse: number;
  tension: number;
  density: number;
  frequency: number;
  amplitude: number;
  stringSpeed: number;
  speed: number;
  wavelength: number;
  wavenumber: number;
  angularFrequency: number;
  period: number;
  maxParticleSpeed: number;
  /** The shown phase ωt of the animation, rad in [0, 2π). */
  cyclePhase: number;
  clock: number;
  temperature: number;
  pressure: number;
  airDensity: number;
  soundSpeed: number;
  newtonSpeed: number;
  phaseDifference: number;
  resultant: number;
  /** 2 constructive, 1 partial, 0 destructive. */
  interference: number;
  end: number;
  reflectedSign: number;
  phaseChange: number;
  /** Where the incident pulse's peak would be, as a fraction of the string (beyond 1 it has reflected). */
  pulseCentre: number;
  reflected: number;
  system: number;
  harmonic: number;
  harmonicNumber: number;
  length: number;
  standingSpeed: number;
  standingWavelength: number;
  standingFrequency: number;
  fundamental: number;
  nodes: number;
  antinodes: number;
  column: number;
  diameter: number;
  endCorrection: number;
  firstResonance: number;
  secondResonance: number;
  resonanceOrder: number;
  response: number;
  tubeSpeed: number;
  frequency2: number;
  beatFrequency: number;
  beatPeriod: number;
  averageFrequency: number;
  sourceSpeed: number;
  observerSpeed: number;
  observedFrequency: number;
  dopplerShift: number;
  /** 1 higher, 0 unchanged, −1 lower. */
  pitchChange: number;
  wavelengthAhead: number;
  mach: number;
  power: number;
  distance: number;
  intensity: number;
  level: number;
  /** 0 whisper-quiet … 4 painful. */
  loudness: number;
};

const OUTPUTS = [
  "medium", "transverse", "tension", "density", "frequency", "amplitude", "stringSpeed", "speed", "wavelength", "wavenumber",
  "angularFrequency", "period", "maxParticleSpeed", "cyclePhase", "clock",
  "temperature", "pressure", "airDensity", "soundSpeed", "newtonSpeed",
  "phaseDifference", "resultant", "interference", "end", "reflectedSign", "phaseChange", "pulseCentre", "reflected",
  "system", "harmonic", "harmonicNumber", "length", "standingSpeed", "standingWavelength", "standingFrequency", "fundamental", "nodes", "antinodes",
  "column", "diameter", "endCorrection", "firstResonance", "secondResonance", "resonanceOrder", "response", "tubeSpeed",
  "frequency2", "beatFrequency", "beatPeriod", "averageFrequency",
  "sourceSpeed", "observerSpeed", "observedFrequency", "dopplerShift", "pitchChange", "wavelengthAhead", "mach",
  "power", "distance", "intensity", "level", "loudness",
] as const satisfies readonly (keyof WaveMotionResults)[];

type Limited = keyof typeof WAVE_LIMITS;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const limit = (id: Limited, v: number) => {
  const [lo, hi] = WAVE_LIMITS[id];
  return clamp(Number.isFinite(v) ? v : lo, lo, hi);
};
/** Turn −0 (and anything within rounding of zero) into 0. */
const tidy = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);

/** Speed of a transverse wave on a string, m/s, from the tension (N) and the mass per length (g/m). */
export function waveStringSpeed(tension: number, densityGPerM: number): number {
  return Math.sqrt(tension / (densityGPerM / 1000));
}

/** Density of dry air, kg/m³, at a pressure (kPa) and temperature (°C): ρ = PM/RT. */
export function waveAirDensity(pressureKPa: number, celsius: number): number {
  return (pressureKPa * 1000 * WAVE_AIR_MOLAR_MASS) / (WAVE_GAS_CONSTANT * (celsius + 273.15));
}

/** Speed of sound in air, m/s: Laplace's √(γP/ρ), or Newton's √(P/ρ) with γ = 1. */
export function waveSoundSpeed(celsius: number, pressureKPa = 101.3, gamma = WAVE_AIR_GAMMA): number {
  return Math.sqrt((gamma * pressureKPa * 1000) / waveAirDensity(pressureKPa, celsius));
}

/** Frequency of mode n (1, 2, 3 …) of a string, an open pipe or a closed pipe of length L. */
export function waveStandingFrequency(system: WaveSystem, n: number, speed: number, length: number): number {
  return system === "closed" ? ((2 * n - 1) * speed) / (4 * length) : (n * speed) / (2 * length);
}

/** f′ = f(v + v_o)/(v − v_s): v_o + when the observer moves towards the source, v_s + when the source moves towards the observer. */
export function waveDopplerFrequency(f: number, v: number, observerSpeed: number, sourceSpeed: number): number {
  return (f * (v + observerSpeed)) / (v - sourceSpeed);
}

/** Sound level in decibels, β = 10 log₁₀(I/I₀). */
export function waveSoundLevel(intensity: number): number {
  return 10 * Math.log10(Math.max(intensity, 1e-30) / WAVE_I0);
}

/** 0 whisper-quiet (< 30 dB), 1 quiet (< 60), 2 loud (< 90), 3 very loud (< 120), 4 painful. */
export function waveLoudnessBand(level: number): number {
  return level < 30 ? 0 : level < 60 ? 1 : level < 90 ? 2 : level < 120 ? 3 : 4;
}

const mediumOf = (p: WaveMotionParams) => (WAVE_MEDIUM_ORDER.includes(p.medium) ? p.medium : "string");
const endOf = (p: WaveMotionParams) => (WAVE_END_ORDER.includes(p.end) ? p.end : "fixed");
const systemOf = (p: WaveMotionParams) => (WAVE_SYSTEM_ORDER.includes(p.system) ? p.system : "string");

export const waveMotionModel: SimulationModel<WaveMotionState, WaveMotionParams, WaveMotionResults> = {
  id: "wavemotion",
  defaultParams: { medium: "string", end: "fixed", system: "string" },
  outputs: OUTPUTS,
  stateVariables: [
    "tension", "density", "frequency", "amplitude", "temperature", "pressure", "phaseDifference", "length", "harmonic",
    "column", "diameter", "frequency2", "sourceSpeed", "observerSpeed", "power", "distance", "clock",
  ],

  initialize() {
    return {
      tension: 100,
      density: 10,
      frequency: 50,
      amplitude: 10,
      temperature: 20,
      pressure: 101.3,
      phaseDifference: 90,
      length: 1,
      harmonic: 1,
      column: 30,
      diameter: 3,
      frequency2: 54,
      sourceSpeed: 0,
      observerSpeed: 0,
      power: 1,
      distance: 10,
      clock: 0,
    };
  },

  /** Play runs the slow-motion clock: the waves move, the pulse runs out and back. */
  advance(state, dt) {
    const t = Math.max(0, state.clock) + dt;
    return { ...state, clock: t >= WAVE_CLOCK_LOOP ? t % WAVE_CLOCK_LOOP : t };
  },

  /** A step moves the standing wave to the next or previous mode. */
  step(state, _params, sign) {
    return { ...state, harmonic: limit("harmonic", Math.round(state.harmonic) + sign) };
  },

  derive(state, params) {
    const medium = mediumOf(params);
    const end = endOf(params);
    const system = systemOf(params);

    // Travelling wave.
    const tension = limit("tension", state.tension);
    const density = limit("density", state.density);
    const f = limit("frequency", state.frequency);
    const amplitude = limit("amplitude", state.amplitude);
    const stringSpeed = waveStringSpeed(tension, density);
    const temperature = limit("temperature", state.temperature);
    const pressure = limit("pressure", state.pressure);
    const soundSpeed = waveSoundSpeed(temperature, pressure);
    const speed = medium === "string" ? stringSpeed : soundSpeed;
    const wavelength = speed / f;
    const clock = limit("clock", state.clock);

    // Two waves added, and a pulse reflected.
    const phi = limit("phaseDifference", state.phaseDifference);
    const resultant = tidy(2 * amplitude * Math.abs(Math.cos((phi * Math.PI) / 360)));
    const share = resultant / (2 * amplitude);
    const pulseCentre = -0.1 + (2.2 * (clock % WAVE_PULSE_LAP)) / WAVE_PULSE_LAP;

    // Standing waves.
    const n = Math.round(limit("harmonic", state.harmonic));
    const length = limit("length", state.length);
    const standingSpeed = system === "string" ? stringSpeed : soundSpeed;
    const standingFrequency = waveStandingFrequency(system, n, standingSpeed, length);

    // Resonance tube: L + e = (2m − 1)λ/4, in cm.
    const column = limit("column", state.column);
    const diameter = limit("diameter", state.diameter);
    const e = WAVE_END_CORRECTION * diameter;
    const quarter = (soundSpeed / f) * 25;
    const nearest = Math.max(1, Math.round(((column + e) / quarter + 1) / 2));
    const lengthOf = (m: number) => (2 * m - 1) * quarter - e;
    const off = column - lengthOf(nearest);

    // Beats, Doppler, decibels.
    const f2 = limit("frequency2", state.frequency2);
    const beat = Math.abs(f - f2);
    const vs = limit("sourceSpeed", state.sourceSpeed);
    const vo = limit("observerSpeed", state.observerSpeed);
    const observed = waveDopplerFrequency(f, soundSpeed, vo, vs);
    const shift = tidy(observed - f);
    const power = limit("power", state.power);
    const distance = limit("distance", state.distance);
    const intensity = power / (4 * Math.PI * distance * distance);
    const level = waveSoundLevel(intensity);

    return {
      medium: WAVE_MEDIUM_ORDER.indexOf(medium),
      transverse: medium === "string" ? 1 : 0,
      tension,
      density,
      frequency: f,
      amplitude,
      stringSpeed,
      speed,
      wavelength,
      wavenumber: (2 * Math.PI) / wavelength,
      angularFrequency: 2 * Math.PI * f,
      period: 1 / f,
      maxParticleSpeed: (amplitude / 1000) * 2 * Math.PI * f,
      cyclePhase: (2 * Math.PI * WAVE_SHOWN_HZ * clock) % (2 * Math.PI),
      clock,
      temperature,
      pressure,
      airDensity: waveAirDensity(pressure, temperature),
      soundSpeed,
      newtonSpeed: waveSoundSpeed(temperature, pressure, 1),
      phaseDifference: phi,
      resultant,
      interference: share >= 0.99 ? 2 : share <= 0.01 ? 0 : 1,
      end: WAVE_END_ORDER.indexOf(end),
      reflectedSign: end === "fixed" ? -1 : 1,
      phaseChange: end === "fixed" ? 180 : 0,
      pulseCentre,
      reflected: pulseCentre > 1.2 ? 1 : 0,
      system: WAVE_SYSTEM_ORDER.indexOf(system),
      harmonic: n,
      harmonicNumber: system === "closed" ? 2 * n - 1 : n,
      length,
      standingSpeed,
      standingWavelength: standingSpeed / standingFrequency,
      standingFrequency,
      fundamental: waveStandingFrequency(system, 1, standingSpeed, length),
      nodes: system === "string" ? n + 1 : n,
      antinodes: system === "open" ? n + 1 : n,
      column,
      diameter,
      endCorrection: e,
      firstResonance: lengthOf(1),
      secondResonance: lengthOf(2),
      resonanceOrder: Math.abs(off) <= WAVE_RESONANCE_WIDTH ? nearest : 0,
      response: 1 / (1 + (off / 0.8) ** 2),
      tubeSpeed: (2 * f * (lengthOf(2) - lengthOf(1))) / 100,
      frequency2: f2,
      beatFrequency: beat,
      beatPeriod: beat > 0 ? 1 / beat : 0,
      averageFrequency: (f + f2) / 2,
      sourceSpeed: vs,
      observerSpeed: vo,
      observedFrequency: observed,
      dopplerShift: shift,
      pitchChange: Math.abs(shift) < 0.01 ? 0 : Math.sign(shift),
      wavelengthAhead: (soundSpeed - vs) / f,
      mach: tidy(vs / soundSpeed),
      power,
      distance,
      intensity,
      level,
      loudness: waveLoudnessBand(level),
    };
  },

  getVariable(state, id) {
    return id in state ? state[id as keyof WaveMotionState] : undefined;
  },

  setVariable(state, id, value) {
    if (!(id in WAVE_LIMITS)) return state;
    const v = limit(id as Limited, value);
    return { ...state, [id]: id === "harmonic" ? Math.round(v) : v };
  },
};
