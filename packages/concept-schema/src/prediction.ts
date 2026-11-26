import type { AnySimulationModel, ParamValue, PredictionSetup } from "@ise/science-engine";
import type { Concept, PredictionItem } from "./schema";

/** Translate a prediction item (which names a concept variable) into an engine setup. */
export function predictionSetup(concept: Concept, item: PredictionItem): PredictionSetup {
  const variable = concept.variables.find((v) => v.id === item.variable);
  if (!variable) throw new Error(`Prediction "${item.id}" references unknown variable "${item.variable}"`);
  return {
    variable: variable.binding.key,
    target: variable.binding.kind,
    from: item.from,
    to: item.to,
    quantity: item.quantity,
    tolerance: item.tolerance,
  };
}

export interface GivenWrite {
  target: "state" | "param";
  key: string;
  value: ParamValue;
}

export type Given = Readonly<Record<string, number | string>>;

/** Resolve variable-id → value pairs into writes: parameters first (they can affect state limits), then state. */
export function resolveGiven(concept: Concept, given: Given | undefined): GivenWrite[] {
  const writes = Object.entries(given ?? {}).flatMap(([id, value]) => {
    const variable = concept.variables.find((v) => v.id === id);
    return variable ? [{ target: variable.binding.kind, key: variable.binding.key, value }] : [];
  });
  return [...writes.filter((w) => w.target === "param"), ...writes.filter((w) => w.target === "state")];
}

/** The writes a prediction's `given` implies. */
export function givenWrites(concept: Concept, item: PredictionItem): GivenWrite[] {
  return resolveGiven(concept, item.given);
}

/** Apply given values to a params/state pair without a session (for tests and previews). */
export function applyGivenValues<S>(
  concept: Concept,
  given: Given | undefined,
  model: AnySimulationModel,
  params: Record<string, ParamValue>,
  state: S,
): { params: Record<string, ParamValue>; state: S } {
  let p = { ...params };
  let s = state;
  for (const w of resolveGiven(concept, given)) {
    if (w.target === "param") p = { ...p, [w.key]: w.value };
    else if (typeof w.value === "number") s = model.setVariable(s, w.key, w.value, p);
  }
  return { params: p, state: s };
}

/** Apply a prediction's `given` to a params/state pair. */
export function applyGiven<S>(
  concept: Concept,
  item: PredictionItem,
  model: AnySimulationModel,
  params: Record<string, ParamValue>,
  state: S,
): { params: Record<string, ParamValue>; state: S } {
  return applyGivenValues(concept, item.given, model, params, state);
}
