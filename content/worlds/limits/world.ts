import { defineWorld } from "@ise/game-engine";

export const limitsWorld = defineWorld({
  id: "limits",
  title: "Limits and Continuity",
  tagline: "Where a function is heading, where its graph breaks, and where it has a slope.",
  color: "curve",
  levels: ["closing-in", "breaks-and-holes", "zooming-in"],
});
