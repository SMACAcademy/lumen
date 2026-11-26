/** One symbol in a formula, explained: "v — final velocity (m/s)". */
export interface FormulaSymbol {
  symbol: string;
  name: string;
  unit?: string;
}

/**
 * A formula that no lab teaches yet — the class 6–10 staples, so revision
 * covers the whole syllabus from day one. Lab formulas come from the labs'
 * own equations instead, and the bank merges the two.
 */
export interface StandaloneFormula {
  id: string;
  /** The syllabus concept it belongs to. */
  topic: string;
  title: string;
  formula: string;
  /** The same formula in words. */
  words: string;
  symbols: readonly FormulaSymbol[];
  /** One line on what it says, when the words alone do not. */
  reading?: string;
}

type SymbolRow = readonly [symbol: string, name: string, unit?: string];

/** Authoring shorthand: symbols as [symbol, name, unit?] rows. */
export function formula(
  id: string,
  topic: string,
  title: string,
  text: string,
  words: string,
  symbols: readonly SymbolRow[],
  reading?: string,
): StandaloneFormula {
  return {
    id,
    topic,
    title,
    formula: text,
    words,
    symbols: symbols.map(([symbol, name, unit]) => (unit ? { symbol, name, unit } : { symbol, name })),
    ...(reading ? { reading } : {}),
  };
}
