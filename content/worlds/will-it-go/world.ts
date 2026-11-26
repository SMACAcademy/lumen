import { defineWorld } from "@ise/game-engine";

export const willItGoWorld = defineWorld({
  id: "will-it-go",
  title: "Will It Go?",
  tagline: "Heat against disorder: the one line that decides whether a reaction runs by itself.",
  color: "vector",
  levels: ["why-ice-melts", "four-kinds-of-reaction"],
});
