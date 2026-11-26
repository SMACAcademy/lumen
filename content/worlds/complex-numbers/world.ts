import { defineWorld } from "@ise/game-engine";

export const complexNumbersWorld = defineWorld({
  id: "complex-numbers",
  title: "Complex Numbers",
  tagline: "Numbers with a direction, multiplication as a turn, and the roots no parabola can show.",
  color: "cosine",
  levels: ["the-argand-plane", "turn-and-stretch", "the-discriminant", "where-the-roots-lie"],
});
