import { describe, expect, it, vi } from "vitest";
import type { SimulationModel } from "./model";
import { initialPlayback, playbackReducer, simulatedDt } from "./playback";
import { LabSession } from "./session";
import {
  binAt,
  binCenter,
  clearTrace,
  createTrace,
  markPoint,
  sweepTrace,
  traceSegments,
  visitOf,
  visitedCount,
} from "./trace";

/** A minimal model: a counter moving at constant velocity with period 10. */
type CounterParams = { velocity: number; stepSize: number };
type CounterState = { x: number };
type CounterResults = { x: number; double: number };

const counterModel: SimulationModel<CounterState, CounterParams, CounterResults> = {
  id: "counter",
  defaultParams: { velocity: 2, stepSize: 1 },
  outputs: ["x", "double"],
  stateVariables: ["x"],
  initialize: () => ({ x: 0 }),
  advance: (s, dt, p) => ({ x: s.x + p.velocity * dt }),
  step: (s, p, sign) => ({ x: s.x + sign * p.stepSize }),
  derive: (s) => ({ x: s.x, double: 2 * s.x }),
  getVariable: (s, id) => (id === "x" ? s.x : undefined),
  setVariable: (s, id, v) => (id === "x" ? { x: v } : s),
  trace: { coordinate: (s) => s.x, period: 10, channels: ["double"], sample: (x) => ({ double: 2 * x }) },
};

describe("playbackReducer", () => {
  it("plays, pauses and toggles", () => {
    let s = initialPlayback;
    expect(s.playing).toBe(false);
    s = playbackReducer(s, { type: "play" });
    expect(s.playing).toBe(true);
    s = playbackReducer(s, { type: "toggle" });
    expect(s.playing).toBe(false);
    s = playbackReducer(s, { type: "toggle" });
    expect(s.playing).toBe(true);
    s = playbackReducer(s, { type: "pause" });
    expect(s.playing).toBe(false);
  });

  it("returns the same object when nothing changes", () => {
    const s = playbackReducer(initialPlayback, { type: "pause" });
    expect(s).toBe(initialPlayback);
  });

  it("reset stops playback but keeps speed", () => {
    let s = playbackReducer(initialPlayback, { type: "setSpeed", speed: 0.25 });
    s = playbackReducer(s, { type: "play" });
    s = playbackReducer(s, { type: "reset" });
    expect(s).toEqual({ playing: false, speed: 0.25 });
  });

  it("scales and clamps simulated time", () => {
    expect(simulatedDt(initialPlayback, 0.016)).toBe(0);
    const playing = { playing: true, speed: 0.5 as const };
    expect(simulatedDt(playing, 0.02)).toBeCloseTo(0.01, 12);
    expect(simulatedDt(playing, 5)).toBeCloseTo(0.05, 12); // clamped to 0.1 real seconds
  });
});

describe("CurveTrace", () => {
  const sample = (x: number) => ({ double: 2 * x });

  it("maps coordinates to bins and centres", () => {
    const t = createTrace(["double"], 10, 10);
    expect(binAt(t, 0)).toBe(0);
    expect(binAt(t, 3.5)).toBe(3);
    expect(binAt(t, 9.999)).toBe(9);
    expect(binAt(t, 13.5)).toBe(3);
    expect(binAt(t, -0.5)).toBe(9);
    expect(binCenter(t, 3)).toBeCloseTo(3.5, 12);
  });

  it("marks every bin swept, in either direction", () => {
    const t = createTrace(["double"], 10, 10);
    sweepTrace(t, 0.5, 4.5, sample);
    expect(visitedCount(t)).toBe(5); // bins 0..4
    expect(t.values.double?.[2]).toBeCloseTo(5, 12); // sampled at bin centre 2.5

    const back = createTrace(["double"], 10, 10);
    sweepTrace(back, 4.5, 0.5, sample);
    expect(visitedCount(back)).toBe(5);
  });

  it("tracks revolutions and fades the previous one", () => {
    const t = createTrace(["double"], 10, 10);
    sweepTrace(t, 0, 12.5, sample); // one full turn and into the next
    expect(t.currentRevolution).toBe(1);
    expect(t.previousRevolution).toBe(0);
    expect(visitOf(t, 1)).toBe("current");
    expect(visitOf(t, 5)).toBe("previous");
    expect(visitedCount(t, "current")).toBe(3); // bins 0,1,2 of revolution 1
  });

  it("handles clockwise sweeps across zero", () => {
    const t = createTrace(["double"], 10, 10);
    sweepTrace(t, 1.5, -1.5, sample);
    expect(t.currentRevolution).toBe(-1);
    expect(visitOf(t, 8)).toBe("current");
    expect(visitOf(t, 1)).toBe("previous");
  });

  it("limits very long sweeps to the final period", () => {
    const t = createTrace(["double"], 10, 10);
    sweepTrace(t, 0, 1000.5, sample);
    expect(t.currentRevolution).toBe(100);
    expect(visitedCount(t, "current") + visitedCount(t, "previous")).toBe(10);
  });

  it("marks a single point for jumps", () => {
    const t = createTrace(["double"], 10, 10);
    markPoint(t, 7.2, sample);
    expect(visitedCount(t)).toBe(1);
    expect(visitOf(t, 7)).toBe("current");
  });

  it("groups contiguous bins into segments and clears", () => {
    const t = createTrace(["double"], 10, 10);
    sweepTrace(t, 0.5, 2.5, sample);
    markPoint(t, 6.5, sample);
    const segments = traceSegments(t);
    expect(segments.map((s) => s.bins)).toEqual([[0, 1, 2], [6]]);
    const before = t.version;
    clearTrace(t);
    expect(visitedCount(t)).toBe(0);
    expect(t.version).toBeGreaterThan(before);
  });
});

describe("LabSession", () => {
  it("initializes from defaults with overrides", () => {
    const s = new LabSession(counterModel, { params: { velocity: 3 } });
    const snap = s.getSnapshot();
    expect(snap.params).toEqual({ velocity: 3, stepSize: 1 });
    expect(snap.results).toEqual({ x: 0, double: 0 });
    expect(snap.playback.playing).toBe(false);
  });

  it("only advances while playing", () => {
    const s = new LabSession(counterModel, { binsPerPeriod: 10 });
    expect(s.tick(0.05)).toBe(false);
    s.play();
    expect(s.tick(0.05)).toBe(true);
    expect(s.getSnapshot().results.x).toBeCloseTo(0.1, 12);
  });

  it("applies the speed multiplier", () => {
    const s = new LabSession(counterModel);
    s.setSpeed(0.5);
    s.play();
    s.tick(0.1);
    expect(s.getSnapshot().results.x).toBeCloseTo(0.1, 12);
  });

  it("steps and pauses", () => {
    const s = new LabSession(counterModel);
    s.play();
    s.step(1);
    s.step(1);
    s.step(-1);
    const snap = s.getSnapshot();
    expect(snap.results.x).toBe(1);
    expect(snap.playback.playing).toBe(false);
  });

  it("resets state and trace but keeps params", () => {
    const s = new LabSession(counterModel, { binsPerPeriod: 10 });
    s.setParam("velocity", 10);
    s.play();
    s.tick(0.05);
    s.tick(0.05);
    s.reset();
    const snap = s.getSnapshot();
    expect(snap.results.x).toBe(0);
    expect(snap.params.velocity).toBe(10);
    expect(snap.playback.playing).toBe(false);
    expect(visitedCount(snap.trace!)).toBe(1); // only the starting point
  });

  it("writes state variables with sweep or jump", () => {
    const s = new LabSession(counterModel, { binsPerPeriod: 10 });
    s.setVariable("x", 4.5, "sweep");
    expect(visitedCount(s.getSnapshot().trace!)).toBe(5);
    s.setVariable("x", 8.5, "jump");
    expect(visitedCount(s.getSnapshot().trace!)).toBe(6);
    expect(s.getVariable("x")).toBe(8.5);
    expect(() => s.setVariable("nope", 1)).toThrow();
  });

  it("notifies subscribers with a new immutable snapshot", () => {
    const s = new LabSession(counterModel);
    const listener = vi.fn();
    const unsubscribe = s.subscribe(listener);
    const before = s.getSnapshot();
    s.setVariable("x", 2);
    expect(listener).toHaveBeenCalledTimes(1);
    const after = s.getSnapshot();
    expect(after).not.toBe(before);
    expect(after.version).toBe(before.version + 1);
    expect(before.results.x).toBe(0);
    unsubscribe();
    s.setVariable("x", 3);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not notify when a param is unchanged", () => {
    const s = new LabSession(counterModel);
    const listener = vi.fn();
    s.subscribe(listener);
    s.setParam("velocity", 2);
    s.pause();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("trace invalidation", () => {
  const scaled: SimulationModel<CounterState, CounterParams, CounterResults> = {
    ...counterModel,
    trace: {
      coordinate: (s) => s.x,
      period: 10,
      channels: ["double"],
      sample: (x, p) => ({ double: p.stepSize * x }),
      resetOn: ["stepSize"],
    },
  };

  it("restarts the trace when a listed parameter changes", () => {
    const s = new LabSession(scaled, { binsPerPeriod: 10 });
    s.setVariable("x", 4.5, "sweep");
    expect(visitedCount(s.getSnapshot().trace!)).toBe(5);
    s.setParam("velocity", 3); // not listed: trace kept
    expect(visitedCount(s.getSnapshot().trace!)).toBe(5);
    s.setParam("stepSize", 2); // listed: stale samples discarded
    const trace = s.getSnapshot().trace!;
    expect(visitedCount(trace)).toBe(1);
    expect(trace.values.double![4]).toBeCloseTo(2 * 4.5, 12); // resampled with new params
  });

  it("passes the destination state to the sampler", () => {
    const stateful: SimulationModel<CounterState, CounterParams, CounterResults> = {
      ...counterModel,
      trace: { coordinate: (s) => s.x, period: 10, channels: ["double"], sample: (_x, _p, state) => ({ double: state.x }) },
    };
    const s = new LabSession(stateful, { binsPerPeriod: 10 });
    s.setVariable("x", 7.5, "jump");
    expect(s.getSnapshot().trace!.values.double![7]).toBe(7.5);
  });
});

describe("unvisited bins", () => {
  it("stay unvisited when the trace reaches revolution 1 (sentinel regression)", () => {
    const t = createTrace(["double"], 10, 10);
    sweepTrace(t, 9.5, 10.5, (x) => ({ double: 2 * x })); // cross into revolution 1
    expect(t.currentRevolution).toBe(1);
    expect(visitOf(t, 5)).toBe("none");
    expect(visitedCount(t, "current")).toBe(1);
    clearTrace(t);
    markPoint(t, 10.5, (x) => ({ double: 2 * x }));
    expect(visitedCount(t, "current")).toBe(1);
  });
});
