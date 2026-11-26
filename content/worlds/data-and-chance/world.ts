import { defineWorld } from "@ise/game-engine";

export const dataAndChanceWorld = defineWorld({
  id: "data-and-chance",
  title: "Data and Chance",
  tagline: "Tally a class, draw it as pictures and bars, then toss a coin a thousand times.",
  color: "sine",
  levels: ["tally-marks-and-bars", "how-likely-is-it", "favourable-over-possible"],
});
