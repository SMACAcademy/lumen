import { defineWorld } from "@ise/game-engine";

export const solvingTrianglesWorld = defineWorld({
  id: "solving-triangles",
  title: "Solving Triangles",
  tagline: "The sine and cosine rules, towers measured from the ground, and the centres of a triangle.",
  color: "angle",
  levels: ["sines-and-cosines", "out-of-reach", "centres-of-a-triangle"],
});
