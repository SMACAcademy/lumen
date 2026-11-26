import { defineWorld } from "@ise/game-engine";

export const practicalChemistryWorld = defineWorld({
  id: "practical-chemistry",
  title: "Practical Chemistry",
  tagline: "A burette read to 0.1 mL, a mystery salt named, and the elements of an organic compound found by fusing it with sodium.",
  color: "cosine",
  levels: ["burette-and-flask", "mystery-salt", "fusion-and-tube-tests"],
});
