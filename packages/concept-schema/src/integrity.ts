/**
 * Cross-reference checks that a JSON schema cannot express: every id a concept
 * mentions must exist, and every model output it binds to must be real.
 */

import { type AnySimulationModel, type Condition, conditionQuantities } from "@ise/science-engine";
import { type Concept, ConceptSchema, type Variable } from "./schema";

/**
 * A prediction moves a variable from one value to another. A slider can go
 * anywhere; a set of choices can only go to one of its own options, and only
 * if those options are numbers.
 */
export function predictableFrom(variable: Variable, from: number, to: number): string[] {
  if (variable.control.type === "range") return [];
  const values = variable.control.options.map((o) => o.value);
  if (!values.every((v) => typeof v === "number")) {
    return [`variable "${variable.id}" is not numeric, so it cannot be predicted with`];
  }
  const missing = [from, to].filter((v) => !values.some((option) => Math.abs(Number(option) - v) < 1e-9));
  return missing.map((v) => `variable "${variable.id}" has no option ${v}`);
}

export interface IntegrityIssue {
  path: string;
  message: string;
}

export function checkConceptIntegrity(concept: Concept, model: AnySimulationModel): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const report = (path: string, message: string) => issues.push({ path, message });

  if (concept.simulation.model !== model.id) {
    report("simulation.model", `expects model "${concept.simulation.model}" but got "${model.id}"`);
  }

  const outputs = new Set<string>(model.outputs);
  const params = new Set(Object.keys(model.defaultParams as object));
  const stateVars = new Set(model.stateVariables);
  const variableIds = new Set(concept.variables.map((v) => v.id));
  const quantityIds = new Set(concept.quantities.map((q) => q.id));
  const equationIds = new Set(concept.equations.map((e) => e.id));
  const layerIds = new Set(concept.visualization.layers.map((l) => l.id));
  const graphIds = new Set(concept.graphs.map((g) => g.id));
  const modeIds = new Set(concept.modes.map((m) => m.id));
  const channels = new Set(model.trace?.channels ?? []);

  const unique = (kind: string, ids: string[]) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) report(kind, `duplicate id "${id}"`);
      seen.add(id);
    }
  };
  unique("variables", concept.variables.map((v) => v.id));
  unique("quantities", concept.quantities.map((q) => q.id));
  unique("equations", concept.equations.map((e) => e.id));
  unique("modes", concept.modes.map((m) => m.id));
  unique("graphs", concept.graphs.map((g) => g.id));

  for (const key of Object.keys(concept.simulation.params)) {
    if (!params.has(key)) report(`simulation.params.${key}`, "not a parameter of the model");
  }

  concept.variables.forEach((v, i) => {
    const path = `variables[${i}] (${v.id})`;
    if (v.binding.kind === "state" && !stateVars.has(v.binding.key)) {
      report(path, `state variable "${v.binding.key}" not supported by the model`);
    }
    if (v.binding.kind === "param" && !params.has(v.binding.key)) {
      report(path, `parameter "${v.binding.key}" not defined by the model`);
    }
    if (v.control.type === "range" && v.control.min >= v.control.max) {
      report(path, "range min must be below max");
    }
    // `unit` is the unit the value is *stored* in. Declaring degrees while
    // storing radians silently shrinks the slider to a few degrees wide.
    if (v.control.type === "range" && v.control.unit === "deg" && v.control.max - v.control.min <= 2 * Math.PI) {
      report(path, "a degrees control spanning less than 2π looks like radians mislabelled as degrees");
    }
  });

  concept.quantities.forEach((q, i) => {
    if (!outputs.has(q.result)) report(`quantities[${i}] (${q.id})`, `model has no output "${q.result}"`);
    if (q.highlight && !layerIds.has(q.highlight)) {
      report(`quantities[${i}] (${q.id})`, `unknown highlight layer "${q.highlight}"`);
    }
  });

  concept.equations.forEach((e, i) => {
    for (const token of e.tokens) {
      if (token.kind === "ref" && !quantityIds.has(token.id) && !variableIds.has(token.id)) {
        report(`equations[${i}] (${e.id})`, `unknown reference "${token.id}"`);
      }
    }
  });

  if (!modeIds.has(concept.defaultMode)) report("defaultMode", `unknown mode "${concept.defaultMode}"`);

  concept.modes.forEach((m, i) => {
    const path = `modes[${i}] (${m.id})`;
    for (const l of m.layers) if (!layerIds.has(l)) report(path, `unknown layer "${l}"`);
    for (const g of m.graphs) if (!graphIds.has(g)) report(path, `unknown graph "${g}"`);
    for (const e of m.equations) if (!equationIds.has(e)) report(path, `unknown equation "${e}"`);
  });

  concept.graphs.forEach((g, i) => {
    const path = `graphs[${i}] (${g.id})`;
    for (const s of g.series) {
      if (!channels.has(s.channel)) report(path, `model trace has no channel "${s.channel}"`);
    }
    for (const guide of g.guides ?? []) {
      if (!quantityIds.has(guide.quantity)) report(path, `guide references unknown quantity "${guide.quantity}"`);
    }
    if (g.xDomain[0] >= g.xDomain[1]) report(path, "xDomain must be increasing");
    if (g.yDomain[0] >= g.yDomain[1]) report(path, "yDomain must be increasing");
  });

  // Conditions compare numbers, so a condition on a text or true/false output
  // can never come true — a mistake no amount of playing would reveal.
  const sample = model.derive(model.initialize(model.defaultParams), model.defaultParams);
  const checkCondition = (path: string, condition: Condition) => {
    for (const q of conditionQuantities(condition)) {
      if (!outputs.has(q)) report(path, `condition reads unknown output "${q}"`);
      else if (typeof sample[q] !== "number") report(path, `condition compares "${q}", which is not a number`);
    }
  };

  const { activities } = concept;
  activities.observe.forEach((s, i) => checkCondition(`activities.observe[${i}] (${s.id})`, s.condition));
  activities.predict.forEach((p, i) => {
    const path = `activities.predict[${i}] (${p.id})`;
    const variable = concept.variables.find((v) => v.id === p.variable);
    if (!variable) report(path, `unknown variable "${p.variable}"`);
    else for (const issue of predictableFrom(variable, p.from, p.to)) report(path, issue);
    if (!outputs.has(p.quantity)) report(path, `model has no output "${p.quantity}"`);
    if (p.mode && !modeIds.has(p.mode)) report(path, `unknown mode "${p.mode}"`);
    for (const [key, value] of Object.entries(p.given ?? {})) {
      const given = concept.variables.find((v) => v.id === key);
      if (!given) report(path, `given references unknown variable "${key}"`);
      else if (given.binding.kind === "state" && typeof value !== "number") report(path, `given state variable "${key}" must be numeric`);
    }
  });
  activities.experiment.columns.forEach((c) => {
    if (!quantityIds.has(c) && !variableIds.has(c)) report("activities.experiment.columns", `unknown column "${c}"`);
  });
  if (!equationIds.has(activities.experiment.discovery.reveals)) {
    report("activities.experiment.discovery.reveals", `unknown equation "${activities.experiment.discovery.reveals}"`);
  }
  if (!activities.experiment.discovery.choices.some((c) => c.correct)) {
    report("activities.experiment.discovery.choices", "at least one choice must be correct");
  }
  activities.explain.forEach((s, i) => {
    const path = `activities.explain[${i}] (${s.id})`;
    if (s.when) checkCondition(path, s.when);
    for (const match of s.body.matchAll(/\{\{(\w+)\}\}/g)) {
      const ref = match[1]!;
      if (!quantityIds.has(ref)) report(path, `template references unknown quantity "${ref}"`);
    }
  });
  activities.challenges.forEach((c, i) => checkCondition(`activities.challenges[${i}] (${c.id})`, c.goal));

  return issues;
}

export class ConceptValidationError extends Error {
  constructor(
    readonly conceptId: string,
    readonly issues: IntegrityIssue[],
  ) {
    super(
      `Concept "${conceptId}" is invalid:\n` + issues.map((i) => `  • ${i.path}: ${i.message}`).join("\n"),
    );
    this.name = "ConceptValidationError";
  }
}

/** Parse with Zod, then cross-check against the model. Throws on any issue. */
export function validateConcept(input: unknown, model: AnySimulationModel): Concept {
  const parsed = ConceptSchema.safeParse(input);
  if (!parsed.success) {
    const id = (input as { meta?: { id?: string } })?.meta?.id ?? "unknown";
    throw new ConceptValidationError(
      id,
      parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    );
  }
  const issues = checkConceptIntegrity(parsed.data, model);
  if (issues.length > 0) throw new ConceptValidationError(parsed.data.meta.id, issues);
  return parsed.data;
}
