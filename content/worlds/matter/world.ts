import { defineWorld } from "@ise/game-engine";

export const matterWorld = defineWorld({
  id: "matter",
  title: "Matter",
  tagline: "Stuff in bulk: stretching a wire until it goes, and finding out what makes things float.",
  color: "curve",
  levels: ["the-wire-that-stretches", "where-it-gives-way", "how-deep-is-deep", "what-floats"],
});
