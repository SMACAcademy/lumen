import type { Params, Results, SimulationModel, StepSign } from "./model";
import {
  type PlaybackAction,
  type PlaybackState,
  type SpeedMultiplier,
  initialPlayback,
  playbackReducer,
  simulatedDt,
} from "./playback";
import { type CurveTrace, clearTrace, createTrace, markPoint, sweepTrace } from "./trace";

/** An immutable view of everything the UI needs for one frame. */
export interface LabSnapshot<S, P extends Params, R extends Results> {
  /** Increments on every change; cheap equality check for subscribers. */
  readonly version: number;
  readonly params: P;
  readonly playback: PlaybackState;
  readonly state: S;
  readonly results: R;
  /** Shared mutable trace buffer; watch `traceVersion` for changes. */
  readonly trace: CurveTrace | null;
  readonly traceVersion: number;
}

export interface LabSessionOptions<P extends Params> {
  params?: Partial<P>;
  binsPerPeriod?: number;
}

export type VariableWriteMode = "sweep" | "jump";

/**
 * LabSession owns one running experiment: parameters, playback, model state
 * and the generated trace. It is framework-free — React (or a test, or a
 * future teacher-projector view) subscribes to it and reads snapshots.
 */
export class LabSession<S, P extends Params, R extends Results> {
  readonly model: SimulationModel<S, P, R>;
  private snapshot: LabSnapshot<S, P, R>;
  private readonly listeners = new Set<() => void>();
  private readonly trace: CurveTrace | null;

  constructor(model: SimulationModel<S, P, R>, options: LabSessionOptions<P> = {}) {
    this.model = model;
    const params = { ...model.defaultParams, ...options.params } as P;
    const state = model.initialize(params);
    this.trace = model.trace
      ? createTrace(model.trace.channels, model.trace.period, options.binsPerPeriod)
      : null;
    this.snapshot = {
      version: 0,
      params,
      playback: initialPlayback,
      state,
      results: model.derive(state, params),
      trace: this.trace,
      traceVersion: 0,
    };
    this.markCurrentPoint(state, params);
    this.snapshot = { ...this.snapshot, traceVersion: this.trace?.version ?? 0 };
  }

  // ── Subscription (compatible with React's useSyncExternalStore) ──────────

  readonly getSnapshot = (): LabSnapshot<S, P, R> => this.snapshot;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  // ── Time ─────────────────────────────────────────────────────────────────

  /** Advance by a real-time frame duration. Returns true if anything changed. */
  tick(realDt: number): boolean {
    const dt = simulatedDt(this.snapshot.playback, realDt);
    if (dt <= 0) return false;
    const { state, params } = this.snapshot;
    this.commit({ state: this.moveWithTrace(state, this.model.advance(state, dt, params), params, "sweep") });
    return true;
  }

  // ── Playback controls ────────────────────────────────────────────────────

  play(): void {
    this.dispatchPlayback({ type: "play" });
  }

  pause(): void {
    this.dispatchPlayback({ type: "pause" });
  }

  togglePlay(): void {
    this.dispatchPlayback({ type: "toggle" });
  }

  setSpeed(speed: SpeedMultiplier): void {
    this.dispatchPlayback({ type: "setSpeed", speed });
  }

  /** Discrete snapped step; stepping implies the learner wants control, so it pauses. */
  step(sign: StepSign = 1): void {
    const { state, params } = this.snapshot;
    const next = this.moveWithTrace(state, this.model.step(state, params, sign), params, "sweep");
    this.commit({ state: next, playback: playbackReducer(this.snapshot.playback, { type: "pause" }) });
  }

  /** Return to the initial state, clear the generated curve, keep parameters. */
  reset(): void {
    const { params } = this.snapshot;
    const state = this.model.initialize(params);
    if (this.trace) clearTrace(this.trace);
    this.markCurrentPoint(state, params);
    this.commit({ state, playback: playbackReducer(this.snapshot.playback, { type: "reset" }) });
  }

  clearTrace(): void {
    if (!this.trace) return;
    clearTrace(this.trace);
    this.markCurrentPoint(this.snapshot.state, this.snapshot.params);
    this.commit({});
  }

  // ── Variables & parameters ───────────────────────────────────────────────

  setParam<K extends keyof P & string>(key: K, value: P[K]): void {
    if (this.snapshot.params[key] === value) return;
    const params = { ...this.snapshot.params, [key]: value };
    if (this.invalidatesTrace(key)) this.restartTrace(this.snapshot.state, params);
    this.commit({ params });
  }

  /**
   * Write a state-bound variable (e.g. θ from a slider). "sweep" paints the
   * trace along the path, "jump" only marks the destination.
   */
  setVariable(id: string, value: number, mode: VariableWriteMode = "sweep"): void {
    const { state, params } = this.snapshot;
    if (!this.model.stateVariables.includes(id)) {
      throw new Error(`Model "${this.model.id}" has no state variable "${id}"`);
    }
    const next = this.model.setVariable(state, id, value, params);
    if (this.invalidatesTrace(id)) {
      this.restartTrace(next, params);
      this.commit({ state: next });
      return;
    }
    this.commit({ state: this.moveWithTrace(state, next, params, mode) });
  }

  getVariable(id: string): number | undefined {
    return this.model.getVariable(this.snapshot.state, id);
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private dispatchPlayback(action: PlaybackAction): void {
    const playback = playbackReducer(this.snapshot.playback, action);
    if (playback !== this.snapshot.playback) this.commit({ playback });
  }

  private invalidatesTrace(key: string): boolean {
    return this.model.trace?.resetOn?.includes(key) ?? false;
  }

  /** Recorded samples are stale: start the trace again from the current point. */
  private restartTrace(state: S, params: P): void {
    if (!this.trace) return;
    clearTrace(this.trace);
    this.markCurrentPoint(state, params);
  }

  private moveWithTrace(from: S, to: S, params: P, mode: VariableWriteMode): S {
    const spec = this.model.trace;
    if (spec && this.trace) {
      const sampler = (x: number) => spec.sample(x, params, to);
      if (mode === "sweep") sweepTrace(this.trace, spec.coordinate(from), spec.coordinate(to), sampler);
      else markPoint(this.trace, spec.coordinate(to), sampler);
    }
    return to;
  }

  private markCurrentPoint(state: S, params: P): void {
    const spec = this.model.trace;
    if (spec && this.trace) markPoint(this.trace, spec.coordinate(state), (x) => spec.sample(x, params, state));
  }

  private commit(change: { state?: S; params?: P; playback?: PlaybackState }): void {
    const state = change.state ?? this.snapshot.state;
    const params = change.params ?? this.snapshot.params;
    const recompute = change.state !== undefined || change.params !== undefined;
    this.snapshot = {
      version: this.snapshot.version + 1,
      params,
      playback: change.playback ?? this.snapshot.playback,
      state,
      results: recompute ? this.model.derive(state, params) : this.snapshot.results,
      trace: this.trace,
      traceVersion: this.trace?.version ?? 0,
    };
    for (const listener of this.listeners) listener();
  }
}
