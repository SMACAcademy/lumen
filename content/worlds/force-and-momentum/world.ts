import { defineWorld } from "@ise/game-engine";

export const forceAndMomentumWorld = defineWorld({
  id: "force-and-momentum",
  title: "Force and Momentum",
  tagline: "Balanced and unbalanced forces, F = ma, and the momentum no collision can lose.",
  color: "angle",
  levels: ["balanced-and-unbalanced", "bumps-and-bounces"],
});
