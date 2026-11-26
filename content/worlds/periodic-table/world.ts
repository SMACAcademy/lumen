import { defineWorld } from "@ise/game-engine";

export const periodicTableWorld = defineWorld({
  id: "periodic-table",
  title: "The Periodic Table",
  tagline: "Size, grip and greed for electrons: the trends across and down, and their exceptions.",
  color: "curve",
  levels: ["across-and-down", "the-exceptions", "groups-and-valency"],
});
