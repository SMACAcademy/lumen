import { defineWorld } from "@ise/game-engine";

export const combustionAndFuelsWorld = defineWorld({
  id: "combustion-and-fuels",
  title: "Combustion, Fuels and Flames",
  tagline: "What a fire needs, what is inside a flame, and which fuel gives the most heat.",
  color: "secant",
  levels: ["what-burning-needs", "flames-and-fires", "fuels-coal-and-petroleum"],
});
