import { defineWorld } from "@ise/game-engine";

export const usingDerivativesWorld = defineWorld({
  id: "using-derivatives",
  title: "Using Derivatives",
  tagline: "The best box, the shape of a curve, and a ladder that speeds up as it slides.",
  color: "secant",
  levels: ["the-best-box", "rising-and-falling", "tied-together"],
});
