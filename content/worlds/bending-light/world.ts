import { defineWorld } from "@ise/game-engine";

export const bendingLightWorld = defineWorld({
  id: "bending-light",
  title: "Bending Light",
  tagline: "Mirrors, refraction and lenses: the rules light follows when it bounces and bends.",
  color: "sine",
  levels: ["into-the-water", "through-a-lens"],
});
