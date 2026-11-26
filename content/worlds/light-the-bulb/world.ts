import { defineWorld } from "@ise/game-engine";

export const lightTheBulbWorld = defineWorld({
  id: "light-the-bulb",
  title: "Light the Bulb",
  tagline: "Cells, bulbs and switches: make a torch work, and find out what lets electricity through.",
  color: "angle",
  levels: ["close-the-loop", "conductor-or-insulator"],
});
