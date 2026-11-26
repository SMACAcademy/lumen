import { defineWorld } from "@ise/game-engine";

export const areaSoFarWorld = defineWorld({
  id: "area-so-far",
  title: "Area So Far",
  tagline: "Collect the area under a curve as you go: its slope is the curve, its + C is where you started, and for a car it is the distance.",
  color: "secant",
  levels: ["sweeping-the-area", "undoing-the-slope", "distance-from-speed"],
});
