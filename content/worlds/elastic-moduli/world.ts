import { defineWorld } from "@ise/game-engine";

export const elasticModuliWorld = defineWorld({
  id: "elastic-moduli",
  title: "Elastic Moduli",
  tagline: "A cube squeezed from every side, a cube pushed sideways, and a wire that thins as it stretches.",
  color: "curve",
  levels: ["squeeze-and-shear", "thinner-as-it-stretches"],
});
