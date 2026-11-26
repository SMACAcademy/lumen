/**
 * The universal simulation contract. Every mathematical or physical model —
 * unit circle, projectile, pendulum, circuit — implements this interface.
 *
 * Models are pure and deterministic: given the same state, parameters and dt
 * they always return the same next state. They know nothing about React,
 * canvas, or the network.
 */

export type ParamValue = number | string | boolean;
export type Params = Readonly<Record<string, ParamValue>>;

/** Flat scalar outputs so UI, formulas, graphs and evaluators can bind by key. */
export type ResultValue = number | string | boolean;
export type Results = Readonly<Record<string, ResultValue>>;

/** Direction of a discrete step: forward (+1) or backward (−1). */
export type StepSign = 1 | -1;

export interface TraceSpec<S, P extends Params> {
  /** Unwrapped value of the independent variable being traced (e.g. θ, t). */
  coordinate(state: S): number;
  /** Length of one period of the coordinate (2π for an angle). */
  period: number;
  /** Channels recorded for each visited coordinate bin, e.g. ["sin", "cos"]. */
  channels: readonly string[];
  /**
   * Evaluate every channel at a coordinate value. `state` is the state the
   * sample is taken in (e.g. the secant's fixed point P while h varies).
   */
  sample(coordinate: number, params: P, state: S): Readonly<Record<string, number>>;
  /**
   * Parameters or state variables whose change invalidates recorded samples
   * (e.g. changing the amplitude redraws the whole curve).
   */
  resetOn?: readonly string[];
}

export interface SimulationModel<S, P extends Params, R extends Results> {
  readonly id: string;
  readonly defaultParams: P;
  /** Every key `derive` produces; used to validate concept definitions. */
  readonly outputs: readonly (keyof R & string)[];
  /** Keys of state-bound variables that `getVariable`/`setVariable` understand. */
  readonly stateVariables: readonly string[];

  initialize(params: P): S;
  /** Continuous time evolution by `dt` seconds. */
  advance(state: S, dt: number, params: P): S;
  /** A discrete, snapped step in the given direction. */
  step(state: S, params: P, sign: StepSign): S;
  derive(state: S, params: P): R;

  getVariable(state: S, id: string): number | undefined;
  setVariable(state: S, id: string, value: number, params: P): S;

  readonly trace?: TraceSpec<S, P>;
}

/** Erases the generic parameters so heterogeneous models can live in one registry. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySimulationModel = SimulationModel<any, any, any>;
