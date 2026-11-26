import { defineWorld } from "@ise/game-engine";

export const sequencesAndSeriesWorld = defineWorld({
  id: "sequences-and-series",
  title: "Sequences and Series",
  tagline: "Staircases added in pairs, squares cut in halves for ever, and the mean that stands in a semicircle.",
  color: "tangent",
  levels: ["adding-in-pairs", "halves-for-ever", "means-and-blocks"],
});
