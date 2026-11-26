import { defineWorld } from "@ise/game-engine";

export const balanceWorld = defineWorld({
  id: "balance",
  title: "Balance",
  tagline: "Reactions that run both ways, and how they push back when you disturb them.",
  color: "secant",
  levels: ["push-and-it-pushes-back", "the-haber-compromise"],
});
