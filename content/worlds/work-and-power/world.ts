import { defineWorld } from "@ise/game-engine";

export const workAndPowerWorld = defineWorld({
  id: "work-and-power",
  title: "Work and Power",
  tagline: "Force times distance, lifting a load, the watt, and the units on the electricity bill.",
  color: "tangent",
  levels: ["push-and-lift", "watts-and-units"],
});
