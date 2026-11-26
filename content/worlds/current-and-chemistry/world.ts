import { defineWorld } from "@ise/game-engine";

export const currentAndChemistryWorld = defineWorld({
  id: "current-and-chemistry",
  title: "Current and Chemistry",
  tagline: "Which liquids conduct, and what a current does to them: bubbles, copper coats and electroplating.",
  color: "sine",
  levels: ["liquids-that-conduct", "bubbles-and-deposits", "a-copper-coat"],
});
