import { MIN_DECK } from "@ise/game-engine";
import { emptySnapshot, type LevelBest, type Snapshot } from "@ise/progress-store";
import { describe, expect, it } from "vitest";
import { rushDeck, sprintDeck } from "./arcade";
import { FORMULA_BANK } from "./formulas";

/** A snapshot of a learner in `year` who has played these levels. */
function learner(year: number | null, played: string[] = []): Snapshot {
  const s = emptySnapshot();
  const levels = Object.fromEntries(
    played.map((id): [string, LevelBest] => [id, { stars: 3, score: 1, xp: 30, plays: 1, firstCompletedAt: "2026-09-25T00:00:00Z", lastPlayedAt: "2026-09-25T00:00:00Z" }]),
  );
  return { ...s, levels, profile: { ...s.profile, year, yearAsked: true } };
}

const levelOf = (questionId: string) => questionId.split(":")[0];

describe("Sort Sprint's deck", () => {
  it("is full even for a learner who has played nothing, and every answer is an option", () => {
    const deck = sprintDeck(emptySnapshot(), "s");
    expect(deck.length).toBeGreaterThanOrEqual(MIN_DECK);
    for (const q of deck) expect(q.options.map((o) => o.id)).toContain(q.answer);
  });

  it("comes from the levels played, when they have enough cards", () => {
    const played = ["what-sticks", "making-waves", "points-and-lines"];
    const deck = sprintDeck(learner(9, played), "s");
    expect(deck.length).toBeGreaterThanOrEqual(MIN_DECK);
    expect(new Set(deck.map((q) => levelOf(q.id)))).toEqual(new Set(played));
  });

  it("widens past a few played levels to fill the deck", () => {
    const deck = sprintDeck(learner(6, ["what-sticks"]), "s");
    expect(deck.length).toBeGreaterThanOrEqual(MIN_DECK);
    expect(deck.some((q) => levelOf(q.id) === "what-sticks")).toBe(true);
    expect(deck.some((q) => levelOf(q.id) !== "what-sticks")).toBe(true);
  });
});

describe("Formula Rush's deck", () => {
  const grade = (formulaId: string) => FORMULA_BANK.find((c) => c.id === formulaId)!.grade;

  it("stays within the learner's class when there is enough", () => {
    const deck = rushDeck(learner(10), "s");
    expect(deck.length).toBeGreaterThanOrEqual(MIN_DECK);
    for (const q of deck) expect(grade(q.answer)).toBeLessThanOrEqual(10);
  });

  it("fills up for anyone, and asks every question with four options", () => {
    for (const year of [6, null]) {
      const deck = rushDeck(learner(year), "s");
      expect(deck.length).toBeGreaterThanOrEqual(MIN_DECK);
      for (const q of deck) expect(q.options).toHaveLength(4);
    }
  });
});
