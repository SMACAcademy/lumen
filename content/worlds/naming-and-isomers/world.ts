import { defineWorld } from "@ise/game-engine";

export const namingAndIsomersWorld = defineWorld({
  id: "naming-and-isomers",
  title: "Naming and Isomers",
  tagline: "Read a complex's name from its formula, and find every way its ligands can sit.",
  color: "cosine",
  levels: ["naming-complexes", "cis-trans-and-mirrors"],
});
