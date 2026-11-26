import { defineWorld } from "@ise/game-engine";

export const rollingAndEquilibriumWorld = defineWorld({
  id: "rolling-and-equilibrium",
  title: "Rolling and Equilibrium",
  tagline: "Shift an axis, race four shapes down a slope, and balance a see-saw and a ladder.",
  color: "sine",
  levels: ["shifting-the-axis", "the-rolling-race", "balancing-act"],
});
