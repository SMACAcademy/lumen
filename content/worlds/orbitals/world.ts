import { defineWorld } from "@ise/game-engine";

export const orbitalsWorld = defineWorld({
  id: "orbitals",
  title: "Orbitals",
  tagline: "Four quantum numbers, three rules, and the shapes electrons live in.",
  color: "tangent",
  levels: ["filling-the-boxes", "shapes-and-nodes"],
});
