import { defineWorld } from "@ise/game-engine";

export const motionWorld = defineWorld({
  id: "motion",
  title: "Motion",
  tagline: "Describing how things move: position, velocity, acceleration and the graphs that hold them.",
  color: "sine",
  levels: ["distance-and-displacement", "reading-motion-graphs", "two-motions-at-once", "fired-from-a-cliff"],
});
