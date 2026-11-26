import { defineWorld } from "@ise/game-engine";

export const areaAndVolumeWorld = defineWorld({
  id: "area-and-volume",
  title: "Area and Volume",
  tagline: "Count the squares a shape covers and the cubes a box holds — and the formulas write themselves.",
  color: "tangent",
  levels: ["counting-squares", "filling-boxes", "nets-and-surface-area"],
});
