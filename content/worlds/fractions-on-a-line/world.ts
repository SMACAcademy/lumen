import { defineWorld } from "@ise/game-engine";

export const fractionsOnALineWorld = defineWorld({
  id: "fractions-on-a-line",
  title: "Fractions on a Line",
  tagline: "Whole numbers, fractions and decimals are all points on the line — and one point can have many names.",
  color: "sine",
  levels: ["where-fractions-live", "same-point-different-names", "whole-numbers-and-decimals"],
});
