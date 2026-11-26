import { buildFormulaBank, type FormulaCard } from "@ise/content";
import { type DayKey, dayKey, dueCount, type Snapshot } from "@ise/progress-store";

/** Every formula in the app, built once: it is static content. */
export const FORMULA_BANK: readonly FormulaCard[] = buildFormulaBank();

const ALL_IDS = FORMULA_BANK.map((c) => c.id);

/** Formulas reviewed before and due again today, across the whole bank. */
export function formulasDue(snapshot: Snapshot, today: DayKey = dayKey()): number {
  return dueCount(snapshot, ALL_IDS, today);
}
