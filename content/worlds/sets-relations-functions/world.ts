import { defineWorld } from "@ise/game-engine";

export const setsRelationsFunctionsWorld = defineWorld({
  id: "sets-relations-functions",
  title: "Sets, Relations and Functions",
  tagline: "Venn diagrams, relations that sort a set into classes, and functions you can chain and undo.",
  color: "sine",
  levels: ["sets-and-relations", "arrows-and-graphs", "chains-and-inverses"],
});
