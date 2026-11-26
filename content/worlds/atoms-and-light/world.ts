import { defineWorld } from "@ise/game-engine";

export const atomsAndLightWorld = defineWorld({
  id: "atoms-and-light",
  title: "Atoms & Light",
  tagline: "Why hydrogen glows in sharp colours: electrons falling between Bohr's levels.",
  color: "curve",
  levels: ["the-red-line", "series-and-limits"],
});
