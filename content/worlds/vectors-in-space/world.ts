import { defineWorld } from "@ise/game-engine";

export const vectorsInSpaceWorld = defineWorld({
  id: "vectors-in-space",
  title: "Vectors in Space",
  tagline: "Divide a segment, cast a shadow, fill a box, and measure the gap between two lines that never meet.",
  color: "vector",
  levels: ["points-in-space", "shadows-and-areas", "boxes-and-planes", "lines-that-miss"],
});
