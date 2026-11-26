import { defineWorld } from "@ise/game-engine";

export const heatWorld = defineWorld({
  id: "heat",
  title: "Heat",
  tagline: "Energy going in, and what a substance does with it: warming, melting, boiling.",
  color: "cosine",
  levels: ["the-stubborn-thermometer", "where-the-heat-hides"],
});
