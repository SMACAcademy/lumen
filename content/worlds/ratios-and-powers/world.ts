import { defineWorld } from "@ise/game-engine";

export const ratiosAndPowersWorld = defineWorld({
  id: "ratios-and-powers",
  title: "Ratios, Percentages and Powers",
  tagline: "Share fairly, count out of a hundred, and write the hugest and tiniest numbers without a page of zeros.",
  color: "angle",
  levels: ["share-it-fairly", "out-of-a-hundred", "powers-big-and-small"],
});
