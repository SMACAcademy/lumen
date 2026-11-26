import { defineWorld } from "@ise/game-engine";

export const currentAndResistanceWorld = defineWorld({
  id: "current-and-resistance",
  title: "Current and Resistance",
  tagline: "Ohm's law, series and parallel circuits, and the power a circuit uses.",
  color: "vector",
  levels: ["ohms-law", "series-or-parallel"],
});
