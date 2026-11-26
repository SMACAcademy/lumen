import { defineWorld } from "@ise/game-engine";

export const probabilityWorld = defineWorld({
  id: "probability",
  title: "Probability",
  tagline: "Two dice, a shrinking sample space, a worrying test result, and coins that settle into a pattern.",
  color: "angle",
  levels: ["two-dice", "given-that", "testing-positive", "counting-successes"],
});
