/**
 * The arcade: short timed rounds built from pieces the levels already have.
 *
 * *Sort Sprint* deals the cards of sort and tap steps one at a time — "is it
 * magnetic?", "which bin?" — answered by the same model that answers them in
 * the level. *Formula Rush* asks formulas from the revision bank both ways
 * round: the formula for a name, and the name of a formula.
 *
 * A round is 60 seconds and three lives. Right answers score more the longer
 * the streak; a wrong one costs a life and the streak. Everything here is
 * pure — the screen only dispatches `answer` and `tick`.
 */

import type { Concept } from "@ise/concept-schema";
import type { AnySimulationModel } from "@ise/science-engine";
import { seededShuffle, sortAnswer, tapAnswer } from "./cards";
import type { Level, Pictogram } from "./level";

export const ARCADE_SECONDS = 60;
export const ARCADE_LIVES = 3;
/** XP a single round can earn at most. */
export const ARCADE_MAX_XP = 20;
/** A deck should have at least this many questions, so a good round never runs dry. */
export const MIN_DECK = 20;

export interface ArcadeOption {
  id: string;
  label: string;
}

export interface ArcadeQuestion {
  id: string;
  /** The question, e.g. "Magnetic?" or "Which is the formula?". */
  prompt: string;
  /** What it is about: a card's words, a formula's name, or a formula. */
  item: string;
  itemStyle: "words" | "formula";
  icon?: Pictogram;
  /** Where it comes from: a level, or a chapter. */
  source: string;
  options: readonly ArcadeOption[];
  optionStyle: "words" | "formula";
  /** The id of the right option. */
  answer: string;
}

// ── A round ───────────────────────────────────────────────────────────────────

export type ArcadeEnd = "time" | "lives" | "deck";

export interface ArcadeState {
  phase: "ready" | "playing" | "over";
  timeLeft: number;
  lives: number;
  score: number;
  /** Right answers in a row, now. */
  streak: number;
  bestStreak: number;
  /** The question being asked. */
  index: number;
  correct: number;
  wrong: number;
  ended: ArcadeEnd | null;
}

export type ArcadeAction = { type: "start" } | { type: "answer"; optionId: string } | { type: "tick"; dt: number };

export function arcadeStart(): ArcadeState {
  return { phase: "ready", timeLeft: ARCADE_SECONDS, lives: ARCADE_LIVES, score: 0, streak: 0, bestStreak: 0, index: 0, correct: 0, wrong: 0, ended: null };
}

/** Points for a right answer that makes the streak this long: 10, 15, 20, 25, then 30 each. */
export function pointsFor(streak: number): number {
  return 10 + 5 * Math.min(Math.max(streak - 1, 0), 4);
}

/** XP a finished round earns: one per right answer, capped. */
export function arcadeXp(state: ArcadeState): number {
  return Math.min(ARCADE_MAX_XP, state.correct);
}

export function arcadeStep(state: ArcadeState, action: ArcadeAction, deck: readonly ArcadeQuestion[]): ArcadeState {
  switch (action.type) {
    case "start": {
      const fresh = { ...arcadeStart(), phase: "playing" as const };
      return deck.length === 0 ? { ...fresh, phase: "over", ended: "deck" } : fresh;
    }
    case "tick": {
      if (state.phase !== "playing") return state;
      const timeLeft = Math.max(0, state.timeLeft - Math.max(0, action.dt));
      return timeLeft === 0 ? { ...state, timeLeft, phase: "over", ended: "time" } : { ...state, timeLeft };
    }
    case "answer": {
      if (state.phase !== "playing") return state;
      const question = deck[state.index];
      if (!question) return { ...state, phase: "over", ended: "deck" };
      const right = action.optionId === question.answer;
      const streak = right ? state.streak + 1 : 0;
      const next: ArcadeState = {
        ...state,
        index: state.index + 1,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        score: state.score + (right ? pointsFor(streak) : 0),
        lives: state.lives - (right ? 0 : 1),
        correct: state.correct + (right ? 1 : 0),
        wrong: state.wrong + (right ? 0 : 1),
      };
      if (next.lives <= 0) return { ...next, phase: "over", ended: "lives" };
      if (next.index >= deck.length) return { ...next, phase: "over", ended: "deck" };
      return next;
    }
  }
}

// ── Sort Sprint ───────────────────────────────────────────────────────────────

export interface SprintSource {
  level: Level;
  concept: Concept;
  model: AnySimulationModel;
}

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Every card of every sort and tap step in these levels, as one-tap questions, shuffled by `seed`. */
export function sprintQuestions(sources: readonly SprintSource[], seed: string): ArcadeQuestion[] {
  const questions: ArcadeQuestion[] = [];
  for (const { level, concept, model } of sources) {
    for (const step of level.steps) {
      if (step.kind === "sort") {
        const answer = sortAnswer(concept, model, step);
        const options = step.bins.map((b) => ({ id: b.id, label: b.label }));
        for (const card of step.cards) {
          const bin = answer[card.id];
          if (!bin) continue;
          questions.push({
            id: `${level.id}:${step.id}:${card.id}`,
            prompt: "Which is it?",
            item: card.label,
            itemStyle: "words",
            ...(card.icon ? { icon: card.icon } : {}),
            source: level.title,
            options,
            optionStyle: "words",
            answer: bin,
          });
        }
      } else if (step.kind === "tap") {
        const answer = tapAnswer(concept, model, step);
        for (const card of step.cards) {
          const fits = answer[card.id];
          if (fits === null || fits === undefined) continue;
          questions.push({
            id: `${level.id}:${step.id}:${card.id}`,
            prompt: `${capitalise(step.rule)}?`,
            item: card.label,
            itemStyle: "words",
            ...(card.icon ? { icon: card.icon } : {}),
            source: level.title,
            options: [
              { id: "yes", label: "Yes" },
              { id: "no", label: "No" },
            ],
            optionStyle: "words",
            answer: fits ? "yes" : "no",
          });
        }
      }
    }
  }
  return seededShuffle(questions, seed);
}

// ── Formula Rush ──────────────────────────────────────────────────────────────

/** What Formula Rush needs of a formula card. */
export interface RushFormula {
  id: string;
  title: string;
  /** The formula in symbols, e.g. "v = u + a · t". */
  symbolic: string;
  subject: string;
  grade: number;
  /** The syllabus concept it belongs to. Formulas of one topic are often the same law rearranged. */
  topic: string;
  /** The chapter it belongs to, shown as the source. */
  chapter: string;
}

/** One side of a formula with the typography stripped: "l × b · h" and "lbh" match, as do "1⁄f", "1/ f" and "1 ÷ f". */
const plain = (side: string) => side.replace(/[\s·×]/g, "").replace(/[÷⁄]/g, "/");

/** A formula's shape: both sides plain, in either order, so "1/v − 1/u = 1/f" is "1/f = 1/v − 1/u". */
export function formulaShape(symbolic: string): string {
  return symbolic.split("=").map(plain).sort().join("=");
}

const sameName = (title: string) => title.toLowerCase().replace(/^the\s+/, "");

/**
 * Only formulas written in symbols make a fair question: "no medium = no
 * sound" is a sentence, not a formula, and "n/d = n / d" says nothing.
 */
export function isQuizzable(formula: RushFormula): boolean {
  const sides = formula.symbolic.split("=").map(plain);
  return sides.length >= 2 && new Set(sides).size === sides.length && !/\b[a-z]{4,}\b/.test(formula.symbolic);
}

/** Distinct formulas: the first of each shape, and of each name, kept. */
function distinct(formulas: readonly RushFormula[]): RushFormula[] {
  const shapes = new Set<string>();
  const names = new Set<string>();
  return formulas.filter((f) => {
    const shape = formulaShape(f.symbolic);
    const name = sameName(f.title);
    if (shapes.has(shape) || names.has(name)) return false;
    shapes.add(shape);
    names.add(name);
    return true;
  });
}

/**
 * Three wrong answers: same subject and nearest class first. Never one from
 * the target's own topic — "V = IR" is not a wrong answer for "I = V / R" —
 * and never two options that read the same.
 */
function distractors(target: RushFormula, pool: readonly RushFormula[], seed: string): RushFormula[] {
  const titles = new Set([sameName(target.title)]);
  const shapes = new Set([formulaShape(target.symbolic)]);
  const nearest = (list: RushFormula[]) => list.sort((a, b) => Math.abs(a.grade - target.grade) - Math.abs(b.grade - target.grade));
  const candidates = seededShuffle(
    pool.filter((f) => f.topic !== target.topic),
    seed,
  );
  const same = nearest(candidates.filter((f) => f.subject === target.subject));
  const other = nearest(candidates.filter((f) => f.subject !== target.subject));
  const picked: RushFormula[] = [];
  // Draw from the nearest few of the same subject, so the wrong answers vary from round to round.
  for (const f of [...seededShuffle(same.slice(0, 8), `${seed}:near`), ...same.slice(8), ...other]) {
    if (picked.length === 3) break;
    const name = sameName(f.title);
    const shape = formulaShape(f.symbolic);
    if (titles.has(name) || shapes.has(shape)) continue;
    titles.add(name);
    shapes.add(shape);
    picked.push(f);
  }
  return picked;
}

/**
 * One question per quizzable formula, alternating "which is the formula for
 * this name?" and "what is this formula called?", shuffled by `seed`.
 * Wrong answers are drawn from the same `formulas`, including the ones set
 * aside as repeats, since a repeat is still a fine wrong answer elsewhere.
 */
export function rushQuestions(formulas: readonly RushFormula[], seed: string): ArcadeQuestion[] {
  const quizzable = formulas.filter(isQuizzable);
  return seededShuffle(distinct(quizzable), seed).flatMap((target, i) => {
    const wrong = distractors(target, quizzable, `${seed}:${target.id}`);
    if (wrong.length < 3) return [];
    const byName = i % 2 === 0;
    const options = seededShuffle([target, ...wrong], `${seed}:${target.id}:options`).map((f) => ({ id: f.id, label: byName ? f.symbolic : f.title }));
    const question: ArcadeQuestion = {
      id: `${target.id}:${byName ? "formula" : "name"}`,
      prompt: byName ? "Which is the formula?" : "What is this formula?",
      item: byName ? target.title : target.symbolic,
      itemStyle: byName ? "words" : "formula",
      source: target.chapter,
      options,
      optionStyle: byName ? "formula" : "words",
      answer: target.id,
    };
    return [question];
  });
}
