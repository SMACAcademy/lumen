import { defineWorld } from "@ise/game-engine";

export const pBlockWorld = defineWorld({
  id: "p-block",
  title: "The p-block",
  tagline: "Boron to radon: metals appear down the groups, and three hydrides hold hands.",
  color: "tangent",
  levels: ["down-the-group", "the-hydrides"],
});
