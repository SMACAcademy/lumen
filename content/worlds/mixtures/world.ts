import { defineWorld } from "@ise/game-engine";

export const mixturesWorld = defineWorld({
  id: "mixtures",
  title: "Liquid Mixtures",
  tagline: "Raoult's straight lines, the mixtures that bulge or sag, and gases pushed into water.",
  color: "sine",
  levels: ["vapour-over-mixtures", "ideal-or-not"],
});
