import { defineWorld } from "@ise/game-engine";

export const acidsWorld = defineWorld({
  id: "acids",
  title: "Acids & Bases",
  tagline: "pH, titration and buffers: finding the one drop where everything changes.",
  color: "cosine",
  levels: ["one-drop", "weak-acids-and-buffers"],
});
