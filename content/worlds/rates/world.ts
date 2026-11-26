import { defineWorld } from "@ise/game-engine";

export const ratesWorld = defineWorld({
  id: "rates",
  title: "Reaction Rates",
  tagline: "How fast reactions go, why they slow down, and what heat does to them.",
  color: "angle",
  levels: ["half-and-half-again", "ten-degrees-hotter"],
});
