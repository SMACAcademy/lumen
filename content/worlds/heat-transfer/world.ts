import { defineWorld } from "@ise/game-engine";

export const heatTransferWorld = defineWorld({
  id: "heat-transfer",
  title: "Heat on the Move",
  tagline: "Three scales, stretching rails, heat down a rod, glowing stars and a cooling cup.",
  color: "secant",
  levels: ["stretch-and-scale", "down-the-rod", "glow-and-cool"],
});
