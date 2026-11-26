export * from "./schema";
export * from "./integrity";
export * from "./prediction";

import type { Concept } from "./schema";

/** Identity helper that gives authors full type-checking and autocomplete. */
export function defineConcept(concept: Concept): Concept {
  return concept;
}
