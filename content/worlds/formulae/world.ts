import { defineWorld } from "@ise/game-engine";

export const formulaeWorld = defineWorld({
  id: "formulae",
  title: "Formulae and Concentration",
  tagline: "What an atom weighs on average, what a formula is made of, and four ways to say how strong a solution is.",
  color: "cosine",
  levels: ["whats-in-a-formula", "how-strong-is-it"],
});
