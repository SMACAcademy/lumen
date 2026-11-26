import type { Concept, Equation } from "@ise/concept-schema";
import { UNITS } from "@ise/units";
import { allConcepts, type Grade, SUBJECTS, type Stage, stageOf, type Subject } from "../curriculum";
import { concepts } from "../index";
import type { FormulaSymbol } from "./schema";
import { schoolFormulas } from "./school";

/** One formula as the Revise screen shows it, wherever it came from. */
export interface FormulaCard {
  /** "lab:<concept>:<equation>" or "card:<id>". */
  id: string;
  title: string;
  /** The formula as text, e.g. "v = u + a · t". */
  symbolic: string;
  words: string | null;
  reading: string | null;
  symbols: FormulaSymbol[];
  topic: string;
  subject: Subject;
  grade: Grade;
  stage: Stage;
  chapter: { id: string; title: string };
  /** The lab whose model can try this formula live; null for standalone cards. */
  lab: { conceptId: string; equationId: string } | null;
}

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "-": "⁻" };
const superscript = (n: number) => [...String(n)].map((c) => SUPERSCRIPT[c] ?? c).join("");

/** How a reference token is written: the quantity's symbol, else the variable's, with any power. */
function refSymbol(concept: Concept, id: string, power?: number, symbolic?: string): string {
  if (symbolic !== undefined) return symbolic;
  const symbol = concept.quantities.find((q) => q.id === id)?.symbol ?? concept.variables.find((v) => v.id === id)?.symbol ?? id;
  if (power === undefined) return symbol;
  // "sin θ" squared reads "sin² θ"; a plain symbol takes the power at its end.
  const space = symbol.indexOf(" ");
  return space === -1 ? `${symbol}${superscript(power)}` : `${symbol.slice(0, space)}${superscript(power)} ${symbol.slice(space + 1)}`;
}

/** A lab equation written out as plain text, in the lab's own symbols. */
export function symbolicText(concept: Concept, equation: Equation): string {
  return equation.tokens
    .map((token) => (token.kind === "ref" ? refSymbol(concept, token.id, token.power, token.symbolic) : token.value))
    .join(" ");
}

/** Each quantity or variable an equation mentions, once, with its name and unit. */
function legend(concept: Concept, equation: Equation): FormulaSymbol[] {
  const seen = new Set<string>();
  const symbols: FormulaSymbol[] = [];
  for (const token of equation.tokens) {
    if (token.kind !== "ref" || token.symbolic !== undefined || seen.has(token.id)) continue;
    seen.add(token.id);
    const quantity = concept.quantities.find((q) => q.id === token.id);
    const variable = concept.variables.find((v) => v.id === token.id);
    const unitId = quantity ? quantity.unit : variable?.control.type === "range" ? variable.control.unit : undefined;
    const unit = unitId ? UNITS[unitId].symbol : "";
    const symbol = quantity?.symbol ?? variable?.symbol ?? token.id;
    const name = (quantity?.name ?? variable?.name ?? token.id).toLowerCase();
    symbols.push(unit ? { symbol, name, unit } : { symbol, name });
  }
  return symbols;
}

/** Every formula in the app: the labs' equations and the school cards, in syllabus order. */
export function buildFormulaBank(): FormulaCard[] {
  const locations = allConcepts();
  const order = new Map(locations.map((entry, i) => [entry.concept.id, i]));
  const place = (topic: string) => {
    const entry = locations[order.get(topic) ?? -1];
    if (!entry) throw new Error(`Formula topic "${topic}" is not in the syllabus`);
    const { chapter, branch } = entry;
    return { subject: branch.subject, grade: chapter.grade, stage: stageOf(chapter.grade), chapter: { id: chapter.id, title: chapter.title } };
  };

  const fromLabs: FormulaCard[] = concepts.flatMap((concept) =>
    concept.equations.map((equation) => ({
      id: `lab:${concept.meta.id}:${equation.id}`,
      title: equation.title,
      symbolic: symbolicText(concept, equation),
      words: equation.words ?? null,
      reading: equation.reading,
      symbols: legend(concept, equation),
      topic: equation.topic,
      ...place(equation.topic),
      lab: { conceptId: concept.meta.id, equationId: equation.id },
    })),
  );

  const fromCards: FormulaCard[] = schoolFormulas.map((card) => ({
    id: `card:${card.id}`,
    title: card.title,
    symbolic: card.formula,
    words: card.words,
    reading: card.reading ?? null,
    symbols: [...card.symbols],
    topic: card.topic,
    ...place(card.topic),
    lab: null,
  }));

  const subjectOrder = (s: Subject) => SUBJECTS.indexOf(s);
  return [...fromCards, ...fromLabs].sort(
    (a, b) =>
      subjectOrder(a.subject) - subjectOrder(b.subject) ||
      a.grade - b.grade ||
      (order.get(a.topic) ?? 0) - (order.get(b.topic) ?? 0) ||
      a.title.localeCompare(b.title),
  );
}
