import { defineWorld } from "@ise/game-engine";

export const vectorComponentsWorld = defineWorld({
  id: "vector-components",
  title: "Vectors in a Plane",
  tagline: "Add arrows tip to tail, split a weight down a slope, and follow a vector that turns.",
  color: "vector",
  levels: ["tip-to-tail", "along-the-slope", "going-round"],
});
