import { defineWorld } from "@ise/game-engine";

export const atomsAndTheTableWorld = defineWorld({
  id: "atoms-and-the-table",
  title: "Atoms and the Table",
  tagline: "Molecules and formulae, counting by the mole, and how chemists put the elements in order.",
  color: "angle",
  levels: ["atoms-to-formulae", "counting-in-moles", "ordering-the-elements"],
});
