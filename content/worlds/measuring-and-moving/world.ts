import { defineWorld } from "@ise/game-engine";

export const measuringAndMovingWorld = defineWorld({
  id: "measuring-and-moving",
  title: "Measuring and Moving",
  tagline: "Hand spans, rulers and pendulums: how long, and how things move.",
  color: "secant",
  levels: ["spans-and-scales", "reading-a-ruler", "swings-and-spins"],
});
