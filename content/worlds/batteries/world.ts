import { defineWorld } from "@ise/game-engine";

export const batteriesWorld = defineWorld({
  id: "batteries",
  title: "Batteries",
  tagline: "Two metals, a wire and a salt bridge: where a voltage comes from, and why it runs out.",
  color: "angle",
  levels: ["the-daniell-cell", "why-batteries-go-flat"],
});
