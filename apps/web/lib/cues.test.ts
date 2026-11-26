import { afterEach, describe, expect, it, vi } from "vitest";
import { createCuePlayer } from "./cues";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cues", () => {
  it("vibrates only when haptics are on", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { ...navigator, vibrate });

    createCuePlayer(false, true).play("correct");
    expect(vibrate).toHaveBeenCalledWith(14);

    vibrate.mockClear();
    createCuePlayer(true, false).play("correct");
    expect(vibrate).not.toHaveBeenCalled();
  });

  it("stays silent, and never throws, where audio is unavailable", () => {
    // jsdom has no AudioContext, which is also what a locked-down browser looks like.
    expect(() => createCuePlayer(true, false).play("complete")).not.toThrow();
  });

  it("plays the notes of a cue when audio works", () => {
    const started: number[] = [];
    const node = () => ({
      connect: (next: unknown) => next,
      frequency: { setValueAtTime: (hz: number) => started.push(hz) },
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      start: () => {},
      stop: () => {},
      type: "sine",
    });
    class FakeContext {
      state = "running";
      currentTime = 0;
      destination = {};
      createOscillator = node;
      createGain = () => ({ connect: (next: unknown) => next, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } });
      resume = () => Promise.resolve();
    }
    vi.stubGlobal("window", { ...globalThis.window, AudioContext: FakeContext });

    createCuePlayer(true, false).play("star");
    expect(started).toEqual([880, 1108, 1318]);
  });
});
