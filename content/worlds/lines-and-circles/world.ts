import { defineWorld } from "@ise/game-engine";

export const linesAndCirclesWorld = defineWorld({
  id: "lines-and-circles",
  title: "Lines and Circles",
  tagline: "Lines that cross at an angle, a line that just touches a circle, and the axis where two circles' tangents are equal.",
  color: "curve",
  levels: ["forms-of-a-line", "lines-at-an-angle", "line-meets-circle", "tangents-and-radical-axis"],
});
