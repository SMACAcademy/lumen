import { defineWorld } from "@ise/game-engine";

export const semiconductorsWorld = defineWorld({
  id: "semiconductors",
  title: "Semiconductors",
  tagline: "Bands and holes, the one-way diode, light from a junction, and the gates of a computer.",
  color: "tangent",
  levels: ["bands-and-holes", "one-way-street", "light-and-logic"],
});
