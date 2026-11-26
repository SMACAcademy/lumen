import { buildFormulaBank } from "@ise/content";
import { applyEvent, emptySnapshot, type ProgressEvent, type Snapshot } from "@ise/progress-store";
import { describe, expect, it } from "vitest";
import { blankOneSymbol, recallDeck } from "./recall";

const bank = buildFormulaBank();
const card = (id: string) => bank.find((c) => c.id === id)!;

function reviewed(snapshot: Snapshot, formulaId: string, day: string, knew = true): Snapshot {
  return applyEvent(snapshot, { id: `${formulaId}-${day}`, at: `${day}T10:00:00.000Z`, day, type: "formula-reviewed", payload: { formulaId, knew } } as ProgressEvent);
}

describe("blanking a symbol", () => {
  it("hides one symbol that appears exactly once", () => {
    const speed = card("card:first-equation");
    const gap = blankOneSymbol(speed.symbolic, speed.symbols)!;
    expect(gap.question).toContain("?");
    expect(speed.symbols.map((s) => s.symbol)).toContain(gap.answer);
    const count = speed.symbolic.split(gap.answer).length - 1;
    expect(count).toBe(1);
    expect(gap.question.replace("?", gap.answer)).toBe(speed.symbolic);
  });

  it("gives up rather than blank something ambiguous", () => {
    expect(blankOneSymbol("x = x + 1", [{ symbol: "x", name: "x" }])).toBeNull();
  });
});

describe("a recall deck", () => {
  const cards = bank.filter((c) => c.grade === 9 && c.subject === "physics");

  it("brings due cards first, then new ones, never twice, up to the size", () => {
    let s = emptySnapshot();
    const [first, second, third] = cards;
    s = reviewed(s, first!.id, "2026-09-20");
    s = reviewed(s, second!.id, "2026-09-25");
    const deck = recallDeck(cards, s, "2026-09-25", 5);
    expect(deck.length).toBe(5);
    expect(deck[0]!.card.id).toBe(first!.id);
    expect(deck.map((p) => p.card.id)).not.toContain(second!.id); // reviewed today, not due yet
    expect(deck.map((p) => p.card.id)).toContain(third!.id);
    expect(new Set(deck.map((p) => p.card.id)).size).toBe(deck.length);
  });

  it("asks in different ways, with an answer for every question", () => {
    const deck = recallDeck(cards, emptySnapshot(), "2026-09-25", 9);
    expect(new Set(deck.map((p) => p.kind)).size).toBeGreaterThan(1);
    for (const prompt of deck) {
      expect(prompt.question).toBeTruthy();
      expect(prompt.answer).toBeTruthy();
    }
  });
});
