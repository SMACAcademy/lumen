import { defineWorld } from "@ise/game-engine";

export const electricFieldsWorld = defineWorld({
  id: "electric-fields",
  title: "Electric Fields",
  tagline: "Charges that push and pull, the fields they spread, and the flux that counts them.",
  color: "secant",
  levels: ["charges-and-forces", "fields-and-dipoles", "flux-and-gauss"],
});
