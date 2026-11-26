import { defineWorld } from "@ise/game-engine";

export const numbersAndPatternsWorld = defineWorld({
  id: "numbers-and-patterns",
  title: "Numbers and Patterns",
  tagline: "Primes at the root of every number, √2 on the line, rules for growing patterns, and the curve a quadratic draws.",
  color: "angle",
  levels: ["primes-and-roots", "growing-patterns", "parabolas-and-progressions"],
});
