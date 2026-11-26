import type { SimulationModel } from "@ise/science-engine";

/**
 * A loudspeaker, the stuff around it, and a wall to bounce off.
 *
 * Sound is a vibration handed on from particle to particle, so it needs a
 * medium: it is fastest in steel, slower in water, slower still in air, and
 * cannot cross a vacuum at all. The frequency of the vibration is the pitch
 * we hear; its amplitude is how loud. The wavelength is what one vibration
 * stretches to in the medium, v = fλ. A clap bounces off a far wall and comes
 * back as an echo after the time to go there and back, t = 2d / v.
 */

export type SoundMedium = "air" | "water" | "steel" | "vacuum";

export const SOUND_MEDIUM_ORDER: readonly SoundMedium[] = ["air", "water", "steel", "vacuum"];

export const SOUND_MEDIA: Record<SoundMedium, { label: string; speed: number }> = {
  air: { label: "Air", speed: 343 },
  water: { label: "Water", speed: 1480 },
  steel: { label: "Steel", speed: 5960 },
  vacuum: { label: "Vacuum", speed: 0 },
};

/** Below this we hear a low note, Hz. */
export const LOW_PITCH = 200;
/** From this up we hear a high note, Hz. */
export const HIGH_PITCH = 500;
/** Our ears can tell an echo from the original only if it is at least this late, s. */
export const ECHO_GAP = 0.1;
export const MIN_WALL = 5;
export const MAX_WALL = 500;

export type SoundParams = {
  medium: SoundMedium;
  /** Vibrations per second, Hz. */
  frequency: number;
  /** How far each particle swings, on a 1–10 scale. */
  amplitude: number;
};

export interface SoundState {
  /** Distance from the speaker to the wall, m. */
  readonly wallDistance: number;
  /** Time since the clap, s. */
  readonly t: number;
}

export type SoundResults = {
  medium: number;
  frequency: number;
  amplitude: number;
  speed: number;
  wavelength: number;
  period: number;
  travels: number;
  pitch: number;
  loudness: number;
  wallDistance: number;
  t: number;
  echoTime: number;
  echoHeard: number;
  /** How far the clap is from the speaker now, m. */
  pulse: number;
  /** 1 on its way out, −1 coming back, 0 once it is home (or it never left). */
  heading: number;
  returned: number;
};

const clampWall = (d: number) => Math.min(MAX_WALL, Math.max(MIN_WALL, d));

/** The echo time for a wall `d` metres away at speed `v`, or 0 if sound cannot travel. */
export function echoTimeOf(d: number, v: number): number {
  return v > 0 ? (2 * d) / v : 0;
}

/** 0 low, 1 middle, 2 high. */
export function pitchOf(frequency: number): number {
  return frequency < LOW_PITCH ? 0 : frequency < HIGH_PITCH ? 1 : 2;
}

const OUTPUTS = [
  "medium", "frequency", "amplitude", "speed", "wavelength", "period", "travels", "pitch", "loudness",
  "wallDistance", "t", "echoTime", "echoHeard", "pulse", "heading", "returned",
] as const satisfies readonly (keyof SoundResults)[];

export const soundModel: SimulationModel<SoundState, SoundParams, SoundResults> = {
  id: "sound",
  defaultParams: { medium: "air", frequency: 256, amplitude: 5 },
  outputs: OUTPUTS,
  stateVariables: ["wallDistance", "t"],

  initialize() {
    return { wallDistance: 170, t: 0 };
  },

  /** Play claps and waits: the clap goes out, bounces, comes home — then again. */
  advance(state, dt, params) {
    const v = (SOUND_MEDIA[params.medium] ?? SOUND_MEDIA.air).speed;
    const loop = Math.max(echoTimeOf(clampWall(state.wallDistance), v), 1) + 0.5;
    const t = state.t + dt;
    return { ...state, t: t > loop ? 0 : t };
  },

  step(state, _params, sign) {
    return { ...state, wallDistance: clampWall(Math.round(state.wallDistance / 10) * 10 + 10 * sign) };
  },

  derive(state, params) {
    const v = (SOUND_MEDIA[params.medium] ?? SOUND_MEDIA.air).speed;
    const d = clampWall(state.wallDistance);
    const f = Math.max(1, params.frequency);
    const echoTime = echoTimeOf(d, v);
    const t = Math.max(0, state.t);
    const travelled = v * t;
    const home = v === 0 || travelled >= 2 * d;
    return {
      medium: Math.max(0, SOUND_MEDIUM_ORDER.indexOf(params.medium)),
      frequency: f,
      amplitude: params.amplitude,
      speed: v,
      wavelength: v / f,
      period: 1 / f,
      travels: v > 0 ? 1 : 0,
      pitch: pitchOf(f),
      loudness: params.amplitude * params.amplitude,
      wallDistance: d,
      t,
      echoTime,
      echoHeard: v > 0 && echoTime >= ECHO_GAP ? 1 : 0,
      pulse: home ? 0 : travelled <= d ? travelled : 2 * d - travelled,
      heading: home ? 0 : travelled <= d ? 1 : -1,
      returned: v > 0 && travelled >= 2 * d ? 1 : 0,
    };
  },

  getVariable(state, id) {
    return id === "wallDistance" ? state.wallDistance : id === "t" ? state.t : undefined;
  },

  setVariable(state, id, value) {
    if (id === "wallDistance") return { wallDistance: clampWall(value), t: 0 };
    if (id === "t") return { ...state, t: Math.max(0, value) };
    return state;
  },
};
