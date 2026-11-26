import { defineWorld } from "@ise/game-engine";

export const kineticTheoryWorld = defineWorld({
  id: "kinetic-theory",
  title: "Kinetic Theory",
  tagline: "A box of bouncing molecules: pressure, temperature, speeds and heat.",
  color: "secant",
  levels: ["molecules-in-a-box", "how-fast-molecules-move", "heat-capacities-of-gases"],
});
