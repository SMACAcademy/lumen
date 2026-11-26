import { defineWorld } from "@ise/game-engine";

export const matricesAndDeterminantsWorld = defineWorld({
  id: "matrices-and-determinants",
  title: "Matrices and Determinants",
  tagline: "A matrix moves the plane, its determinant measures the change, and its inverse undoes it.",
  color: "curve",
  levels: ["where-i-and-j-land", "the-area-scale", "undoing-a-matrix", "two-lines-one-point"],
});
