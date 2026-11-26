/**
 * Cross-checks a level against its concept and model: every id must exist,
 * every prediction's measured outcome must be one of its options, estimates
 * must have a well-defined answer, and every target must be reachable.
 */

import { type Concept, type IntegrityIssue, applyGivenValues, predictableFrom, resolveGiven } from "@ise/concept-schema";
import {
  type AnySimulationModel,
  type Condition,
  type ParamValue,
  conditionQuantities,
  evaluateCondition,
  measurePrediction,
} from "@ise/science-engine";
import { orderValues, sortAnswer, tapAnswer } from "./cards";
import { type Level, LevelSchema, type Step } from "./level";

/** Condition kinds that depend on history or UI, so cannot be checked by searching states. */
function isStatic(condition: Condition): boolean {
  switch (condition.type) {
    case "compare":
    case "compareQuantities":
      return true;
    case "all":
    case "any":
      return condition.conditions.every(isStatic);
    case "not":
      return isStatic(condition.condition);
    default:
      return false;
  }
}

function modesIn(condition: Condition): string[] {
  switch (condition.type) {
    case "mode":
      return [condition.is];
    case "all":
    case "any":
      return condition.conditions.flatMap(modesIn);
    case "not":
      return modesIn(condition.condition);
    default:
      return [];
  }
}

export function conceptParams(concept: Concept, model: AnySimulationModel): Record<string, ParamValue> {
  return { ...(model.defaultParams as Record<string, ParamValue>), ...concept.simulation.params };
}

/** The params and state a step starts from when its `given` is applied to a fresh simulation. */
export function stepStart(concept: Concept, model: AnySimulationModel, step: Step) {
  const params = conceptParams(concept, model);
  return applyGivenValues(concept, step.given, model, params, model.initialize(params));
}

/**
 * Search the variables a learner can move for any state meeting the goal.
 * Returns true when found (or when the goal cannot be searched statically).
 */
export function isReachable(concept: Concept, model: AnySimulationModel, step: Step, goal: Condition): boolean {
  if (!isStatic(goal)) return true;
  const start = stepStart(concept, model, step);
  const movable = concept.variables.filter(
    (v) =>
      v.control.type === "range" &&
      ((step.controls ?? []).includes(v.id) || (step.canvas !== false && v.binding.kind === "state")),
  );
  if (movable.length === 0) return evaluateCondition(goal, { results: model.derive(start.state, start.params) });
  const steps = movable.length === 1 ? 720 : 60;
  const grids = movable.map((v) => {
    const c = v.control.type === "range" ? v.control : null;
    if (!c) return [];
    // The values a learner can actually set, when there are few enough to try them all.
    const settable = Math.round((c.max - c.min) / c.step);
    if (settable <= steps) return Array.from({ length: settable + 1 }, (_, i) => Math.min(c.max, c.min + c.step * i));
    return Array.from({ length: steps + 1 }, (_, i) => c.min + ((c.max - c.min) * i) / steps);
  });
  const search = (index: number, params: Record<string, ParamValue>, state: unknown): boolean => {
    if (index === movable.length) return evaluateCondition(goal, { results: model.derive(state, params) });
    const v = movable[index]!;
    for (const value of grids[index]!) {
      const found =
        v.binding.kind === "param"
          ? search(index + 1, { ...params, [v.binding.key]: value }, state)
          : search(index + 1, params, model.setVariable(state, v.binding.key, value, params));
      if (found) return true;
    }
    return false;
  };
  return search(0, start.params, start.state);
}

export function checkLevelIntegrity(level: Level, concept: Concept, model: AnySimulationModel): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const report = (path: string, message: string) => issues.push({ path, message });

  if (level.concept !== concept.meta.id) report("concept", `expects concept "${level.concept}" but got "${concept.meta.id}"`);
  if (concept.simulation.model !== model.id) report("concept", `concept uses model "${concept.simulation.model}", not "${model.id}"`);

  const outputs = new Set<string>(model.outputs);
  const sample = model.derive(model.initialize(conceptParams(concept, model)), conceptParams(concept, model));
  const variables = new Map(concept.variables.map((v) => [v.id, v]));
  const quantities = new Map(concept.quantities.map((q) => [q.id, q]));
  const modes = new Set(concept.modes.map((m) => m.id));
  const equations = new Set(concept.equations.map((e) => e.id));

  const uniqueCards = (path: string, ids: readonly string[]) => {
    if (new Set(ids).size !== ids.length) report(path, "card ids must be unique within a step");
  };

  const seen = new Set<string>();
  level.steps.forEach((step, i) => {
    const path = `steps[${i}] (${step.id})`;
    const before = issues.length;
    if (seen.has(step.id)) report(path, `duplicate step id "${step.id}"`);
    seen.add(step.id);

    if (step.mode && !modes.has(step.mode)) report(path, `unknown mode "${step.mode}"`);
    for (const id of step.controls ?? []) if (!variables.has(id)) report(path, `unknown control variable "${id}"`);
    for (const [id, value] of Object.entries(step.given ?? {})) {
      const v = variables.get(id);
      if (!v) report(path, `given references unknown variable "${id}"`);
      else if (v.binding.kind === "state" && typeof value !== "number") report(path, `given state variable "${id}" must be numeric`);
    }

    const checkGoal = (goal: Condition) => {
      for (const q of conditionQuantities(goal)) {
        if (!outputs.has(q)) report(path, `goal reads unknown output "${q}"`);
        // A goal on a text or true/false output compares NaN, so it never latches.
        else if (typeof sample[q] !== "number") report(path, `goal compares "${q}", which is not a number`);
      }
      for (const m of modesIn(goal)) if (!modes.has(m)) report(path, `goal names unknown mode "${m}"`);
    };

    switch (step.kind) {
      case "explore":
        checkGoal(step.goal);
        break;
      case "target":
        checkGoal(step.goal);
        if (!step.hints?.length) report(path, "target steps need at least one hint");
        if (issues.length === 0 && !isReachable(concept, model, step, step.goal)) {
          report(path, "no reachable state meets the goal with the controls given");
        }
        break;
      case "predict": {
        const v = variables.get(step.variable);
        if (!v) {
          report(path, `unknown variable "${step.variable}"`);
          break;
        }
        for (const issue of predictableFrom(v, step.from, step.to)) report(path, issue);
        if (!outputs.has(step.quantity)) {
          // A predict step measures a model output; an estimate names a
          // concept quantity. Mixing the two is the easy mistake, so say so.
          const asQuantity = quantities.get(step.quantity);
          report(
            path,
            asQuantity
              ? `model has no output "${step.quantity}" — that is a concept quantity; predictions measure its output, "${asQuantity.result}"`
              : `model has no output "${step.quantity}"`,
          );
          break;
        }
        const start = stepStart(concept, model, step);
        const { outcome } = measurePrediction(
          model,
          start.params,
          { variable: v.binding.key, target: v.binding.kind, from: step.from, to: step.to, quantity: step.quantity, tolerance: step.tolerance },
          start.state,
        );
        if (!step.options.includes(outcome)) report(path, `measured outcome "${outcome}" is not among the options`);
        break;
      }
      case "estimate": {
        const q = quantities.get(step.quantity);
        if (!q) {
          const byResult = concept.quantities.find((candidate) => candidate.result === step.quantity);
          report(
            path,
            byResult
              ? `unknown quantity "${step.quantity}" — that is a model output; estimates name a concept quantity, here "${byResult.id}"`
              : `unknown quantity "${step.quantity}"`,
          );
          break;
        }
        if (step.range.min >= step.range.max) report(path, "range min must be below max");
        if (resolveGiven(concept, step.given).length === 0) report(path, "estimates need `given` so the answer is well defined");
        const start = stepStart(concept, model, step);
        const truth = model.derive(start.state, start.params)[q.result];
        if (typeof truth !== "number") report(path, `quantity "${q.id}" is not numeric`);
        else if (truth < step.range.min || truth > step.range.max) report(path, `true value ${truth} is outside the slider range`);
        break;
      }
      case "discover":
        if (!equations.has(step.equation)) report(path, `unknown equation "${step.equation}"`);
        break;
      case "sort": {
        const bins = new Set(step.bins.map((b) => b.id));
        if (bins.size !== step.bins.length) report(path, "bin ids must be unique");
        for (const bin of step.bins) if (bin.when) checkGoal(bin.when);
        uniqueCards(path, step.cards.map((c) => c.id));
        for (const card of step.cards) if (card.bin && !bins.has(card.bin)) report(path, `card "${card.id}" names unknown bin "${card.bin}"`);
        if (issues.length > before) break;
        const answer = sortAnswer(concept, model, step);
        for (const card of step.cards) {
          const bin = answer[card.id];
          if (!bin) report(path, `card "${card.id}" belongs in no bin — give it a bin, or a state a bin's rule matches`);
          else if (card.bin && card.bin !== bin) report(path, `card "${card.id}" is typed into "${card.bin}" but the model puts it in "${bin}"`);
        }
        break;
      }
      case "match":
        uniqueCards(path, step.pairs.flatMap((p) => [p.left.id, p.right.id]));
        break;
      case "order": {
        uniqueCards(path, step.cards.map((c) => c.id));
        if (!step.by) break;
        if (!outputs.has(step.by)) {
          report(path, `order is by unknown output "${step.by}"`);
          break;
        }
        const missing = step.cards.filter((c) => !c.given).map((c) => c.id);
        if (missing.length > 0) {
          report(path, `ordering by "${step.by}" needs a given on every card; missing on ${missing.join(", ")}`);
          break;
        }
        const values = orderValues(concept, model, step);
        const rises = values.every((v, k) => Number.isFinite(v) && (k === 0 || v > values[k - 1]!));
        if (!rises) report(path, `"${step.by}" does not rise along the order: ${values.join(", ")}`);
        break;
      }
      case "tap": {
        uniqueCards(path, step.cards.map((c) => c.id));
        if (step.when) checkGoal(step.when);
        if (issues.length > before) break;
        const answer = tapAnswer(concept, model, step);
        for (const card of step.cards) {
          const fits = answer[card.id];
          if (fits === null || fits === undefined) report(path, `card "${card.id}" has no answer — mark it correct or not, or give it a state`);
          else if (card.correct !== undefined && card.correct !== fits) report(path, `card "${card.id}" is typed ${card.correct} but the model says ${fits}`);
        }
        if (!Object.values(answer).some((fits) => fits === true)) report(path, "no card fits the rule, so there is nothing to catch");
        break;
      }
      case "build": {
        for (const part of step.parts) {
          const v = variables.get(part.variable);
          if (!v) report(path, `part "${part.label}" names unknown variable "${part.variable}"`);
          else if (v.control.type !== "range") report(path, `part "${part.label}" must be a range variable`);
        }
        checkGoal(step.goal);
        if (!step.hints?.length) report(path, "build steps need at least one hint");
        const asTarget = { ...step, controls: [...(step.controls ?? []), ...step.parts.map((p) => p.variable)] };
        if (issues.length === before && !isReachable(concept, model, asTarget, step.goal)) {
          report(path, "no combination of parts meets the goal");
        }
        break;
      }
      case "intro":
        break;
    }
  });
  return issues;
}

export class LevelValidationError extends Error {
  constructor(
    readonly levelId: string,
    readonly issues: IntegrityIssue[],
  ) {
    super(`Level "${levelId}" is invalid:\n` + issues.map((i) => `  • ${i.path}: ${i.message}`).join("\n"));
    this.name = "LevelValidationError";
  }
}

/** Parse with Zod, then cross-check against the concept and model. Throws on any issue. */
export function validateLevel(input: unknown, concept: Concept, model: AnySimulationModel): Level {
  const parsed = LevelSchema.safeParse(input);
  if (!parsed.success) {
    const id = (input as { id?: string })?.id ?? "unknown";
    throw new LevelValidationError(id, parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  const issues = checkLevelIntegrity(parsed.data, concept, model);
  if (issues.length > 0) throw new LevelValidationError(parsed.data.id, issues);
  return parsed.data;
}
