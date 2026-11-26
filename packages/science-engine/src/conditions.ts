/**
 * A tiny declarative condition language used by concept definitions for
 * observe checkpoints, challenges and context-sensitive explanations.
 * Conditions reference model outputs by key, never concept-specific code.
 */

import type { Results } from "./model";

export type CompareOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export type Condition =
  /** Compare a result against a number (eq/neq use `tolerance`). */
  | { type: "compare"; quantity: string; op: CompareOp; value: number; tolerance?: number }
  /** Compare two results with each other. */
  | { type: "compareQuantities"; left: string; op: CompareOp; right: string; tolerance?: number }
  /** Latches once every listed value of a result has been observed (needs a tracker). */
  | { type: "visitedAll"; quantity: string; values: readonly number[] }
  /** Fraction of one period covered by the generated trace (needs trace coverage in context). */
  | { type: "traceCoverage"; min: number }
  /** Current UI mode, e.g. "sine". */
  | { type: "mode"; is: string }
  /** A UI event has happened at least once, e.g. "play", "record". */
  | { type: "event"; name: string }
  | { type: "all"; conditions: readonly Condition[] }
  | { type: "any"; conditions: readonly Condition[] }
  | { type: "not"; condition: Condition };

export interface ConditionContext {
  results: Results;
  mode?: string;
  /** Fraction in [0, 1] of the current period covered by the trace. */
  traceCoverage?: number;
  /** Values seen so far for each quantity (maintained by a ConditionTracker). */
  seen?: ReadonlyMap<string, ReadonlySet<number>>;
  events?: ReadonlySet<string>;
}

const DEFAULT_TOLERANCE = 1e-9;

export function compare(a: number, op: CompareOp, b: number, tolerance = DEFAULT_TOLERANCE): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  switch (op) {
    case "eq":
      return Math.abs(a - b) <= tolerance;
    case "neq":
      return Math.abs(a - b) > tolerance;
    case "gt":
      return a > b;
    case "gte":
      return a >= b - tolerance;
    case "lt":
      return a < b;
    case "lte":
      return a <= b + tolerance;
  }
}

function numeric(results: Results, key: string): number {
  const value = results[key];
  return typeof value === "number" ? value : Number.NaN;
}

export function evaluateCondition(condition: Condition, ctx: ConditionContext): boolean {
  switch (condition.type) {
    case "compare":
      return compare(numeric(ctx.results, condition.quantity), condition.op, condition.value, condition.tolerance);
    case "compareQuantities":
      return compare(
        numeric(ctx.results, condition.left),
        condition.op,
        numeric(ctx.results, condition.right),
        condition.tolerance,
      );
    case "visitedAll": {
      const seen = ctx.seen?.get(condition.quantity);
      return seen !== undefined && condition.values.every((v) => seen.has(v));
    }
    case "traceCoverage":
      return (ctx.traceCoverage ?? 0) >= condition.min;
    case "mode":
      return ctx.mode === condition.is;
    case "event":
      return ctx.events?.has(condition.name) ?? false;
    case "all":
      return condition.conditions.every((c) => evaluateCondition(c, ctx));
    case "any":
      return condition.conditions.some((c) => evaluateCondition(c, ctx));
    case "not":
      return !evaluateCondition(condition.condition, ctx);
  }
}

/** Every result key a condition reads — used to validate concept definitions. */
export function conditionQuantities(condition: Condition): string[] {
  switch (condition.type) {
    case "compare":
    case "visitedAll":
      return [condition.quantity];
    case "compareQuantities":
      return [condition.left, condition.right];
    case "all":
    case "any":
      return condition.conditions.flatMap(conditionQuantities);
    case "not":
      return conditionQuantities(condition.condition);
    default:
      return [];
  }
}

function collectVisited(condition: Condition, out: Set<string>): void {
  if (condition.type === "visitedAll") out.add(condition.quantity);
  else if (condition.type === "all" || condition.type === "any") {
    for (const c of condition.conditions) collectVisited(c, out);
  } else if (condition.type === "not") collectVisited(condition.condition, out);
}

/**
 * Accumulates history (values seen, events fired) and latches conditions once
 * satisfied — the right semantics for "have you done X yet?" checkpoints.
 */
export class ConditionTracker {
  private readonly seen = new Map<string, Set<number>>();
  private readonly events = new Set<string>();
  private readonly latched = new Set<string>();
  private readonly watched: ReadonlySet<string>;

  constructor(private readonly conditions: ReadonlyMap<string, Condition>) {
    const watched = new Set<string>();
    for (const c of conditions.values()) collectVisited(c, watched);
    this.watched = watched;
  }

  recordEvent(name: string): void {
    this.events.add(name);
  }

  /** Feed the latest state; returns ids that became satisfied on this update. */
  update(ctx: Omit<ConditionContext, "seen" | "events">): string[] {
    for (const key of this.watched) {
      const value = ctx.results[key];
      if (typeof value !== "number") continue;
      let set = this.seen.get(key);
      if (!set) this.seen.set(key, (set = new Set()));
      set.add(value);
    }
    const full: ConditionContext = { ...ctx, seen: this.seen, events: this.events };
    const newly: string[] = [];
    for (const [id, condition] of this.conditions) {
      if (!this.latched.has(id) && evaluateCondition(condition, full)) {
        this.latched.add(id);
        newly.push(id);
      }
    }
    return newly;
  }

  isSatisfied(id: string): boolean {
    return this.latched.has(id);
  }

  satisfied(): ReadonlySet<string> {
    return this.latched;
  }

  reset(): void {
    this.seen.clear();
    this.events.clear();
    this.latched.clear();
  }
}
