/**
 * Answers for the card games, worked out by the model wherever a card carries
 * a state of the simulation: the sort bin a floating block belongs in, whether
 * an element is a metal. Authors may type answers too; integrity checks the
 * two agree, so an answer key can never contradict the simulation.
 */

import { type Concept, applyGivenValues } from "@ise/concept-schema";
import { type AnySimulationModel, type Results, evaluateCondition } from "@ise/science-engine";
import { conceptParams } from "./integrity";
import type { Card, OrderStep, SortStep, Step, TapStep } from "./level";

/** The model's results for a card: the step's `given`, then the card's. Null for a card without `given`. */
export function cardResults(concept: Concept, model: AnySimulationModel, step: Step, card: Card): Results | null {
  if (!card.given) return null;
  const params = conceptParams(concept, model);
  const given = { ...step.given, ...card.given };
  const { params: p, state } = applyGivenValues(concept, given, model, params, model.initialize(params));
  return model.derive(state, p);
}

/** Card id → the bin it belongs in: the first bin whose `when` the model meets, else the typed bin. */
export function sortAnswer(concept: Concept, model: AnySimulationModel, step: SortStep): Record<string, string | null> {
  const ruled = step.bins.filter((b) => b.when);
  return Object.fromEntries(
    step.cards.map((card) => {
      const results = ruled.length > 0 ? cardResults(concept, model, step, card) : null;
      const computed = results ? (ruled.find((b) => evaluateCondition(b.when!, { results }))?.id ?? null) : null;
      return [card.id, computed ?? card.bin ?? null];
    }),
  );
}

/** Card id → whether it fits the rule: from the model when the step has `when` and the card `given`, else as typed. */
export function tapAnswer(concept: Concept, model: AnySimulationModel, step: TapStep): Record<string, boolean | null> {
  return Object.fromEntries(
    step.cards.map((card) => {
      const results = step.when ? cardResults(concept, model, step, card) : null;
      const computed = results ? evaluateCondition(step.when!, { results }) : null;
      return [card.id, computed ?? card.correct ?? null];
    }),
  );
}

/** The `by` output's value for each card of an order step, in authored order (NaN where it cannot be read). */
export function orderValues(concept: Concept, model: AnySimulationModel, step: OrderStep): number[] {
  if (!step.by) return [];
  return step.cards.map((card) => {
    const value = cardResults(concept, model, step, card)?.[step.by!];
    return typeof value === "number" ? value : Number.NaN;
  });
}

/** A small, fast hash of a string, for seeding. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * The same shuffle every time for the same seed, so a level plays the same on
 * every device and in tests — and never the answer order itself when there
 * are more than two items.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  let state = hash(seed) || 1;
  const random = () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  if (out.length > 2 && out.every((item, i) => item === items[i])) out.push(out.shift()!);
  return out;
}
