import { defineWorld } from "@ise/game-engine";

export const roundSolidsAndSimilarityWorld = defineWorld({
  id: "round-solids-and-similarity",
  title: "Round Solids and Similar Shapes",
  tagline: "A rolling wheel, a circle cut into a rectangle, three cones that fill a cylinder, and a tower measured by its shadow.",
  color: "tangent",
  levels: ["wheels-and-tins", "area-of-a-circle", "cones-and-spheres", "same-shape-new-size"],
});
