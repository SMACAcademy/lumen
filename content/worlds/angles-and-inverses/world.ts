import { defineWorld } from "@ise/game-engine";

export const anglesAndInversesWorld = defineWorld({
  id: "angles-and-inverses",
  title: "Angles and Inverses",
  tagline: "Add two angles, find every solution of sin x = k, and run sine backwards.",
  color: "angle",
  levels: ["adding-angles", "every-solution", "running-backwards", "small-angles"],
});
