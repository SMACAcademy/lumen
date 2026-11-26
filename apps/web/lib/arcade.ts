import { getConcept, gradeOfLevel, levels } from "@ise/content";
import { type ArcadeQuestion, type Level, MIN_DECK, type RushFormula, rushQuestions, type SprintSource, sprintQuestions } from "@ise/game-engine";
import type { ArcadeGame, Snapshot } from "@ise/progress-store";
import { FORMULA_BANK } from "./formulas";
import { learnerClass } from "./journey";
import { resolveModel } from "./registry";

export interface ArcadeGameInfo {
  id: ArcadeGame;
  title: string;
  blurb: string;
  rules: string;
}

export const ARCADE_GAMES: Record<ArcadeGame, ArcadeGameInfo> = {
  "sort-sprint": {
    id: "sort-sprint",
    title: "Sort Sprint",
    blurb: "Cards from the levels you have played, one at a time: which bin, yes or no?",
    rules: "Sort as many cards as you can in 60 seconds. Three wrong answers and the round is over; right answers in a row score more.",
  },
  "formula-rush": {
    id: "formula-rush",
    title: "Formula Rush",
    blurb: "Formulas up to your class: pick the formula for a name, or the name for a formula.",
    rules: "Answer as many as you can in 60 seconds. Three wrong answers and the round is over; right answers in a row score more.",
  },
};

export const ARCADE_ORDER: readonly ArcadeGame[] = ["sort-sprint", "formula-rush"];

export function isArcadeGame(id: string): id is ArcadeGame {
  return (ARCADE_ORDER as readonly string[]).includes(id);
}

const hasCards = (level: Level) => level.steps.some((s) => s.kind === "sort" || s.kind === "tap");

function sourceOf(level: Level): SprintSource[] {
  const concept = getConcept(level.concept);
  return concept ? [{ level, concept, model: resolveModel(concept.simulation.model) }] : [];
}

/** Widen through `tiers` until the questions they make reach a full deck. */
function widen<T>(tiers: readonly (readonly T[])[], make: (items: T[]) => ArcadeQuestion[]): ArcadeQuestion[] {
  const chosen: T[] = [];
  let questions: ArcadeQuestion[] = [];
  for (const tier of tiers) {
    for (const item of tier) if (!chosen.includes(item)) chosen.push(item);
    questions = make(chosen);
    if (questions.length >= MIN_DECK) break;
  }
  return questions;
}

/** Sort Sprint's deck: levels played first, then those up to the learner's class, then all of them. */
export function sprintDeck(snapshot: Snapshot, seed: string): ArcadeQuestion[] {
  const learner = learnerClass(snapshot);
  const withCards = levels.filter(hasCards);
  return widen(
    [
      withCards.filter((l) => snapshot.levels[l.id]),
      withCards.filter((l) => learner === null || (gradeOfLevel(l.id) ?? 12) <= learner),
      withCards,
    ],
    (chosen) => sprintQuestions(chosen.flatMap(sourceOf), seed),
  );
}

const RUSH_POOL: readonly RushFormula[] = FORMULA_BANK.map((card) => ({
  id: card.id,
  title: card.title,
  symbolic: card.symbolic,
  subject: card.subject,
  grade: card.grade,
  topic: card.topic,
  chapter: card.chapter.title,
}));

/** Formula Rush's deck: formulas up to the learner's class, then the school years, then everything. */
export function rushDeck(snapshot: Snapshot, seed: string): ArcadeQuestion[] {
  const learner = learnerClass(snapshot) ?? 12;
  return widen(
    [RUSH_POOL.filter((f) => f.grade <= learner), RUSH_POOL.filter((f) => f.grade <= 10), RUSH_POOL],
    (chosen) => rushQuestions(chosen, seed),
  );
}

export function deckFor(game: ArcadeGame, snapshot: Snapshot, seed: string): ArcadeQuestion[] {
  return game === "sort-sprint" ? sprintDeck(snapshot, seed) : rushDeck(snapshot, seed);
}
