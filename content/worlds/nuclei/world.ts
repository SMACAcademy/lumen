import { defineWorld } from "@ise/game-engine";

export const nucleiWorld = defineWorld({
  id: "nuclei",
  title: "Nuclei",
  tagline: "Mass that goes missing, a curve that peaks at iron, and atoms that halve.",
  color: "secant",
  levels: ["tiny-and-dense", "towards-iron", "a-half-at-a-time"],
});
