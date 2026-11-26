import { defineWorld } from "@ise/game-engine";

export const moTheoryWorld = defineWorld({
  id: "mo-theory",
  title: "Molecular Orbitals",
  tagline: "Bonding and antibonding: bond order, existence, and the magnetic oxygen molecule.",
  color: "sine",
  levels: ["filling-the-mos", "why-oxygen-is-magnetic"],
});
