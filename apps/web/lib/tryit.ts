import { applyGivenValues, type Concept, type Equation, type Quantity, type Variable } from "@ise/concept-schema";
import { getConcept } from "@ise/content";
import type { AnySimulationModel, Results } from "@ise/science-engine";
import { resolveModel } from "./registry";

/** Everything a formula card needs to run its lab's model. */
export interface TryItSetup {
  concept: Concept;
  equation: Equation;
  model: AnySimulationModel;
  /** Sliders: range variables the formula uses. */
  inputs: Variable[];
  /** The quantities the formula shows. */
  outputs: Quantity[];
  /** Where the sliders start: the lab's own defaults. */
  initial: Record<string, number>;
}

const MAX_INPUTS = 3;
type ParamValue = number | string | boolean;

function baseParams(concept: Concept, model: AnySimulationModel): Record<string, ParamValue> {
  return { ...model.defaultParams, ...concept.simulation.params };
}

/**
 * The inputs a formula can be tried with: the range variables it names, plus
 * any whose symbol matches a quantity it names (the formula says "a", the lab
 * calls the slider `a` and the output `acceleration`). With none, the lab's
 * first primary sliders.
 */
function inputsFor(concept: Concept, equation: Equation): Variable[] {
  const refs = equation.tokens.flatMap((t) => (t.kind === "ref" ? [t.id] : []));
  const symbols = new Set(refs.flatMap((id) => concept.quantities.filter((q) => q.id === id).map((q) => q.symbol)));
  const ranged = concept.variables.filter((v) => v.control.type === "range");
  const named = ranged.filter((v) => refs.includes(v.id) || symbols.has(v.symbol));
  const chosen = named.length > 0 ? named : ranged.filter((v) => v.group === "primary").slice(0, 2);
  return chosen.slice(0, MAX_INPUTS);
}

export function tryItSetup(conceptId: string, equationId: string): TryItSetup | null {
  const concept = getConcept(conceptId);
  const equation = concept?.equations.find((e) => e.id === equationId);
  if (!concept || !equation) return null;
  const model = resolveModel(concept.simulation.model);
  const inputs = inputsFor(concept, equation);
  const outputs = [
    ...new Map(
      equation.tokens.flatMap((t) => (t.kind === "ref" ? concept.quantities.filter((q) => q.id === t.id) : [])).map((q) => [q.id, q]),
    ).values(),
  ];

  const params = baseParams(concept, model);
  const state = model.initialize(params);
  const initial: Record<string, number> = {};
  for (const v of inputs) {
    const value = v.binding.kind === "param" ? params[v.binding.key] : model.getVariable(state, v.binding.key);
    if (typeof value === "number") initial[v.id] = value;
  }
  return { concept, equation, model, inputs, outputs, initial };
}

/**
 * What the lab's model says for these slider values: parameters first, then a
 * fresh state from them, then the state-bound values — the same order the lab
 * itself applies a level's givens in.
 */
export function tryItResults(setup: TryItSetup, values: Record<string, number>): Results {
  const { concept, model } = setup;
  const withParams = applyGivenValues(concept, values, model, baseParams(concept, model), model.initialize(baseParams(concept, model)));
  const fresh = model.initialize(withParams.params);
  const { params, state } = applyGivenValues(concept, values, model, withParams.params, fresh);
  return model.derive(state, params);
}
