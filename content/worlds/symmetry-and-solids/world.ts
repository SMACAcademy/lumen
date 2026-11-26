import { defineWorld } from "@ise/game-engine";

export const symmetryAndSolidsWorld = defineWorld({
  id: "symmetry-and-solids",
  title: "Symmetry and Solids",
  tagline: "Fold shapes along a mirror, turn them on their tracing, add up a polygon's corners, and fold six squares into a cube.",
  color: "sine",
  levels: ["fold-and-turn", "polygon-corners", "faces-nets-and-views"],
});
