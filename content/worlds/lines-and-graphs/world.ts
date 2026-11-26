import { defineWorld } from "@ise/game-engine";

export const linesAndGraphsWorld = defineWorld({
  id: "lines-and-graphs",
  title: "Lines and Graphs",
  tagline: "Points on a plane, the line y = mx + c, and where two lines meet.",
  color: "sine",
  levels: ["points-and-lines", "where-lines-meet"],
});
