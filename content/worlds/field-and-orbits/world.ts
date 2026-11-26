import { defineWorld } from "@ise/game-engine";

export const fieldAndOrbitsWorld = defineWorld({
  id: "field-and-orbits",
  title: "Field and Orbits",
  tagline: "Weaker up high, weaker down deep, and nothing at all on the scales in orbit.",
  color: "curve",
  levels: ["how-g-changes", "falling-together", "the-cost-of-climbing"],
});
