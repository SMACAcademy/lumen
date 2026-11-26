import { defineWorld } from "@ise/game-engine";

export const tangentsAndSectorsWorld = defineWorld({
  id: "tangents-and-sectors",
  title: "Tangents, Sectors and Coordinates",
  tagline: "A line that just touches a circle, a slice of pizza measured exactly, and a field's area from its three sides.",
  color: "tangent",
  levels: ["touching-a-circle", "slices-of-a-circle", "section-and-heron"],
});
