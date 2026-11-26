import { defineWorld } from "@ise/game-engine";

export const carbonCompoundsWorld = defineWorld({
  id: "carbon-compounds",
  title: "Carbon Compounds",
  tagline: "Share electrons, build and name carbon chains, burn them, and clean up with soap.",
  color: "angle",
  levels: ["sharing-electrons", "chains-and-families", "burn-change-and-clean"],
});
