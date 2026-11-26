import { defineWorld } from "@ise/game-engine";

export const molesWorld = defineWorld({
  id: "moles",
  title: "Moles",
  tagline: "Counting molecules by weighing them, and finding which reactant runs out first.",
  color: "tangent",
  levels: ["counting-by-weighing", "the-limiting-reagent"],
});
