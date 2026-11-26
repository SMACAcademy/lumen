import { defineWorld } from "@ise/game-engine";

export const integersAndRationalsWorld = defineWorld({
  id: "integers-and-rationals",
  title: "Integers and Rationals",
  tagline: "Hop below zero, turn round twice, and find fractions between fractions.",
  color: "tangent",
  levels: ["hops-below-zero", "turning-round-twice", "between-any-two"],
});
