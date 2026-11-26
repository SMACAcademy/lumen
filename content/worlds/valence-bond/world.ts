import { defineWorld } from "@ise/game-engine";

export const valenceBondWorld = defineWorld({
  id: "valence-bond",
  title: "Valence Bond Theory",
  tagline: "Orbitals that overlap head-on or side by side: where bonds come from, and how to count them.",
  color: "sine",
  levels: ["overlapping-orbitals", "sigma-and-pi"],
});
