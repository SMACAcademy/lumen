import { defineWorld } from "@ise/game-engine";

export const countingAndBinomialWorld = defineWorld({
  id: "counting-and-binomial",
  title: "Counting and the Binomial Theorem",
  tagline: "Outfits on a tree, teams and arrangements, round tables and necklaces, and the triangle that expands (a + b)ⁿ.",
  color: "angle",
  levels: ["multiply-the-choices", "choose-a-team", "seats-and-necklaces", "pascals-triangle"],
});
