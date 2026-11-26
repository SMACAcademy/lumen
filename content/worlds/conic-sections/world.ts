import { defineWorld } from "@ise/game-engine";

export const conicSectionsWorld = defineWorld({
  id: "conic-sections",
  title: "Conic Sections",
  tagline: "Slice a cone, pin a string, and aim a dish: the parabola, ellipse and hyperbola.",
  color: "curve",
  levels: ["slicing-the-cone", "pins-and-string", "touching-the-curve"],
});
