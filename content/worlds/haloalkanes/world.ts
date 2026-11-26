import { defineWorld } from "@ise/game-engine";

export const haloalkanesWorld = defineWorld({
  id: "haloalkanes",
  title: "Haloalkanes and Haloarenes",
  tagline: "Break the carbon–halogen bond: from the back, through a carbocation, or by losing HX — and meet molecules that are not their mirror images.",
  color: "cosine",
  levels: ["carbon-halogen-bond", "sn1-and-sn2", "mirror-image-molecules", "when-substitution-loses"],
});
