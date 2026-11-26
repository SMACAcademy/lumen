import { defineWorld } from "@ise/game-engine";

export const redoxWorld = defineWorld({
  id: "redox",
  title: "Redox",
  tagline: "Oxidation numbers, electrons lost and gained, and which reactions go.",
  color: "cosine",
  levels: ["oxidation-numbers", "balance-the-electrons"],
});
