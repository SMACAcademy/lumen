import { defineWorld } from "@ise/game-engine";

export const complexesWorld = defineWorld({
  id: "complexes",
  title: "Complexes",
  tagline: "Ligands split the d orbitals: colour, spin and magnetism follow from the gap.",
  color: "vector",
  levels: ["splitting-the-d-orbitals", "high-spin-low-spin"],
});
