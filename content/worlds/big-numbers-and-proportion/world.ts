import { defineWorld } from "@ise/game-engine";

export const bigNumbersAndProportionWorld = defineWorld({
  id: "big-numbers-and-proportion",
  title: "Big Numbers and Proportion",
  tagline: "Count in lakhs and millions, round and write the Roman way, then find out what doubles and what halves.",
  color: "tangent",
  levels: ["lakhs-and-millions", "round-and-roman", "double-or-halve"],
});
