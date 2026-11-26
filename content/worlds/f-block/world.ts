import { defineWorld } from "@ise/game-engine";

export const fBlockWorld = defineWorld({
  id: "f-block",
  title: "The f-block",
  tagline: "The two rows under the table: ions that shrink step by step, and the electrons buried inside them.",
  color: "curve",
  levels: ["the-lanthanoid-contraction", "the-actinoids"],
});
