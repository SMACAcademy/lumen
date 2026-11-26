import { defineWorld } from "@ise/game-engine";

export const workAndEnergyWorld = defineWorld({
  id: "work-and-energy",
  title: "Work and Energy",
  tagline: "Kinetic and potential energy, and the rule that energy only ever changes form.",
  color: "tangent",
  levels: ["lift-and-drop", "energy-changes-form"],
});
