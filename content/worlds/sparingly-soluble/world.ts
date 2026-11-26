import { defineWorld } from "@ise/game-engine";

export const sparinglySolubleWorld = defineWorld({
  id: "sparingly-soluble",
  title: "Sparingly Soluble",
  tagline: "The salts that barely dissolve: their limit, the moment a precipitate forms, and the ion that pushes them back out.",
  color: "sine",
  levels: ["will-it-precipitate", "the-common-ion"],
});
