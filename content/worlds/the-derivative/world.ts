import { defineWorld } from "@ise/game-engine";

export const theDerivativeWorld = defineWorld({
  id: "the-derivative",
  title: "The Derivative",
  tagline: "From the slope at one point to a whole graph of slopes — and the slope of that.",
  color: "tangent",
  levels: ["closing-the-gap", "the-slope-graph", "bending-up-bending-down"],
});
