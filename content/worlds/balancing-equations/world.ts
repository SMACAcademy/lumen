import { defineWorld } from "@ise/game-engine";

export const balancingEquationsWorld = defineWorld({
  id: "balancing-equations",
  title: "Balancing Equations",
  tagline: "Atoms in, atoms out — and the four kinds of reaction.",
  color: "tangent",
  levels: ["atoms-in-atoms-out", "balance-it"],
});
