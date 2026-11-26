import { defineWorld } from "@ise/game-engine";

export const differentialEquationsWorld = defineWorld({
  id: "differential-equations",
  title: "Differential Equations",
  tagline: "Follow a field of little slopes, cool a cup of tea, and sort equations by how to solve them.",
  color: "tangent",
  levels: ["follow-the-slopes", "growth-and-cooling", "solving-them"],
});
