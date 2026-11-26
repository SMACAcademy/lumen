import { defineWorld } from "@ise/game-engine";

export const thermodynamicsWorld = defineWorld({
  id: "thermodynamics",
  title: "Thermodynamics",
  tagline: "Two bodies settling, a piston doing work, and an engine that can never be perfect.",
  color: "secant",
  levels: ["first-law", "four-processes", "engines-and-fridges"],
});
