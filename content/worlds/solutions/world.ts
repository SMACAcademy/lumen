import { defineWorld } from "@ise/game-engine";

export const solutionsWorld = defineWorld({
  id: "solutions",
  title: "Solutions",
  tagline: "Dissolve something and a liquid freezes later, boils later and pushes through membranes.",
  color: "sine",
  levels: ["salt-on-the-road", "pasta-water-and-pairs"],
});
