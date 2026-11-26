import { defineWorld } from "@ise/game-engine";

export const rightTrianglesWorld = defineWorld({
  id: "right-triangles",
  title: "Right Triangles",
  tagline: "Squares on the sides, then sine, cosine and tangent — and heights you cannot climb.",
  color: "tangent",
  levels: ["squares-on-the-sides", "sine-cosine-tangent"],
});
