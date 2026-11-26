import { defineWorld } from "@ise/game-engine";

export const fastAndSlowWorld = defineWorld({
  id: "fast-and-slow",
  title: "Fast and Slow",
  tagline: "Speed is how far you go each second — and a journey can be drawn as a line.",
  color: "secant",
  levels: ["how-fast", "the-journey-graph"],
});
