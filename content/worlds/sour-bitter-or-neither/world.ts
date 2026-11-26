import { defineWorld } from "@ise/game-engine";

export const sourBitterOrNeitherWorld = defineWorld({
  id: "sour-bitter-or-neither",
  title: "Sour, Bitter or Neither",
  tagline: "Acids, bases and the colours that tell them apart — then cancel one with the other.",
  color: "cosine",
  levels: ["sour-bitter-or-neither", "neutralise-it"],
});
