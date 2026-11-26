import { defineWorld } from "@ise/game-engine";

export const areaByStripsWorld = defineWorld({
  id: "area-by-strips",
  title: "Area by Strips",
  tagline: "Thin strips that add up to an area, a sine wave that sums to nothing, and the region between two curves.",
  color: "sine",
  levels: ["slicing-it-thin", "signed-area", "between-the-curves"],
});
