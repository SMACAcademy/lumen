import { defineWorld } from "@ise/game-engine";

export const quantumAtomWorld = defineWorld({
  id: "quantum-atom",
  title: "Toward the Quantum Atom",
  tagline: "The experiment that found the nucleus, and the idea that took away the electron's orbit.",
  color: "curve",
  levels: ["finding-the-nucleus", "matter-waves"],
});
