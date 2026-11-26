import { defineWorld } from "@ise/game-engine";

export const rateLawsWorld = defineWorld({
  id: "rate-laws",
  title: "Rate Laws and Collisions",
  tagline: "Find a reaction's order, the plot that comes out straight, and the few collisions that react.",
  color: "angle",
  levels: ["finding-the-order", "straight-line-plots", "collisions-that-count"],
});
