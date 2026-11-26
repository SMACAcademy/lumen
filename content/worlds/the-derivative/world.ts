import { defineWorld } from "@ise/game-engine";

export const theDerivativeWorld = defineWorld({
  id: "the-derivative",
  title: "The Derivative",
  tagline: "From an average rate to the slope at one point, a whole graph of slopes — and the slope of that.",
  color: "tangent",
  levels: ["rise-over-run", "closing-the-gap", "the-slope-graph", "bending-up-bending-down"],
});
