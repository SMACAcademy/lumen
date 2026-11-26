import { defineWorld } from "@ise/game-engine";

export const rulesOfDifferentiationWorld = defineWorld({
  id: "rules-of-differentiation",
  title: "Rules of Differentiation",
  tagline: "Products, chains and curves that are not y = something: how derivatives are actually worked out.",
  color: "angle",
  levels: ["the-growing-rectangle", "links-in-a-chain", "round-the-circle"],
});
