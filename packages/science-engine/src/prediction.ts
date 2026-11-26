/**
 * Reusable prediction framework. A prediction asks what happens to a model
 * output when a variable changes; the answer is *measured* by running the
 * model, never hard-coded in content.
 */

import type { Params, Results, SimulationModel } from "./model";

export type PredictionOutcome = "increase" | "decrease" | "same";

export interface PredictionSetup {
  /** State variable or parameter key that changes. */
  variable: string;
  /** Whether `variable` is model state (default) or a parameter. */
  target?: "state" | "param";
  /** Starting value in the variable's internal unit. */
  from: number;
  /** Final value in the variable's internal unit. */
  to: number;
  /** Model output being predicted. */
  quantity: string;
  /** Changes smaller than this count as "same". */
  tolerance?: number;
}

export interface PredictionMeasurement {
  before: number;
  after: number;
  outcome: PredictionOutcome;
}

export function classifyChange(before: number, after: number, tolerance = 1e-9): PredictionOutcome {
  const delta = after - before;
  if (Math.abs(delta) <= tolerance) return "same";
  return delta > 0 ? "increase" : "decrease";
}

export function measurePrediction<S, P extends Params, R extends Results>(
  model: SimulationModel<S, P, R>,
  params: P,
  setup: PredictionSetup,
  /** Everything except the predicted variable is held at this state (defaults to a fresh one). */
  baseState?: S,
): PredictionMeasurement {
  const base = baseState ?? model.initialize(params);
  const read = (value: number): number => {
    const result =
      setup.target === "param"
        ? model.derive(base, { ...params, [setup.variable]: value })[setup.quantity]
        : model.derive(model.setVariable(base, setup.variable, value, params), params)[setup.quantity];
    if (typeof result !== "number") {
      throw new Error(`Output "${setup.quantity}" of model "${model.id}" is not numeric`);
    }
    return result;
  };
  const before = read(setup.from);
  const after = read(setup.to);
  return { before, after, outcome: classifyChange(before, after, setup.tolerance) };
}
