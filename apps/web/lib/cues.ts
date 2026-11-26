"use client";

import { useMemo } from "react";
import { useProgress } from "./progress";

/**
 * Sound and touch feedback. Tones are synthesised on the spot — no audio
 * files, a few hundred bytes of code — and every cue is optional: the learner
 * can turn sound or haptics off, and a browser that blocks audio simply
 * stays quiet.
 */
export type Cue = "tap" | "correct" | "wrong" | "star" | "complete";

/** Frequencies in Hz with the delay (seconds) from the start of the cue. */
const NOTES: Record<Cue, readonly { hz: number; at: number; length?: number; type?: OscillatorType }[]> = {
  tap: [{ hz: 660, at: 0, length: 0.045 }],
  correct: [
    { hz: 659, at: 0, length: 0.09 },
    { hz: 988, at: 0.08, length: 0.14 },
  ],
  wrong: [
    { hz: 240, at: 0, length: 0.12, type: "triangle" },
    { hz: 180, at: 0.09, length: 0.16, type: "triangle" },
  ],
  star: [
    { hz: 880, at: 0, length: 0.1 },
    { hz: 1108, at: 0.07, length: 0.1 },
    { hz: 1318, at: 0.14, length: 0.18 },
  ],
  complete: [
    { hz: 523, at: 0, length: 0.12 },
    { hz: 659, at: 0.1, length: 0.12 },
    { hz: 784, at: 0.2, length: 0.14 },
    { hz: 1046, at: 0.32, length: 0.3 },
  ],
};

const VIBRATION: Record<Cue, number | number[]> = {
  tap: 8,
  correct: 14,
  wrong: [24, 40, 24],
  star: [10, 30, 10],
  complete: [12, 40, 12, 40, 24],
};

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    // Browsers start the context suspended until a gesture; resuming is safe to repeat.
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

export interface CuePlayer {
  play(cue: Cue): void;
  sound: boolean;
  haptics: boolean;
}

export function createCuePlayer(sound: boolean, haptics: boolean): CuePlayer {
  return {
    sound,
    haptics,
    play(cue) {
      if (haptics) {
        try {
          navigator.vibrate?.(VIBRATION[cue]);
        } catch {
          /* vibration unsupported or blocked */
        }
      }
      if (!sound) return;
      const ctx = audio();
      if (!ctx) return;
      const now = ctx.currentTime;
      for (const note of NOTES[cue]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + note.at;
        const end = start + (note.length ?? 0.1);
        osc.type = note.type ?? "sine";
        osc.frequency.setValueAtTime(note.hz, start);
        // A quick attack and an exponential tail: percussive, never harsh.
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(end + 0.02);
      }
    },
  };
}

/** Cues that follow the learner's preferences. */
export function useCues(): CuePlayer {
  const { snapshot } = useProgress();
  const { sound, haptics } = snapshot.preferences;
  return useMemo(() => createCuePlayer(sound, haptics), [sound, haptics]);
}
