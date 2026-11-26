import type { FormulaCard, FormulaSymbol } from "@ise/content";
import { type DayKey, isDue, type Snapshot } from "@ise/progress-store";

export type RecallKind = "name" | "meaning" | "gap";

/** One flashcard: a question, and the answer to check yourself against. */
export interface RecallPrompt {
  kind: RecallKind;
  card: FormulaCard;
  question: string;
  answer: string;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A symbol standing on its own: not part of a longer name or number. */
const alone = (symbol: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(symbol)}(?![\\p{L}\\p{N}])`, "gu");

/**
 * The formula with one symbol replaced by "?", or null when no symbol can be
 * blanked without ambiguity (it must appear exactly once). The last such
 * symbol is chosen: usually one on the right-hand side.
 */
export function blankOneSymbol(symbolic: string, symbols: readonly FormulaSymbol[]): { question: string; answer: string } | null {
  const candidates = symbols
    .map((s) => s.symbol)
    .filter((symbol) => !/[\s,]/.test(symbol) && (symbolic.match(alone(symbol)) ?? []).length === 1);
  const answer = candidates.at(-1);
  if (!answer) return null;
  return { question: symbolic.replace(alone(answer), "?"), answer };
}

function prompt(card: FormulaCard, kind: RecallKind): RecallPrompt {
  const explained = card.words ?? card.reading;
  if (kind === "gap") {
    const gap = blankOneSymbol(card.symbolic, card.symbols);
    if (gap) {
      const name = card.symbols.find((s) => s.symbol === gap.answer)?.name;
      return { kind, card, question: gap.question, answer: name ? `${gap.answer} — ${name}` : gap.answer };
    }
  }
  if (kind === "meaning" && explained) return { kind, card, question: card.symbolic, answer: explained };
  return {
    kind: "name",
    card,
    question: `What is the formula for ${card.title.charAt(0).toLowerCase()}${card.title.slice(1)}?`,
    answer: card.words && card.words !== card.symbolic ? `${card.symbolic}\n${card.words}` : card.symbolic,
  };
}

const KINDS: readonly RecallKind[] = ["name", "meaning", "gap"];

/**
 * A recall session over some cards: those due again first (the most overdue
 * first), then ones never reviewed, up to `size`. Cards reviewed and not yet
 * due stay out. The way each is asked rotates through the three kinds.
 */
export function recallDeck(cards: readonly FormulaCard[], snapshot: Snapshot, today: DayKey, size = 10): RecallPrompt[] {
  const due = cards
    .filter((c) => snapshot.formulas[c.id] && isDue(snapshot, c.id, today))
    .sort((a, b) => snapshot.formulas[a.id]!.due.localeCompare(snapshot.formulas[b.id]!.due));
  const fresh = cards.filter((c) => !snapshot.formulas[c.id]);
  return [...due, ...fresh].slice(0, size).map((card, i) => prompt(card, KINDS[i % KINDS.length]!));
}
