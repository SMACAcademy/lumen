import { defineWorld } from "@ise/game-engine";

export const anglesAndShapesWorld = defineWorld({
  id: "angles-and-shapes",
  title: "Angles and Shapes",
  tagline: "Measure a turn, tilt a line until it is parallel, and find the angle rules in triangles, parallelograms and circles.",
  color: "angle",
  levels: ["measuring-turns", "parallel-lines-and-triangles", "congruence-and-parallelograms", "angles-in-a-circle"],
});
