import { defineWorld } from "@ise/game-engine";

export const motionGraphsWorld = defineWorld({
  id: "motion-graphs",
  title: "Motion Graphs",
  tagline: "Uniform motion, acceleration, and the equations hidden in a velocity–time graph.",
  color: "secant",
  levels: ["steady-or-speeding-up", "area-under-the-graph"],
});
