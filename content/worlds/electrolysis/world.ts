import { defineWorld } from "@ise/game-engine";

export const electrolysisWorld = defineWorld({
  id: "electrolysis",
  title: "Electrolysis",
  tagline: "Count the electrons, weigh the metal — and see how ions carry a current.",
  color: "secant",
  levels: ["faradays-laws", "ions-on-the-move"],
});
