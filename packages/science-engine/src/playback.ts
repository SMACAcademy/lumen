/** Framework-free playback state machine shared by every simulation. */

export const SPEED_MULTIPLIERS = [0.1, 0.25, 0.5, 1, 2] as const;
export type SpeedMultiplier = (typeof SPEED_MULTIPLIERS)[number];

export interface PlaybackState {
  playing: boolean;
  /** Slow-motion / fast-forward multiplier applied to real elapsed time. */
  speed: SpeedMultiplier;
}

export type PlaybackAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "toggle" }
  | { type: "setSpeed"; speed: SpeedMultiplier }
  | { type: "reset" };

export const initialPlayback: PlaybackState = { playing: false, speed: 1 };

export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case "play":
      return state.playing ? state : { ...state, playing: true };
    case "pause":
      return state.playing ? { ...state, playing: false } : state;
    case "toggle":
      return { ...state, playing: !state.playing };
    case "setSpeed":
      return state.speed === action.speed ? state : { ...state, speed: action.speed };
    case "reset":
      // Reset stops motion but keeps the learner's chosen speed.
      return { ...state, playing: false };
  }
}

/** Simulated seconds that elapse for a real frame of `realDt` seconds. */
export function simulatedDt(state: PlaybackState, realDt: number, maxRealDt = 0.1): number {
  if (!state.playing || realDt <= 0) return 0;
  // Clamp so a backgrounded tab doesn't teleport the simulation.
  return Math.min(realDt, maxRealDt) * state.speed;
}
