import { defineWorld } from "@ise/game-engine";

export const statisticsWorld = defineWorld({
  id: "statistics",
  title: "Statistics",
  tagline: "The middle of the marks, how far they stray, and fifty values counted into classes.",
  color: "curve",
  levels: ["middle-of-the-marks", "how-spread-out", "grouped-into-classes"],
});
