import { defineWorld } from "@ise/game-engine";

export const dBlockWorld = defineWorld({
  id: "d-block",
  title: "The d-block",
  tagline: "Scandium to zinc: coloured ions, magnetic moments and a ladder of oxidation states.",
  color: "angle",
  levels: ["colour-and-magnetism", "variable-valency"],
});
