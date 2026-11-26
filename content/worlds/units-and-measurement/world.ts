import { defineWorld } from "@ise/game-engine";

export const unitsAndMeasurementWorld = defineWorld({
  id: "units-and-measurement",
  title: "Units and Measurement",
  tagline: "A newton from kilograms, a formula from its dimensions, and how far to trust a number.",
  color: "angle",
  levels: ["building-units", "how-many-figures", "errors-add-up"],
});
