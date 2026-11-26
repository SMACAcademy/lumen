import { defineWorld } from "@ise/game-engine";

export const oxygenCompoundsWorld = defineWorld({
  id: "oxygen-compounds",
  title: "Oxygen Compounds",
  tagline: "Alcohols, phenols and ethers, then aldehydes, ketones and acids: one oxygen, many reactions.",
  color: "cosine",
  levels: ["alcohols-by-degree", "phenols-and-ethers", "the-carbonyl-attacked", "mirrors-and-acids"],
});
